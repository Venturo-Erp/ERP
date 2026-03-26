'use client'

import { logger } from '@/lib/utils/logger'
import React, { useMemo, useState, useEffect } from 'react'
import { FileSignature, X, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Tour } from '@/types/tour.types'
import { ContractData } from '@/lib/contract-utils'
import DOMPurify from 'dompurify'
import { alert } from '@/lib/ui/alert-dialog'
import { COMP_CONTRACTS_LABELS } from './constants/labels'

interface ContractViewDialogProps {
  isOpen: boolean
  onClose: () => void
  tour: Tour
}

export function ContractViewDialog({ isOpen, onClose, tour }: ContractViewDialogProps) {
  const [printing, setPrinting] = useState(false)
  const [contractHtml, setContractHtml] = useState<string>('')
  const [loading, setLoading] = useState(true)

  // 解析儲存的合約資料
  const contractData = useMemo<Partial<ContractData>>(() => {
    if (!tour.contract_content) {
      return {}
    }
    try {
      return JSON.parse(tour.contract_content)
    } catch (error) {
      return {}
    }
  }, [tour.contract_content])

  // 載入並渲染完整合約
  useEffect(() => {
    if (!isOpen || !tour.contract_template || !tour.contract_content) {
      return
    }

    const loadContract = async () => {
      try {
        setLoading(true)

        // 讀取合約範本
        const templateMap = {
          domestic: 'domestic.html',
          international: 'international.html',
          individual_international: 'individual_international_full.html',
        }
        const templateFile =
          templateMap[tour.contract_template as keyof typeof templateMap] || 'international.html'
        const response = await fetch(`/contract-templates/${templateFile}`)

        if (!response.ok) {
          throw new Error(COMP_CONTRACTS_LABELS.無法載入合約範本)
        }

        let template = await response.text()

        // 替換所有變數（對插入的值進行 HTML 轉義，防止 XSS）
        Object.entries(contractData).forEach(([key, value]) => {
          const regex = new RegExp(`{{${key}}}`, 'g')
          // 將特殊字符轉義，防止 HTML/JS 注入
          const safeValue = String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;')
          template = template.replace(regex, safeValue)
        })

        // 使用 DOMPurify 清理最終的 HTML，移除任何潛在的惡意腳本
        const sanitizedHtml = DOMPurify.sanitize(template, {
          ALLOWED_TAGS: [
            'html',
            'head',
            'body',
            'style',
            'title',
            'div',
            'span',
            'p',
            'br',
            'hr',
            'h1',
            'h2',
            'h3',
            'h4',
            'h5',
            'h6',
            'table',
            'thead',
            'tbody',
            'tr',
            'th',
            'td',
            'ul',
            'ol',
            'li',
            'strong',
            'em',
            'b',
            'i',
            'u',
            'a',
            'img',
            'header',
            'footer',
            'section',
            'article',
          ],
          ALLOWED_ATTR: [
            'class',
            'id',
            'style',
            'src',
            'alt',
            'href',
            'target',
            'colspan',
            'rowspan',
            'width',
            'height',
          ],
          FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
          FORBID_ATTR: ['onclick', 'onerror', 'onload', 'onmouseover'],
        })

        setContractHtml(sanitizedHtml)
      } catch (error) {
        logger.error(COMP_CONTRACTS_LABELS.載入合約失敗, error)
        setContractHtml(
          COMP_CONTRACTS_LABELS.p_class_text_status_danger_載入合約範本失敗_請稍後再試_p
        )
      } finally {
        setLoading(false)
      }
    }

    loadContract()
  }, [isOpen, tour.contract_template, tour.contract_content, contractData])

  const handlePrint = async () => {
    if (!contractHtml) {
      void alert(COMP_CONTRACTS_LABELS.無合約資料可列印, 'warning')
      return
    }

    try {
      setPrinting(true)

      // 開啟新視窗並列印
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        void alert(COMP_CONTRACTS_LABELS.請允許彈出視窗以進行列印, 'warning')
        return
      }

      // 包裝成完整的可列印 HTML
      const printHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>合約列印</title>
          <style>
            @page {
              size: A4;
              margin: 15mm;
            }
            body {
              font-family: "PingFang TC", "Microsoft JhengHei", "Noto Sans TC", sans-serif;
              font-size: 12pt;
              line-height: 1.6;
              color: #000;
              background: #fff;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            td, th {
              padding: 4px 8px;
              vertical-align: top;
            }
            @media print {
              body { -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          ${contractHtml}
        </body>
        </html>
      `

      printWindow.document.write(printHtml)
      printWindow.document.close()

      // 等待內容載入後列印
      printWindow.onload = () => {
        printWindow.print()
        // 列印後關閉視窗
        printWindow.onafterprint = () => {
          printWindow.close()
        }
      }
    } catch (error) {
      logger.error(COMP_CONTRACTS_LABELS.列印錯誤, error)
      void alert(COMP_CONTRACTS_LABELS.列印合約時發生錯誤_請稍後再試, 'error')
    } finally {
      setPrinting(false)
    }
  }

  if (!tour.contract_content) {
    return (
      <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
        <DialogContent level={2}>
          <DialogHeader>
            <DialogTitle>{COMP_CONTRACTS_LABELS.LABEL_2532}</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-morandi-secondary">{COMP_CONTRACTS_LABELS.SAVING_238}</div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent level={2} className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature size={20} />
            查看合約 - {tour.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto py-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-morandi-secondary">{COMP_CONTRACTS_LABELS.LOADING_2471}</div>
            </div>
          ) : (
            <div
              className="bg-card p-8 shadow-sm border border-border rounded-lg"
              dangerouslySetInnerHTML={{ __html: contractHtml }}
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={printing} className="gap-2">
            <X size={16} />
            {COMP_CONTRACTS_LABELS.CLOSE}
          </Button>
          <Button
            onClick={handlePrint}
            disabled={printing || loading}
            className="bg-morandi-gold hover:bg-morandi-gold-hover gap-2"
          >
            <Printer size={16} />
            {printing ? COMP_CONTRACTS_LABELS.列印中 : COMP_CONTRACTS_LABELS.列印完整合約}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
