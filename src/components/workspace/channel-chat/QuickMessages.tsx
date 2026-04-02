'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Zap, Clock, UtensilsCrossed, Bus, AlertTriangle, Send, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { COMP_WORKSPACE_LABELS } from '../constants/labels'

interface QuickMessage {
  id: string
  icon: React.ReactNode
  label: string
  template: string
  variables?: Array<{
    key: string
    label: string
    placeholder: string
    required?: boolean
  }>
}

const QUICK_MESSAGES: QuickMessage[] = [
  {
    id: 'meeting',
    icon: <Clock size={16} />,
    label: COMP_WORKSPACE_LABELS.集合通知,
    template: '📍 集合通知\n\n時間：{{time}}\n地點：{{location}}\n\n請準時集合！',
    variables: [
      {
        key: 'time',
        label: COMP_WORKSPACE_LABELS.集合時間,
        placeholder: COMP_WORKSPACE_LABELS.例如_08_30,
        required: true,
      },
      {
        key: 'location',
        label: COMP_WORKSPACE_LABELS.集合地點,
        placeholder: COMP_WORKSPACE_LABELS.例如_飯店大廳,
        required: true,
      },
    ],
  },
  {
    id: 'meal',
    icon: <UtensilsCrossed size={16} />,
    label: COMP_WORKSPACE_LABELS.用餐通知,
    template: '🍽️ 用餐通知\n\n{{message}}\n\n請移動至餐廳用餐',
    variables: [
      {
        key: 'message',
        label: COMP_WORKSPACE_LABELS.餐廳_說明,
        placeholder: COMP_WORKSPACE_LABELS.例如_一樓中餐廳,
        required: false,
      },
    ],
  },
  {
    id: 'bus',
    icon: <Bus size={16} />,
    label: COMP_WORKSPACE_LABELS.上車通知,
    template: '🚌 上車通知\n\n{{message}}\n\n請回到車上，即將出發！',
    variables: [
      {
        key: 'message',
        label: COMP_WORKSPACE_LABELS.說明,
        placeholder: COMP_WORKSPACE_LABELS.例如_請在_5_分鐘內上車,
        required: false,
      },
    ],
  },
  {
    id: 'urgent',
    icon: <AlertTriangle size={16} />,
    label: COMP_WORKSPACE_LABELS.緊急通知,
    template: '⚠️ 緊急通知\n\n{{message}}\n\n請注意查看！',
    variables: [
      {
        key: 'message',
        label: COMP_WORKSPACE_LABELS.緊急訊息,
        placeholder: COMP_WORKSPACE_LABELS.請輸入緊急通知內容,
        required: true,
      },
    ],
  },
]

interface QuickMessagesProps {
  onSend: (message: string) => Promise<{ success: boolean; error?: string }>
  disabled?: boolean
}

