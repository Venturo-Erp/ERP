'use client'

import { useEffect, useRef, useState } from 'react'
import { Shield, Upload, RefreshCw, Check, Key } from 'lucide-react'
import jsQR from 'jsqr'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface CurrentResponse {
  configured: boolean
  code?: string
  remaining?: number
  accountName?: string | null
}

type ViewState = 'idle' | 'setup' | 'active' | 'expired'

export function AmadeusTotpWidget() {
  // 零載入：不查 API，直接進 idle 狀態（按按鈕才知道有沒有設定）
  const [view, setView] = useState<ViewState>('idle')
  const [code, setCode] = useState<string>('')
  const [remaining, setRemaining] = useState<number>(0)
  const [accountName, setAccountName] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string>('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const tickTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (tickTimerRef.current) clearInterval(tickTimerRef.current)
    }
  }, [])

  const generateCode = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/amadeus-totp/current')
      if (!res.ok) throw new Error('產生失敗')
      const data: CurrentResponse = await res.json()
      if (!data.configured || !data.code) {
        toast.info('請先上傳 Amadeus QR code')
        setView('setup')
        return
      }
      setCode(data.code)
      setRemaining(data.remaining || 30)
      setAccountName(data.accountName || '')
      setCopied(false)
      setView('active')
    } catch {
      toast.error('產生驗證碼失敗')
    } finally {
      setGenerating(false)
    }
  }

  useEffect(() => {
    if (view !== 'active') {
      if (tickTimerRef.current) clearInterval(tickTimerRef.current)
      return
    }
    if (tickTimerRef.current) clearInterval(tickTimerRef.current)
    tickTimerRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          setView('expired')
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (tickTimerRef.current) clearInterval(tickTimerRef.current)
    }
  }, [view])

  const handleCopy = async () => {
    if (view !== 'active' || !code) return
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error('複製失敗')
    }
  }

  const handleReset = async () => {
    if (!confirm('確定要清除目前的 Amadeus 驗證設定？')) return
    try {
      const res = await fetch('/api/amadeus-totp', { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('已清除，請重新上傳 QR code')
      setView('setup')
      setCode('')
      setAccountName('')
    } catch {
      toast.error('清除失敗')
    }
  }

  const handleFile = async (file: File) => {
    setErrorMsg('')
    setUploading(true)
    try {
      const parsed = await parseQrFile(file)
      const res = await fetch('/api/amadeus-totp/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: parsed.secret, accountName: parsed.accountName }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error || '設定失敗')
        return
      }
      toast.success('Amadeus 驗證設定完成')
      setAccountName(parsed.accountName || '')
      setView('idle')
    } catch (err) {
      const msg = err instanceof Error ? err.message : '無法解析 QR code'
      setErrorMsg(msg)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="h-full">
      <div className="h-full rounded-2xl border border-border/70 shadow-lg backdrop-blur-md transition-all duration-300 hover:shadow-lg hover:border-border/80 bg-gradient-to-br from-muted via-card to-morandi-container/30">
        <div className="p-5 space-y-4 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'rounded-full p-2.5 text-white shadow-lg shadow-black/10',
                'bg-gradient-to-br from-morandi-blue/80 to-morandi-blue',
                'ring-2 ring-border/50 ring-offset-1 ring-offset-background/20'
              )}
            >
              <Shield className="w-5 h-5 drop-shadow-sm" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-morandi-primary leading-tight tracking-wide">
                Amadeus 驗證碼
              </p>
              <p className="text-xs text-morandi-secondary/90 mt-1 truncate">
                {accountName && (view === 'active' || view === 'expired')
                  ? accountName
                  : 'Selling Platform 2FA'}
              </p>
            </div>
          </div>

          {/* 內容 */}
          <div className="rounded-xl bg-card/70 p-4 shadow-md border border-border/40 flex-1 flex items-center justify-center">
            {view === 'setup' && (
              <SetupPanel
                dragOver={dragOver}
                setDragOver={setDragOver}
                uploading={uploading}
                errorMsg={errorMsg}
                onFile={handleFile}
                onClick={() => fileInputRef.current?.click()}
              />
            )}

            {view === 'idle' && (
              <button
                onClick={generateCode}
                disabled={generating}
                className="group w-full text-center rounded-xl p-2 hover:bg-morandi-blue/5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-default"
              >
                <Key className="w-8 h-8 mx-auto text-morandi-muted/60 mb-2 group-hover:text-morandi-blue transition-colors" />
                <p className="text-xs text-morandi-secondary group-hover:text-morandi-blue transition-colors">
                  {generating ? '產生中…' : '點擊產生驗證碼'}
                </p>
              </button>
            )}

            {view === 'active' && (
              <button
                onClick={handleCopy}
                className="group w-full rounded-lg transition-all duration-200 hover:bg-morandi-blue/10 cursor-pointer px-2 py-1"
                title="點擊複製"
              >
                <div className="text-4xl font-mono font-bold text-morandi-blue tracking-[0.3em] tabular-nums select-none">
                  {code.slice(0, 3)} {code.slice(3)}
                </div>
                <div className="mt-3 h-1 rounded-full bg-border/40 overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-1000 ease-linear',
                      remaining <= 5 ? 'bg-status-danger' : 'bg-morandi-blue'
                    )}
                    style={{ width: `${(remaining / 30) * 100}%` }}
                  />
                </div>
                <div className="h-4 mt-2 text-xs flex items-center justify-center gap-1">
                  {copied ? (
                    <span className="text-morandi-green flex items-center gap-1">
                      <Check size={12} /> 已複製
                    </span>
                  ) : (
                    <span className="text-morandi-muted">點擊數字複製 · {remaining}s</span>
                  )}
                </div>
              </button>
            )}

            {view === 'expired' && (
              <button
                onClick={generateCode}
                disabled={generating}
                className="group w-full rounded-lg transition-all duration-200 hover:bg-morandi-blue/5 cursor-pointer disabled:opacity-50 px-2 py-1"
              >
                <div className="text-4xl font-mono font-bold text-morandi-muted/40 tracking-[0.3em] tabular-nums select-none">
                  {code.slice(0, 3)} {code.slice(3)}
                </div>
                <div className="mt-3 h-1 rounded-full bg-border/40 overflow-hidden" />
                <div className="h-4 mt-2 text-xs flex items-center justify-center">
                  <span className="text-morandi-muted group-hover:text-morandi-blue transition-colors">
                    {generating ? '產生中…' : '已過期 · 點擊重新產生'}
                  </span>
                </div>
              </button>
            )}
          </div>

          {/* 底部 */}
          <div className="flex gap-3 flex-shrink-0">
            {view === 'setup' && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="w-4 h-4 mr-1" />
                {uploading ? '解析中…' : '上傳 QR code'}
              </Button>
            )}
            {(view === 'idle' || view === 'expired') && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 rounded-xl text-morandi-muted hover:text-status-danger"
                onClick={handleReset}
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                重新設定
              </Button>
            )}
            {view === 'active' && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={handleCopy}
              >
                <Check className="w-4 h-4 mr-1" />
                複製驗證碼
              </Button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0]
              if (f) handleFile(f)
              e.target.value = ''
            }}
          />
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Setup Panel
// ============================================================================

