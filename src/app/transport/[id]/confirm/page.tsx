/**
 * 車行填寫司機資訊頁面（公開）
 * /transport/[id]/confirm
 */

import { createClient } from '@supabase/supabase-js'
import { TransportConfirmForm } from './TransportConfirmForm'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function TransportConfirmPage({ params }: PageProps) {
  const { id } = await params

  // 查詢交通項目 + 團資訊
  const { data: item, error } = await supabase
    .from('tour_itinerary_items')
    .select(
      `
      id,
      title,
      supplier_name,
      estimated_cost,
      driver_name,
      driver_phone,
      vehicle_plate,
      vehicle_type,
      booking_confirmed_at,
      tour:tours (
        code,
        name,
        departure_date,
        current_participants
      )
    `
    )
    .eq('id', id)
    .single()

  if (error || !item) {
    return (
      <div className="min-h-screen bg-morandi-container flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-xl font-bold text-morandi-primary mb-2">找不到預訂資訊</h1>
          <p className="text-morandi-secondary">連結可能已失效或預訂已取消</p>
        </div>
      </div>
    )
  }

  // 已確認
  if (item.booking_confirmed_at) {
    return (
      <div className="min-h-screen bg-morandi-container flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-xl font-bold text-morandi-primary mb-2">已確認</h1>
          <p className="text-morandi-secondary mb-4">司機資訊已提交，感謝您的配合！</p>
          <div className="bg-morandi-container rounded-lg p-4 text-left text-sm">
            <div className="grid grid-cols-2 gap-2">
              <span className="text-morandi-secondary">司機姓名</span>
              <span className="font-medium">{item.driver_name || '-'}</span>
              <span className="text-morandi-secondary">司機電話</span>
              <span className="font-medium">{item.driver_phone || '-'}</span>
              <span className="text-morandi-secondary">車牌號碼</span>
              <span className="font-medium">{item.vehicle_plate || '-'}</span>
              <span className="text-morandi-secondary">車款</span>
              <span className="font-medium">{item.vehicle_type || '-'}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const tourData = item.tour as any
  const tour = Array.isArray(tourData) ? tourData[0] : tourData

  return (
    <div className="min-h-screen bg-morandi-container py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="bg-blue-600 text-white rounded-t-lg p-6">
          <h1 className="text-xl font-bold flex items-center gap-2">🚌 遊覽車預訂確認</h1>
          <p className="text-blue-100 text-sm mt-1">請填寫司機資訊以完成預訂</p>
        </div>

        {/* 團資訊 */}
        <div className="bg-white border-x border-border p-6">
          <h2 className="font-medium text-morandi-primary mb-3">團體資訊</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-morandi-secondary">團號</span>
              <div className="font-bold text-lg">{tour?.code || '-'}</div>
            </div>
            <div>
              <span className="text-morandi-secondary">出發日期</span>
              <div className="font-medium">{tour?.departure_date || '-'}</div>
            </div>
            <div className="col-span-2">
              <span className="text-morandi-secondary">團名</span>
              <div className="font-medium">{tour?.name || '-'}</div>
            </div>
            <div>
              <span className="text-morandi-secondary">人數</span>
              <div className="font-medium">{tour?.current_participants || 0} 人</div>
            </div>
            <div>
              <span className="text-morandi-secondary">成交金額</span>
              <div className="font-bold text-blue-600">
                {item.estimated_cost ? `¥${item.estimated_cost.toLocaleString()}` : '-'}
              </div>
            </div>
          </div>
        </div>

        {/* 表單 */}
        <TransportConfirmForm
          itemId={id}
          defaultValues={{
            driver_name: item.driver_name || '',
            driver_phone: item.driver_phone || '',
            vehicle_plate: item.vehicle_plate || '',
            vehicle_type: item.vehicle_type || item.title || '',
          }}
        />
      </div>
    </div>
  )
}
