'use client'
/**
 * ReceiptPrintDialog
 * 收款收據列印對話框（A4 直向）
 *
 * 兩種模式：
 * - confirmed → 收款收據
 * - refunded  → 退款收據
 */

import { forwardRef, useCallback, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'
import { useWorkspaceSettings, getLogoStyle } from '@/hooks/useWorkspaceSettings'
import type { Receipt } from '@/stores'

interface ReceiptPrintDialogProps {
  receipt: Receipt | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const COLORS = {
  gold: '#B8A99A',
  brown: '#3a3633',
  lightBrown: '#FAF7F2',
  gray: '#4B5563',
  lightGray: '#9CA3AF',
}

// 把阿拉伯數字轉中文大寫（簡化版、含元 / 整 / 點等收據常見格式）
function numberToChinese(num: number): string {
  if (!num || isNaN(num)) return '零元整'
  const digits = ['零', '壹', '貳', '參', '肆', '伍', '陸', '柒', '捌', '玖']
  const units = ['', '拾', '佰', '仟']
  const bigUnits = ['', '萬', '億', '兆']
  const intPart = Math.floor(Math.abs(num))
  if (intPart === 0) return '零元整'

  const str = String(intPart)
  let result = ''
  let zeroFlag = false
  const len = str.length

  for (let i = 0; i < len; i++) {
    const digit = Number(str[i])
    const posFromRight = len - 1 - i
    const unitPos = posFromRight % 4
    const bigPos = Math.floor(posFromRight / 4)

    if (digit === 0) {
      zeroFlag = true
    } else {
      if (zeroFlag) {
        result += '零'
        zeroFlag = false
      }
      result += digits[digit] + units[unitPos]
    }

    // 每滿 4 位、加大單位（萬 / 億 / 兆）
    if (unitPos === 0 && bigPos > 0) {
      // 該段非全 0 才加
      const segStart = len - (bigPos + 1) * 4
      const segEnd = len - bigPos * 4
      const seg = str.slice(Math.max(0, segStart), segEnd)
      if (Number(seg) !== 0) {
        result += bigUnits[bigPos]
      }
      zeroFlag = false
    }
  }

  return result + '元整'
}

interface PreviewProps {
  receipt: Receipt
  workspace: ReturnType<typeof useWorkspaceSettings>
}

const ReceiptPreview = forwardRef<HTMLDivElement, PreviewProps>(function ReceiptPreview(
  { receipt, workspace },
  ref
) {
  const isRefund = receipt.status === 'refunded'
  const amount = isRefund
    ? Number(receipt.refund_amount) || 0
    : Number(receipt.actual_amount) || Number(receipt.receipt_amount) || 0
  const date = isRefund
    ? (receipt.refunded_at || '').slice(0, 10)
    : receipt.receipt_date || receipt.payment_date

  const paymentMethodLabel: Record<string, string> = {
    cash: '現金',
    transfer: '匯款',
    credit_card: '信用卡',
    check: '支票',
    linkpay: 'LinkPay',
  }
  const methodName =
    receipt.payment_methods?.name ||
    paymentMethodLabel[receipt.payment_method] ||
    receipt.payment_method ||
    '-'

  return (
    <div
      ref={ref}
      style={{
        padding: '20mm 18mm',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "PingFang TC", "Microsoft JhengHei", sans-serif',
        color: COLORS.brown,
        fontSize: '13px',
        lineHeight: 1.6,
      }}
    >
      {/* 標題列 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          borderBottom: `2px solid ${COLORS.gold}`,
          paddingBottom: '12px',
          marginBottom: '20px',
        }}
      >
        <div>
          {workspace.logo_url && (
            <img
              src={workspace.logo_url}
              alt="logo"
              style={getLogoStyle('print')}
            />
          )}
          <div style={{ marginTop: '6px', fontSize: '14px', fontWeight: 600 }}>
            {workspace.legal_name || workspace.name}
          </div>
          {workspace.tax_id && (
            <div style={{ fontSize: '11px', color: COLORS.gray }}>
              統一編號：{workspace.tax_id}
            </div>
          )}
          {workspace.address && (
            <div style={{ fontSize: '11px', color: COLORS.gray }}>{workspace.address}</div>
          )}
          {workspace.phone && (
            <div style={{ fontSize: '11px', color: COLORS.gray }}>電話：{workspace.phone}</div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontSize: '28px',
              fontWeight: 700,
              letterSpacing: '8px',
              color: isRefund ? '#B84C4C' : COLORS.brown,
            }}
          >
            {isRefund ? '退款收據' : '收 據'}
          </div>
          <div style={{ fontSize: '11px', color: COLORS.gray, marginTop: '4px' }}>
            編號：{receipt.receipt_number}
          </div>
          <div style={{ fontSize: '11px', color: COLORS.gray }}>日期：{date || '-'}</div>
        </div>
      </div>

      {/* 客戶 */}
      <div
        style={{
          marginBottom: '14px',
          padding: '8px 12px',
          background: COLORS.lightBrown,
          borderLeft: `3px solid ${COLORS.gold}`,
        }}
      >
        <span style={{ color: COLORS.gray, marginRight: '12px' }}>受款人 / 付款人：</span>
        <span style={{ fontWeight: 600 }}>{receipt.customer_name || '-'}</span>
      </div>

      {/* 收款明細 */}
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginBottom: '20px',
          border: `1px solid ${COLORS.lightGray}`,
        }}
      >
        <thead>
          <tr style={{ background: COLORS.lightBrown }}>
            <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${COLORS.lightGray}` }}>
              項目
            </th>
            <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${COLORS.lightGray}` }}>
              說明
            </th>
            <th style={{ padding: '10px', textAlign: 'right', borderBottom: `1px solid ${COLORS.lightGray}` }}>
              金額
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding: '10px', borderBottom: `1px solid ${COLORS.lightGray}` }}>
              {isRefund ? '退款' : '團費收款'}
            </td>
            <td style={{ padding: '10px', borderBottom: `1px solid ${COLORS.lightGray}` }}>
              {receipt.tour_name || receipt.order_number || '-'}
              {isRefund && receipt.refund_notes && (
                <div style={{ fontSize: '11px', color: COLORS.gray, marginTop: '4px' }}>
                  {receipt.refund_notes}
                </div>
              )}
            </td>
            <td style={{ padding: '10px', textAlign: 'right', fontFamily: 'monospace', borderBottom: `1px solid ${COLORS.lightGray}` }}>
              ${amount.toLocaleString()}
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr style={{ background: COLORS.lightBrown }}>
            <td colSpan={2} style={{ padding: '10px', textAlign: 'right', fontWeight: 600 }}>
              合計
            </td>
            <td style={{ padding: '10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, fontSize: '15px' }}>
              ${amount.toLocaleString()}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* 大寫金額 + 收款方式 */}
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <span style={{ color: COLORS.gray }}>新台幣（大寫）：</span>
          <span style={{ fontWeight: 600, fontSize: '14px' }}>{numberToChinese(amount)}</span>
        </div>
        <div>
          <span style={{ color: COLORS.gray }}>{isRefund ? '退款方式' : '收款方式'}：</span>
          <span>{methodName}</span>
        </div>
      </div>

      {/* 收款帳戶（如果有 transfer） */}
      {receipt.receipt_account && (
        <div style={{ marginBottom: '16px', fontSize: '12px', color: COLORS.gray }}>
          {isRefund ? '退款' : '入帳'}帳戶：{receipt.receipt_account}
        </div>
      )}

      {/* 印章 + 簽名區 */}
      <div
        style={{
          marginTop: '40px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
        }}
      >
        <div style={{ width: '40%' }}>
          <div style={{ borderBottom: `1px solid ${COLORS.gray}`, height: '36px' }} />
          <div style={{ fontSize: '11px', color: COLORS.gray, marginTop: '4px' }}>經手人</div>
        </div>
        <div
          style={{
            width: '40%',
            position: 'relative',
            textAlign: 'center',
            minHeight: '80px',
          }}
        >
          {workspace.invoice_seal_image_url && (
            <img
              src={workspace.invoice_seal_image_url}
              alt="seal"
              style={{
                maxWidth: '110px',
                maxHeight: '110px',
                opacity: 0.85,
                transform: 'rotate(-6deg)',
              }}
            />
          )}
          <div
            style={{
              borderBottom: `1px solid ${COLORS.gray}`,
              marginTop: '8px',
            }}
          />
          <div style={{ fontSize: '11px', color: COLORS.gray, marginTop: '4px' }}>本公司印鑑</div>
        </div>
      </div>

      {/* 備註 */}
      {receipt.notes && !isRefund && (
        <div style={{ marginTop: '24px', fontSize: '11px', color: COLORS.gray }}>
          備註：{receipt.notes}
        </div>
      )}
    </div>
  )
})

