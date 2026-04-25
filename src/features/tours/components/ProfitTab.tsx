'use client'

import { useMemo } from 'react'
import { DollarSign, HandCoins } from 'lucide-react'
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
import {
  calculateFullProfit,
  generateProfitTableData,
} from '../services/profit-calculation.service'
import {
  BONUS_TYPE_LABELS,
  BONUS_TYPE_BADGE_VARIANTS,
  PROFIT_TAB_LABELS,
  PROFIT_TABLE_LABELS,
} from '../constants/bonus-labels'
import { BonusSettingType } from '@/types/bonus.types'
import type { ProfitTableRow } from '@/types/bonus.types'
import { TOURS_LABELS } from './constants/labels'

interface ProfitTabProps {
  tour: Tour
}

function formatAmount(amount: number): string {
  return amount.toLocaleString('zh-TW', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function ProfitTableColumn({ title, rows }: { title: string; rows: ProfitTableRow[] }) {
  return (
    <div className="flex-1">
      <div className="bg-morandi-container/30 px-4 py-2 text-xs font-medium text-morandi-secondary border-b border-border">
        {title}
      </div>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="border-b border-border last:border-b-0 hover:bg-morandi-bg/50"
            >
              <td className="px-4 py-2 text-morandi-secondary">{row.label}</td>
              <td
                className={cn(
                  'px-4 py-2 text-right font-mono tabular-nums',
                  row.amount < 0 ? 'text-morandi-red font-medium' : 'text-morandi-primary'
                )}
              >
                ${formatAmount(row.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ProfitTab({ tour }: ProfitTabProps) {
  const { items: allReceipts } = useReceipts()
  const { items: allMembers } = useMembers()
  const { items: allOrders } = useOrdersSlim()
  const { items: allPaymentRequests } = usePaymentRequests()
  const { items: allBonusSettings } = useTourBonusSettings()
  const { get: getEmployee } = useEmployeeDictionary()

  // Filter orders for this tour
  const orders = useMemo(
    () => allOrders?.filter(o => o.tour_id === tour.id) ?? [],
    [allOrders, tour.id]
  )

  // Order IDs for this tour
  const orderIds = useMemo(() => {
    return new Set(orders.map(o => o.id))
  }, [orders])

  const paymentRequests = useMemo(
    () => allPaymentRequests?.filter(pr => pr.tour_id === tour.id) ?? [],
    [allPaymentRequests, tour.id]
  )

  const bonusSettings = useMemo(
    () => allBonusSettings?.filter(s => s.tour_id === tour.id) ?? [],
    [allBonusSettings, tour.id]
  )

  // Filter receipts by order IDs belonging to this tour
  const receipts = useMemo(() => {
    if (!allReceipts) return []
    return allReceipts.filter(r => r.order_id && orderIds.has(r.order_id))
  }, [allReceipts, orderIds])

  // Filter members by order IDs
  const memberCount = useMemo(() => {
    if (!allMembers) return 0
    return allMembers.filter(m => m.order_id && orderIds.has(m.order_id)).length
  }, [allMembers, orderIds])

  // Build employee dictionary
  const employeeDict = useMemo(() => {
    if (!bonusSettings) return {}
    const dict: Record<string, string> = {}
    for (const s of bonusSettings) {
      if (s.employee_id) {
        const emp = getEmployee(s.employee_id)
        dict[s.employee_id] = emp?.display_name || emp?.chinese_name || s.employee_id
      }
    }
    return dict
  }, [bonusSettings, getEmployee])

  // Separate expenses: exclude bonus-type payment requests
  const { normalExpenses, bonusExpenses } = useMemo(() => {
    if (!paymentRequests) return { normalExpenses: [], bonusExpenses: [] }
    const normal: typeof paymentRequests = []
    const bonus: typeof paymentRequests = []
    for (const pr of paymentRequests) {
      const rt = (pr.request_type || '').toLowerCase()
      if (rt.includes('bonus') || rt.includes('獎金')) {
        bonus.push(pr)
      } else {
        normal.push(pr)
      }
    }
    return { normalExpenses: normal, bonusExpenses: bonus }
  }, [paymentRequests])

  // Calculate profit — receipts 已有正確欄位
  const profitResult = useMemo(() => {
    const adaptedReceipts = (receipts ?? []).map(r => ({
      ...r,
      receipt_number: r.receipt_number ?? '',
      allocation_mode: 'single' as const,
      payment_items: [],
      total_amount: Number(r.receipt_amount) || Number(r.amount) || 0,
      status: r.status === 'confirmed' ? ('received' as const) : ('pending' as const),
      created_by: r.created_by ?? '',
      updated_at: r.updated_at ?? '',
      created_at: r.created_at ?? '',
    }))

    return calculateFullProfit({
      receipts: adaptedReceipts,
      expenses: (normalExpenses ?? []).map(pr => ({
        amount: pr.amount ?? 0,
      })),
      settings: bonusSettings ?? [],
      memberCount,
      employeeDict,
    })
  }, [receipts, normalExpenses, bonusSettings, memberCount, employeeDict])

  const { left, right } = useMemo(() => generateProfitTableData(profitResult), [profitResult])
  const allBonuses = [...profitResult.team_bonuses, ...profitResult.employee_bonuses]
  const netProfit = profitResult.net_profit

  return (
    <div className="space-y-4">
      {/* 利潤計算 — 跟 TourReceipts/TourCosts 同樣的卡片風格、金色主題 */}
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        <div className="px-4 py-2 bg-morandi-gold/10 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-morandi-gold" />
          <span className="text-sm font-medium text-morandi-gold">
            {PROFIT_TAB_LABELS.profit_table}
          </span>
          <span
            className={cn(
              'ml-auto text-xs font-mono tabular-nums font-medium',
              netProfit >= 0 ? 'text-morandi-green' : 'text-morandi-red'
            )}
          >
            {PROFIT_TAB_LABELS.bonus_detail.replace('明細', '')}：
            {netProfit >= 0 ? '+' : ''}${formatAmount(netProfit)}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
          <ProfitTableColumn title={PROFIT_TAB_LABELS.left_column} rows={left} />
          <ProfitTableColumn title={PROFIT_TAB_LABELS.right_column} rows={right} />
        </div>
      </div>

      {/* 獎金明細 */}
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        <div className="px-4 py-2 bg-morandi-secondary/10 flex items-center gap-2">
          <HandCoins className="w-4 h-4 text-morandi-secondary" />
          <span className="text-sm font-medium text-morandi-secondary">
            {PROFIT_TAB_LABELS.bonus_detail} ({allBonuses.length + bonusExpenses.length})
          </span>
        </div>
        {netProfit < 0 ? (
          <div className="px-4 py-3 text-status-warning text-sm bg-status-warning-bg/50">
            {PROFIT_TABLE_LABELS.no_bonus}
          </div>
        ) : allBonuses.length === 0 && bonusExpenses.length === 0 ? (
          <div className="px-4 py-12 text-center text-morandi-secondary text-sm">
            <HandCoins size={24} className="mx-auto mb-3 opacity-50" />
            <p>{TOURS_LABELS.SETTINGS_6822}</p>
          </div>
        ) : (
          <>
            {allBonuses.length > 0 && (
              <table className="w-full text-sm">
                <thead className="border-b border-border">
                  <tr className="text-xs text-morandi-secondary">
                    <th className="text-left px-4 py-2 font-medium">{TOURS_LABELS.TYPE}</th>
                    <th className="text-left px-4 py-2 font-medium">{TOURS_LABELS.LABEL_2076}</th>
                    <th className="text-right px-4 py-2 font-medium">{TOURS_LABELS.AMOUNT}</th>
                  </tr>
                </thead>
                <tbody>
                  {allBonuses.map((b, i) => (
                    <tr
                      key={i}
                      className="border-b border-border last:border-b-0 hover:bg-morandi-bg/50"
                    >
                      <td className="px-4 py-2">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                            BONUS_TYPE_BADGE_VARIANTS[b.setting.type as BonusSettingType] || ''
                          )}
                        >
                          {BONUS_TYPE_LABELS[b.setting.type as BonusSettingType]}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-morandi-secondary">{b.employee_name || '-'}</td>
                      <td className="px-4 py-2 text-right font-mono tabular-nums text-morandi-primary font-medium">
                        ${formatAmount(b.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {bonusExpenses.length > 0 && (
              <>
                <div className="px-4 py-2 bg-morandi-container/30 text-xs font-medium text-morandi-secondary border-y border-border">
                  {TOURS_LABELS.LABEL_8378}
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {bonusExpenses.map(pr => (
                      <tr
                        key={pr.id}
                        className="border-b border-border last:border-b-0 hover:bg-morandi-bg/50"
                      >
                        <td className="px-4 py-2 text-morandi-secondary">
                          {pr.code || pr.request_number || '-'}
                        </td>
                        <td className="px-4 py-2 text-morandi-secondary">
                          {pr.supplier_name || '-'}
                        </td>
                        <td className="px-4 py-2 text-right font-mono tabular-nums text-morandi-red font-medium">
                          -${formatAmount(pr.amount ?? 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
