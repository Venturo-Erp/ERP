'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { QuickMessages } from './QuickMessages'
import { cn } from '@/lib/utils'
import { COMP_WORKSPACE_LABELS } from '../constants/labels'

interface TravelerMessageInputProps {
  onSend: (message: string) => Promise<{ success: boolean; error?: string }>
  disabled?: boolean
  placeholder?: string
}

export function TravelerMessageInput({
  onSend,
  disabled,
  placeholder = COMP_WORKSPACE_LABELS.輸入訊息給旅伴,
}: TravelerMessageInputProps) {
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)

  const handleSend = async () => {
    if (!message.trim() || isSending) return

    setIsSending(true)
    const result = await onSend(message.trim())
    setIsSending(false)

    if (result.success) {
      setMessage('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="p-3 border-t border-violet-500/30 bg-dark-bg-elevated">
      <div className="flex items-end gap-2">
        {/* 快速訊息按鈕 */}
        <QuickMessages onSend={onSend} disabled={disabled} />

        {/* 訊息輸入框 */}
        <div className="flex-1 relative">
          <Textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isSending}
            className={cn(
              'min-h-[40px] max-h-[120px] resize-none pr-12',
              'border-violet-500/30 focus:border-violet-400 focus:ring-violet-400',
              'bg-dark-bg text-violet-100 placeholder:text-violet-400/60'
            )}
            rows={1}
          />
        </div>

        {/* 發送按鈕 */}
        <Button
          onClick={handleSend}
          disabled={disabled || isSending || !message.trim()}
          className={cn(
            'h-10 w-10 shrink-0',
            'bg-violet-500 hover:bg-violet-600 text-white',
            'disabled:bg-violet-500/30 disabled:text-violet-300/50'
          )}
          size="icon"
          aria-label="Send"
        >
          <Send size={18} />
        </Button>
      </div>

      {/* 提示文字 */}
      <p className="text-xs text-violet-400 mt-1.5 ml-1">{COMP_WORKSPACE_LABELS.SENDING_1544}</p>
    </div>
  )
}
