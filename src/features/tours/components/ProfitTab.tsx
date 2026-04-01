'use client'

import { useMemo } from 'react'
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
    <div className="flex-1 min-w-[280px]">
      <h4 className="text-sm font-semibold mb-2 text-muted-foreground">{title}</h4>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={i > 0 ? 'border-t' : ''}>
                <td className="px-3 py-2">{row.label}</td>
                <td
                  className={`px-3 py-2 text-right font-mono tabular-nums ${row.amount < 0 ? 'text-morandi-red' : ''}`}
                >
                  ${formatAmount(row.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
      status: r.status === '1' ? 'received' as const : 'pending' as const,
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

  return (
    <div className="space-y-6">
      {/* 收入明細 */}
      <section>
        <h3 className="text-base font-semibold mb-2">{PROFIT_TAB_LABELS.income_detail}</h3>
        {receipts && receipts.length > 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">{TOURS_LABELS.LABEL_116}</th>
                  <th className="text-left px-3 py-2 font-medium">{TOURS_LABELS.DATE}</th>
                  <th className="text-right px-3 py-2 font-medium">{TOURS_LABELS.AMOUNT}</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map(r => (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2">{r.receipt_number}</td>
                    <td className="px-3 py-2">{r.receipt_date}</td>
                    <td className="px-3 py-2 text-right font-mono">
                      ${formatAmount(Number(r.receipt_amount) || Number(r.amount))}
                    </td>
                  </tr>
                ))}
                <tr className="border-t bg-muted/30 font-medium">
                  <td className="px-3 py-2" colSpan={2}>
                    {TOURS_LABELS.LABEL_1423}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    ${formatAmount(profitResult.receipt_total)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-muted-foreground text-sm py-4 text-center">
            {TOURS_LABELS.LABEL_7189}
          </div>
        )}
      </section>

      {/* 支出明細 */}
      <section>
        <h3 className="text-base font-semibold mb-2">{PROFIT_TAB_LABELS.expense_detail}</h3>
        {normalExpenses.length > 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">{TOURS_LABELS.LABEL_9671}</th>
                  <th className="text-left px-3 py-2 font-medium">{TOURS_LABELS.LABEL_1552}</th>
                  <th className="text-right px-3 py-2 font-medium">{TOURS_LABELS.AMOUNT}</th>
                </tr>
              </thead>
              <tbody>
                {normalExpenses.map(pr => (
                  <tr key={pr.id} className="border-t">
                    <td className="px-3 py-2">{pr.code || pr.request_number}</td>
                    <td className="px-3 py-2">{pr.supplier_name || '-'}</td>
                    <td className="px-3 py-2 text-right font-mono">${formatAmount(pr.amount)}</td>
                  </tr>
                ))}
                <tr className="border-t bg-muted/30 font-medium">
                  <td className="px-3 py-2" colSpan={2}>
                    {TOURS_LABELS.LABEL_1423}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    ${formatAmount(profitResult.expense_total)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-muted-foreground text-sm py-4 text-center">
            {TOURS_LABELS.LABEL_4310}
          </div>
        )}
      </section>

      {/* 利潤計算表（兩欄並排） */}
      <section>
        <h3 className="text-base font-semibold mb-2">{PROFIT_TAB_LABELS.profit_table}</h3>
        <div className="flex flex-col md:flex-row gap-4">
          <ProfitTableColumn title={PROFIT_TAB_LABELS.left_column} rows={left} />
          <ProfitTableColumn title={PROFIT_TAB_LABELS.right_column} rows={right} />
        </div>
      </section>

      {/* 獎金明細 */}
      <section>
        <h3 className="text-base font-semibold mb-2">{PROFIT_TAB_LABELS.bonus_detail}</h3>
        {profitResult.net_profit < 0 ? (
          <div className="bg-status-warning-bg border border-status-warning/30 rounded-lg p-4 text-status-warning text-sm">
            {PROFIT_TABLE_LABELS.no_bonus}
          </div>
        ) : (
          <div className="space-y-2">
            {[...profitResult.team_bonuses, ...profitResult.employee_bonuses].length === 0 ? (
              <div className="text-muted-foreground text-sm py-4 text-center">
                {TOURS_LABELS.SETTINGS_6822}
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">{TOURS_LABELS.TYPE}</th>
                      <th className="text-left px-3 py-2 font-medium">{TOURS_LABELS.LABEL_2076}</th>
                      <th className="text-right px-3 py-2 font-medium">{TOURS_LABELS.AMOUNT}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...profitResult.team_bonuses, ...profitResult.employee_bonuses].map(
                      (b, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-3 py-2">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${BONUS_TYPE_BADGE_VARIANTS[b.setting.type as BonusSettingType] || ''}`}
                            >
                              {BONUS_TYPE_LABELS[b.setting.type as BonusSettingType]}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {b.employee_name || '-'}
                          </td>
                          <td className="px-3 py-2 text-right font-mono">
                            ${formatAmount(b.amount)}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 獎金請款 */}
            {bonusExpenses.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                  {TOURS_LABELS.LABEL_8378}
                </h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <tbody>
                      {bonusExpenses.map(pr => (
                        <tr key={pr.id} className="border-t first:border-t-0">
                          <td className="px-3 py-2">{pr.code || pr.request_number}</td>
                          <td className="px-3 py-2">{pr.supplier_name || '-'}</td>
                          <td className="px-3 py-2 text-right font-mono">
                            ${formatAmount(pr.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
