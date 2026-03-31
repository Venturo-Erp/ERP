'use client'
import { COMPANY_NAME, COMPANY_NAME_EN } from '@/lib/tenant'
/**
 * TourRequestFormDialog - 正式需求單
 *
 * 功能：
 * 1. 顯示單一供應商的需求明細
 * 2. 可編輯項目
 * 3. 開新視窗列印（避免 Dialog z-index 問題）
 */

import { TOUR_REQUEST_FORM_LABELS as PROPOSAL_FORM_LABELS } from '../constants/labels'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DIALOG_SIZES,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Printer, FileText, Plus, Trash2, Loader2, Receipt, Send, Building2 } from 'lucide-react'
import { SupplierSearchInput, type Supplier as SupplierData } from './SupplierSearchInput'
import { usePrintLogo } from '@/features/quotes/components/printable/shared/usePrintLogo'
import { useCompanyInfo } from '@/hooks/useCompanyInfo'
import { supabase } from '@/lib/supabase/client'
import { dynamicFrom } from '@/lib/supabase/typed-client'
import { useAuthStore, useEmployeeStore } from '@/stores'
import { useToast } from '@/components/ui/use-toast'
import { logger } from '@/lib/utils/logger'
import type { Tour } from '@/stores/types'
import type { Database } from '@/lib/supabase/types'
import {
  ADD_MANUAL_REQUEST_DIALOG_LABELS,
  PACKAGE_LIST_PANEL_LABELS,
  TOUR_REQUEST_FORM_DIALOG_LABELS,
} from '../constants/labels'
import { formatDateTW } from '@/lib/utils/format-date'

type Workspace = Database['public']['Tables']['workspaces']['Row']

// 分類對應表（TourRequest category → supplier_type_code）
const CATEGORY_TO_SUPPLIER_TYPE: Record<string, string> = {
  hotel: 'hotel',
  restaurant: 'restaurant',
  transport: 'transport',
  activity: 'attraction', // 注意：不同名稱
  other: 'other',
}

// 需求項目類型
interface RequestItem {
  id: string
  date: string
  title: string // 餐別/房型/項目
  quantity: number
  unitPrice: number
  note: string
}

// 分類對應的欄位標題
const CATEGORY_COLUMNS: Record<
  string,
  { dateLabel: string; titleLabel: string; qtyLabel: string }
> = {
  hotel: {
    dateLabel: TOUR_REQUEST_FORM_DIALOG_LABELS.日期,
    titleLabel: TOUR_REQUEST_FORM_DIALOG_LABELS.房型,
    qtyLabel: ADD_MANUAL_REQUEST_DIALOG_LABELS.間數,
  },
  restaurant: {
    dateLabel: TOUR_REQUEST_FORM_DIALOG_LABELS.日期,
    titleLabel: TOUR_REQUEST_FORM_DIALOG_LABELS.餐別,
    qtyLabel: ADD_MANUAL_REQUEST_DIALOG_LABELS.人數,
  },
  transport: {
    dateLabel: TOUR_REQUEST_FORM_DIALOG_LABELS.日期,
    titleLabel: TOUR_REQUEST_FORM_DIALOG_LABELS.路線_車型,
    qtyLabel: ADD_MANUAL_REQUEST_DIALOG_LABELS.台數,
  },
  activity: {
    dateLabel: TOUR_REQUEST_FORM_DIALOG_LABELS.日期,
    titleLabel: TOUR_REQUEST_FORM_DIALOG_LABELS.項目,
    qtyLabel: TOUR_REQUEST_FORM_DIALOG_LABELS.人數,
  },
  other: {
    dateLabel: TOUR_REQUEST_FORM_DIALOG_LABELS.日期,
    titleLabel: TOUR_REQUEST_FORM_DIALOG_LABELS.項目,
    qtyLabel: ADD_MANUAL_REQUEST_DIALOG_LABELS.數量,
  },
}

// 分類中文名
const CATEGORY_NAMES: Record<string, string> = {
  hotel: PACKAGE_LIST_PANEL_LABELS.住宿,
  restaurant: PACKAGE_LIST_PANEL_LABELS.餐飲,
  transport: PACKAGE_LIST_PANEL_LABELS.交通,
  activity: TOUR_REQUEST_FORM_DIALOG_LABELS.門票_活動,
  other: PACKAGE_LIST_PANEL_LABELS.其他,
}

