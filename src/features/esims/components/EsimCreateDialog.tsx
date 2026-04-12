'use client'

import { logger } from '@/lib/utils/logger'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { FormDialog } from '@/components/dialog'
import { Input } from '@/components/ui/input'
import { Combobox } from '@/components/ui/combobox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useEsims, createEsim, createOrder, invalidateTours } from '@/data'
import { useAuthStore } from '@/stores/auth-store'
import { useTours } from '@/features/tours/hooks/useTours'
import { fastMoveService } from '@/services/fastmove.service'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import type { FastMoveProduct, Esim } from '@/types/esim.types'
import type { Order } from '@/types'
import { alert } from '@/lib/ui/alert-dialog'
import { LABELS } from '../constants/labels'

// 產品地區選項
const PRODUCT_REGIONS = [
  { value: 'JPN', label: '日本' },
  { value: 'KOR', label: '韓國' },
  { value: 'THI', label: '泰國' },
  { value: 'VNM', label: '越南' },
  { value: 'SGP', label: '新加坡' },
  { value: 'MYS', label: '馬來西亞' },
]

interface EsimItem {
  id: string
  product_region: string
  product_id: string
  quantity: number
  email: string
  note: string
}

interface EsimCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EsimCreateDialog({ open, onOpenChange }: EsimCreateDialogProps) {
  const router = useRouter()
  const { items: esims } = useEsims()
  const { user } = useAuthStore()
  const { tours } = useTours()