interface SetupPanelProps {
  dragOver: boolean
  setDragOver: (v: boolean) => void
  uploading: boolean
  errorMsg: string
  onFile: (file: File) => void
  onClick: () => void
}

function SetupPanel({ dragOver, setDragOver, uploading, errorMsg, onFile, onClick }: SetupPanelProps) {
  return (
    <div className="text-center w-full">
      <div
        onClick={onClick}
        onDragOver={e => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault()
          setDragOver(false)
          const f = e.dataTransfer.files[0]
          if (f) onFile(f)
        }}
        className={cn(
          'rounded-xl border-2 border-dashed py-4 px-3 cursor-pointer transition-all',
          dragOver
            ? 'border-morandi-blue bg-morandi-blue/10'
            : 'border-border/60 hover:border-morandi-blue/60 hover:bg-morandi-blue/5',
          uploading && 'opacity-50 pointer-events-none'
        )}
      >
        <Upload className="w-6 h-6 mx-auto text-morandi-muted mb-1" />
        <p className="text-xs text-morandi-secondary">
          拖入或點擊上傳 QR code
        </p>
        <p className="text-[10px] text-morandi-muted mt-1">
          Google Authenticator 匯出截圖
        </p>
      </div>
      {errorMsg && (
        <p className="text-[11px] text-status-danger mt-2">{errorMsg}</p>
      )}
    </div>
  )
}

