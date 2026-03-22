'use client'

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from 'react'
import { createPortal } from 'react-dom'
import { Loader2, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'
import { useMentionSearch, type MentionResult } from './useMentionSearch'

// ── types ──────────────────────────────────────────────────────
export interface MentionInputProps {
  value: string
  onChange: (value: string) => void
  onAttractionSelect: (attraction: { id: string; name: string }) => void
  countryName: string
  attractions?: { id: string; name: string }[]
  placeholder?: string
  className?: string
  disabledAttractionIds?: string[] // 已排入行程的景點 ID（不可再選）
}

export interface MentionInputHandle {
  insertAtCursor: (text: string) => void
}

// ── text → HTML with blue attraction names ─────────────────────
function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function buildHtml(text: string, attractions: { id: string; name: string }[]): string {
  if (!text) return ''
  if (!attractions.length) return escapeHtml(text)

  const positions: { start: number; end: number; id: string; name: string }[] = []
  for (const attr of attractions) {
    let from = 0
    while (true) {
      const idx = text.indexOf(attr.name, from)
      if (idx === -1) break
      positions.push({ start: idx, end: idx + attr.name.length, id: attr.id, name: attr.name })
      from = idx + attr.name.length
    }
  }
  if (!positions.length) return escapeHtml(text)

  positions.sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start))
  const filtered: typeof positions = []
  for (const pos of positions) {
    if (!filtered.length || pos.start >= filtered[filtered.length - 1].end) {
      filtered.push(pos)
    }
  }

  let html = ''
  let last = 0
  for (const p of filtered) {
    if (p.start > last) html += escapeHtml(text.slice(last, p.start))
    html += `<span data-attraction-id="${p.id}" style="color:#2563eb;font-weight:500">${escapeHtml(p.name)}</span>`
    last = p.end
  }
  if (last < text.length) html += escapeHtml(text.slice(last))
  return html
}

// ── cursor helpers for contentEditable ─────────────────────────
function getCursorOffset(el: HTMLElement): number {
  const sel = window.getSelection()
  if (!sel || !sel.rangeCount) return 0
  const range = sel.getRangeAt(0)
  const pre = range.cloneRange()
  pre.selectNodeContents(el)
  pre.setEnd(range.startContainer, range.startOffset)
  return pre.toString().length
}

function setCursorOffset(el: HTMLElement, offset: number) {
  const sel = window.getSelection()
  if (!sel) return
  const range = document.createRange()
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  let current = 0
  while (walker.nextNode()) {
    const node = walker.currentNode as Text
    if (current + node.length >= offset) {
      range.setStart(node, offset - current)
      range.collapse(true)
      sel.removeAllRanges()
      sel.addRange(range)
      return
    }
    current += node.length
  }
  // Fallback: end of content
  range.selectNodeContents(el)
  range.collapse(false)
  sel.removeAllRanges()
  sel.addRange(range)
}

// ── hover tooltip (portal) ─────────────────────────────────────
const detailCache = new Map<
  string,
  { description?: string; city_name?: string; thumbnail?: string }
>()

