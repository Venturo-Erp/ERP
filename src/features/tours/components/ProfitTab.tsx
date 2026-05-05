'use client'

/**
 * ProfitTab — 利潤計算表 + 獎金明細（重寫 2026-05-04）
 *
 * 設計：
 * - 利潤計算表：4 列 × 2 欄（未扣營業稅 / 已扣營業稅）
 *   只放總額（收款 / 付款 / 營收 / 利潤）、不混進扣項或獎金
 * - 獎金明細：把所有扣項 + 員工獎金都列在下方（行政費 / 營收稅額 / OP / 業務 / 團隊）
 *   底部以「公司盈餘」收尾
 * - 利潤計算表跟獎金明細不重複任何項目
 */

import { useMemo } from 'react'
import { DollarSign, HandCoins, FileCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Tour } from '@/stores/types'
import {
  useReceipts,
  usePaymentRequests,
  useTourBonusSettings,
  useEmployeeDictionary,
  useMembers,
  useOrdersSlim,
} from '@/data'
import { calculateFullProfit } from '../services/profit-calculation.service'
import {
  BONUS_TYPE_LABELS,
  BONUS_TYPE_BADGE_VARIANTS,
  PROFIT_TABLE_LABELS,
} from '../constants/bonus-labels'
import { BonusSettingType, BonusCalculationType } from '@/types/bonus.types'
import type { TourBonusSetting } from '@/types/bonus.types'
import { TOURS_LABELS } from './constants/labels'

interface ProfitTabProps {
  tour: Tour
}

