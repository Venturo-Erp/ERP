'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import Underline from '@tiptap/extension-underline'
import Highlight from '@tiptap/extension-highlight'
import { useEffect, useCallback, useState, useRef, useMemo } from 'react'
import { cn } from '@/lib/utils'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Palette,
  Highlighter,
} from 'lucide-react'
import { UI_LABELS } from './constants/labels'
import { sanitizeHtml } from '@/lib/utils/sanitize'

interface RichTextInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  singleLine?: boolean
}

// 預設顏色選項
const COLORS = [
  { label: '深棕灰', value: '#3a3633' },
  { label: '白色', value: '#FFFFFF' },
  { label: '紅色', value: '#E53935' },
  { label: '橙色', value: '#FB8C00' },
  { label: '黃色', value: '#FDD835' },
  { label: '綠色', value: '#43A047' },
  { label: '藍色', value: '#1E88E5' },
  { label: '紫色', value: '#8E24AA' },
  { label: '粉色', value: '#EC407A' },
  { label: '金色', value: '#C69C6D' },
  { label: '深綠', value: '#2C5F4D' },
  { label: '日本藍', value: '#30abe8' },
]

// 螢光色選項
const HIGHLIGHTS = [
  { label: '黃色', value: '#FFEB3B' },
  { label: '綠色', value: '#C8E6C9' },
  { label: '藍色', value: '#BBDEFB' },
  { label: '粉色', value: '#F8BBD9' },
  { label: '橙色', value: '#FFE0B2' },
]