function AttractionTooltip({ id, name, anchor }: { id: string; name: string; anchor: DOMRect }) {
  const [detail, setDetail] = useState(detailCache.get(id) || null)

  useEffect(() => {
    if (detail || detailCache.has(id)) {
      if (!detail) setDetail(detailCache.get(id)!)
      return
    }
    let cancelled = false
    supabase
      .from('attractions')
      .select('description, thumbnail, cities(name)')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (cancelled || !data) return
        const d = {
          description: ((data as Record<string, unknown>).description as string) || '',
          city_name:
            ((data as Record<string, unknown>).cities as { name: string } | null)?.name || '',
          thumbnail: ((data as Record<string, unknown>).thumbnail as string) || '',
        }
        detailCache.set(id, d)
        setDetail(d)
      })
    return () => {
      cancelled = true
    }
  }, [id, detail])

  return createPortal(
    <div
      className="fixed z-[10020] max-w-[280px] bg-card border border-border rounded-lg shadow-lg overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150"
      style={{
        top: anchor.bottom + 4,
        left: anchor.left + anchor.width / 2,
        transform: 'translateX(-50%)',
      }}
    >
      {detail ? (
        <div className="flex gap-2 p-2">
          {detail.thumbnail && (
            <img
              src={detail.thumbnail}
              alt={name}
              className="w-16 h-16 object-cover rounded shrink-0"
            />
          )}
          <div className="text-xs min-w-0">
            <div className="font-medium">{name}</div>
            {detail.city_name && (
              <div className="text-muted-foreground text-[10px]">{detail.city_name}</div>
            )}
            {detail.description && (
              <p className="mt-1 line-clamp-3 text-muted-foreground">{detail.description}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="p-2 text-xs">
          <Loader2 size={12} className="animate-spin inline mr-1" />
          {name}
        </div>
      )}
    </div>,
    document.body
  )
}

// ── main component ─────────────────────────────────────────────
export const MentionInput = forwardRef<MentionInputHandle, MentionInputProps>(function MentionInput(
  {
    value,
    onChange,
    onAttractionSelect,
    countryName,
    attractions = [],
    placeholder,
    className,
    disabledAttractionIds = [],
  },
  ref
) {
  const [isOpen, setIsOpen] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionStart, setMentionStart] = useState(-1)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 })
  const [hoveredAttraction, setHoveredAttraction] = useState<{
    id: string
    name: string
    rect: DOMRect
  } | null>(null)

  const editorRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const isComposingRef = useRef(false)
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([])

  const { results, loading } = useMentionSearch(countryName, mentionQuery, isOpen)

  useImperativeHandle(
    ref,
    () => ({
      insertAtCursor: (text: string) => {
        const el = editorRef.current
        if (!el) return
        el.focus()
        const cursor = getCursorOffset(el)
        const before = value.slice(0, cursor)
        const after = value.slice(cursor)
        onChange(before + text + after)
        requestAnimationFrame(() => {
          if (editorRef.current) {
            setCursorOffset(editorRef.current, cursor + text.length)
          }
        })
      },
    }),
    [value, onChange]
  )

  const html = useMemo(() => buildHtml(value, attractions), [value, attractions])
  const attractionIdsKey = useMemo(() => attractions.map(a => a.id).join(','), [attractions])
  const prevAttrIdsRef = useRef(attractionIdsKey)

  // Set initial HTML on mount
  useEffect(() => {
    const el = editorRef.current
    if (!el) return
    el.innerHTML = html || ''
  }, [])

  // Sync HTML into contentEditable — only when value or attractions actually change
  useEffect(() => {
    const el = editorRef.current
    if (!el) return
    const currentText = el.textContent || ''

    if (currentText !== value) {
      // Value changed from outside (e.g. attraction selected, external prop)
      const cursor = getCursorOffset(el)
      el.innerHTML = html || ''
      setCursorOffset(el, cursor)
      prevAttrIdsRef.current = attractionIdsKey
      return
    }

    if (prevAttrIdsRef.current !== attractionIdsKey) {
      // Same text but attractions changed → re-apply highlights
      prevAttrIdsRef.current = attractionIdsKey
      const cursor = getCursorOffset(el)
      el.innerHTML = html || currentText
      setCursorOffset(el, cursor)
    }
  }, [html, value, attractionIdsKey])

  // ── hover detection on attraction spans ──
  useEffect(() => {
    const el = editorRef.current
    if (!el) return
    const handleOver = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('[data-attraction-id]') as HTMLElement | null
      if (target) {
        const id = target.getAttribute('data-attraction-id')!
        const name = target.textContent || ''
        setHoveredAttraction({ id, name, rect: target.getBoundingClientRect() })
      } else {
        setHoveredAttraction(null)
      }
    }
    const handleOut = (e: MouseEvent) => {
      const related = e.relatedTarget as HTMLElement | null
      if (!related || !related.closest?.('[data-attraction-id]')) {
        setHoveredAttraction(null)
      }
    }
    el.addEventListener('mouseover', handleOver)
    el.addEventListener('mouseout', handleOut)
    return () => {
      el.removeEventListener('mouseover', handleOver)
      el.removeEventListener('mouseout', handleOut)
    }
  }, [])

  // ── input handling ──
  const handleInput = useCallback(() => {
    const el = editorRef.current
    if (!el) return
    const text = el.textContent || ''
    onChange(text)

    if (!isComposingRef.current) {
      const cursor = getCursorOffset(el)
      // Detect @
      let atIdx = -1
      for (let i = cursor - 1; i >= 0; i--) {
        if (text[i] === '@') {
          atIdx = i
          break
        }
      }
      if (atIdx >= 0) {
        const q = text.slice(atIdx + 1, cursor)
        if (q.length <= 20) {
          setMentionStart(atIdx)
          setMentionQuery(q)
          if (!isOpen) setIsOpen(true)
        } else {
          setIsOpen(false)
        }
      } else {
        setIsOpen(false)
      }
    }
  }, [onChange, isOpen])

  // ── dropdown position (at caret) ──
  const updatePosition = useCallback(() => {
    const sel = window.getSelection()
    if (!sel || !sel.rangeCount || !editorRef.current) return
    const caretRect = sel.getRangeAt(0).getBoundingClientRect()
    const editorRect = editorRef.current.getBoundingClientRect()
    // If caret rect is zero (e.g. empty), fall back to editor rect
    const anchor = caretRect.height > 0 ? caretRect : editorRect
    setDropdownPos({
      top: anchor.bottom + 2,
      left: anchor.left,
      width: Math.min(editorRect.width, 280),
    })
  }, [])

  useEffect(() => {
    if (isOpen) updatePosition()
  }, [isOpen, mentionQuery, updatePosition])

  // ── click outside ──
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        editorRef.current &&
        !editorRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  useEffect(() => {
    setHighlightedIndex(0)
  }, [results])
  useEffect(() => {
    if (highlightedIndex >= 0 && optionRefs.current[highlightedIndex]) {
      optionRefs.current[highlightedIndex]?.scrollIntoView({ block: 'nearest' })
    }
  }, [highlightedIndex])

  const selectAttraction = useCallback(
    (item: MentionResult) => {
      if (mentionStart < 0) return
      const before = value.slice(0, mentionStart)
      const after = value.slice(mentionStart + 1 + mentionQuery.length)
      const newVal = before + item.name + after
      onChange(newVal)
      onAttractionSelect({ id: item.id, name: item.name })
      setIsOpen(false)
      requestAnimationFrame(() => {
        if (editorRef.current) {
          editorRef.current.focus()
          setCursorOffset(editorRef.current, before.length + item.name.length)
        }
      })
    },
    [mentionStart, mentionQuery, value, onChange, onAttractionSelect]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!isOpen || !results.length) return
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setHighlightedIndex(p => (p < results.length - 1 ? p + 1 : 0))
          break
        case 'ArrowUp':
          e.preventDefault()
          setHighlightedIndex(p => (p > 0 ? p - 1 : results.length - 1))
          break
        case 'Enter':
          if (isComposingRef.current) return
          e.preventDefault()
          if (highlightedIndex >= 0 && highlightedIndex < results.length)
            selectAttraction(results[highlightedIndex])
          break
        case 'Escape':
          e.preventDefault()
          setIsOpen(false)
          break
      }
    },
    [isOpen, results, highlightedIndex, selectAttraction]
  )

  // ── prevent Enter from creating <br>/<div> ──
  const handleKeyDownAll = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' && !isOpen) {
        e.preventDefault()
      }
      handleKeyDown(e)
    },
    [isOpen, handleKeyDown]
  )

  // ── dropdown portal ──
  const dropdown =
    isOpen && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[10010] bg-card border border-border rounded-lg shadow-lg overflow-hidden"
            style={{
              top: dropdownPos.top,
              left: dropdownPos.left,
              width: dropdownPos.width,
              pointerEvents: 'auto',
            }}
            onMouseDown={e => e.preventDefault()}
          >
            <div className="overflow-y-auto max-h-[200px]">
              {loading && !results.length ? (
                <div className="flex items-center justify-center py-3 text-xs text-muted-foreground">
                  <Loader2 size={14} className="animate-spin mr-1.5" />
                  搜尋中...
                </div>
              ) : results.length > 0 ? (
                results.map((item, i) => {
                  const isDisabled = disabledAttractionIds.includes(item.id)
                  return (
                    <button
                      key={item.id}
                      ref={el => {
                        optionRefs.current[i] = el
                      }}
                      type="button"
                      disabled={isDisabled}
                      title={isDisabled ? '此景點已在行程中' : ''}
                      className={cn(
                        'w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 transition-colors',
                        !isDisabled && 'hover:bg-morandi-container/30',
                        highlightedIndex === i && !isDisabled && 'bg-morandi-container/50',
                        isDisabled && 'opacity-50 cursor-not-allowed'
                      )}
                      onClick={() => !isDisabled && selectAttraction(item)}
                    >
                      <MapPin
                        size={12}
                        className={cn(
                          'shrink-0',
                          isDisabled ? 'text-muted-foreground' : 'text-blue-500'
                        )}
                      />
                      <span className="truncate">{item.name}</span>
                      {item.city_name && (
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {item.city_name}
                        </span>
                      )}
                      {isDisabled && (
                        <span className="text-[10px] text-muted-foreground shrink-0">✓ 已排入</span>
                      )}
                    </button>
                  )
                })
              ) : (
                <div className="px-3 py-3 text-center text-xs text-muted-foreground">
                  找不到景點
                </div>
              )}
            </div>
          </div>,
          document.body
        )
      : null

  // ── render ──
  return (
    <div className={cn('relative min-w-0', className)}>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDownAll}
        onCompositionStart={() => {
          isComposingRef.current = true
        }}
        onCompositionEnd={() => {
          isComposingRef.current = false
          handleInput()
        }}
        data-placeholder={placeholder}
        className={cn(
          'w-full rounded-md border border-input bg-card px-3 py-1 whitespace-nowrap overflow-x-auto overflow-y-hidden',
          'focus-visible:outline-none focus-visible:border-morandi-gold transition-colors',
          'empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground',
          className
        )}
      />

      {/* Attraction hover tooltip */}
      {hoveredAttraction && typeof document !== 'undefined' && (
        <AttractionTooltip
          id={hoveredAttraction.id}
          name={hoveredAttraction.name}
          anchor={hoveredAttraction.rect}
        />
      )}

      {dropdown}
    </div>
  )
})