  const [selectedTourId, setSelectedTourId] = useState<string>('')
  const [orderNumber, setOrderNumber] = useState<string>('')
  const [contactPerson, setContactPerson] = useState<string>('')
  const [contactPhone, setContactPhone] = useState<string>('')
  const [products, setProducts] = useState<FastMoveProduct[]>([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [hasInitialized, setHasInitialized] = useState(false)
  const [tourOrders, setTourOrders] = useState<Order[]>([])

  const [esimItems, setEsimItems] = useState<EsimItem[]>([
    {
      id: '1',
      product_region: '',
      product_id: '',
      quantity: 1,
      email: '',
      note: '',
    },
  ])

  const tourOptions = useMemo(() => {
    logger.log('Tours data:', tours?.length)
    return (tours || []).map(tour => ({
      value: tour.id,
      label: `${tour.code} - ${tour.name}`,
    }))
  }, [tours])

  // 訂單選項（使用當前團號的訂單 + 新增選項）
  const orderOptions = useMemo(() => {
    const options = tourOrders
      .filter(order => order.order_number)
      .map(order => ({
        value: order.order_number!,
        label: `${order.order_number} - ${order.contact_person || ''}`,
      }))
    // 加入「新增訂單」選項
    if (selectedTourId) {
      options.push({
        value: '__create_new__',
        label: '+ 新增訂單',
      })
    }
    return options
  }, [tourOrders, selectedTourId])

  // ✅ 當對話框打開時，載入團號資料
  useEffect(() => {
    if (open && !hasInitialized) {
      const init = async () => {
        try {
          // 確保 SWR 快取已載入
          if (tours.length === 0) {
            await invalidateTours()
          }
          setHasInitialized(true)
        } catch (error) {
          logger.error('Failed to initialize esim dialog:', error)
        }
      }
      void init()
    }

    // 對話框關閉時重置初始化狀態
    if (!open) {
      setHasInitialized(false)
      setSelectedTourId('')
    }
  }, [open, hasInitialized, tours.length])

  // ✅ 當團號改變時，載入該團的訂單
  useEffect(() => {
    if (selectedTourId) {
      const fetchTourOrders = async () => {
        try {
          const { supabase } = await import('@/lib/supabase/client')
          const { data, error } = await supabase
            .from('orders')
            .select(
              'id, code, order_number, tour_id, tour_name, customer_id, status, total_amount, paid_amount, remaining_amount, payment_status, contact_person, contact_phone, contact_email, sales_person, assistant, member_count, adult_count, child_count, infant_count, total_people, notes, identity_options, is_active, workspace_id, created_at, created_by, updated_at, updated_by'
            )
            .eq('tour_id', selectedTourId)
            .order('created_at', { ascending: false })
            .limit(500)

          if (!error && data) {
            setTourOrders(data)
          } else {
            setTourOrders([])
          }
        } catch (error) {
          logger.error('Failed to fetch tour orders:', error)
          setTourOrders([])
        }
      }
      fetchTourOrders()
    } else {
      setTourOrders([])
    }
  }, [selectedTourId])

  // 當選擇團號時的處理
  const handleTourChange = (tourId: string) => {
    setSelectedTourId(tourId)
    // 清空訂單選擇，因為團號改變了
    setOrderNumber('')
  }

  // 從 selectedTourId 取得 groupCode
  const groupCode = tours?.find(t => t.id === selectedTourId)?.code || ''

  // 載入 FastMove 產品列表
  const fetchProducts = async () => {
    setIsLoadingProducts(true)
    try {
      // [Pending] FastMove API 整合 - 待 API Key 配置後啟用
      // const productList = await fastMoveService.getProducts()

      // 🧪 臨時使用 Mock 資料測試
      const productList = [
        {
          wmproduct_id: 'JP-7D-UNLIM',
          product_id: 'JP-7D-UNLIM',
          product_name: '日本 7天無限流量',
          product_region: 'JPN',
          product_price: 500,
          product_type: 1,
          le_sim: false,
        },
        {
          wmproduct_id: 'JP-14D-UNLIM',
          product_id: 'JP-14D-UNLIM',
          product_name: '日本 14天無限流量',
          product_region: 'JPN',
          product_price: 800,
          product_type: 1,
          le_sim: false,
        },
        {
          wmproduct_id: 'KR-7D-UNLIM',
          product_id: 'KR-7D-UNLIM',
          product_name: '韓國 7天無限流量',
          product_region: 'KOR',
          product_price: 450,
          product_type: 1,
          le_sim: false,
        },
        {
          wmproduct_id: 'TH-7D-UNLIM',
          product_id: 'TH-7D-UNLIM',
          product_name: '泰國 7天無限流量',
          product_region: 'THI',
          product_price: 350,
          product_type: 1,
          le_sim: false,
        },
      ]

      setProducts(productList)
      toast.success(`已更新 ${productList.length} 個產品（測試資料）`)
    } catch (error) {
      toast.error('無法載入產品列表，請稍後再試')
      logger.error('Failed to fetch products:', error)
    } finally {
      setIsLoadingProducts(false)
    }
  }

  // 將 FastMove 產品轉換為選項格式（記憶化避免無限循環）
  const productOptions = useMemo(
    () =>
      products.map(p => ({
        value: p.product_id,
        label: `${p.product_name} - $${p.product_price}`,
      })),
    [products]
  )

  const addEsimItem = () => {
    setEsimItems([
      ...esimItems,
      {
        id: Date.now().toString(),
        product_region: '',
        product_id: '',
        quantity: 1,
        email: '',
        note: '',
      },
    ])
  }

  const removeEsimItem = (id: string) => {
    setEsimItems(esimItems.filter(item => item.id !== id))
  }

  const updateEsimItem = (id: string, field: keyof EsimItem, value: unknown) => {
    setEsimItems(esimItems.map(item => (item.id === id ? { ...item, [field]: value } : item)))
  }

  // 不強制選擇團號（沒選會自動建立 ad-hoc 網卡團）
  const canSubmit = esimItems.every(item => item.product_region && item.product_id && item.email)

  const handleSubmit = async () => {
    if (!canSubmit || !user) return

    try {
      let selectedTour = tours?.find(t => t.id === selectedTourId)

      // 如果沒選團，自動建立 ad-hoc 網卡團（出發日=今天）
      if (!selectedTour) {
        const { tourService } = await import('@/features/tours/services/tour.service')
        const customerName = contactPerson || (user as { display_name?: string }).display_name
        selectedTour = await tourService.createAdHocTour('esim', customerName)
        toast.success(`已建立網卡團：${selectedTour.code}`)
      }
      const finalGroupCode = selectedTour.code

      // 取得或建立訂單
      let targetOrderNumber = orderNumber

      // 如果選擇「+ 新增訂單」或沒有選訂單，則自動建立
      if ((!orderNumber || orderNumber === '__create_new__') && selectedTour) {
        // 重新查詢該團的訂單數量（確保最新）
        const { supabase } = await import('@/lib/supabase/client')
        const { count } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('tour_id', selectedTour.id)

        // 訂單編號格式: {團號}-O{2位數}
        const nextNumber = ((count || 0) + 1).toString().padStart(2, '0')
        const newOrderNumber = `${selectedTour.code}-O${nextNumber}`

        await createOrder({
          order_number: newOrderNumber,
          tour_id: selectedTour.id,
          code: newOrderNumber,
          tour_name: selectedTour.name,
          contact_person: contactPerson || user.display_name || '系統',
          sales_person: user.display_name || '系統',
          assistant: user.display_name || '系統',
          member_count: esimItems.reduce((sum, item) => sum + item.quantity, 0),
          total_amount: 0,
          paid_amount: 0,
          remaining_amount: 0,
          payment_status: 'unpaid' as const,
          status: 'confirmed',
        } as unknown as Parameters<typeof createOrder>[0])

        targetOrderNumber = newOrderNumber
        toast.success(`已建立訂單：${newOrderNumber}`)
      }

      // 為每個網卡項目生成單號並建立
      for (const item of esimItems) {
        const prefix = `E${finalGroupCode}`
        const existingNumbers = (esims || [])
          .filter((e: Esim) => e.esim_number?.startsWith(prefix))
          .map((e: Esim) => {
            const num = e.esim_number.slice(prefix.length)
            return parseInt(num, 10)
          })
          .filter((n: number) => !isNaN(n))

        const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1
        const esimNumber = `${prefix}${String(nextNumber).padStart(2, '0')}`

        // 從產品列表找到選中的產品，取得價格
        const selectedProduct = products.find(p => p.product_id === item.product_id)
        const productPrice = selectedProduct?.product_price || 0

        // 產生請款單號（給 FastMove 使用）
        // [Note] 請款單號使用時間戳產生，確保唯一性
        const invoiceNumber = `I${finalGroupCode}${String(Date.now()).slice(-4)}`

        await createEsim({
          esim_number: esimNumber,
          group_code: finalGroupCode,
          order_number: targetOrderNumber || undefined,
          product_id: item.product_id,
          quantity: item.quantity,
          price: productPrice,
          email: item.email,
          note: item.note || '',
          status: 0,
        } as unknown as Parameters<typeof createEsim>[0])

        // [Integration] FastMove API 下單
        // FastMove API 會自動產生請款單，請款日期為「下個月第一個週四」
        try {
          await fastMoveService.createOrder({
            email: item.email,
            product_id: item.product_id,
            quantity: item.quantity,
            price: productPrice,
            group_code: finalGroupCode,
            order_number: targetOrderNumber || '',
            created_by: user.id,
            invoice_number: invoiceNumber,
            esim_number: esimNumber,
          })
          logger.log('FastMove 下單成功，請款單號：', invoiceNumber)
        } catch (error) {
          logger.error('FastMove API 調用錯誤:', error)
          // 不中斷流程，網卡已建立，只是 FastMove 失敗
        }
      }

      // 重置表單，重新自動選擇預設團號
      setSelectedTourId('')
      setOrderNumber('')
      setEsimItems([
        {
          id: '1',
          product_region: '',
          product_id: '',
          quantity: 1,
          email: '',
          note: '',
        },
      ])
      router.refresh()
    } catch (error) {
      logger.error('建立失敗:', error)
      throw error
    }
  }

  const handleClose = () => {
    setSelectedTourId('')
    setOrderNumber('')
    setContactPerson('')
    setContactPhone('')
    setEsimItems([
      {
        id: '1',
        product_region: '',
        product_id: '',
        quantity: 1,
        email: '',
        note: '',
      },
    ])
    onOpenChange(false)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={open => !open && handleClose()}
      title={LABELS.batchCreateTitle}
      onSubmit={handleSubmit}
      onCancel={handleClose}
      submitLabel="批次新增網卡"
      submitDisabled={!canSubmit}
      maxWidth="5xl"
      contentClassName="max-h-[75vh] overflow-y-auto"
    >
      {/* 上半部：聯絡人資訊 */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-morandi-primary">
              {LABELS.selectTourCode}{' '}
              <span className="text-xs text-morandi-secondary">{LABELS.autoSelectEsimTour}</span>
            </label>
            <Combobox
              value={selectedTourId}
              onChange={handleTourChange}
              options={tourOptions}
              placeholder={LABELS.selectTourCodePlaceholder}
              className="mt-1"
              showSearchIcon
              showClearButton
            />
          </div>
          <div>
            <label className="text-sm font-medium text-morandi-primary">
              {LABELS.orderNumberLabel}{' '}
              <span className="text-xs text-morandi-secondary">{LABELS.orderAutoCreate}</span>
            </label>
            <Combobox
              value={orderNumber}
              onChange={setOrderNumber}
              options={orderOptions}
              placeholder={LABELS.orderPlaceholder(!!selectedTourId)}
              disabled={!selectedTourId}
              className="mt-1"
              showSearchIcon
              showClearButton
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-morandi-primary">
              {LABELS.contactPerson}
            </label>
            <Input
              value={contactPerson}
              onChange={e => setContactPerson(e.target.value)}
              placeholder={LABELS.contactPersonPlaceholder}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-morandi-primary">
              {LABELS.contactPhone}
            </label>
            <Input
              value={contactPhone}
              onChange={e => setContactPhone(e.target.value)}
              placeholder={LABELS.contactPhonePlaceholder}
              className="mt-1"
            />
          </div>
        </div>
      </div>

      {/* 分割線 */}
      <div className="border-t border-border"></div>

      {/* 下半部：批次網卡列表 */}
      <div className="space-y-2">
        {esimItems.map((item, index) => (
          <div
            key={item.id}
            className="grid grid-cols-[140px_180px_70px_1fr_120px_40px] gap-2 items-center"
          >
            <div className="flex items-center gap-1">
              <Select
                value={item.product_region}
                onValueChange={value => updateEsimItem(item.id, 'product_region', value)}
              >
                <SelectTrigger className="w-full h-10">
                  <SelectValue placeholder={LABELS.productRegion} />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_REGIONS.map(region => (
                    <SelectItem key={region.value} value={region.value}>
                      {region.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={fetchProducts}
                disabled={isLoadingProducts}
                className="h-8 w-8 p-0 hover:bg-morandi-gray/10 flex-shrink-0"
              >
                <RefreshCw className={`h-4 w-4 ${isLoadingProducts ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            <Combobox
              value={item.product_id}
              onChange={value => updateEsimItem(item.id, 'product_id', value)}
              options={productOptions.filter(p => {
                const product = products.find(pr => pr.product_id === p.value)
                return !item.product_region || product?.product_region === item.product_region
              })}
              placeholder={LABELS.selectProduct}
              disabled={!item.product_region || products.length === 0}
              showSearchIcon
            />

            <Select
              value={String(item.quantity)}
              onValueChange={value => updateEsimItem(item.id, 'quantity', Number(value))}
            >
              <SelectTrigger className="w-full h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                  <SelectItem key={num} value={String(num)}>
                    {num}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="email"
              value={item.email}
              onChange={e => updateEsimItem(item.id, 'email', e.target.value)}
              placeholder={LABELS.receiveEmail}
            />

            <Input
              value={item.note}
              onChange={e => updateEsimItem(item.id, 'note', e.target.value)}
              placeholder={LABELS.notePlaceholder}
            />

            <Button
              type="button"
              onClick={index === esimItems.length - 1 ? addEsimItem : () => removeEsimItem(item.id)}
              size="sm"
              className={
                index === esimItems.length - 1
                  ? 'h-8 w-8 p-0 flex-shrink-0 bg-morandi-gold hover:bg-morandi-gold-hover text-white'
                  : 'h-8 w-8 p-0 flex-shrink-0 text-morandi-red hover:bg-status-danger-bg'
              }
              variant={index === esimItems.length - 1 ? 'default' : 'ghost'}
            >
              {index === esimItems.length - 1 ? '+' : '✕'}
            </Button>
          </div>
        ))}
      </div>
    </FormDialog>
  )
}