export function ReceiptPrintDialog({ receipt, open, onOpenChange }: ReceiptPrintDialogProps) {
  const printRef = useRef<HTMLDivElement>(null)
  const workspace = useWorkspaceSettings()

  const handlePrint = useCallback(() => {
    if (!printRef.current) return

    const iframe = document.createElement('iframe')
    iframe.style.position = 'absolute'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = 'none'
    iframe.style.left = '-9999px'
    document.body.appendChild(iframe)

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
    if (!iframeDoc) {
      document.body.removeChild(iframe)
      return
    }

    iframeDoc.open()
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>收據 - ${receipt?.receipt_number || ''}</title>
        <style>
          @page { size: A4 portrait; margin: 0; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: white; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        </style>
      </head>
      <body>${printRef.current.innerHTML}</body>
      </html>
    `)
    iframeDoc.close()

    setTimeout(() => {
      iframe.contentWindow?.print()
      setTimeout(() => document.body.removeChild(iframe), 1000)
    }, 100)
  }, [receipt?.receipt_number])

  if (!receipt) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        level={1}
        className="w-[95vw] max-w-[900px] h-[90vh] overflow-hidden flex flex-col p-0"
      >
        <DialogHeader className="flex-shrink-0 px-6 py-4 border-b bg-morandi-background">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">
              {receipt.status === 'refunded' ? '退款收據' : '收款收據'} — {receipt.receipt_number}
            </DialogTitle>
            <Button variant="soft-gold" size="sm" onClick={handlePrint} className="gap-2">
              <Printer size={16} />
              列印
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto bg-morandi-container p-4 flex items-start justify-center">
          <div
            className="shadow-lg bg-white"
            style={{ width: '210mm', minHeight: '297mm', maxWidth: '100%' }}
          >
            <ReceiptPreview ref={printRef} receipt={receipt} workspace={workspace} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
