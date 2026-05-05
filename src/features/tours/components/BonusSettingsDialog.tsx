'use client'

/**
 * BonusSettingsDialog — 獎金設定 Dialog（多列、仿請款單樣式）
 *
 * 設計重點：
 * - 預設 5 列：營收稅額 / OP / 業務 / 團隊 / 行政費用
 * - 已存在的 settings 直接帶入、缺的類型從 workspace defaults 補空白列
 * - 類別、員工、項目說明、單價、計算方式、金額（試算）皆 inline edit
 * - 行政費用列：計算方式鎖「元/人」、金額 = 單價 × 人數
 * - 「+ 新增獎金項目」可加列、滿足多 OP / 多業務需求
 * - 不 fork AddRequestDialog、共用 InlineEditTable / Combobox / Dialog 即可
 */

import { useEffect, useMemo, useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { InlineEditTable, type InlineEditColumn } from '@/components/ui/inline-edit-table'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { useAuthStore } from '@/stores/auth-store'
import { BonusSettingType, BonusCalculationType } from '@/types/bonus.types'
import type { TourBonusSetting } from '@/types/bonus.types'
import type { Tour } from '@/stores/types'
import {
  useTourBonusSettings,
  useWorkspaceBonusDefaults,
  useEmployeesSlim,
  useMembers,
  useOrdersSlim,
  useReceipts,
  usePaymentRequests,
  createTourBonusSetting,
  updateTourBonusSetting,
  deleteTourBonusSetting,
  invalidateTourBonusSettings,
} from '@/data'
import { calculateFullProfit } from '../services/profit-calculation.service'
import { BONUS_TYPE_LABELS, BONUS_TAB_LABELS } from '../constants/bonus-labels'
import { formatMoney } from '@/lib/utils/format-currency'

interface BonusSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tour: Tour
}

/** 預設展示順序（也決定 dialog 開啟時補空白列的順序）
 *
 * 行政費用 / 營收稅額 是「成本 / 扣項」、放最前面、跟下面的「員工獎金」做視覺區分。
 */
const DEFAULT_TYPE_ORDER: BonusSettingType[] = [
  BonusSettingType.ADMINISTRATIVE_EXPENSES,
  BonusSettingType.PROFIT_TAX,
  BonusSettingType.OP_BONUS,
  BonusSettingType.SALE_BONUS,
  BonusSettingType.TEAM_BONUS,
]

/** 排序權重：依 DEFAULT_TYPE_ORDER 的位置排（不再用 enum 數值排） */
const TYPE_SORT_WEIGHT: Record<BonusSettingType, number> = DEFAULT_TYPE_ORDER.reduce(
  (acc, t, i) => {
    acc[t] = i
    return acc
  },
  {} as Record<BonusSettingType, number>
)

/** 視為「成本 / 扣項」的類型、會套不同底色固定在最前面 */
const isCostRow = (type: BonusSettingType) =>
  type === BonusSettingType.ADMINISTRATIVE_EXPENSES || type === BonusSettingType.PROFIT_TAX

/** dialog 內每列的可編輯資料 */
interface BonusRow {
  rowKey: string
  id: string | null
  type: BonusSettingType
  bonus: number
  bonus_type: BonusCalculationType
  employee_id: string | null
  description: string
}

let tmpIdCounter = 0
const newTmpKey = () => `tmp_${++tmpIdCounter}_${Date.now()}`

/** 行政費用列強制 FIXED_AMOUNT、其他列在 % / 元 之間切換 */
const isAdminRow = (type: BonusSettingType) =>
  type === BonusSettingType.ADMINISTRATIVE_EXPENSES

