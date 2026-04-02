'use client'

/**
 * 客製化詳情頁 - 客戶 DIY 選景點
 * 路由: /p/wishlist/[slug]
 * 
 * 🎯 流程：
 * 1. 客人選景點（左側卡片）
 * 2. 已選清單顯示在右側
 * 3. 送出 → 3D 特效動畫（衛星發送到座標）
 * 4. 生成專屬追蹤連結 /p/wishlist/track/[code]
 * 5. 客人可用此連結查看進度、我們的回覆
 */

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import { 
  MapPin, 
  Check, 
  X, 
  Send,
  ChevronLeft,
  Phone,
  Loader2,
  Copy,
  CheckCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'

interface WishlistTemplate {
  id: string
  name: string
  slug: string
  description: string | null
  workspace_id: string
}

interface TemplateItem {
  id: string
  name: string
  image_url: string | null
  description: string | null
  region: string | null
  category: string | null
}

interface CompanyInfo {
  name: string
  phone: string
}

interface SelectedItem {
  item_id: string
  name: string
  priority: number
}

export default function WishlistDetailPage({ 
  params 
}: { 
  params: Promise<{ slug: string }> 
}) {
  const { slug } = use(params)
  const router = useRouter()
  
  const [template, setTemplate] = useState<WishlistTemplate | null>(null)
  const [items, setItems] = useState<TemplateItem[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  
  // 已選景點
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([])
  
  // 篩選
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  
  // 詢價表單
  const [showInquiryForm, setShowInquiryForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [inquiryForm, setInquiryForm] = useState({
    name: '',
    phone: '',
    travel_date: '',
    people_count: 2,
    notes: '',
  })

  // 成功畫面
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [trackingCode, setTrackingCode] = useState('')
  const [trackingUrl, setTrackingUrl] = useState('')
  
  // 公司資訊
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({ name: '旅行社', phone: '' })
  
  // LINE 用戶
  const [lineUser, setLineUser] = useState<{ userId: string; displayName: string; pictureUrl?: string } | null>(null)
  const [lineLoading, setLineLoading] = useState(true)
  
  // 客戶資料（綁定的）
  const [linkedCustomer, setLinkedCustomer] = useState<{
    id: string
    code: string
    name: string
    phone: string | null
    email: string | null
  } | null>(null)
  
  // 客戶比對
  const [matchingCustomers, setMatchingCustomers] = useState<{
    id: string
    code: string
    name: string
    phone: string | null
  }[]>([])
  const [showMatchDialog, setShowMatchDialog] = useState(false)
  const [matchForm, setMatchForm] = useState({ name: '', birthDate: '' })

  // 載入資料
  useEffect(() => {
    const fetchData = async () => {
      // 載入模板
      const { data: templateData, error: templateError } = await supabase
        .from('wishlist_templates')
        .select('id, name, slug, description, workspace_id')
        .eq('slug', slug)
        .eq('status', 'published')
        .single()

      if (templateError || !templateData) {
        setNotFound(true)
        setLoading(false)
        return
      }

      setTemplate(templateData)
      
      // 載入公司資訊
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('legal_name, phone')
        .eq('id', templateData.workspace_id)
        .single()
      
      if (workspace) {
        setCompanyInfo({
          name: workspace.legal_name || '旅行社',
          phone: workspace.phone || '',
        })
      }

      // 載入景點
      const { data: itemsData } = await supabase
        .from('wishlist_template_items')
        .select('id, name, image_url, description, region, category')
        .eq('template_id', templateData.id)
        .order('display_order')

      setItems(itemsData || [])
      setLoading(false)
    }

    fetchData()
  }, [slug])

  // 檢查 LINE 登入狀態 + 查詢已綁定客戶
  useEffect(() => {
    const checkLineUser = async () => {
      try {
        const res = await fetch('/api/auth/line/me')
        const data = await res.json()
        if (data.user) {
          setLineUser(data.user)
          
          // 查詢是否已綁定客戶
          const customerRes = await fetch(`/api/customers/by-line?lineUserId=${data.user.userId}`)
          const customerData = await customerRes.json()
          
          if (customerData.customer) {
            setLinkedCustomer(customerData.customer)
            // 自動帶入客戶資料
            setInquiryForm(prev => ({
              ...prev,
              name: customerData.customer.name || prev.name,
              phone: customerData.customer.phone || prev.phone,
            }))
          } else {
            // 沒綁定，用 LINE 名稱
            if (data.user.displayName && !inquiryForm.name) {
              setInquiryForm(prev => ({ ...prev, name: data.user.displayName }))
            }
          }
        }
      } catch {
        // ignore
      } finally {
        setLineLoading(false)
      }
    }
    checkLineUser()
  }, [])

  // 取得所有分類
  const categories = [...new Set(items.map(i => i.category).filter(Boolean))]

  // 篩選景點
  const filteredItems = items.filter(item => {
    if (selectedCategory === 'all') return true
    return item.category === selectedCategory
  })

  // 選擇/取消選擇景點
  const toggleItem = (item: TemplateItem) => {
    setSelectedItems(prev => {
      const exists = prev.find(s => s.item_id === item.id)
      if (exists) {
        return prev.filter(s => s.item_id !== item.id)
      } else {
        return [...prev, {
          item_id: item.id,
          name: item.name,
          priority: prev.length + 1,
        }]
      }
    })
  }

  // 移除已選景點
  const removeItem = (itemId: string) => {
    setSelectedItems(prev => prev.filter(s => s.item_id !== itemId))
  }

  // 複製連結
  const copyTrackingUrl = () => {
    navigator.clipboard.writeText(trackingUrl)
    toast.success('已複製連結')
  }

  // 提交詢價
  const handleSubmit = async () => {
    if (selectedItems.length === 0) {
      toast.error('請至少選擇一個景點')
      return
    }
    if (!inquiryForm.name) {
      toast.error('請輸入姓名')
      return
    }
    if (!inquiryForm.phone) {
      toast.error('請輸入電話')
      return
    }

    setSubmitting(true)

    // 產生追蹤碼（短碼，好記）
    const code = `W${Date.now().toString(36).toUpperCase().slice(-6)}`

    const { error } = await supabase
      .from('customer_inquiries' as never)
      .insert({
        workspace_id: template?.workspace_id,
        template_id: template?.id,
        code,
        customer_name: inquiryForm.name,
        phone: inquiryForm.phone,
        email: null,
        travel_date: inquiryForm.travel_date || null,
        people_count: inquiryForm.people_count,
        notes: inquiryForm.notes || null,
        selected_items: selectedItems,
        status: 'pending',
        line_user_id: lineUser?.userId || null,
        customer_id: linkedCustomer?.id || null,
      } as never)

    setSubmitting(false)

    if (error) {
      logger.error('Submit error:', error)
      toast.error('送出失敗，請稍後再試')
      return
    }

    // 成功！顯示追蹤連結
    const url = `${window.location.origin}/p/wishlist/track/${code}`
    setTrackingCode(code)
    setTrackingUrl(url)
    setShowInquiryForm(false)
    setSubmitSuccess(true)
    
    // 如果有 LINE 登入，推播追蹤連結給客人
    if (lineUser?.userId) {
      try {
        await fetch('/api/line/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: lineUser.userId,
            message: `感謝您的詢價！🎉\n\n您選擇了 ${selectedItems.length} 個景點，我們會盡快與您聯繫。\n\n📋 追蹤連結：\n${url}\n\n追蹤碼：${code}`,
          }),
        })
      } catch {
        // 推播失敗不影響主流程
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900">
        <MapPin className="w-16 h-16 text-white/20 mb-4" />
        <p className="text-xl font-medium mb-2 text-white">找不到此頁面</p>
        <p className="text-white/60 mb-6">此頁面可能已下架或連結錯誤</p>
        <Link href="/p/wishlist">
          <Button>返回首頁</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-sm border-b border-white/10 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/p/wishlist" className="text-white/60 hover:text-white">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-white">{companyInfo.name}</h1>
          </div>
          {companyInfo.phone && (
            <a href={`tel:${companyInfo.phone}`} className="flex items-center gap-1 text-sm text-white/60 hover:text-white">
              <Phone className="w-4 h-4" />
              {companyInfo.phone}
            </a>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* 左側：景點列表 */}
          <div className="flex-1">
            {/* 標題 */}
            <div className="mb-6">
              <h2 className="text-3xl font-bold mb-2 text-white">{template?.name}</h2>
              {template?.description && (
                <p className="text-white/60">{template.description}</p>
              )}
            </div>

            {/* 景點卡片 */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {filteredItems.map(item => {
                const isSelected = selectedItems.some(s => s.item_id === item.id)
                
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleItem(item)}
                    className={`
                      relative bg-white/5 backdrop-blur-sm border rounded-xl overflow-hidden cursor-pointer transition-all
                      ${isSelected 
                        ? 'ring-2 ring-primary border-primary bg-primary/10' 
                        : 'border-white/10 hover:border-white/30 hover:bg-white/10'
                      }
                    `}
                  >
                    {/* 圖片 */}
                    <div className="aspect-[4/3] bg-slate-800 relative">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <MapPin className="w-10 h-10 text-white/20" />
                        </div>
                      )}
                      
                      {/* 選中標記 */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg">
                          <Check className="w-5 h-5 text-white" />
                        </div>
                      )}

                      {/* 分類標籤 */}
                      {item.category && (
                        <Badge className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm text-white text-xs border-0">
                          {item.category}
                        </Badge>
                      )}
                    </div>

                    {/* 資訊 */}
                    <div className="p-3">
                      <h3 className="font-medium text-white line-clamp-1">{item.name}</h3>
                      {item.region && (
                        <p className="text-xs text-white/50">{item.region}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 右側：已選景點 */}
          <div className="w-80 flex-shrink-0">
            <div className="sticky top-24 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5">
              <h3 className="font-bold text-lg mb-1 text-white">已選景點</h3>
              <p className="text-sm text-white/50 mb-4">{selectedItems.length} 個景點</p>

              {selectedItems.length === 0 ? (
                <div className="py-8 text-center text-white/40">
                  <p className="text-sm">點擊景點卡片加入清單</p>
                </div>
              ) : (
                <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                  {selectedItems.map((item, index) => (
                    <div
                      key={item.item_id}
                      className="flex items-center gap-2 p-2 bg-white/5 rounded-lg group"
                    >
                      <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-medium">
                        {index + 1}
                      </span>
                      <span className="flex-1 text-sm truncate text-white">{item.name}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeItem(item.item_id)
                        }}
                        className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-morandi-red transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* LINE 登入狀態 */}
              {!lineLoading && (
                <div className="mb-4">
                  {lineUser ? (
                    <div className="flex items-center gap-2 p-2 bg-morandi-green/10 border border-morandi-green/20 rounded-lg">
                      {lineUser.pictureUrl && (
                        <img src={lineUser.pictureUrl} alt="" className="w-8 h-8 rounded-full" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-morandi-green truncate">{lineUser.displayName}</p>
                        <p className="text-xs text-morandi-green/60">已連結 LINE</p>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full border-[#06C755] text-[#06C755] hover:bg-[#06C755] hover:text-white"
                      onClick={() => {
                        window.location.href = `/api/auth/line?redirect=/p/wishlist/${slug}`
                      }}
                    >
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                      </svg>
                      用 LINE 登入接收通知
                    </Button>
                  )}
                </div>
              )}

              <Button
                className="w-full"
                size="lg"
                disabled={selectedItems.length === 0}
                onClick={() => {
                  if (!lineUser) {
                    // 強制 LINE 登入
                    window.location.href = `/api/auth/line?redirect=/p/wishlist/${slug}`
                    return
                  }
                  // 已登入，檢查是否已綁定客戶
                  if (linkedCustomer) {
                    // 已綁定，直接打開表單
                    setShowInquiryForm(true)
                  } else {
                    // 未綁定，先進行客戶比對
                    setShowMatchDialog(true)
                  }
                }}
              >
                <Send className="w-4 h-4 mr-2" />
                {!lineUser ? '登入 LINE 後送出' : '送出詢價'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 詢價表單 Dialog */}
      <Dialog open={showInquiryForm} onOpenChange={setShowInquiryForm}>
        <DialogContent level={1} className="max-w-md">
          <DialogHeader>
            <DialogTitle>填寫聯絡資訊</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* LINE 登入提示 */}
            {!lineUser && (
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-sm text-muted-foreground mb-2">登入 LINE 可自動接收追蹤通知</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#06C755] text-[#06C755] hover:bg-[#06C755] hover:text-white"
                  onClick={() => {
                    window.location.href = `/api/auth/line?redirect=/p/wishlist/${slug}`
                  }}
                >
                  <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                  </svg>
                  LINE 登入
                </Button>
              </div>
            )}
            
            {lineUser && (
              <div className="flex items-center gap-2 p-2 bg-morandi-green/10 border border-morandi-green/30 rounded-lg">
                {lineUser.pictureUrl && (
                  <img src={lineUser.pictureUrl} alt="" className="w-8 h-8 rounded-full" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium text-morandi-green">{lineUser.displayName}</p>
                  <p className="text-xs text-morandi-green">送出後會自動傳送追蹤連結到您的 LINE</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>姓名 *</Label>
              <Input
                value={inquiryForm.name}
                onChange={(e) => setInquiryForm(p => ({ ...p, name: e.target.value }))}
                placeholder="您的姓名"
              />
            </div>

            <div className="space-y-2">
              <Label>電話 *</Label>
              <Input
                value={inquiryForm.phone}
                onChange={(e) => setInquiryForm(p => ({ ...p, phone: e.target.value }))}
                placeholder="0912-345-678"
              />
              <p className="text-xs text-muted-foreground">我們會用此電話與您聯繫</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>預計出發日期</Label>
                <Input
                  type="date"
                  value={inquiryForm.travel_date}
                  onChange={(e) => setInquiryForm(p => ({ ...p, travel_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>人數</Label>
                <Input
                  type="number"
                  min={1}
                  value={inquiryForm.people_count}
                  onChange={(e) => setInquiryForm(p => ({ ...p, people_count: parseInt(e.target.value) || 1 }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>其他需求</Label>
              <Textarea
                value={inquiryForm.notes}
                onChange={(e) => setInquiryForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="有什麼特別想要的行程安排嗎？"
                rows={3}
              />
            </div>

            {/* 已選景點預覽 */}
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm font-medium mb-2">已選 {selectedItems.length} 個景點：</p>
              <div className="flex flex-wrap gap-1">
                {selectedItems.slice(0, 5).map(item => (
                  <Badge key={item.item_id} variant="outline" className="text-xs">
                    {item.name}
                  </Badge>
                ))}
                {selectedItems.length > 5 && (
                  <Badge variant="outline" className="text-xs">
                    +{selectedItems.length - 5} 更多
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowInquiryForm(false)}>
              取消
            </Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  送出中...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  送出詢價
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 客戶比對 Dialog（首次使用者填姓名+生日比對） */}
      <Dialog open={showMatchDialog} onOpenChange={setShowMatchDialog}>
        <DialogContent level={1} className="max-w-md">
          <DialogHeader>
            <DialogTitle>確認您的身份</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              請填寫您的姓名和生日，我們會確認您是否為老客戶
            </p>
            
            <div className="space-y-2">
              <Label>姓名 *</Label>
              <Input
                value={matchForm.name}
                onChange={(e) => setMatchForm(p => ({ ...p, name: e.target.value }))}
                placeholder="請輸入真實姓名"
              />
            </div>
            
            <div className="space-y-2">
              <Label>生日（選填，用於確認身份）</Label>
              <Input
                type="date"
                value={matchForm.birthDate}
                onChange={(e) => setMatchForm(p => ({ ...p, birthDate: e.target.value }))}
              />
            </div>

            {/* 比對結果 */}
            {matchingCustomers.length > 0 && (
              <div className="bg-status-info/10 border border-status-info/30 rounded-lg p-3">
                <p className="text-sm font-medium text-morandi-primary mb-2">找到可能是您的帳號：</p>
                {matchingCustomers.map(c => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-2 bg-white rounded border cursor-pointer hover:border-primary"
                    onClick={async () => {
                      // 綁定到這個客戶
                      const res = await fetch('/api/customers/link-line', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          customerId: c.id,
                          lineUserId: lineUser?.userId,
                        }),
                      })
                      const data = await res.json()
                      if (data.customer) {
                        setLinkedCustomer(data.customer)
                        setInquiryForm(prev => ({
                          ...prev,
                          name: data.customer.name,
                          phone: data.customer.phone || '',
                        }))
                        setShowMatchDialog(false)
                        setShowInquiryForm(true)
                        toast.success(`歡迎回來，${data.customer.name}！`)
                      }
                    }}
                  >
                    <div>
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.phone ? `電話：${c.phone.slice(0, 4)}****` : '客戶編號：' + c.code}</p>
                    </div>
                    <Button size="sm" variant="outline">這是我</Button>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground mt-2">
                  如果都不是您，請點「新客戶」建立新帳號
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={async () => {
                if (!matchForm.name) {
                  toast.error('請輸入姓名')
                  return
                }
                // 查詢比對
                const res = await fetch('/api/customers/match', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    name: matchForm.name,
                    birthDate: matchForm.birthDate || undefined,
                    workspaceId: template?.workspace_id,
                  }),
                })
                const data = await res.json()
                if (data.matches && data.matches.length > 0) {
                  setMatchingCustomers(data.matches)
                } else {
                  toast.info('沒有找到符合的客戶，將為您建立新帳號')
                  // 建立新客戶
                  const createRes = await fetch('/api/customers/link-line', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      lineUserId: lineUser?.userId,
                      name: matchForm.name,
                      workspaceId: template?.workspace_id,
                    }),
                  })
                  const createData = await createRes.json()
                  if (createData.customer) {
                    setLinkedCustomer(createData.customer)
                    setInquiryForm(prev => ({ ...prev, name: createData.customer.name }))
                    setShowMatchDialog(false)
                    setShowInquiryForm(true)
                  }
                }
              }}
            >
              查詢
            </Button>
            <Button
              className="flex-1"
              onClick={async () => {
                if (!matchForm.name) {
                  toast.error('請輸入姓名')
                  return
                }
                // 直接建立新客戶
                const res = await fetch('/api/customers/link-line', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    lineUserId: lineUser?.userId,
                    name: matchForm.name,
                    workspaceId: template?.workspace_id,
                  }),
                })
                const data = await res.json()
                if (data.customer) {
                  setLinkedCustomer(data.customer)
                  setInquiryForm(prev => ({ ...prev, name: data.customer.name }))
                  setShowMatchDialog(false)
                  setShowInquiryForm(true)
                  toast.success('帳號已建立！')
                }
              }}
            >
              我是新客戶
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 成功畫面 Dialog */}
      <Dialog open={submitSuccess} onOpenChange={setSubmitSuccess}>
        <DialogContent level={1} className="max-w-md text-center">
          <div className="py-6">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-morandi-green/10 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-morandi-green" />
            </div>
            
            <h2 className="text-2xl font-bold mb-2">詢價單已送出！</h2>
            <p className="text-muted-foreground mb-6">
              我們會盡快與您聯繫。您可以保存以下連結，隨時查看進度。
            </p>

            {/* QR Code */}
            <div className="bg-white rounded-xl p-6 mb-6 inline-block mx-auto">
              <QRCodeSVG 
                value={trackingUrl} 
                size={180}
                level="M"
                includeMargin={false}
              />
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">
              用手機掃描 QR Code 保存追蹤連結
            </p>

            {/* 追蹤連結 */}
            <div className="bg-muted rounded-lg p-4 mb-6">
              <p className="text-xs text-muted-foreground mb-2">或複製連結：</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-white px-2 py-1.5 rounded border truncate">
                  {trackingUrl}
                </code>
                <Button size="icon" variant="outline" className="h-8 w-8" onClick={copyTrackingUrl}>
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                追蹤碼：<strong>{trackingCode}</strong>
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => {
                setSubmitSuccess(false)
                setSelectedItems([])
                setInquiryForm({ name: '', phone: '', travel_date: '', people_count: 2, notes: '' })
              }}>
                繼續選景點
              </Button>
              <Button className="flex-1" onClick={() => router.push(`/p/wishlist/track/${trackingCode}`)}>
                查看進度
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