interface TourRequestFormDialogProps {
  isOpen: boolean
  onClose: () => void
  // 旅遊團模式
  tour?: Tour | null
  // 從需求確認單傳入的資料
  category: string
  supplierName: string
  items: {
    id?: string
    serviceDate: string | null
    title: string
    quantity: number
    note?: string
  }[]
  tourCode?: string
  tourName?: string
  departureDate?: string
  pax?: number
}

export function TourRequestFormDialog({
  isOpen,
  onClose,
  tour,
  category,
  supplierName,
  items: initialItems,
  tourCode,
  tourName,
  departureDate,
  pax,
}: TourRequestFormDialogProps) {
  const router = useRouter()
  const { user } = useAuthStore()
  const { toast } = useToast()
  const { subtitle: companySubtitle } = useCompanyInfo()
  const { items: employees, fetchAll: fetchEmployees } = useEmployeeStore()

  // 編輯狀態的項目（日期 fallback：用 departure_date + index 推算）
  const [items, setItems] = useState<RequestItem[]>(() => {
    const depDate = departureDate || tour?.departure_date || null
    return initialItems.map((item, idx) => {
      let date = item.serviceDate || ''
      // 如果沒有日期，嘗試用出發日期 + 天數推算
      if (!date && depDate) {
        const d = new Date(depDate)
        d.setDate(d.getDate() + idx)
        date = d.toISOString().split('T')[0]
      }
      return {
        id: item.id || `new-${idx}`,
        date,
        title: item.title,
        quantity: item.quantity,
        unitPrice: 0,
        note: item.note || '',
      }
    })
  })

  // 供應商資訊（可編輯）
  const [supplierInfo, setSupplierInfo] = useState({
    id: '', // 如果是已存在的供應商，記錄 ID
    name: supplierName,
    contactPerson: '',
    phone: '',
    fax: '',
  })

  // 城市資訊
  const [cityInfo, setCityInfo] = useState({
    countryCode: '',
    cityCode: '',
    cityName: '',
    countryName: '',
    customCity: '', // 不在列表時手動輸入
  })

  // 接收供應商 workspace
  const [recipientWorkspaceId, setRecipientWorkspaceId] = useState<string>('')
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [sending, setSending] = useState(false)

  // 列印/儲存狀態
  const [saving, setSaving] = useState(false)

  // 載入公司 Logo（用於新視窗列印）
  const logoUrl = usePrintLogo(isOpen)

  // 判斷是否有足夠資料
  const hasValidData = !!tour

  // 選擇供應商時自動帶入資訊
  const handleSupplierSelect = (supplier: SupplierData) => {
    setSupplierInfo({
      id: supplier.id,
      name: supplier.name,
      contactPerson: supplier.contact_person || '',
      phone: supplier.phone || '',
      fax: '', // 供應商表沒有 fax 欄位
    })

    // 如果供應商有國家資訊，帶入
    if (supplier.country) {
      setCityInfo(prev => ({
        ...prev,
        countryName: supplier.country || '',
      }))
    }
  }

  // [Planned] 我方資訊 - 待整合 workspace settings
  const [companyInfo, setCompanyInfo] = useState({
    name: COMPANY_NAME,
    phone: '',
    fax: '',
    sales: '',
    assistant: '',
  })

  // 載入可選的 workspace 清單
  useEffect(() => {
    if (!isOpen || !user?.workspace_id) return
    const currentWorkspaceId = user.workspace_id
    const fetchWorkspaces = async () => {
      if (!currentWorkspaceId) return
      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .neq('id', currentWorkspaceId)
        .eq('is_active', true)
        .order('name')
        .limit(500)
      if (error) {
        logger.warn('載入 workspace 清單失敗:', error)
        return
      }
      setWorkspaces(data || [])
    }
    fetchWorkspaces()
  }, [isOpen, user?.workspace_id])

  // 載入員工清單並預設助理為當前登入者
  useEffect(() => {
    if (isOpen) {
      fetchEmployees()
      // 預設助理為當前登入者
      const userName = user?.chinese_name || user?.display_name || user?.name || ''
      if (userName && !companyInfo.assistant) {
        setCompanyInfo(prev => ({ ...prev, assistant: userName }))
      }
    }
  }, [isOpen, fetchEmployees, user?.chinese_name, user?.display_name, user?.name])

  // 員工選單：自己排最前面，其他依員工編號排序
  const sortedEmployees = React.useMemo(() => {
    const filtered = employees.filter(
      emp => emp.employee_type !== 'bot' && emp.workspace_id === user?.workspace_id
    )
    const currentUserName = user?.chinese_name || user?.display_name || user?.name || ''
    return filtered.sort((a, b) => {
      const aIsMe = a.chinese_name === currentUserName || a.display_name === currentUserName
      const bIsMe = b.chinese_name === currentUserName || b.display_name === currentUserName
      if (aIsMe && !bIsMe) return -1
      if (!aIsMe && bIsMe) return 1
      // 依員工編號排序
      return (a.employee_number || '').localeCompare(b.employee_number || '')
    })
  }, [employees, user?.workspace_id, user?.chinese_name, user?.display_name, user?.name])

  // 取得欄位設定
  const columns = CATEGORY_COLUMNS[category] || CATEGORY_COLUMNS.other
  const categoryName = CATEGORY_NAMES[category] || TOUR_REQUEST_FORM_DIALOG_LABELS.需求

  // 各分類的 placeholder 提示
  const titlePlaceholder: Record<string, string> = {
    hotel: '例：標準雙人房',
    restaurant: '例：午餐/晚餐',
    transport: '例：43人座遊覽車',
    activity: '例：門票/體驗活動',
    other: '輸入項目說明',
  }

  // 更新項目
  const updateItem = (id: string, field: keyof RequestItem, value: string | number) => {
    setItems(prev => prev.map(item => (item.id === id ? { ...item, [field]: value } : item)))
  }

  // 新增項目
  const addItem = () => {
    setItems(prev => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        date: '',
        title: '',
        quantity: 1,
        unitPrice: 0,
        note: '',
      },
    ])
  }

  // 刪除項目
  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id))
  }

  // 格式化日期
  const formatDate = (dateStr: string | null | undefined) => {
    return formatDateTW(dateStr)
  }

  // 沒有足夠資料時不渲染
  if (!hasValidData) return null

  // 生成 HTML 內容（用於列印和儲存）
  const generatePrintHtml = () => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${categoryName}${TOUR_REQUEST_FORM_DIALOG_LABELS.需求單}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            padding: 40px;
            max-width: 794px;
            margin: 0 auto;
          }
          .header {
            position: relative;
            padding-bottom: 16px;
            margin-bottom: 24px;
            border-bottom: 1px solid #B8A99A;
          }
          .logo { position: absolute; left: 0; top: 0; width: 120px; height: 40px; object-fit: contain; }
          .title-area { text-align: center; padding: 8px 0; }
          .subtitle { font-size: 14px; letter-spacing: 2px; color: #B8A99A; margin-bottom: 4px; }
          .title { font-size: 20px; font-weight: bold; color: #333; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 24px; }
          .info-section { }
          .info-title { font-weight: bold; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 8px; }
          .info-row { font-size: 14px; margin-bottom: 4px; }
          .tour-info { background: #f5f5f5; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
          .tour-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; font-size: 14px; }
          th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
          th { background: #f5f5f5; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; text-align: center; font-size: 12px; color: #B8B2AA; font-style: italic; }
          .print-controls { padding: 16px; border-bottom: 1px solid #eee; text-align: right; }
          .print-controls button { padding: 8px 16px; margin-left: 8px; cursor: pointer; border-radius: 6px; }
          .btn-outline { background: white; border: 1px solid #ddd; }
          .btn-primary { background: #c9aa7c; color: white; border: none; }
          @media print { .print-controls { display: none; } }
        </style>
      </head>
      <body>
        <div class="print-controls">
          <button class="btn-outline" onclick="window.close()">${TOUR_REQUEST_FORM_DIALOG_LABELS.關閉}</button>
          <button class="btn-primary" onclick="window.print()">${TOUR_REQUEST_FORM_DIALOG_LABELS.列印}</button>
        </div>

        <div class="header">
          ${logoUrl ? `<img src="${logoUrl}" class="logo" alt="Logo" />` : '<div style="position:absolute;left:0;top:0;font-size:12px;color:#999;">{PROPOSAL_FORM_LABELS.LABEL_3621}</div>'}
          <div class="title-area">
            <div class="subtitle">REQUEST FORM</div>
            <div class="title">${categoryName}${TOUR_REQUEST_FORM_DIALOG_LABELS.需求單}</div>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-section">
            <div class="info-title">${TOUR_REQUEST_FORM_DIALOG_LABELS.我方資訊}</div>
            <div class="info-row">${TOUR_REQUEST_FORM_DIALOG_LABELS.公司}${companyInfo.name}</div>
            ${companyInfo.phone || companyInfo.fax ? `<div class="info-row">${companyInfo.phone ? `${TOUR_REQUEST_FORM_DIALOG_LABELS.電話}${companyInfo.phone}` : ''}${companyInfo.phone && companyInfo.fax ? '　' : ''}${companyInfo.fax ? `${TOUR_REQUEST_FORM_DIALOG_LABELS.傳真}${companyInfo.fax}` : ''}</div>` : ''}
            ${companyInfo.sales || companyInfo.assistant ? `<div class="info-row">${companyInfo.sales ? `${TOUR_REQUEST_FORM_DIALOG_LABELS.業務}${companyInfo.sales}` : ''}${companyInfo.sales && companyInfo.assistant ? '　' : ''}${companyInfo.assistant ? `${TOUR_REQUEST_FORM_DIALOG_LABELS.助理}${companyInfo.assistant}` : ''}</div>` : ''}
          </div>
          <div class="info-section">
            <div class="info-title">${TOUR_REQUEST_FORM_DIALOG_LABELS.廠商資訊}</div>
            <div class="info-row">${TOUR_REQUEST_FORM_DIALOG_LABELS.廠商}${supplierInfo.name}</div>
            ${cityInfo.customCity || supplierInfo.contactPerson ? `<div class="info-row">${cityInfo.customCity ? `${TOUR_REQUEST_FORM_DIALOG_LABELS.城市}${cityInfo.customCity}` : ''}${cityInfo.customCity && supplierInfo.contactPerson ? '　' : ''}${supplierInfo.contactPerson ? `${TOUR_REQUEST_FORM_DIALOG_LABELS.聯絡人}${supplierInfo.contactPerson}` : ''}</div>` : ''}
            ${supplierInfo.phone || supplierInfo.fax ? `<div class="info-row">${supplierInfo.phone ? `${TOUR_REQUEST_FORM_DIALOG_LABELS.電話}${supplierInfo.phone}` : ''}${supplierInfo.phone && supplierInfo.fax ? '　' : ''}${supplierInfo.fax ? `${TOUR_REQUEST_FORM_DIALOG_LABELS.傳真}${supplierInfo.fax}` : ''}</div>` : ''}
          </div>
        </div>

        <div class="tour-info">
          <div class="tour-grid">
            <div>${TOUR_REQUEST_FORM_DIALOG_LABELS.團號}${tourCode || tour?.code || '-'}</div>
            <div>${TOUR_REQUEST_FORM_DIALOG_LABELS.團名}${tourName || tour?.name || '-'}</div>
            <div>${TOUR_REQUEST_FORM_DIALOG_LABELS.出發日期}${formatDate(departureDate || tour?.departure_date)}</div>
            <div>${TOUR_REQUEST_FORM_DIALOG_LABELS.人數}${pax || tour?.max_participants || '-'} ${TOUR_REQUEST_FORM_DIALOG_LABELS.人}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>${columns.dateLabel}</th>
              <th>${columns.titleLabel}</th>
              <th class="text-center">${columns.qtyLabel}</th>
              <th class="text-right">${TOUR_REQUEST_FORM_DIALOG_LABELS.單價}</th>
              <th>${TOUR_REQUEST_FORM_DIALOG_LABELS.備註}</th>
            </tr>
          </thead>
          <tbody>
            ${items
              .map(
                item => `
              <tr>
                <td>${formatDate(item.date)}</td>
                <td>${item.title}</td>
                <td class="text-center">${item.quantity}</td>
                <td class="text-right">${item.unitPrice > 0 ? '$' + item.unitPrice.toLocaleString() : '-'}</td>
                <td>${item.note || '-'}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <div class="footer">${companySubtitle}</div>
      </body>
      </html>
    `
  }

  // 不再存 HTML 檔案，改為只記錄發送狀態（在 updateRequestsStatus 處理）

  // 儲存/更新供應商資訊
  const saveSupplierInfo = async () => {
    // 沒有供應商名稱或沒有 workspace_id 就不儲存
    if (!supplierInfo.name || !user?.workspace_id) {
      return
    }

    try {
      const supplierTypeCode = CATEGORY_TO_SUPPLIER_TYPE[category] || 'other'
      const cityName = cityInfo.customCity || cityInfo.cityName

      // 如果有 ID，表示是選擇的既有供應商，更新聯絡資訊
      if (supplierInfo.id) {
        const { error } = await dynamicFrom('suppliers')
          .update({
            contact_person: supplierInfo.contactPerson || null,
            phone: supplierInfo.phone || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', supplierInfo.id)

        if (error) {
          logger.warn('更新供應商失敗:', error)
        }
        return
      }

      // 檢查是否已存在同名同類別的供應商

      const { data: existing } = await dynamicFrom('suppliers')
        .select('id')
        .eq('name', supplierInfo.name)
        .eq('type', supplierTypeCode)
        .eq('workspace_id', user.workspace_id)
        .maybeSingle()

      if (existing) {
        // 已存在，更新聯絡資訊

        const { error } = await dynamicFrom('suppliers')
          .update({
            contact_person: supplierInfo.contactPerson || null,
            phone: supplierInfo.phone || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)

        if (error) {
          logger.warn('更新供應商失敗:', error)
        }
      } else {
        // 不存在，建立新供應商
        // 生成供應商代碼

        const { data: maxCodeData } = await dynamicFrom('suppliers')
          .select('code')
          .like('code', 'S%')
          .order('code', { ascending: false })
          .limit(1)

        let newCode = 'S000001'
        if (maxCodeData && maxCodeData.length > 0) {
          const maxNum = parseInt(maxCodeData[0].code.replace('S', ''), 10) || 0
          newCode = `S${String(maxNum + 1).padStart(6, '0')}`
        }

        const { error } = await dynamicFrom('suppliers').insert({
          code: newCode,
          name: supplierInfo.name,
          type: supplierTypeCode,
          contact_person: supplierInfo.contactPerson || null,
          phone: supplierInfo.phone || null,
          workspace_id: user.workspace_id,
          is_active: true,
        })

        if (error) {
          logger.warn('建立供應商失敗:', error)
        } else {
          logger.log('已建立新供應商:', supplierInfo.name)
        }
      }
    } catch (err) {
      logger.error('儲存供應商失敗:', err)
    }
  }

  // 更新需求單狀態為「已發送」
  const updateRequestsStatus = async () => {
    // 收集有 ID 的項目（已存在的需求單）
    const requestIds = items
      .map((item: RequestItem) => item.id)
      .filter((id: string): id is string => !!id && !id.startsWith('new-'))

    if (requestIds.length === 0) return

    try {
      const now = new Date().toISOString()
      const { error } = await supabase
        .from('tour_requests')
        .update({
          status: 'sent',
          sent_at: now,
          updated_at: now,
        })
        .in('id', requestIds)

      if (error) {
        logger.warn('更新需求單狀態失敗:', error)
      } else {
        logger.info(`已更新 ${requestIds.length} 筆需求單狀態為「已發送」`)
      }
    } catch (err) {
      logger.error('更新需求單狀態錯誤:', err)
    }
  }

  // 系統內發送需求單
  const handleSendRequest = async () => {
    if (!recipientWorkspaceId) return
    setSending(true)

    try {
      const requestIds = items
        .map((item: RequestItem) => item.id)
        .filter((id: string): id is string => !!id && !id.startsWith('new-'))

      if (requestIds.length === 0) {
        toast({
          title: TOUR_REQUEST_FORM_DIALOG_LABELS.發送失敗,
          description: '沒有可發送的需求項目',
          variant: 'destructive',
        })
        return
      }

      // 儲存供應商資訊
      await saveSupplierInfo()

      const now = new Date().toISOString()
      const { error } = await supabase
        .from('tour_requests')
        .update({
          recipient_workspace_id: recipientWorkspaceId,
          status: 'sent',
          sent_at: now,
          updated_at: now,
        })
        .in('id', requestIds)

      if (error) {
        logger.error('發送需求單失敗:', error)
        toast({
          title: TOUR_REQUEST_FORM_DIALOG_LABELS.發送失敗,
          description: TOUR_REQUEST_FORM_DIALOG_LABELS.請重試或聯繫系統管理員,
          variant: 'destructive',
        })
        return
      }

      const targetWs = workspaces.find(w => w.id === recipientWorkspaceId)
      toast({
        title: TOUR_REQUEST_FORM_DIALOG_LABELS.需求單已發送,
        description: `${TOUR_REQUEST_FORM_DIALOG_LABELS.已發送至供應商}${targetWs?.name || ''}`,
      })

      // 發送頻道通知（fire-and-forget）
      if (tour?.id && user?.workspace_id) {
        fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'request_sent',
            tourId: tour.id,
            workspaceId: user.workspace_id,
            requestType: categoryName,
            supplierName: targetWs?.name || supplierInfo.name
          })
        }).catch(() => {}) // 忽略錯誤，不影響主流程
      }

      onClose()
    } catch (err) {
      logger.error('發送需求單錯誤:', err)
      toast({
        title: TOUR_REQUEST_FORM_DIALOG_LABELS.發送失敗,
        description: TOUR_REQUEST_FORM_DIALOG_LABELS.請重試或聯繫系統管理員,
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  // 開啟新視窗列印（避免 Dialog z-index 問題）
  const handlePrintInNewWindow = async () => {
    setSaving(true)

    try {
      // 生成 HTML 內容
      const printContent = generatePrintHtml()

      // 1. 儲存供應商資訊
      await saveSupplierInfo()

      // 2. 更新需求單狀態為「已發送」（含發送時間記錄）
      await updateRequestsStatus()

      // 全部存檔成功後，開啟新視窗列印
      const printWindow = window.open('', '_blank', 'width=900,height=700')
      if (!printWindow) {
        toast({
          title: TOUR_REQUEST_FORM_DIALOG_LABELS.請允許彈出視窗以進行列印,
          variant: 'destructive',
        })
        return
      }

      printWindow.document.write(printContent)
      printWindow.document.close()

      toast({
        title: TOUR_REQUEST_FORM_DIALOG_LABELS.需求單已發送並存檔,
        description: TOUR_REQUEST_FORM_DIALOG_LABELS.狀態已更新為_已發送,
      })
    } catch (err) {
      logger.error('需求單處理失敗:', err)
      toast({
        title: TOUR_REQUEST_FORM_DIALOG_LABELS.存檔失敗,
        description: TOUR_REQUEST_FORM_DIALOG_LABELS.請重試或聯繫系統管理員,
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()} modal={true}>
      <DialogContent
        level={2}
        className={`${DIALOG_SIZES['4xl']} max-h-[85vh] overflow-hidden flex flex-col`}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText size={18} className="text-morandi-gold" />
            {categoryName}需求單 - {supplierInfo.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* 雙欄資訊區 */}
          <div className="grid grid-cols-2 gap-6">
            {/* 我方資訊 */}
            <div className="space-y-2">
              <h3 className="font-medium text-morandi-primary border-b border-border pb-1">
                {PROPOSAL_FORM_LABELS.LABEL_7720}
              </h3>
              <div className="space-y-1 text-sm">
                <div className="flex items-baseline gap-1">
                  <span className="text-morandi-secondary whitespace-nowrap">
                    {PROPOSAL_FORM_LABELS.COMPANY}
                  </span>
                  <span className="text-morandi-primary">{companyInfo.name}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4">
                  <div className="flex items-baseline">
                    <span className="text-morandi-secondary whitespace-nowrap">
                      {PROPOSAL_FORM_LABELS.PHONE}
                    </span>
                    <input
                      value={companyInfo.phone}
                      onChange={e => setCompanyInfo(prev => ({ ...prev, phone: e.target.value }))}
                      className="flex-1 min-w-0 h-7 px-1 text-sm bg-transparent border-b border-border/50 focus:outline-none focus:border-morandi-gold"
                    />
                  </div>
                  <div className="flex items-baseline">
                    <span className="text-morandi-secondary whitespace-nowrap">
                      {PROPOSAL_FORM_LABELS.FAX}
                    </span>
                    <input
                      value={companyInfo.fax}
                      onChange={e => setCompanyInfo(prev => ({ ...prev, fax: e.target.value }))}
                      className="flex-1 min-w-0 h-7 px-1 text-sm bg-transparent border-b border-border/50 focus:outline-none focus:border-morandi-gold"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-4">
                  <div className="flex items-baseline">
                    <span className="text-morandi-secondary whitespace-nowrap">
                      {PROPOSAL_FORM_LABELS.SALES}
                    </span>
                    <select
                      value={companyInfo.sales}
                      onChange={e => setCompanyInfo(prev => ({ ...prev, sales: e.target.value }))}
                      className="flex-1 min-w-0 h-7 px-1 text-sm bg-transparent border-b border-border/50 focus:outline-none focus:border-morandi-gold cursor-pointer"
                    >
                      <option value=""></option>
                      {sortedEmployees.map(emp => {
                        const label =
                          [emp.chinese_name, emp.display_name].filter(Boolean).join(' / ') || ''
                        return (
                          <option key={emp.id} value={emp.chinese_name || emp.display_name || ''}>
                            {label}
                          </option>
                        )
                      })}
                    </select>
                  </div>
                  <div className="flex items-baseline">
                    <span className="text-morandi-secondary whitespace-nowrap">
                      {PROPOSAL_FORM_LABELS.ASSISTANT}
                    </span>
                    <select
                      value={companyInfo.assistant}
                      onChange={e =>
                        setCompanyInfo(prev => ({ ...prev, assistant: e.target.value }))
                      }
                      className="flex-1 min-w-0 h-7 px-1 text-sm bg-transparent border-b border-border/50 focus:outline-none focus:border-morandi-gold cursor-pointer"
                    >
                      <option value=""></option>
                      {sortedEmployees.map(emp => {
                        const label =
                          [emp.chinese_name, emp.display_name].filter(Boolean).join(' / ') || ''
                        return (
                          <option key={emp.id} value={emp.chinese_name || emp.display_name || ''}>
                            {label}
                          </option>
                        )
                      })}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* 廠商資訊 */}
            <div className="space-y-2">
              <h3 className="font-medium text-morandi-primary border-b border-border pb-1">
                {PROPOSAL_FORM_LABELS.LABEL_3340}
              </h3>
              <div className="space-y-1 text-sm">
                <div className="flex items-baseline gap-1">
                  <span className="text-morandi-secondary whitespace-nowrap">
                    {PROPOSAL_FORM_LABELS.SUPPLIER}
                  </span>
                  <SupplierSearchInput
                    value={supplierInfo.name}
                    onChange={val => setSupplierInfo(prev => ({ ...prev, name: val, id: '' }))}
                    onSupplierSelect={handleSupplierSelect}
                    category={category}
                    className="flex-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-x-4">
                  <div className="flex items-baseline">
                    <span className="text-morandi-secondary whitespace-nowrap">
                      {PROPOSAL_FORM_LABELS.CITY}
                    </span>
                    <input
                      value={cityInfo.customCity}
                      onChange={e => setCityInfo(prev => ({ ...prev, customCity: e.target.value }))}
                      className="flex-1 min-w-0 h-7 px-1 text-sm bg-transparent border-b border-border/50 focus:outline-none focus:border-morandi-gold"
                    />
                  </div>
                  <div className="flex items-baseline">
                    <span className="text-morandi-secondary whitespace-nowrap">
                      {PROPOSAL_FORM_LABELS.CONTACT}
                    </span>
                    <input
                      value={supplierInfo.contactPerson}
                      onChange={e =>
                        setSupplierInfo(prev => ({ ...prev, contactPerson: e.target.value }))
                      }
                      className="flex-1 min-w-0 h-7 px-1 text-sm bg-transparent border-b border-border/50 focus:outline-none focus:border-morandi-gold"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-4">
                  <div className="flex items-baseline">
                    <span className="text-morandi-secondary whitespace-nowrap">
                      {PROPOSAL_FORM_LABELS.PHONE}
                    </span>
                    <input
                      value={supplierInfo.phone}
                      onChange={e => setSupplierInfo(prev => ({ ...prev, phone: e.target.value }))}
                      className="flex-1 min-w-0 h-7 px-1 text-sm bg-transparent border-b border-border/50 focus:outline-none focus:border-morandi-gold"
                    />
                  </div>
                  <div className="flex items-baseline">
                    <span className="text-morandi-secondary whitespace-nowrap">
                      {PROPOSAL_FORM_LABELS.FAX}
                    </span>
                    <input
                      value={supplierInfo.fax}
                      onChange={e => setSupplierInfo(prev => ({ ...prev, fax: e.target.value }))}
                      className="flex-1 min-w-0 h-7 px-1 text-sm bg-transparent border-b border-border/50 focus:outline-none focus:border-morandi-gold"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 接收供應商 workspace 選擇器 */}
          <div className="flex items-center gap-3 px-1">
            <div className="flex items-center gap-1.5 text-sm text-morandi-secondary whitespace-nowrap">
              <Building2 size={14} />
              <span>{TOUR_REQUEST_FORM_DIALOG_LABELS.接收供應商}</span>
            </div>
            <select
              value={recipientWorkspaceId}
              onChange={e => setRecipientWorkspaceId(e.target.value)}
              className="flex-1 h-8 px-2 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-morandi-gold"
            >
              <option value="">{TOUR_REQUEST_FORM_DIALOG_LABELS.不發送_列印模式}</option>
              {workspaces.map(ws => (
                <option key={ws.id} value={ws.id}>
                  {ws.name}
                  {ws.code ? ` (${ws.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 團體資訊 */}
          <div className="bg-morandi-container/30 rounded-lg p-4">
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-morandi-secondary">{PROPOSAL_FORM_LABELS.LABEL_3785}</span>
                <span className="font-medium ml-1">{tourCode || tour?.code || '-'}</span>
              </div>
              <div>
                <span className="text-morandi-secondary">{PROPOSAL_FORM_LABELS.LABEL_168}</span>
                <span className="font-medium ml-1">{tourName || tour?.name || '-'}</span>
              </div>
              <div>
                <span className="text-morandi-secondary">{PROPOSAL_FORM_LABELS.LABEL_2816}</span>
                <span className="font-medium ml-1">
                  {formatDate(departureDate || tour?.departure_date)}
                </span>
              </div>
              <div>
                <span className="text-morandi-secondary">{PROPOSAL_FORM_LABELS.LABEL_8361}</span>
                <span className="font-medium ml-1">
                  {pax || tour?.current_participants || tour?.max_participants || '-'} 人
                </span>
              </div>
            </div>
          </div>

          {/* 需求明細表格 */}
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-morandi-container/50 border-b border-border">
                  <th className="px-3 py-2 text-left font-medium w-[100px]">{columns.dateLabel}</th>
                  <th className="px-3 py-2 text-left font-medium">{columns.titleLabel}</th>
                  <th className="px-3 py-2 text-center font-medium w-[80px]">{columns.qtyLabel}</th>
                  <th className="px-3 py-2 text-center font-medium w-[100px]">
                    {PROPOSAL_FORM_LABELS.LABEL_9413}
                  </th>
                  <th className="px-3 py-2 text-left font-medium w-[150px]">
                    {PROPOSAL_FORM_LABELS.REMARKS}
                  </th>
                  <th className="px-3 py-2 text-center font-medium w-[60px]">
                    {PROPOSAL_FORM_LABELS.ACTIONS}
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr
                    key={item.id}
                    className="border-t border-border/50 hover:bg-morandi-container/10"
                  >
                    <td className="p-0">
                      <input
                        type="date"
                        value={item.date}
                        onChange={e => updateItem(item.id, 'date', e.target.value)}
                        className="w-full h-9 px-3 text-sm bg-transparent border-0 focus:outline-none focus:bg-morandi-container/20"
                      />
                    </td>
                    <td className="p-0">
                      <input
                        value={item.title}
                        onChange={e => updateItem(item.id, 'title', e.target.value)}
                        placeholder={titlePlaceholder[category] || '輸入項目說明'}
                        className="w-full h-9 px-3 text-sm bg-transparent border-0 focus:outline-none focus:bg-morandi-container/20 placeholder:text-morandi-muted/50"
                      />
                    </td>
                    <td className="p-0">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={e =>
                          updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)
                        }
                        className="w-full h-9 px-3 text-sm text-center bg-transparent border-0 focus:outline-none focus:bg-morandi-container/20"
                      />
                    </td>
                    <td className="p-0">
                      <input
                        type="number"
                        value={item.unitPrice || ''}
                        onChange={e =>
                          updateItem(item.id, 'unitPrice', parseInt(e.target.value) || 0)
                        }
                        className="w-full h-9 px-3 text-sm text-right bg-transparent border-0 focus:outline-none focus:bg-morandi-container/20"
                      />
                    </td>
                    <td className="p-0">
                      <input
                        value={item.note}
                        onChange={e => updateItem(item.id, 'note', e.target.value)}
                        className="w-full h-9 px-3 text-sm bg-transparent border-0 focus:outline-none focus:bg-morandi-container/20"
                      />
                    </td>
                    <td className="px-2 py-1 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                        className="h-7 w-7 p-0 text-morandi-red hover:bg-red-50"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* 新增按鈕 */}
            <div className="p-2 border-t border-border/50">
              <Button
                variant="ghost"
                size="sm"
                onClick={addItem}
                className="gap-1 text-morandi-gold hover:text-morandi-gold-hover"
              >
                <Plus size={14} />
                {PROPOSAL_FORM_LABELS.ADD_2089}
              </Button>
            </div>
          </div>
        </div>

        {/* 底部按鈕 */}
        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose} className="gap-2">
            <X size={16} />
            {PROPOSAL_FORM_LABELS.CLOSE}
          </Button>
          {tour?.id && (
            <Button
              variant="outline"
              onClick={() => {
                onClose()
                router.push(`/finance/requests?tour_id=${tour.id}`)
              }}
              className="gap-2 text-morandi-gold border-morandi-gold hover:bg-morandi-gold hover:text-white"
            >
              <Receipt size={16} />
              {PROPOSAL_FORM_LABELS.LABEL_4890}
            </Button>
          )}
          <Button
            onClick={handlePrintInNewWindow}
            disabled={saving || sending}
            className="gap-2 bg-morandi-gold hover:bg-morandi-gold-hover text-white"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
            {PROPOSAL_FORM_LABELS.PRINT}
          </Button>
          {recipientWorkspaceId && (
            <Button
              onClick={handleSendRequest}
              disabled={sending || saving}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {TOUR_REQUEST_FORM_DIALOG_LABELS.發送}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
