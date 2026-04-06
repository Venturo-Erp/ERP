'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, User, CreditCard, Plane, Building, FileText, DollarSign } from 'lucide-react'
import { DateCell, CurrencyCell } from '@/components/table-cells'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/utils/logger'
import { ID_LABELS } from './constants/labels'

interface MemberDetail {
  id: string
  chinese_name: string | null
  passport_name: string | null
  passport_number: string | null
  passport_expiry: string | null
  gender: string | null
  birth_date: string | null
  age: number | null
  id_number: string | null
  member_type: string
  identity: string | null
  special_meal: string | null
  pnr: string | null
  remarks: string | null
  // 財務
  selling_price: number | null
  deposit_amount: number | null
  balance_amount: number | null
  deposit_receipt_no: string | null
  balance_receipt_no: string | null
  // 住宿
  hotel_1_name: string | null
  hotel_1_checkin: string | null
  hotel_1_checkout: string | null
  hotel_2_name: string | null
  hotel_2_checkin: string | null
  hotel_2_checkout: string | null
  // 關聯
  order_id: string
  tour?: {
    id: string
    code: string
    name: string
    departure_date: string | null
    return_date: string | null
  }
}

export default function MemberDetailPage() {
  const params = useParams()
  const router = useRouter()
  const memberId = params.id as string

  const [member, setMember] = useState<MemberDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadMember() {
      // 1. 取得成員資料
      const { data: memberData, error: memberError } = await supabase
        .from('order_members')
        .select(
          'id, order_id, chinese_name, passport_name, gender, age, birth_date, identity, member_type, id_number, passport_number, passport_expiry, pnr, hotel_1_name, hotel_1_checkin, hotel_1_checkout, hotel_2_name, hotel_2_checkin, hotel_2_checkout, selling_price, cost_price, profit, deposit_amount, balance_amount, deposit_receipt_no, balance_receipt_no, special_meal, remarks, workspace_id'
        )
        .eq('id', memberId)
        .single()

      if (memberError || !memberData) {
        logger.error('Failed to load member:', memberError)
        setIsLoading(false)
        return
      }

      // 2. 取得訂單和團資料
      const { data: orderData } = await supabase
        .from('orders')
        .select('tour_id')
        .eq('id', memberData.order_id)
        .single()

      let tourInfo: MemberDetail['tour'] = undefined

      if (orderData?.tour_id) {
        const { data: tourData } = await supabase
          .from('tours')
          .select('id, code, name, departure_date, return_date')
          .eq('id', orderData.tour_id)
          .single()

        if (tourData) {
          tourInfo = tourData
        }
      }

      setMember({
        ...memberData,
        tour: tourInfo,
      })
      setIsLoading(false)
    }

    loadMember()
  }, [memberId])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-morandi-gold" />
      </div>
    )
  }

  if (!member) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-morandi-secondary">{ID_LABELS.NOT_FOUND_5568}</p>
        <button onClick={() => router.back()} className="text-morandi-gold">
          {ID_LABELS.BACK}
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-morandi-container transition-colors -ml-2"
          >
            <ArrowLeft size={20} className="text-morandi-primary" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-morandi-primary">
              {member.chinese_name || member.passport_name || '未命名'}
            </h1>
            {member.tour && (
              <Link href={`/m/tours/${member.tour.id}`} className="text-sm text-morandi-gold">
                {member.tour.code}
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 基本資料 */}
        <section className="bg-card rounded-xl border border-border p-4">
          <h2 className="font-bold text-morandi-primary mb-3 flex items-center gap-2">
            <User size={18} className="text-morandi-gold" />
            {ID_LABELS.LABEL_974}
          </h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <InfoItem label={ID_LABELS.LABEL_9768} value={member.chinese_name} />
            <InfoItem label={ID_LABELS.LABEL_739} value={member.passport_name} />
            <InfoItem label={ID_LABELS.LABEL_2195} value={formatGender(member.gender)} />
            <InfoItem label={ID_LABELS.LABEL_7004} value={member.age ? `${member.age} 歲` : null} />
            <InfoItem label={ID_LABELS.LABEL_8658} value={member.birth_date} isDate />
            <InfoItem label={ID_LABELS.LABEL_8725} value={member.identity} />
            <InfoItem label={ID_LABELS.TYPE} value={formatMemberType(member.member_type)} />
            <InfoItem label={ID_LABELS.LABEL_8408} value={member.id_number} />
          </div>
        </section>

        {/* 護照資料 */}
        <section className="bg-card rounded-xl border border-border p-4">
          <h2 className="font-bold text-morandi-primary mb-3 flex items-center gap-2">
            <CreditCard size={18} className="text-morandi-gold" />
            {ID_LABELS.LABEL_2477}
          </h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <InfoItem
              label={ID_LABELS.LABEL_5147}
              value={member.passport_number}
              className="col-span-2"
            />
            <InfoItem label={ID_LABELS.LABEL_4167} value={member.passport_expiry} isDate />
            <InfoItem label="PNR" value={member.pnr} />
          </div>
        </section>

        {/* 團體資訊 */}
        {member.tour && (
          <section className="bg-card rounded-xl border border-border p-4">
            <h2 className="font-bold text-morandi-primary mb-3 flex items-center gap-2">
              <Plane size={18} className="text-morandi-gold" />
              {ID_LABELS.LABEL_5172}
            </h2>
            <Link
              href={`/m/tours/${member.tour.id}`}
              className="block p-3 bg-morandi-container/30 rounded-lg hover:bg-morandi-container/50 transition-colors"
            >
              <div className="font-medium text-morandi-primary">{member.tour.code}</div>
              <div className="text-sm text-morandi-secondary mt-1">{member.tour.name}</div>
              <div className="flex items-center gap-1 text-sm text-morandi-secondary mt-1">
                <DateCell date={member.tour.departure_date} showIcon={false} /> -{' '}
                <DateCell date={member.tour.return_date} showIcon={false} />
              </div>
            </Link>
          </section>
        )}

        {/* 住宿資訊 */}
        {(member.hotel_1_name || member.hotel_2_name) && (
          <section className="bg-card rounded-xl border border-border p-4">
            <h2 className="font-bold text-morandi-primary mb-3 flex items-center gap-2">
              <Building size={18} className="text-morandi-gold" />
              {ID_LABELS.LABEL_8617}
            </h2>
            <div className="space-y-3">
              {member.hotel_1_name && (
                <div className="p-3 bg-morandi-container/30 rounded-lg">
                  <div className="font-medium text-morandi-primary">{member.hotel_1_name}</div>
                  <div className="flex items-center gap-1 text-sm text-morandi-secondary mt-1">
                    <DateCell date={member.hotel_1_checkin} showIcon={false} /> -{' '}
                    <DateCell date={member.hotel_1_checkout} showIcon={false} />
                  </div>
                </div>
              )}
              {member.hotel_2_name && (
                <div className="p-3 bg-morandi-container/30 rounded-lg">
                  <div className="font-medium text-morandi-primary">{member.hotel_2_name}</div>
                  <div className="flex items-center gap-1 text-sm text-morandi-secondary mt-1">
                    <DateCell date={member.hotel_2_checkin} showIcon={false} /> -{' '}
                    <DateCell date={member.hotel_2_checkout} showIcon={false} />
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* 財務資訊 */}
        <section className="bg-card rounded-xl border border-border p-4">
          <h2 className="font-bold text-morandi-primary mb-3 flex items-center gap-2">
            <DollarSign size={18} className="text-morandi-gold" />
            {ID_LABELS.LABEL_2004}
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-morandi-secondary">{ID_LABELS.LABEL_561}</span>
              <span className="font-medium text-morandi-primary">
                {member.selling_price !== null ? (
                  <CurrencyCell amount={member.selling_price} />
                ) : (
                  '-'
                )}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-morandi-secondary">
                訂金 {member.deposit_receipt_no && `(${member.deposit_receipt_no})`}
              </span>
              <span className="font-medium text-morandi-green">
                {member.deposit_amount !== null ? (
                  <CurrencyCell amount={member.deposit_amount} variant="income" />
                ) : (
                  '-'
                )}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-morandi-secondary">
                尾款 {member.balance_receipt_no && `(${member.balance_receipt_no})`}
              </span>
              <span
                className={cn(
                  'font-medium',
                  member.balance_amount && member.balance_amount > 0
                    ? 'text-status-warning'
                    : 'text-morandi-green'
                )}
              >
                {member.balance_amount !== null ? (
                  <CurrencyCell
                    amount={member.balance_amount}
                    variant={
                      member.balance_amount && member.balance_amount > 0 ? 'expense' : 'income'
                    }
                  />
                ) : (
                  '-'
                )}
              </span>
            </div>
          </div>
        </section>

        {/* 特殊需求 */}
        {(member.special_meal || member.remarks) && (
          <section className="bg-card rounded-xl border border-border p-4">
            <h2 className="font-bold text-morandi-primary mb-3 flex items-center gap-2">
              <FileText size={18} className="text-morandi-gold" />
              {ID_LABELS.LABEL_1075}
            </h2>
            <div className="space-y-3 text-sm">
              {member.special_meal && (
                <div>
                  <div className="text-morandi-secondary mb-1">{ID_LABELS.LABEL_6650}</div>
                  <div className="text-morandi-primary">{member.special_meal}</div>
                </div>
              )}
              {member.remarks && (
                <div>
                  <div className="text-morandi-secondary mb-1">{ID_LABELS.REMARKS}</div>
                  <div className="text-morandi-primary whitespace-pre-wrap">{member.remarks}</div>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

// 資訊項目組件
function InfoItem({
  label,
  value,
  className,
  isDate,
}: {
  label: string
  value: string | number | null | undefined
  className?: string
  isDate?: boolean
}) {
  return (
    <div className={className}>
      <div className="text-morandi-secondary text-xs mb-0.5">{label}</div>
      <div className="text-morandi-primary">
        {isDate && value ? <DateCell date={String(value)} showIcon={false} /> : value || '-'}
      </div>
    </div>
  )
}

// 格式化函數
function formatGender(gender: string | null): string {
  if (!gender) return '-'
  switch (gender.toUpperCase()) {
    case 'M':
    case 'MALE':
      return '男'
    case 'F':
    case 'FEMALE':
      return '女'
    default:
      return gender
  }
}

function formatMemberType(type: string): string {
  switch (type) {
    case 'adult':
      return '成人'
    case 'child':
      return '小孩'
    case 'infant':
      return '嬰兒'
    case 'child_no_bed':
      return '小孩不佔床'
    default:
      return type
  }
}
