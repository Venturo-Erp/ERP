/**
 * CoreTableRequestDialog - 從核心表產生需求單
 *
 * 功能：
 * 1. 從 tour_itinerary_items 讀取已報價項目
 * 2. JOIN 供應商資料（restaurants/hotels/attractions）
 * 3. 帶入訂單總人數
 * 4. 產生 PDF（桌數/房間數空白，助理手動填）
 * 5. tour_requests 只存狀態（is_from_core = true）
 */

'use client'
import { COMPANY_NAME, COMPANY_NAME_EN } from '@/lib/tenant'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DIALOG_SIZES,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FileText, Printer, Loader2, X } from 'lucide-react'
import {
  useCoreRequestItems,
  useTotalPax,
  type CoreRequestItem,
} from '../hooks/useCoreRequestItems'
import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores'
import { logger } from '@/lib/utils/logger'
import type { Tour } from '@/stores/types'

// 分類對應的標題
const CATEGORY_LABELS: Record<string, string> = {
  hotel: '住宿',
  restaurant: '餐廳',
  transport: '交通',
  activity: '活動',
  other: '其他',
}

interface CoreTableRequestDialogProps {
  isOpen: boolean
  onClose: () => void
  tour: Tour
  supplierId?: string | null // 可選，如果沒有會用 supplierName 查詢
  supplierName: string
  category: string
}

