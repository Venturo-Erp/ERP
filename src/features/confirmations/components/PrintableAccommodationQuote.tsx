'use client'

/**
 * PrintableAccommodationQuote - 住宿需求單列印版（使用 inline style）
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { X, Printer, Plus, Trash2 } from 'lucide-react'
import { useWorkspaceSettings } from '@/hooks/useWorkspaceSettings'
import { COMPANY_NAME, COMPANY_NAME_EN } from '@/lib/tenant'

interface RoomRow {
  id: string
  checkIn: string
  roomType: string
  bedType: string
  clientPrice: string
  netPrice: string
  quantity: number
}

interface PrintableAccommodationQuoteProps {
  open: boolean
  onClose: () => void
  tour: { id: string; code: string; name: string; departure_date?: string } | null
  totalPax: number | null
  accommodations: Array<{
    checkIn: string
    roomType: string
    bedType?: string
    quantity: number
    note?: string
  }>
  supplierName: string
}

export function PrintableAccommodationQuote({
  open,
  onClose,
  tour,
  totalPax,
  accommodations,
  supplierName,
}: PrintableAccommodationQuoteProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [note, setNote] = useState('')
  const [contact, setContact] = useState('')
  const [phone, setPhone] = useState('')
  const [fax, setFax] = useState('')
  const [rows, setRows] = useState<RoomRow[]>([])
  const printContentRef = useRef<HTMLDivElement>(null)
  const ws = useWorkspaceSettings()

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // 初始化：從分房資料帶入，或建立空行
  useEffect(() => {
    if (open && accommodations.length > 0) {
      setRows(accommodations.map((a, i) => ({
        id: `row-${i}`,
        checkIn: a.checkIn || '',
        roomType: a.roomType || '',
        bedType: a.bedType || '',
        clientPrice: '',
        netPrice: '',
        quantity: a.quantity || 1,
      })))
    } else if (open && accommodations.length === 0) {
      // 沒有分房資料，建立一個空行
      setRows([{
        id: `row-${Date.now()}`,
        checkIn: tour?.departure_date || '',
        roomType: '',
        bedType: '',
        clientPrice: '',
        netPrice: '',
        quantity: 1,
      }])
    }
  }, [open, accommodations, tour?.departure_date])

  const addRow = () => {
    setRows(prev => [...prev, {
      id: `row-${Date.now()}`,
      checkIn: tour?.departure_date || '',
      roomType: '',
      bedType: '',
      clientPrice: '',
      netPrice: '',
      quantity: 1,
    }])
  }

  const removeRow = (id: string) => {
    setRows(prev => prev.filter(r => r.id !== id))
  }

  const updateRow = (id: string, field: keyof RoomRow, value: string | number) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  const handlePrint = useCallback(() => {
    if (!printContentRef.current) return

    const originalTitle = document.title
    const printTitle = `${supplierName}-住宿需求單`
    document.title = printTitle

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
        <title>${printTitle}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang TC", "Microsoft JhengHei", sans-serif;
            font-size: 13px;
            line-height: 1.5;
            color: #333;
            background: white;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        </style>
      </head>
      <body>
        ${printContentRef.current.innerHTML}
      </body>
      </html>
    `)
    iframeDoc.close()

    setTimeout(() => {
      iframe.contentWindow?.print()
      setTimeout(() => {
        document.body.removeChild(iframe)
        document.title = originalTitle
      }, 1000)
    }, 100)
  }, [supplierName])

  if (!open || !isMounted) return null

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          maxWidth: '900px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* 頂部按鈕 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px',
            borderBottom: '1px solid #e5e7eb',
            backgroundColor: '#faf8f5',
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#5d5348' }}>
            住宿需求單預覽
          </h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button onClick={onClose} variant="outline" size="sm">
              <X className="h-4 w-4 mr-1" />
              關閉
            </Button>
            <Button
              onClick={handlePrint}
              size="sm"
              className="bg-morandi-gold hover:bg-morandi-gold-hover text-white"
            >
              <Printer className="h-4 w-4 mr-1" />
              列印
            </Button>
          </div>
        </div>

        {/* A4 預覽區 */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '24px',
            backgroundColor: '#f3f4f6',
          }}
        >
          <div
            ref={printContentRef}
            style={{
              width: '210mm',
              minHeight: '297mm',
              padding: '1.5cm',
              backgroundColor: 'white',
              margin: '0 auto',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            }}
          >
            {/* 標題區 */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '20px',
                paddingBottom: '16px',
                borderBottom: '1px solid #a8a29e',
              }}
            >
              <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#5d5348', margin: 0 }}>
                廠商需求單
              </h2>
              <div style={{ textAlign: 'right', fontSize: '13px', color: '#78716c' }}>
                <div style={{ fontWeight: 600 }}>{ws.name || COMPANY_NAME}</div>
                {COMPANY_NAME_EN && <div style={{ fontSize: '11px' }}>{COMPANY_NAME_EN}</div>}
              </div>
            </div>

            {/* 資訊區 */}
            <div
              style={{
                border: '2px solid #a8a29e',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '20px',
                background: 'linear-gradient(to bottom right, #faf8f5, #f5f1ea)',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '70px 1fr 70px 1fr',
                  gap: '10px 16px',
                  alignItems: 'center',
                  fontSize: '13px',
                }}
              >
                {/* Row 1 */}
                <span style={{ fontWeight: 600, color: '#78716c' }}>致：</span>
                <span style={{ padding: '6px 10px', backgroundColor: '#f3f4f6', borderRadius: '4px', border: '1px solid #a8a29e' }}>
                  {supplierName || ''}
                </span>
                <span style={{ fontWeight: 600, color: '#78716c' }}>聯絡人：</span>
                <input
                  type="text"
                  value={contact}
                  onChange={e => setContact(e.target.value)}
                  placeholder="聯絡人"
                  style={{ padding: '6px 10px', backgroundColor: 'white', borderRadius: '4px', border: '1px solid #a8a29e', fontSize: '13px', width: '100%' }}
                />

                {/* Row 2 */}
                <span style={{ fontWeight: 600, color: '#78716c' }}>電話：</span>
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="電話"
                  style={{ padding: '6px 10px', backgroundColor: 'white', borderRadius: '4px', border: '1px solid #a8a29e', fontSize: '13px', width: '100%' }}
                />
                <span style={{ fontWeight: 600, color: '#78716c' }}>傳真：</span>
                <input
                  type="text"
                  value={fax}
                  onChange={e => setFax(e.target.value)}
                  placeholder="傳真"
                  style={{ padding: '6px 10px', backgroundColor: 'white', borderRadius: '4px', border: '1px solid #a8a29e', fontSize: '13px', width: '100%' }}
                />

                {/* Row 3 */}
                <span style={{ fontWeight: 600, color: '#78716c' }}>團名：</span>
                <span style={{ padding: '6px 10px', backgroundColor: '#f3f4f6', borderRadius: '4px', border: '1px solid #a8a29e' }}>
                  {tour?.name || ''}
                </span>
                <span style={{ fontWeight: 600, color: '#78716c' }}>人數：</span>
                <span style={{ padding: '6px 10px', backgroundColor: '#f3f4f6', borderRadius: '4px', border: '1px solid #a8a29e' }}>
                  {totalPax !== null && totalPax !== undefined ? `${totalPax} 人` : ''}
                </span>
              </div>
            </div>

            {/* 住宿表 */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#78716c', margin: 0 }}>
                  住宿表
                </h3>
                <button
                  onClick={addRow}
                  className="no-print"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    fontSize: '13px',
                    color: '#5d5348',
                    backgroundColor: 'white',
                    border: '1px solid #a8a29e',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={14} />
                  新增房型
                </button>
              </div>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '13px',
                }}
              >
                <thead>
                  <tr style={{ background: 'linear-gradient(to right, #d4c5b9, #c9b8a8)' }}>
                    <th style={{ border: '1px solid #a8a29e', padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#5d5348' }}>入住日期</th>
                    <th style={{ border: '1px solid #a8a29e', padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#5d5348' }}>需求房型</th>
                    <th style={{ border: '1px solid #a8a29e', padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#5d5348' }}>床型安排</th>
                    <th style={{ border: '1px solid #a8a29e', padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#5d5348' }}>客報價</th>
                    <th style={{ border: '1px solid #a8a29e', padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#5d5348' }}>NET價</th>
                    <th style={{ border: '1px solid #a8a29e', padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#5d5348', width: '60px' }}>數量</th>
                    <th className="no-print" style={{ border: '1px solid #a8a29e', padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: '#5d5348', width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={row.id} style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#fafaf8' }}>
                      <td style={{ border: '1px solid #a8a29e', padding: '4px' }}>
                        <input
                          type="date"
                          value={row.checkIn}
                          onChange={e => updateRow(row.id, 'checkIn', e.target.value)}
                          style={{ width: '100%', padding: '4px 8px', border: 'none', backgroundColor: 'transparent', fontSize: '13px' }}
                        />
                      </td>
                      <td style={{ border: '1px solid #a8a29e', padding: '4px' }}>
                        <input
                          type="text"
                          value={row.roomType}
                          onChange={e => updateRow(row.id, 'roomType', e.target.value)}
                          placeholder="雙人房"
                          style={{ width: '100%', padding: '4px 8px', border: 'none', backgroundColor: 'transparent', fontSize: '13px' }}
                        />
                      </td>
                      <td style={{ border: '1px solid #a8a29e', padding: '4px' }}>
                        <input
                          type="text"
                          value={row.bedType}
                          onChange={e => updateRow(row.id, 'bedType', e.target.value)}
                          placeholder="一大床"
                          style={{ width: '100%', padding: '4px 8px', border: 'none', backgroundColor: 'transparent', fontSize: '13px' }}
                        />
                      </td>
                      <td style={{ border: '1px solid #a8a29e', padding: '4px' }}>
                        <input
                          type="text"
                          value={row.clientPrice}
                          onChange={e => updateRow(row.id, 'clientPrice', e.target.value)}
                          placeholder=""
                          style={{ width: '100%', padding: '4px 8px', border: 'none', backgroundColor: 'transparent', fontSize: '13px' }}
                        />
                      </td>
                      <td style={{ border: '1px solid #a8a29e', padding: '4px' }}>
                        <input
                          type="text"
                          value={row.netPrice}
                          onChange={e => updateRow(row.id, 'netPrice', e.target.value)}
                          placeholder=""
                          style={{ width: '100%', padding: '4px 8px', border: 'none', backgroundColor: 'transparent', fontSize: '13px' }}
                        />
                      </td>
                      <td style={{ border: '1px solid #a8a29e', padding: '4px' }}>
                        <input
                          type="number"
                          value={row.quantity}
                          onChange={e => updateRow(row.id, 'quantity', parseInt(e.target.value) || 1)}
                          min={1}
                          style={{ width: '100%', padding: '4px 8px', border: 'none', backgroundColor: 'transparent', fontSize: '13px', textAlign: 'center' }}
                        />
                      </td>
                      <td className="no-print" style={{ border: '1px solid #a8a29e', padding: '4px', textAlign: 'center' }}>
                        {rows.length > 1 && (
                          <button
                            onClick={() => removeRow(row.id)}
                            style={{ padding: '4px', color: '#a8a29e', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 備註 */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: 600, color: '#78716c', marginBottom: '8px', fontSize: '13px' }}>
                備註
              </label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="其他說明或備註事項..."
                style={{
                  width: '100%',
                  minHeight: '60px',
                  padding: '8px',
                  border: '1px solid #a8a29e',
                  borderRadius: '4px',
                  resize: 'none',
                  fontSize: '13px',
                }}
              />
            </div>

            {/* 頁尾 */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '24px',
                borderTop: '1px solid #a8a29e',
                paddingTop: '16px',
                marginTop: 'auto',
              }}
            >
              <div style={{ fontSize: '13px' }}>
                <div><span style={{ fontWeight: 500, color: '#78716c' }}>公司名稱：</span>{ws.name || COMPANY_NAME}</div>
                <div><span style={{ fontWeight: 500, color: '#78716c' }}>公司電話：</span>{ws.phone || ''}</div>
                <div><span style={{ fontWeight: 500, color: '#78716c' }}>業務：</span></div>
                <div><span style={{ fontWeight: 500, color: '#78716c' }}>助理：</span></div>
              </div>
              <div style={{ fontSize: '13px' }}>
                <div><span style={{ fontWeight: 500, color: '#78716c' }}>供應商確認：</span></div>
                <div style={{ borderBottom: '1px solid #a8a29e', height: '32px', marginTop: '8px' }}></div>
                <div style={{ fontSize: '11px', color: '#a8a29e', marginTop: '4px' }}>簽名 / 日期</div>
              </div>
            </div>
          </div>
        </div>

        {/* 底部按鈕 */}
        <div
          style={{
            padding: '16px',
            borderTop: '1px solid #e5e7eb',
            backgroundColor: 'white',
            display: 'flex',
            gap: '12px',
          }}
        >
          <button
            onClick={handlePrint}
            style={{
              padding: '10px 20px',
              borderRadius: '9999px',
              border: '1px solid #e5e7eb',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              backgroundColor: 'white',
            }}
          >
            列印
          </button>
          <button
            style={{
              padding: '10px 20px',
              borderRadius: '9999px',
              border: '1px solid #06c755',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              backgroundColor: 'white',
              color: '#06c755',
            }}
          >
            LINE
          </button>
          <button
            style={{
              padding: '10px 20px',
              borderRadius: '9999px',
              border: '1px solid #5d5348',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              backgroundColor: 'white',
              color: '#5d5348',
            }}
          >
            指派員工
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
