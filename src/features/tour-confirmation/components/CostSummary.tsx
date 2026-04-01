'use client'

/**
 * CostSummary - 費用總計卡片
 *
 * 顯示各分類的預計/實際費用統計
 */

import { Bus, Utensils, Hotel, Ticket, FileText, Calculator } from 'lucide-react'
import type { CostSummary as CostSummaryType } from '@/types/tour-confirmation-sheet.types'
import { formatMoney } from '@/lib/utils/format-currency'
import { COST_SUMMARY_LABELS } from '../constants/labels'

interface CostSummaryCardProps {
  summary: CostSummaryType
}

export function CostSummaryCard({ summary }: CostSummaryCardProps) {
  const formatCurrency = (value: number) => formatMoney(value) || '0'

  const categories = [
    { key: 'transport', label: COST_SUMMARY_LABELS.交通, icon: Bus, color: 'text-status-info' },
    { key: 'meal', label: COST_SUMMARY_LABELS.餐食, icon: Utensils, color: 'text-status-warning' },
    {
      key: 'accommodation',
      label: COST_SUMMARY_LABELS.住宿,
      icon: Hotel,
      color: 'text-morandi-secondary',
    },
    { key: 'activity', label: COST_SUMMARY_LABELS.活動, icon: Ticket, color: 'text-morandi-green' },
    {
      key: 'other',
      label: COST_SUMMARY_LABELS.其他,
      icon: FileText,
      color: 'text-morandi-secondary',
    },
  ] as const

  const difference = summary.total.actual - summary.total.expected
  const diffPercent =
    summary.total.expected > 0 ? ((difference / summary.total.expected) * 100).toFixed(1) : '0'

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      {/* 標題 */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-morandi-container/30">
        <div className="w-8 h-8 rounded-lg bg-morandi-gold flex items-center justify-center">
          <Calculator size={16} className="text-white" />
        </div>
        <h3 className="font-medium text-morandi-primary">{COST_SUMMARY_LABELS.TOTAL_336}</h3>
      </div>

      {/* 分類統計 */}
      <div className="p-4">
        <table className="w-full">
          <thead>
            <tr className="text-xs text-morandi-secondary">
              <th className="text-left pb-2 font-medium">{COST_SUMMARY_LABELS.LABEL_2257}</th>
              <th className="text-right pb-2 font-medium">{COST_SUMMARY_LABELS.LABEL_1924}</th>
              <th className="text-right pb-2 font-medium">{COST_SUMMARY_LABELS.LABEL_686}</th>
              <th className="text-right pb-2 font-medium">{COST_SUMMARY_LABELS.LABEL_8980}</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(({ key, label, icon: Icon, color }) => {
              const categoryData = summary[key]
              const diff = categoryData.actual - categoryData.expected
              return (
                <tr key={key} className="border-t border-border/40">
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <Icon size={14} className={color} />
                      <span className="text-sm text-morandi-primary">{label}</span>
                    </div>
                  </td>
                  <td className="py-2 text-right text-sm font-mono">
                    {formatCurrency(categoryData.expected)}
                  </td>
                  <td className="py-2 text-right text-sm font-mono">
                    {formatCurrency(categoryData.actual)}
                  </td>
                  <td
                    className={`py-2 text-right text-sm font-mono ${
                      diff > 0 ? 'text-morandi-red' : diff < 0 ? 'text-morandi-green' : ''
                    }`}
                  >
                    {diff > 0 ? '+' : ''}
                    {formatCurrency(diff)}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border font-medium">
              <td className="pt-3 text-morandi-primary">{COST_SUMMARY_LABELS.TOTAL}</td>
              <td className="pt-3 text-right font-mono text-base">
                {formatCurrency(summary.total.expected)}
              </td>
              <td className="pt-3 text-right font-mono text-base">
                {formatCurrency(summary.total.actual)}
              </td>
              <td
                className={`pt-3 text-right font-mono text-base ${
                  difference > 0 ? 'text-morandi-red' : difference < 0 ? 'text-morandi-green' : ''
                }`}
              >
                {difference > 0 ? '+' : ''}
                {formatCurrency(difference)}
                <span className="text-xs ml-1">({diffPercent}%)</span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* 底部提示 */}
      {difference !== 0 && (
        <div
          className={`px-4 py-2 text-xs border-t border-border ${
            difference > 0 ? 'bg-morandi-red/10 text-morandi-red' : 'bg-morandi-green/10 text-morandi-green'
          }`}
        >
          {difference > 0
            ? `實際支出超出預計 ${formatCurrency(difference)} 元 (${diffPercent}%)`
            : `實際支出低於預計 ${formatCurrency(Math.abs(difference))} 元 (${Math.abs(Number(diffPercent))}%)`}
        </div>
      )}
    </div>
  )
}