export function RichTextInput({
  value,
  onChange,
  placeholder,
  className,
  singleLine = true,
}: RichTextInputProps) {
  const [showToolbar, setShowToolbar] = useState(false)
  const [toolbarPos, setToolbarPos] = useState({ top: 0, left: 0 })
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showHighlightPicker, setShowHighlightPicker] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Memoize extensions to prevent recreating on each render
  const extensions = useMemo(
    () => [
      StarterKit.configure({
        // 保留 paragraph（必須），但禁用其他區塊類型
        heading: false,
        bulletList: false,
        orderedList: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        hardBreak: singleLine ? false : undefined,
      }),
      TextStyle,
      Color,
      Underline.configure({
        HTMLAttributes: {
          class: 'underline',
        },
      }),
      Highlight.configure({ multicolor: true }),
    ],
    [singleLine]
  )

  const editor = useEditor({
    immediatelyRender: false, // 避免 SSR hydration 問題
    extensions,
    content: value || '',
    editorProps: {
      attributes: {
        class: cn(
          'focus:outline-none min-h-[2.5rem] px-3 py-2',
          singleLine && 'whitespace-nowrap overflow-x-auto'
        ),
      },
      handleKeyDown: singleLine
        ? (view, event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              return true
            }
            return false
          }
        : undefined,
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      if (html === '<p></p>' || html === '') {
        onChange('')
      } else {
        onChange(html)
      }
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection
      if (from !== to) {
        // 有選取文字，顯示工具列
        const selection = window.getSelection()
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0)
          const rect = range.getBoundingClientRect()
          const containerRect = containerRef.current?.getBoundingClientRect()
          if (containerRect) {
            setToolbarPos({
              top: rect.top - containerRect.top - 45,
              left: rect.left - containerRect.left + rect.width / 2 - 120,
            })
          }
        }
        setShowToolbar(true)
      } else {
        setShowToolbar(false)
        setShowColorPicker(false)
        setShowHighlightPicker(false)
      }
    },
  })

  // 同步外部值變化
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '')
    }
  }, [value, editor])

  const setColor = useCallback(
    (color: string) => {
      editor?.chain().focus().setColor(color).run()
      setShowColorPicker(false)
    },
    [editor]
  )

  const setHighlight = useCallback(
    (color: string) => {
      editor?.chain().focus().toggleHighlight({ color }).run()
      setShowHighlightPicker(false)
    },
    [editor]
  )

  const removeHighlight = useCallback(() => {
    editor?.chain().focus().unsetHighlight().run()
    setShowHighlightPicker(false)
  }, [editor])

  if (!editor) return null

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative border border-input rounded-md bg-card',
        'focus-within:ring-2 focus-within:ring-morandi-gold/20 focus-within:border-morandi-gold',
        className
      )}
    >
      {/* 浮動工具列 */}
      {showToolbar && (
        <div
          className="absolute z-50 flex items-center gap-0.5 bg-card rounded-lg shadow-lg border border-border p-1"
          style={{
            top: Math.max(toolbarPos.top, -45),
            left: Math.max(toolbarPos.left, 0),
          }}
          onMouseDown={e => e.preventDefault()}
        >
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={cn(
              'p-1.5 rounded hover:bg-muted transition-colors',
              editor.isActive('bold') && 'bg-muted'
            )}
            title={UI_LABELS.LABEL_3889}
          >
            <Bold size={16} />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={cn(
              'p-1.5 rounded hover:bg-muted transition-colors',
              editor.isActive('italic') && 'bg-muted'
            )}
            title={UI_LABELS.LABEL_9678}
          >
            <Italic size={16} />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={cn(
              'p-1.5 rounded hover:bg-muted transition-colors',
              editor.isActive('underline') && 'bg-muted'
            )}
            title={UI_LABELS.LABEL_5500}
          >
            <UnderlineIcon size={16} />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={cn(
              'p-1.5 rounded hover:bg-muted transition-colors',
              editor.isActive('strike') && 'bg-muted'
            )}
            title={UI_LABELS.DELETE_5630}
          >
            <Strikethrough size={16} />
          </button>

          <div className="w-px h-5 bg-muted mx-1" />

          {/* 文字顏色 */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowColorPicker(!showColorPicker)
                setShowHighlightPicker(false)
              }}
              className="p-1.5 rounded hover:bg-muted transition-colors"
              title={UI_LABELS.LABEL_4467}
            >
              <Palette size={16} />
            </button>
            {showColorPicker && (
              <div className="absolute left-0 top-full mt-1 grid grid-cols-4 gap-1 p-2 bg-card rounded-lg shadow-lg border border-border z-50 min-w-[140px]">
                {COLORS.map(color => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setColor(color.value)}
                    className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                  />
                ))}
              </div>
            )}
          </div>

          {/* 螢光標記 */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowHighlightPicker(!showHighlightPicker)
                setShowColorPicker(false)
              }}
              className={cn(
                'p-1.5 rounded hover:bg-muted transition-colors',
                editor.isActive('highlight') && 'bg-muted'
              )}
              title={UI_LABELS.LABEL_1434}
            >
              <Highlighter size={16} />
            </button>
            {showHighlightPicker && (
              <div className="absolute left-0 top-full mt-1 flex flex-col gap-1 p-2 bg-card rounded-lg shadow-lg border border-border z-50">
                <div className="grid grid-cols-5 gap-1">
                  {HIGHLIGHTS.map(color => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setHighlight(color.value)}
                      className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
                      style={{ backgroundColor: color.value }}
                      title={color.label}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={removeHighlight}
                  className="text-xs text-morandi-secondary hover:text-morandi-primary mt-1"
                >
                  {UI_LABELS.LABEL_4248}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 編輯區 */}
      <EditorContent editor={editor} />

      {/* Placeholder */}
      {editor.isEmpty && placeholder && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-morandi-muted pointer-events-none">
          {placeholder}
        </div>
      )}
    </div>
  )
}

// 輔助函數：將 HTML 轉為純文字
export function htmlToPlainText(html: string): string {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, '')
}

// 輔助函數：安全渲染 HTML
export function RichTextDisplay({ html, className }: { html: string; className?: string }) {
  if (!html) return null
  return <span className={className} dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />
}