export function BonusSettingsDialog({ open, onOpenChange, tour }: BonusSettingsDialogProps) {
  const workspace_id = useAuthStore(s => s.user?.workspace_id) ?? ''

  const { items: allSettings } = useTourBonusSettings()
  const { items: defaults } = useWorkspaceBonusDefaults()
  const { items: employees } = useEmployeesSlim()
  const { items: allMembers } = useMembers()
  const { items: allOrders } = useOrdersSlim()
  const { items: allReceipts } = useReceipts()
  const { items: allPaymentRequests } = usePaymentRequests()

  // 此團相關訂單 / 人數
  const orders = useMemo(
    () => (allOrders ?? []).filter(o => o.tour_id === tour.id),
    [allOrders, tour.id]
  )
  const orderIds = useMemo(() => new Set(orders.map(o => o.id)), [orders])
  const memberCount = useMemo(
    () => (allMembers ?? []).filter(m => m.order_id && orderIds.has(m.order_id)).length,
    [allMembers, orderIds]
  )

  // 此團相關收 / 付款（用來估算淨利、提供「金額」欄試算）
  const tourReceipts = useMemo(
    () =>
      (allReceipts ?? []).filter(
        r => r.tour_id === tour.id || (r.order_id && orderIds.has(r.order_id))
      ),
    [allReceipts, tour.id, orderIds]
  )
  const tourExpenses = useMemo(
    () =>
      (allPaymentRequests ?? [])
        .filter(pr => pr.tour_id === tour.id)
        .filter(pr => {
          const rt = (pr.request_type || '').toLowerCase()
          return !rt.includes('bonus') && !rt.includes('獎金')
        })
        .map(pr => ({ amount: Number(pr.amount) || 0 })),
    [allPaymentRequests, tour.id]
  )

  // 此團現有 settings
  const existingSettings = useMemo(
    () => (allSettings ?? []).filter(s => s.tour_id === tour.id),
    [allSettings, tour.id]
  )

  // === Local edit state ===
  const [rows, setRows] = useState<BonusRow[]>([])
  const [originalIds, setOriginalIds] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  // 開啟時 hydrate 列表：每個類型至少有一列、有資料用資料、沒有用 workspace default
  useEffect(() => {
    if (!open) return

    const result: BonusRow[] = []
    const seenTypes = new Set<BonusSettingType>()

    // 先丟既有資料（依 DEFAULT_TYPE_ORDER 權重排）
    const sorted = [...existingSettings].sort(
      (a, b) => TYPE_SORT_WEIGHT[a.type] - TYPE_SORT_WEIGHT[b.type]
    )
    for (const s of sorted) {
      result.push({
        rowKey: s.id,
        id: s.id,
        type: s.type,
        bonus: Number(s.bonus) || 0,
        bonus_type: s.bonus_type,
        employee_id: s.employee_id,
        description: s.description ?? '',
      })
      seenTypes.add(s.type)
    }

    // 缺的類型補空白列（用 workspace default 的 bonus / bonus_type、否則用合理預設）
    for (const type of DEFAULT_TYPE_ORDER) {
      if (seenTypes.has(type)) continue
      const def = (defaults ?? []).find(d => d.type === type)
      result.push({
        rowKey: newTmpKey(),
        id: null,
        type,
        bonus: def ? Number(def.bonus) || 0 : 0,
        bonus_type: isAdminRow(type)
          ? BonusCalculationType.FIXED_AMOUNT
          : (def?.bonus_type ?? BonusCalculationType.PERCENT),
        employee_id: def?.employee_id ?? null,
        description: def?.description ?? '',
      })
    }

    // 重新依 DEFAULT_TYPE_ORDER 權重排
    result.sort((a, b) => TYPE_SORT_WEIGHT[a.type] - TYPE_SORT_WEIGHT[b.type])

    setRows(result)
    setOriginalIds(new Set(existingSettings.map(s => s.id)))
  }, [open, existingSettings, defaults])

  // === 試算金額（依當前編輯狀態跑一次 calculateFullProfit）===
  const adaptedReceipts = useMemo(
    () =>
      tourReceipts.map(r => ({
        receipt_amount: r.receipt_amount,
        actual_amount: r.actual_amount,
      })),
    [tourReceipts]
  )

  const profitContext = useMemo(() => {
    // 把 rows 包裝成 TourBonusSetting 形狀餵給計算服務（id / created_at 補假值）
    const settingsLike: TourBonusSetting[] = rows.map(r => ({
      id: r.id ?? r.rowKey,
      workspace_id,
      tour_id: tour.id,
      type: r.type,
      bonus: r.bonus,
      bonus_type: r.bonus_type,
      employee_id: r.employee_id,
      description: r.description || null,
      payment_request_id: null,
      disbursement_date: null,
      created_at: '',
      updated_at: '',
    }))
    return calculateFullProfit({
      receipts: adaptedReceipts,
      expenses: tourExpenses,
      settings: settingsLike,
      memberCount,
    })
  }, [rows, adaptedReceipts, tourExpenses, memberCount, workspace_id, tour.id])

  // 每列的「金額」欄
  const computeRowAmount = useCallback(
    (row: BonusRow): number => {
      const val = Number(row.bonus) || 0

      // 行政費用：手填寫總額、直接 = 單價
      if (row.type === BonusSettingType.ADMINISTRATIVE_EXPENSES) {
        return val
      }

      // 營收稅額：FIXED_AMOUNT 直接 = 單價、PERCENT 走 service 算稅
      if (row.type === BonusSettingType.PROFIT_TAX) {
        if (row.bonus_type === BonusCalculationType.FIXED_AMOUNT) return val
        return profitContext.profit_tax
      }

      // OP / 業務 / 團隊：FIXED 直接、PERCENT 依淨利
      if (row.bonus_type === BonusCalculationType.FIXED_AMOUNT) return val
      if (row.bonus_type === BonusCalculationType.MINUS_FIXED_AMOUNT) return -val
      if (profitContext.net_profit < 0) return 0
      if (row.bonus_type === BonusCalculationType.PERCENT) {
        return Math.round((profitContext.net_profit * val) / 100)
      }
      if (row.bonus_type === BonusCalculationType.MINUS_PERCENT) {
        return Math.round((profitContext.net_profit * -val) / 100)
      }
      return 0
    },
    [profitContext]
  )

  // === Row 操作 ===
  const updateRow = useCallback((index: number, patch: Partial<BonusRow>) => {
    setRows(prev => {
      const next = [...prev]
      next[index] = { ...next[index], ...patch }
      // 切到行政費用列時、強制 bonus_type = FIXED_AMOUNT
      if (patch.type !== undefined && isAdminRow(patch.type)) {
        next[index].bonus_type = BonusCalculationType.FIXED_AMOUNT
      }
      return next
    })
  }, [])

  const addRow = useCallback(() => {
    setRows(prev => [
      ...prev,
      {
        rowKey: newTmpKey(),
        id: null,
        type: BonusSettingType.OP_BONUS,
        bonus: 0,
        bonus_type: BonusCalculationType.PERCENT,
        employee_id: null,
        description: '',
      },
    ])
  }, [])

  const removeRow = useCallback((index: number) => {
    setRows(prev => prev.filter((_, i) => i !== index))
  }, [])

  // === 員工選項 ===
  const employeeOptions = useMemo(
    () =>
      (employees ?? []).map(e => ({
        value: e.id,
        label: e.display_name || e.chinese_name || e.english_name || e.id,
      })),
    [employees]
  )

  // === Save: diff existing vs current rows ===
  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      const currentIds = new Set(rows.filter(r => r.id).map(r => r.id as string))
      const toDelete = [...originalIds].filter(id => !currentIds.has(id))

      // 平行寫入：create / update / delete
      const tasks: Promise<unknown>[] = []

      for (const r of rows) {
        const payload = {
          type: r.type,
          bonus: Number(r.bonus) || 0,
          bonus_type: r.bonus_type,
          employee_id: r.employee_id,
          description: r.description.trim() || null,
        }
        if (r.id) {
          tasks.push(updateTourBonusSetting(r.id, payload))
        } else {
          tasks.push(
            createTourBonusSetting({
              ...payload,
              workspace_id,
              tour_id: tour.id,
            })
          )
        }
      }

      for (const id of toDelete) {
        tasks.push(deleteTourBonusSetting(id))
      }

      await Promise.all(tasks)
      await invalidateTourBonusSettings()
      toast.success('獎金設定已儲存')
      onOpenChange(false)
    } catch (err) {
      logger.error('儲存獎金設定失敗', err)
      toast.error('儲存失敗')
    } finally {
      setSaving(false)
    }
  }, [rows, originalIds, workspace_id, tour.id, onOpenChange])

  // === Columns ===
  const inputClass = 'input-no-focus w-full h-10 px-2 bg-transparent text-sm'

  const typeOptions = DEFAULT_TYPE_ORDER.map(t => ({
    value: String(t),
    label: BONUS_TYPE_LABELS[t],
  }))

  const columns: InlineEditColumn<BonusRow>[] = [
    {
      key: 'type',
      label: '類別',
      width: '120px',
      render: ({ row, onUpdate }) => (
        <Select
          value={String(row.type)}
          onValueChange={v => onUpdate({ type: Number(v) as BonusSettingType })}
        >
          <SelectTrigger className="input-no-focus h-10 border-0 shadow-none bg-transparent text-sm px-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {typeOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    {
      key: 'employee',
      label: '員工',
      width: '160px',
      render: ({ row, onUpdate }) => (
        <Combobox
          options={employeeOptions}
          value={row.employee_id ?? ''}
          onChange={v => onUpdate({ employee_id: v || null })}
          placeholder="（選填）"
          className="input-no-focus [&_input]:h-9 [&_input]:px-1 [&_input]:bg-transparent"
          showSearchIcon={false}
        />
      ),
    },
    {
      key: 'description',
      label: '項目說明',
      render: ({ row, onUpdate }) => (
        <input
          type="text"
          value={row.description}
          onChange={e => onUpdate({ description: e.target.value })}
          placeholder="（選填）"
          className={`${inputClass} placeholder:text-morandi-muted/60`}
        />
      ),
    },
    {
      key: 'bonus',
      label: '單價',
      width: '110px',
      align: 'right',
      render: ({ row, onUpdate }) => (
        <input
          type="number"
          value={row.bonus || ''}
          onChange={e => onUpdate({ bonus: Number(e.target.value) || 0 })}
          placeholder="0"
          min={0}
          step="0.01"
          className={`${inputClass} text-right placeholder:text-morandi-muted/60`}
        />
      ),
    },
    {
      key: 'bonus_type',
      label: '計算方式',
      width: '110px',
      render: ({ row, onUpdate }) => {
        if (isAdminRow(row.type)) {
          // 行政費用：手填寫、不選計算方式
          return <span className="text-xs text-morandi-muted/60 px-2">—</span>
        }
        return (
          <Select
            value={String(row.bonus_type)}
            onValueChange={v => onUpdate({ bonus_type: Number(v) as BonusCalculationType })}
          >
            <SelectTrigger className="input-no-focus h-10 border-0 shadow-none bg-transparent text-sm px-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={String(BonusCalculationType.PERCENT)}>%</SelectItem>
              <SelectItem value={String(BonusCalculationType.FIXED_AMOUNT)}>元</SelectItem>
            </SelectContent>
          </Select>
        )
      },
    },
    {
      key: 'amount',
      label: '金額（試算）',
      width: '120px',
      align: 'right',
      render: ({ row }) => {
        const amount = computeRowAmount(row)
        return (
          <span className="text-morandi-gold font-medium pr-2">
            {formatMoney(amount)}
          </span>
        )
      },
    },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent level={1} className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>
            獎金設定 — {tour.code}
            {tour.name ? ` ${tour.name}` : ''}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="text-xs text-morandi-secondary flex flex-wrap gap-x-4 gap-y-1">
            <span>團人數：{memberCount} 人</span>
            <span>收款試算：{formatMoney(profitContext.receipt_total)}</span>
            <span>付款試算：{formatMoney(profitContext.expense_total)}</span>
            <span>淨利試算：{formatMoney(profitContext.net_profit)}</span>
          </div>

          <InlineEditTable<BonusRow>
            rows={rows}
            columns={columns}
            onUpdate={updateRow}
            onAdd={addRow}
            onRemove={removeRow}
            canRemove={() => true}
            addLabel="新增獎金項目"
            rowClassName={row =>
              isCostRow(row.type) ? 'bg-morandi-container/40' : undefined
            }
          />

          <p className="text-xs text-morandi-muted">
            ※「金額」欄為試算值、依當前收 / 付款資料即時計算。
            行政費用為手填寫總額（金額 = 單價）。
            OP / 業務 / 團隊：選「%」依淨利計算、選「元」直接帶單價；淨利為負時 % 模式不發放。
          </p>
        </div>

        <DialogFooter>
          <Button variant="soft-gold" onClick={() => onOpenChange(false)} disabled={saving}>
            {BONUS_TAB_LABELS.CANCEL}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {BONUS_TAB_LABELS.SAVE}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
