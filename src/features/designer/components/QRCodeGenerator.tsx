'use client'

/**
 * QR Code 生成器
 *
 * 允許用戶輸入 URL 或文字生成 QR Code
 * 並插入到畫布中
 */

import { useState, useCallback } from 'react'
import { logger } from '@/lib/utils/logger'
import QRCode from 'qrcode'
import { QrCode, Link, FileText, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { DESIGNER_LABELS } from './constants/labels'

interface QRCodeGeneratorProps {
  onGenerate: (dataUrl: string) => void
}

// 預設 QR Code 模板
const QR_TEMPLATES = [
  { id: 'website', label: '網站', placeholder: 'https://example.com', icon: Link },
  { id: 'text', label: '文字', placeholder: '輸入任意文字...', icon: FileText },
]

export function QRCodeGenerator({ onGenerate }: QRCodeGeneratorProps) {
  const [content, setContent] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('website')

  // 生成 QR Code 預覽
  const generatePreview = useCallback(async (text: string) => {
    if (!text.trim()) {
      setPreviewUrl(null)
      return
    }

    try {
      const url = await QRCode.toDataURL(text, {
        width: 200,
        margin: 2,
        color: {
          dark: '#3a3633',
          light: '#ffffff',
        },
      })
      setPreviewUrl(url)
    } catch (error) {
      logger.error('Failed to generate QR preview:', error)
      setPreviewUrl(null)
    }
  }, [])

  // 輸入變更時更新預覽
  const handleContentChange = useCallback(
    (value: string) => {
      setContent(value)
      // 延遲生成預覽
      const timer = setTimeout(() => generatePreview(value), 300)
      return () => clearTimeout(timer)
    },
    [generatePreview]
  )

  // 生成並插入 QR Code
  const handleGenerate = useCallback(async () => {
    if (!content.trim()) return

    setIsGenerating(true)
    try {
      const dataUrl = await QRCode.toDataURL(content, {
        width: 300,
        margin: 2,
        color: {
          dark: '#3a3633',
          light: '#ffffff',
        },
      })
      onGenerate(dataUrl)
      setContent('')
      setPreviewUrl(null)
    } catch (error) {
      logger.error('Failed to generate QR code:', error)
    } finally {
      setIsGenerating(false)
    }
  }, [content, onGenerate])

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          <QrCode size={16} className="text-morandi-gold" />
          <span className="text-sm font-medium">QR Code 生成器</span>
        </div>
        <p className="text-[10px] text-morandi-secondary">{DESIGNER_LABELS.GENERATING_239}</p>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-4">
        {/* 類型選擇 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 w-full">
            {QR_TEMPLATES.map(template => (
              <TabsTrigger key={template.id} value={template.id} className="text-xs">
                <template.icon size={12} className="mr-1" />
                {template.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {QR_TEMPLATES.map(template => (
            <TabsContent key={template.id} value={template.id} className="mt-3">
              <Input
                value={content}
                onChange={e => handleContentChange(e.target.value)}
                placeholder={template.placeholder}
                className="text-sm"
              />
            </TabsContent>
          ))}
        </Tabs>

        {/* 預覽 */}
        <div className="flex flex-col items-center">
          <p className="text-[10px] text-morandi-secondary mb-2">{DESIGNER_LABELS.PREVIEW}</p>
          <div
            className={cn(
              'w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center',
              previewUrl ? 'border-morandi-gold bg-card' : 'border-border bg-morandi-container/30'
            )}
          >
            {previewUrl ? (
              <img src={previewUrl} alt="QR Code Preview" className="w-28 h-28" />
            ) : (
              <QrCode size={32} className="text-morandi-muted" />
            )}
          </div>
        </div>

        {/* 生成按鈕 */}
        <Button
          onClick={handleGenerate}
          disabled={!content.trim() || isGenerating}
          className="w-full bg-gradient-to-br from-morandi-gold/40 to-morandi-container/60 text-morandi-primary ring-1 ring-border/50 hover:from-morandi-gold/60 hover:to-morandi-container/80 shadow-md hover:shadow-lg gap-2"
        >
          {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <QrCode size={14} />}
          插入 QR Code
        </Button>
      </div>

      {/* 底部提示 */}
      <div className="p-2 border-t border-border text-[10px] text-morandi-secondary text-center">
        {DESIGNER_LABELS.GENERATING_1586}
      </div>
    </div>
  )
}
