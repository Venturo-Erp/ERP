'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import {
  PASSPORT_DELIVERY_OPTIONS,
  PASSPORT_REQUIREMENTS,
  PASSPORT_NOTES,
  TAIWAN_COMPATRIOT_DELIVERY_OPTIONS,
  TAIWAN_COMPATRIOT_REQUIREMENTS,
  TAIWAN_COMPATRIOT_NOTES,
  USA_ESTA_DELIVERY_OPTIONS,
  USA_ESTA_REQUIREMENTS,
  USA_ESTA_NOTES,
  formatCurrency,
  type DeliveryOption,
  type RequirementSection,
} from '../constants/visa-info'
import { VISA_INFO_DIALOG_LABELS as L } from '../constants/labels'

interface VisasInfoDialogProps {
  open: boolean
  onClose: () => void
}

export function VisasInfoDialog({ open, onClose }: VisasInfoDialogProps) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const copyStatusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set())

  useEffect(() => {
    return () => {
      if (copyStatusTimeoutRef.current) {
        clearTimeout(copyStatusTimeoutRef.current)
      }
    }
  }, [])

  // 切換勾選類別
  const toggleSection = (sectionTitle: string) => {
    setSelectedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(sectionTitle)) {
        newSet.delete(sectionTitle)
      } else {
        newSet.add(sectionTitle)
      }
      return newSet
    })
  }

  // 複製已選擇的類別
  const handleCopySelected = useCallback(async () => {
    if (selectedSections.size === 0) {
      setCopyStatus('error')
      return
    }

    try {
      const selectedText = Array.from(selectedSections).join('\n\n')
      let copied = false

      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(selectedText)
        copied = true
      } else if (typeof document !== 'undefined') {
        const textarea = document.createElement('textarea')
        textarea.value = selectedText
        textarea.setAttribute('readonly', '')
        textarea.style.position = 'absolute'
        textarea.style.left = '-9999px'
        document.body.appendChild(textarea)
        textarea.select()
        copied = document.execCommand('copy')
        document.body.removeChild(textarea)
      }

      if (!copied) {
        throw new Error('Clipboard not supported')
      }

      setCopyStatus('success')
    } catch (error) {
      setCopyStatus('error')
    } finally {
      if (copyStatusTimeoutRef.current) {
        clearTimeout(copyStatusTimeoutRef.current)
      }
      copyStatusTimeoutRef.current = setTimeout(() => {
        setCopyStatus('idle')
      }, 2000)
    }
  }, [selectedSections])

  const renderVisaInfoContent = (
    options: DeliveryOption[],
    requirements: RequirementSection[],
    notes: string[]
  ) => (
    <div className="space-y-6">
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="grid grid-cols-[1.5fr_1fr_1fr] bg-morandi-container text-xs font-medium uppercase tracking-wide text-morandi-secondary">
          <div className="px-4 py-3">{L.col_method}</div>
          <div className="px-4 py-3">{L.col_adult}</div>
          <div className="px-4 py-3">{L.col_child}</div>
        </div>
        {options.map(option => (
          <div
            key={option.method}
            className="grid grid-cols-[1.5fr_1fr_1fr] border-t border-border text-sm text-morandi-primary"
          >
            <div className="px-4 py-3 font-medium">{option.method}</div>
            <div className="px-4 py-3">{formatCurrency(option.adult)}</div>
            <div className="px-4 py-3">{formatCurrency(option.child)}</div>
          </div>
        ))}
      </div>

      <div className="space-y-5">
        {requirements.map(section => {
          const sectionText = `－${section.title}${section.fee ? ` ${formatCurrency(section.fee)}` : ''}\n${section.items.map((item, idx) => `${idx + 1}. ${item}`).join('\n')}`

          return (
            <label
              key={section.title}
              className="block space-y-3 hover:bg-morandi-container/10 p-3 rounded cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedSections.has(sectionText)}
                  onChange={() => toggleSection(sectionText)}
                  className="rounded"
                />
                <h3 className="text-sm font-semibold text-morandi-primary flex-1">
                  －{section.title}
                  {section.fee && (
                    <span className="ml-3 text-morandi-gold font-bold">
                      {formatCurrency(section.fee)}
                    </span>
                  )}
                </h3>
              </div>
              <ol className="list-decimal space-y-2 pl-12 text-sm text-morandi-secondary">
                {section.items.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ol>
            </label>
          )
        })}
      </div>

      <div className="rounded-lg bg-morandi-container p-4">
        <ul className="list-disc space-y-2 pl-5 text-sm text-morandi-secondary">
          {notes.map((note, index) => (
            <li key={index}>{note}</li>
          ))}
        </ul>
      </div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={open => !open && onClose()}>
      <DialogContent level={1} className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <DialogTitle>{L.title}</DialogTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={handleCopySelected}
              disabled={selectedSections.size === 0}
              className="flex items-center gap-2"
            >
              <Copy size={16} />
              {L.btn_copy} ({selectedSections.size})
            </Button>
          </div>
        </DialogHeader>
        {copyStatus !== 'idle' && (
          <p
            className={cn(
              'text-xs',
              copyStatus === 'success' ? 'text-morandi-green' : 'text-status-danger'
            )}
          >
            {copyStatus === 'success'
              ? L.copy_success(selectedSections.size)
              : selectedSections.size === 0
                ? L.copy_empty
                : L.copy_failed}
          </p>
        )}
        <Tabs defaultValue="passport" className="mt-4">
          <TabsList className="grid h-12 grid-cols-3 rounded-lg bg-morandi-container text-sm text-morandi-secondary">
            <TabsTrigger value="passport">{L.tab_passport}</TabsTrigger>
            <TabsTrigger value="taiwan">{L.tab_taiwan}</TabsTrigger>
            <TabsTrigger value="usa-esta">{L.tab_usa_esta}</TabsTrigger>
          </TabsList>
          <TabsContent value="passport" className="mt-4">
            {renderVisaInfoContent(
              PASSPORT_DELIVERY_OPTIONS,
              PASSPORT_REQUIREMENTS,
              PASSPORT_NOTES
            )}
          </TabsContent>
          <TabsContent value="taiwan" className="mt-4">
            {renderVisaInfoContent(
              TAIWAN_COMPATRIOT_DELIVERY_OPTIONS,
              TAIWAN_COMPATRIOT_REQUIREMENTS,
              TAIWAN_COMPATRIOT_NOTES
            )}
          </TabsContent>
          <TabsContent value="usa-esta" className="mt-4">
            {renderVisaInfoContent(
              USA_ESTA_DELIVERY_OPTIONS,
              USA_ESTA_REQUIREMENTS,
              USA_ESTA_NOTES
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