export function CoreTableRequestDialog({
  isOpen,
  onClose,
  tour,
  supplierId: propSupplierId,
  supplierName,
  category,
}: CoreTableRequestDialogProps) {
  const { user } = useAuthStore()
  const { toast } = useToast()

  const [resolvedSupplierId, setResolvedSupplierId] = useState<string | null>(
    propSupplierId || null
  )
  const [resolvingSupplier, setResolvingSupplier] = useState(false)

  // 如果沒有 supplierId，用 supplierName 查詢
  useEffect(() => {
    if (propSupplierId || !supplierName || !isOpen) {
      setResolvedSupplierId(propSupplierId || null)
      return
    }

    const resolveSupplier = async () => {
      setResolvingSupplier(true)
      try {
        // 用 supplierName 查詢 supplier_id
        const { data, error } = await supabase
          .from('suppliers')
          .select('id')
          .eq('name', supplierName)
          .eq('workspace_id', user?.workspace_id || '')
          .maybeSingle()

        if (error) {
          logger.error('查詢供應商失敗:', error)
          setResolvedSupplierId(null)
          return
        }

        setResolvedSupplierId(data?.id || null)
      } catch (err) {
        logger.error('resolveSupplier 錯誤:', err)
        setResolvedSupplierId(null)
      } finally {
        setResolvingSupplier(false)
      }
    }

    resolveSupplier()
  }, [propSupplierId, supplierName, isOpen, user?.workspace_id])

  // 讀取核心表資料
  const { data: coreItems, isLoading: itemsLoading } = useCoreRequestItems(
    tour?.id || null,
    resolvedSupplierId
  )

  // 讀取總人數
  const { data: totalPax, isLoading: paxLoading } = useTotalPax(tour?.id || null)

  const [printing, setPrinting] = useState(false)

  // 產生 PDF HTML
  const generatePrintHtml = () => {
    if (!coreItems || coreItems.length === 0) {
      return ''
    }

    // 取得供應商資料（從第一個項目）
    const firstItem = coreItems[0]
    const supplierData = firstItem.restaurant || firstItem.hotel || firstItem.attraction || null

    const categoryName = CATEGORY_LABELS[category] || category

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${categoryName}需求單 - ${supplierName}</title>
  <style>
    @media print {
      @page { margin: 1.5cm; }
      body { margin: 0; }
    }
    body {
      font-family: 'Microsoft JhengHei', 'PingFang TC', sans-serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    h1 {
      text-align: center;
      font-size: 24pt;
      margin-bottom: 10px;
      border-bottom: 3px double #333;
      padding-bottom: 10px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }
    .info-section {
      border: 1px solid #ddd;
      padding: 15px;
      border-radius: 5px;
    }
    .info-section h3 {
      margin-top: 0;
      border-bottom: 1px solid #ddd;
      padding-bottom: 5px;
    }
    .info-row {
      display: flex;
      margin-bottom: 5px;
    }
    .info-label {
      font-weight: bold;
      min-width: 80px;
      color: #666;
    }
    .tour-info {
      background: #f5f5f5;
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 20px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th, td {
      border: 1px solid #333;
      padding: 8px;
      text-align: center;
    }
    th {
      background: #f0f0f0;
      font-weight: bold;
    }
    .blank-field {
      border-bottom: 1px solid #333;
      display: inline-block;
      min-width: 80px;
      height: 20px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      font-size: 10pt;
      color: #666;
    }
  </style>
</head>
<body>
  <h1>${categoryName}需求單</h1>
  
  <div class="info-grid">
    <div class="info-section">
      <h3>我方資訊</h3>
      <div class="info-row">
        <span class="info-label">公司：</span>
        <span>${COMPANY_NAME}</span>
      </div>
      <div class="info-row">
        <span class="info-label">負責人：</span>
        <span>${user?.chinese_name || user?.name || ''}</span>
      </div>
    </div>
    
    <div class="info-section">
      <h3>供應商資訊</h3>
      <div class="info-row">
        <span class="info-label">${categoryName}：</span>
        <span>${supplierData?.name || supplierName}</span>
      </div>
      ${
        supplierData?.address
          ? `
      <div class="info-row">
        <span class="info-label">地址：</span>
        <span>${supplierData.address}</span>
      </div>
      `
          : ''
      }
      ${
        supplierData?.phone
          ? `
      <div class="info-row">
        <span class="info-label">電話：</span>
        <span>${supplierData.phone}</span>
      </div>
      `
          : ''
      }
    </div>
  </div>
  
  <div class="tour-info">
    <div class="info-row">
      <span class="info-label">團號：</span>
      <span>${tour.code}</span>
    </div>
    <div class="info-row">
      <span class="info-label">團名：</span>
      <span>${tour.name}</span>
    </div>
    <div class="info-row">
      <span class="info-label">出發日期：</span>
      <span>${tour.departure_date || ''}</span>
    </div>
    <div class="info-row">
      <span class="info-label">總人數：</span>
      <span><strong>${totalPax || 0} 人</strong></span>
    </div>
  </div>
  
  <table>
    <thead>
      <tr>
        <th>日期</th>
        <th>項目</th>
        <th>預算（/人）</th>
        <th>${category === 'restaurant' ? '桌數' : category === 'hotel' ? '房間數' : '數量'}</th>
        <th>備註</th>
      </tr>
    </thead>
    <tbody>
      ${coreItems
        .map(
          item => `
      <tr>
        <td>${(() => {
          // 優先用 service_date，沒有則用 departure_date + day_number 推算
          let dateStr = ''
          if (item.service_date) {
            dateStr = item.service_date
          } else if (tour.departure_date && item.day_number) {
            const d = new Date(tour.departure_date)
            d.setDate(d.getDate() + item.day_number - 1)
            dateStr = d.toISOString().split('T')[0]
          }
          const label = dateStr ? dateStr.replace(/^\d{4}-/, '') : `Day ${item.day_number || '-'}`
          return label + (item.sub_category ? ` ${item.sub_category === 'breakfast' ? '早' : item.sub_category === 'lunch' ? '午' : '晚'}` : '')
        })()}</td>
        <td>${item.title || '-'}</td>
        <td>${item.unit_price ? `NT$ ${item.unit_price.toLocaleString()}` : '-'}</td>
        <td><span class="blank-field"></span></td>
        <td>${item.quote_note || ''}</td>
      </tr>
      `
        )
        .join('')}
    </tbody>
  </table>
  
  <div class="footer">
    <p>列印時間：${new Date().toLocaleString('zh-TW')}</p>
    <p>此需求單由 {COMPANY_NAME} 自動產生</p>
  </div>
</body>
</html>
    `
  }

  // 新增需求單
  const handlePrint = async () => {
    if (!coreItems || coreItems.length === 0) {
      toast({
        title: '無法產生需求單',
        description: '沒有可用的報價項目',
        variant: 'destructive',
      })
      return
    }

    setPrinting(true)

    try {
      // 1. 更新核心表狀態（request_status）
      const coreItemIds = coreItems.map(item => item.id)
      const { error: updateError } = await supabase
        .from('tour_itinerary_items')
        .update({
          request_status: 'sent',
          request_sent_at: new Date().toISOString(),
        })
        .in('id', coreItemIds)

      if (updateError) {
        logger.error('更新核心表狀態失敗:', updateError)
        throw updateError
      }

      // 2. 產生 PDF 並列印
      const printContent = generatePrintHtml()
      const printWindow = window.open('', '_blank', 'width=900,height=700')

      if (!printWindow) {
        toast({
          title: '請允許彈出視窗以進行列印',
          variant: 'destructive',
        })
        return
      }

      printWindow.document.write(printContent)
      printWindow.document.close()

      toast({
        title: '需求單已產生',
        description: '已從報價單自動產生需求單',
      })

      onClose()
    } catch (err) {
      logger.error('產生需求單失敗:', err)
      toast({
        title: '產生失敗',
        description: '請重試或聯繫系統管理員',
        variant: 'destructive',
      })
    } finally {
      setPrinting(false)
    }
  }

  const isLoading = itemsLoading || paxLoading || resolvingSupplier

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent
        level={2}
        className={`${DIALOG_SIZES.lg} max-h-[85vh] overflow-hidden flex flex-col`}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText size={18} className="text-morandi-gold" />
            從報價單產生需求單
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-morandi-gold" />
              <span className="ml-2 text-morandi-secondary">讀取資料中...</span>
            </div>
          ) : !coreItems || coreItems.length === 0 ? (
            <div className="text-center py-8 text-morandi-secondary">
              <p>此供應商沒有已報價的項目</p>
              <p className="text-sm mt-2">請先在報價單填寫價格</p>
            </div>
          ) : (
            <>
              <div className="bg-morandi-container/30 rounded-lg p-4">
                <h3 className="font-medium mb-2">供應商資訊</h3>
                <p className="text-sm text-morandi-secondary">
                  {supplierName} - {CATEGORY_LABELS[category] || category}
                </p>
              </div>

              <div className="bg-morandi-container/30 rounded-lg p-4">
                <h3 className="font-medium mb-2">團體資訊</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-morandi-secondary">團號：</span>
                    <span>{tour.code}</span>
                  </div>
                  <div>
                    <span className="text-morandi-secondary">團名：</span>
                    <span>{tour.name}</span>
                  </div>
                  <div>
                    <span className="text-morandi-secondary">出發日期：</span>
                    <span>{tour.departure_date || '-'}</span>
                  </div>
                  <div>
                    <span className="text-morandi-secondary">總人數：</span>
                    <span className="font-medium">{totalPax || 0} 人</span>
                  </div>
                </div>
              </div>

              <div className="border border-border rounded-lg p-4">
                <h3 className="font-medium mb-2">需求項目（共 {coreItems.length} 項）</h3>
                <div className="space-y-2">
                  {coreItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <span className="text-morandi-secondary">{(() => {
                        if (item.service_date) return item.service_date.replace(/^\d{4}-/, '')
                        if (tour.departure_date && item.day_number) {
                          const d = new Date(tour.departure_date)
                          d.setDate(d.getDate() + item.day_number - 1)
                          return d.toISOString().split('T')[0].replace(/^\d{4}-/, '')
                        }
                        return `Day ${item.day_number || '-'}`
                      })()}</span>
                      <span>{item.title || '-'}</span>
                      <span className="ml-auto text-morandi-primary">
                        NT$ {item.unit_price?.toLocaleString() || '-'}/人
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-status-warning-bg border border-status-warning/30 rounded-lg p-3 text-sm">
                <p className="font-medium text-status-warning mb-1">📝 提示</p>
                <ul className="list-disc list-inside text-status-warning space-y-1">
                  <li>總人數自動帶入（{totalPax || 0} 人）</li>
                  <li>桌數/房間數需助理手動填寫</li>
                  <li>預算來自報價單填寫的金額</li>
                </ul>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={printing}>
            <X className="h-4 w-4 mr-1" />
            取消
          </Button>
          <Button
            onClick={handlePrint}
            disabled={isLoading || !coreItems || coreItems.length === 0 || printing}
          >
            {printing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                產生中...
              </>
            ) : (
              <>
                <Printer className="mr-2 h-4 w-4" />
                新增需求單
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