// ============================================================================
// QR parsing (otpauth-migration protobuf + otpauth URI)
// ============================================================================

interface ParsedQr {
  secret: string
  accountName?: string
}

async function parseQrFile(file: File): Promise<ParsedQr> {
  const dataUrl = await readFileAsDataUrl(file)
  const img = await loadImage(dataUrl)

  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('無法解析圖片')
  ctx.drawImage(img, 0, 0)

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const qr = jsQR(imageData.data, imageData.width, imageData.height)
  if (!qr) throw new Error('找不到 QR code，請確認截圖清晰')

  return parseOtpUri(qr.data)
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target?.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function parseOtpUri(uri: string): ParsedQr {
  const migMatch = uri.match(/otpauth-migration:\/\/offline\?data=(.+)/)
  if (migMatch) {
    const raw = atob(decodeURIComponent(migMatch[1]))
    const bytes = new Uint8Array(raw.length)
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
    const result = parseMigrationPayload(bytes)
    if (!result) throw new Error('QR 內容解析失敗')
    return result
  }

  const otpMatch = uri.match(/otpauth:\/\/totp\/(.+?)\?(.+)/)
  if (otpMatch) {
    const label = decodeURIComponent(otpMatch[1])
    const params = new URLSearchParams(otpMatch[2])
    const secret = params.get('secret')
    if (!secret) throw new Error('QR 缺少 secret')
    return { secret, accountName: label }
  }

  throw new Error('QR 格式不支援（請用 Google Authenticator 匯出）')
}

function parseMigrationPayload(data: Uint8Array): ParsedQr | null {
  let i = 0
  while (i < data.length) {
    const tag = data[i++]
    const fieldNum = tag >> 3
    const wireType = tag & 0x07

    if (wireType === 2) {
      const { value, next } = readLengthDelimited(data, i)
      i = next
      if (fieldNum === 1) {
        const result = parseOtpParams(value)
        if (result) return result
      }
    } else if (wireType === 0) {
      while (data[i] & 0x80) i++
      i++
    } else {
      break
    }
  }
  return null
}

function parseOtpParams(data: Uint8Array): ParsedQr | null {
  let secret: string | null = null
  let name: string | null = null
  let i = 0

  while (i < data.length) {
    const tag = data[i++]
    const fieldNum = tag >> 3
    const wireType = tag & 0x07

    if (wireType === 2) {
      const { value, next } = readLengthDelimited(data, i)
      i = next
      if (fieldNum === 1) {
        secret = bytesToBase32(value)
      } else if (fieldNum === 2) {
        name = new TextDecoder().decode(value)
      }
    } else if (wireType === 0) {
      while (data[i] & 0x80) i++
      i++
    } else {
      break
    }
  }

  if (secret) return { secret, accountName: name || undefined }
  return null
}

function readLengthDelimited(data: Uint8Array, start: number): { value: Uint8Array; next: number } {
  let len = 0
  let shift = 0
  let b: number
  let i = start
  do {
    b = data[i++]
    len |= (b & 0x7f) << shift
    shift += 7
  } while (b & 0x80)
  return { value: data.slice(i, i + len), next: i + len }
}

function bytesToBase32(bytes: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = ''
  for (const byte of bytes) bits += byte.toString(2).padStart(8, '0')
  let out = ''
  for (let j = 0; j + 5 <= bits.length; j += 5) {
    out += alphabet[parseInt(bits.slice(j, j + 5), 2)]
  }
  return out
}
