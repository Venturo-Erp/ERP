'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileSpreadsheet, FileText } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { OFFICE_LABELS } from '../constants/labels'

type DocumentType = 'spreadsheet' | 'document' | 'slides'

interface DocumentTypeOption {
  type: DocumentType
  label: string
  description: string
  icon: React.ElementType
  color: string
}

const documentTypes: DocumentTypeOption[] = [
  {
    type: 'spreadsheet',
    label: OFFICE_LABELS.試算表,
    description: OFFICE_LABELS.類似_Excel_適合數據計算_表格整理,
    icon: FileSpreadsheet,
    color: 'text-morandi-green bg-morandi-green/10 hover:bg-morandi-green/10',
  },
  {
    type: 'document',
    label: OFFICE_LABELS.文件,
    description: OFFICE_LABELS.類似_Word_適合撰寫報告_合約,
    icon: FileText,
    color: 'text-status-info bg-status-info-bg hover:bg-status-info-bg',
  },
]

interface NewDocumentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewDocumentDialog({ open, onOpenChange }: NewDocumentDialogProps) {
  const router = useRouter()
  const [docName, setDocName] = useState('')
  const [selectedType, setSelectedType] = useState<DocumentType | null>(null)

  const handleCreate = () => {
    if (!selectedType) return

    const name = docName.trim() || OFFICE_LABELS.未命名文件
    router.push(`/office/editor?name=${encodeURIComponent(name)}&type=${selectedType}`)
    onOpenChange(false)
    setDocName('')
    setSelectedType(null)
  }

  const handleClose = () => {
    onOpenChange(false)
    setDocName('')
    setSelectedType(null)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent level={1} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{OFFICE_LABELS.ADD_4696}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 文件名稱 */}
          <div>
            <label className="text-sm font-medium text-morandi-primary mb-1.5 block">
              {OFFICE_LABELS.LABEL_7261}
            </label>
            <input
              type="text"
              value={docName}
              onChange={e => setDocName(e.target.value)}
              placeholder={OFFICE_LABELS.未命名文件}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-morandi-gold/50"
            />
          </div>

          {/* 文件類型選擇 */}
          <div>
            <label className="text-sm font-medium text-morandi-primary mb-2 block">
              {OFFICE_LABELS.SELECT_3424}
            </label>
            <div className="space-y-2">
              {documentTypes.map(option => (
                <button
                  key={option.type}
                  onClick={() => setSelectedType(option.type)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                    selectedType === option.type
                      ? 'border-morandi-gold bg-morandi-gold/5'
                      : 'border-transparent ' + option.color
                  }`}
                >
                  <div className={`p-2 rounded-lg ${option.color.split(' ')[1]}`}>
                    <option.icon className={`w-5 h-5 ${option.color.split(' ')[0]}`} />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-morandi-primary">{option.label}</div>
                    <div className="text-xs text-morandi-secondary">{option.description}</div>
                  </div>
                  {selectedType === option.type && (
                    <div className="ml-auto w-5 h-5 rounded-full bg-morandi-gold flex items-center justify-center">
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 按鈕 */}
        <div className="flex justify-end gap-2">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-morandi-secondary hover:text-morandi-primary transition-colors"
          >
            {OFFICE_LABELS.CANCEL}
          </button>
          <button
            onClick={handleCreate}
            disabled={!selectedType}
            className="px-4 py-2 bg-morandi-gold hover:bg-morandi-gold-hover disabled:bg-morandi-muted text-white rounded-lg text-sm font-medium transition-colors"
          >
            {OFFICE_LABELS.CREATE}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