export function QuickMessages({ onSend, disabled }: QuickMessagesProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState<QuickMessage | null>(null)
  const [variableValues, setVariableValues] = useState<Record<string, string>>({})
  const [previewContent, setPreviewContent] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sendSuccess, setSendSuccess] = useState(false)

  // 選擇快速訊息
  const handleSelectMessage = (message: QuickMessage) => {
    setSelectedMessage(message)
    setVariableValues({})
    setPreviewContent(message.template.replace(/\{\{[^}]+\}\}/g, ''))
    setIsPopoverOpen(false)
  }

  // 更新變數值並更新預覽
  const handleVariableChange = (key: string, value: string) => {
    const newValues = { ...variableValues, [key]: value }
    setVariableValues(newValues)

    // 更新預覽內容
    if (selectedMessage) {
      let content = selectedMessage.template
      Object.entries(newValues).forEach(([k, v]) => {
        content = content.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v || '')
      })
      // 移除未填寫的變數
      content = content.replace(/\{\{[^}]+\}\}/g, '')
      setPreviewContent(content)
    }
  }

  // 發送訊息
  const handleSend = async () => {
    if (!selectedMessage) return

    // 檢查必填欄位
    const missingRequired = selectedMessage.variables?.filter(
      v => v.required && !variableValues[v.key]?.trim()
    )

    if (missingRequired && missingRequired.length > 0) {
      return
    }

    setIsSending(true)
    setSendSuccess(false)

    const result = await onSend(previewContent.trim())

    setIsSending(false)

    if (result.success) {
      setSendSuccess(true)
      setTimeout(() => {
        setSelectedMessage(null)
        setVariableValues({})
        setPreviewContent('')
        setSendSuccess(false)
      }, 1000)
    }
  }

  // 關閉對話框
  const handleCloseDialog = () => {
    setSelectedMessage(null)
    setVariableValues({})
    setPreviewContent('')
  }

  return (
    <>
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            className="h-8 px-2 text-violet-300 hover:text-violet-200 hover:bg-violet-500/20"
          >
            <Zap size={14} className="mr-1" />
            {COMP_WORKSPACE_LABELS.LABEL_7765}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-1 bg-[#2d2640] border-violet-500/30" align="end">
          <div className="text-xs font-medium text-violet-300 px-2 py-1.5 border-b border-violet-500/30 mb-1">
            {COMP_WORKSPACE_LABELS.SELECT_1304}
          </div>
          {QUICK_MESSAGES.map(msg => (
            <button
              key={msg.id}
              onClick={() => handleSelectMessage(msg)}
              className="w-full flex items-center gap-2 px-2 py-2 text-sm text-left rounded hover:bg-violet-500/20 transition-colors"
            >
              <span className="text-violet-400">{msg.icon}</span>
              <span className="text-violet-200">{msg.label}</span>
            </button>
          ))}
        </PopoverContent>
      </Popover>

      {/* 編輯對話框 */}
      <Dialog open={!!selectedMessage} onOpenChange={open => !open && handleCloseDialog()}>
        <DialogContent level={1} className="sm:max-w-md bg-[#1e1b2e] border-violet-500/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-violet-200">
              {selectedMessage?.icon}
              {selectedMessage?.label}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* 變數輸入 */}
            {selectedMessage?.variables && selectedMessage.variables.length > 0 && (
              <div className="space-y-3">
                {selectedMessage.variables.map(variable => (
                  <div key={variable.key}>
                    <Label className="text-sm text-violet-300">
                      {variable.label}
                      {variable.required && <span className="text-morandi-red ml-1">*</span>}
                    </Label>
                    <Input
                      value={variableValues[variable.key] || ''}
                      onChange={e => handleVariableChange(variable.key, e.target.value)}
                      placeholder={variable.placeholder}
                      className="mt-1 border-violet-500/30 focus:border-violet-400 focus:ring-violet-400 bg-[#2d2640] text-violet-100 placeholder:text-violet-400/60"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* 預覽 */}
            <div>
              <Label className="text-sm text-violet-300">
                {COMP_WORKSPACE_LABELS.PREVIEW_4634}
              </Label>
              <Textarea
                value={previewContent}
                onChange={e => setPreviewContent(e.target.value)}
                className="mt-1 min-h-[120px] border-violet-500/30 focus:border-violet-400 focus:ring-violet-400 bg-[#2d2640] text-violet-100 placeholder:text-violet-400/60"
                placeholder={COMP_WORKSPACE_LABELS.編輯訊息內容}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleCloseDialog}
              className="border-violet-500/30 text-violet-300 hover:bg-violet-500/20"
            >
              {COMP_WORKSPACE_LABELS.CANCEL}
            </Button>
            <Button
              onClick={handleSend}
              disabled={isSending || !previewContent.trim()}
              className={cn(
                'gap-2',
                sendSuccess
                  ? 'bg-morandi-green/100 hover:bg-morandi-green/100'
                  : 'bg-violet-500 hover:bg-violet-600'
              )}
            >
              {isSending ? (
                <>
                  <span className="animate-spin">⏳</span>
                  {COMP_WORKSPACE_LABELS.SENDING_9154}
                </>
              ) : sendSuccess ? (
                <>
                  <Check size={16} />
                  {COMP_WORKSPACE_LABELS.SENDING_3215}
                </>
              ) : (
                <>
                  <Send size={16} />
                  {COMP_WORKSPACE_LABELS.SENDING_5018}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