function formatAmount(amount: number): string {
  return amount.toLocaleString('zh-TW', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

interface SummaryRow {
  label: string
  pre: number
  post: number
}

function SummaryTable({ rows }: { rows: SummaryRow[] }) {
  return (
    <table className="w-full text-sm">
      <thead className="text-xs text-morandi-secondary border-b border-border">
        <tr>
          <th className="text-left px-4 py-2 font-medium">項目</th>
          <th className="text-right px-4 py-2 font-medium w-44">未扣營業稅</th>
          <th className="text-right px-4 py-2 font-medium w-44">已扣營業稅</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => {
          const isLast = i === rows.length - 1
          return (
            <tr
              key={i}
              className={cn(
                'border-b border-border last:border-b-0 hover:bg-morandi-bg/50',
                isLast && 'bg-morandi-container/30'
              )}
            >
              <td className={cn('px-4 py-2 text-morandi-secondary', isLast && 'font-semibold text-morandi-primary')}>
                {row.label}
              </td>
              <td
                className={cn(
                  'px-4 py-2 text-right font-mono tabular-nums',
                  row.pre < 0 ? 'text-morandi-red font-medium' : 'text-morandi-primary',
                  isLast && 'font-semibold'
                )}
              >
                ${formatAmount(row.pre)}
              </td>
              <td
                className={cn(
                  'px-4 py-2 text-right font-mono tabular-nums',
                  row.post < 0 ? 'text-morandi-red font-medium' : 'text-morandi-primary',
                  isLast && 'font-semibold'
                )}
              >
                ${formatAmount(row.post)}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

interface DetailRow {
  type: 'admin' | 'tax' | BonusSettingType
  label: string
  sublabel?: string
  amount: number
  badgeClass?: string
  badgeText?: string
  /** 對應 bonus_setting（OP/SALE/TEAM 才有、admin/tax 是聚合的、沒對應單筆 setting） */
  setting?: TourBonusSetting
  /** 受款人名（員工名 / 「團隊獎金」） */
  payeeName?: string
}

export function ProfitTab({ tour }: ProfitTabProps) {
  const { items: allReceipts } = useReceipts()
  const { items: allMembers } = useMembers()
  const { items: allOrders } = useOrdersSlim()
  const { items: allPaymentRequests } = usePaymentRequests()
  const { items: allBonusSettings } = useTourBonusSettings()
  const { get: getEmployee } = useEmployeeDictionary()

  const orders = useMemo(
    () => allOrders?.filter(o => o.tour_id === tour.id) ?? [],
    [allOrders, tour.id]
  )
  const orderIds = useMemo(() => new Set(orders.map(o => o.id)), [orders])

  const paymentRequests = useMemo(
    () => allPaymentRequests?.filter(pr => pr.tour_id === tour.id) ?? [],
    [allPaymentRequests, tour.id]
  )

  const bonusSettings = useMemo(
    () => allBonusSettings?.filter(s => s.tour_id === tour.id) ?? [],
    [allBonusSettings, tour.id]
  )

  const receipts = useMemo(() => {
    if (!allReceipts) return []
    return allReceipts.filter(r => r.order_id && orderIds.has(r.order_id))
  }, [allReceipts, orderIds])

  const memberCount = useMemo(() => {
    if (!allMembers) return 0
    return allMembers.filter(m => m.order_id && orderIds.has(m.order_id)).length
  }, [allMembers, orderIds])

  const employeeDict = useMemo(() => {
    const dict: Record<string, string> = {}
    for (const s of bonusSettings) {
      if (s.employee_id) {
        const emp = getEmployee(s.employee_id)
        dict[s.employee_id] = emp?.display_name || emp?.chinese_name || s.employee_id
      }
    }
    return dict
  }, [bonusSettings, getEmployee])

  // 排除「獎金類請款」(bonus / 獎金 字樣) 不算進付款總額
  const normalExpenses = useMemo(
    () =>
      paymentRequests.filter(pr => {
        const rt = (pr.request_type || '').toLowerCase()
        return !rt.includes('bonus') && !rt.includes('獎金')
      }),
    [paymentRequests]
  )

  const profitResult = useMemo(() => {
    const adaptedReceipts = receipts.map(r => ({
      ...r,
      receipt_number: r.receipt_number ?? '',
      allocation_mode: 'single' as const,
      payment_items: [],
      total_amount: Number(r.receipt_amount) || 0,
      status: r.status === 'confirmed' ? ('received' as const) : ('pending' as const),
      created_by: r.created_by ?? '',
      updated_at: r.updated_at ?? '',
      created_at: r.created_at ?? '',
    }))

    return calculateFullProfit({
      receipts: adaptedReceipts,
      expenses: normalExpenses.map(pr => ({ amount: pr.amount ?? 0 })),
      settings: bonusSettings,
      memberCount,
      employeeDict,
    })
  }, [receipts, normalExpenses, bonusSettings, memberCount, employeeDict])

  // ===== 利潤計算表 4 列 × 2 欄 =====
  // 未扣稅 vs 已扣稅
  // - 收款 / 付款：稅不影響、兩欄同值
  // - 營收 = 收款 − 付款；(b) = (a) − 稅額
  // - 利潤 = 營收 − 行政費；(b) = 利潤(a) − 稅額
  const grossRevenue = profitResult.receipt_total - profitResult.expense_total
  const profitPreTax = grossRevenue - profitResult.administrative_cost
  const summaryRows: SummaryRow[] = [
    {
      label: '收款總額',
      pre: profitResult.receipt_total,
      post: profitResult.receipt_total,
    },
    {
      label: '付款總額',
      pre: profitResult.expense_total,
      post: profitResult.expense_total,
    },
    {
      label: '營收總額',
      pre: grossRevenue,
      post: grossRevenue - profitResult.profit_tax,
    },
    {
      label: '利潤總額',
      pre: profitPreTax,
      post: profitPreTax - profitResult.profit_tax,
    },
  ]

  // ===== 獎金明細 =====
  // 包含：行政費 + 營收稅額 + 員工獎金 + 團隊獎金
  // 底部：公司盈餘 = 利潤(b) − 所有獎金（calc service 已算好 = company_profit）
  const detailRows: DetailRow[] = []

  if (profitResult.administrative_cost !== 0) {
    detailRows.push({
      type: 'admin',
      label: '行政費用',
      sublabel:
        profitResult.admin_cost_per_person > 0
          ? `${profitResult.admin_cost_per_person} 元/人 × ${profitResult.member_count} 人`
          : '手填寫總額',
      amount: profitResult.administrative_cost,
      badgeClass: 'bg-cat-orange-bg text-cat-orange',
      badgeText: '扣項',
    })
  }
  if (profitResult.profit_tax !== 0) {
    detailRows.push({
      type: 'tax',
      label: '營收稅額',
      sublabel: profitResult.tax_rate > 0 ? `${profitResult.tax_rate}%` : '手填寫總額',
      amount: profitResult.profit_tax,
      badgeClass: 'bg-morandi-red/15 text-morandi-red',
      badgeText: '扣項',
    })
  }

  for (const b of profitResult.employee_bonuses) {
    if (b.amount === 0) continue
    const bonusVal = Number(b.setting.bonus)
    const sublabel =
      b.setting.bonus_type === BonusCalculationType.PERCENT ? `${bonusVal}%` : `$${bonusVal}`
    const employee = b.employee_name ? ` — ${b.employee_name}` : ''
    detailRows.push({
      type: b.setting.type,
      label: `${BONUS_TYPE_LABELS[b.setting.type as BonusSettingType]}${employee}`,
      sublabel,
      amount: b.amount,
      badgeClass: BONUS_TYPE_BADGE_VARIANTS[b.setting.type as BonusSettingType],
      badgeText: '獎金',
      setting: b.setting,
      payeeName:
        b.employee_name || BONUS_TYPE_LABELS[b.setting.type as BonusSettingType],
    })
  }
  for (const b of profitResult.team_bonuses) {
    if (b.amount === 0) continue
    const bonusVal = Number(b.setting.bonus)
    const sublabel =
      b.setting.bonus_type === BonusCalculationType.PERCENT ? `${bonusVal}%` : `$${bonusVal}`
    detailRows.push({
      type: BonusSettingType.TEAM_BONUS,
      label: BONUS_TYPE_LABELS[BonusSettingType.TEAM_BONUS],
      sublabel,
      amount: b.amount,
      badgeClass: BONUS_TYPE_BADGE_VARIANTS[BonusSettingType.TEAM_BONUS],
      badgeText: '獎金',
      setting: b.setting,
      payeeName: BONUS_TYPE_LABELS[BonusSettingType.TEAM_BONUS],
    })
  }

  const netProfit = profitResult.net_profit

  // 已生成請款單 lookup（setting.payment_request_id → request.code）
  // 顯示「已生成 PR-xxx」狀態用、實際生成由「列印並結團」一鍵自動跑
  const requestCodeById = useMemo(() => {
    const map: Record<string, string> = {}
    for (const r of paymentRequests) {
      if (r.id && r.code) map[r.id] = r.code
    }
    return map
  }, [paymentRequests])

  return (
    <div className="space-y-4">
      {/* 利潤計算表 — 只放 4 個總額 */}
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        <div className="px-4 py-2 bg-morandi-gold/10 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-morandi-gold" />
          <span className="text-sm font-medium text-morandi-gold">利潤計算表</span>
        </div>
        <SummaryTable rows={summaryRows} />
      </div>

      {/* 獎金明細 — 扣項 + 員工獎金 + 公司盈餘 */}
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        <div className="px-4 py-2 bg-morandi-secondary/10 flex items-center gap-2">
          <HandCoins className="w-4 h-4 text-morandi-secondary" />
          <span className="text-sm font-medium text-morandi-secondary">
            獎金明細 ({detailRows.length})
          </span>
        </div>
        {netProfit < 0 ? (
          <div className="px-4 py-3 text-status-warning text-sm bg-status-warning-bg/50">
            {PROFIT_TABLE_LABELS.no_bonus}
          </div>
        ) : detailRows.length === 0 ? (
          <div className="px-4 py-12 text-center text-morandi-secondary text-sm">
            <HandCoins size={24} className="mx-auto mb-3 opacity-50" />
            <p>{TOURS_LABELS.SETTINGS_6822}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs text-morandi-secondary border-b border-border">
              <tr>
                <th className="text-left px-4 py-2 font-medium w-20"></th>
                <th className="text-left px-4 py-2 font-medium">項目</th>
                <th className="text-left px-4 py-2 font-medium">說明</th>
                <th className="text-right px-4 py-2 font-medium w-28">金額</th>
                <th className="text-left px-4 py-2 font-medium w-44">請款狀態</th>
              </tr>
            </thead>
            <tbody>
              {detailRows.map((row, i) => {
                const issuedRequestId = row.setting?.payment_request_id ?? null
                const issuedCode = issuedRequestId ? requestCodeById[issuedRequestId] : null
                return (
                  <tr
                    key={i}
                    className="border-b border-border last:border-b-0 hover:bg-morandi-bg/50"
                  >
                    <td className="px-4 py-2 w-20">
                      {row.badgeText && (
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                            row.badgeClass
                          )}
                        >
                          {row.badgeText}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-morandi-primary">{row.label}</td>
                    <td className="px-4 py-2 text-morandi-secondary text-xs">
                      {row.sublabel || ''}
                    </td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-morandi-primary font-medium">
                      ${formatAmount(row.amount)}
                    </td>
                    <td className="px-4 py-2">
                      {!row.setting ? (
                        <span className="text-xs text-morandi-secondary/60">—</span>
                      ) : issuedRequestId ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-morandi-green">
                          <FileCheck className="h-3.5 w-3.5" />
                          已生成 {issuedCode || `(${issuedRequestId.slice(0, 8)})`}
                        </span>
                      ) : (
                        <span className="text-xs text-morandi-secondary/60">
                          結團時自動生成
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
              <tr className="border-t-2 border-border bg-morandi-container/30">
                <td className="px-4 py-3" colSpan={3}>
                  <span className="text-sm font-semibold text-morandi-primary">公司盈餘</span>
                  <span className="text-xs text-morandi-secondary ml-2">
                    （利潤(已扣稅) − 所有獎金）
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums font-bold text-base text-morandi-gold">
                  ${formatAmount(profitResult.company_profit)}
                </td>
                <td className="px-4 py-3" />
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
