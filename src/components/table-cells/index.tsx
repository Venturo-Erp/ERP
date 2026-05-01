'use client'

import React from 'react'
import Image from 'next/image'
import { Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { formatDateTW, formatDateTime } from '@/lib/utils/format-date'
import { formatCurrency as formatCurrencyUtil } from '@/lib/utils/format-currency'
import {
  getStatusColor,
  getStatusLabel,
  getStatusBgColor,
  getStatusIcon,
} from '@/lib/status-config'
import type { LucideIcon } from 'lucide-react'
import { TABLE_CELLS_LABELS } from './constants/labels'

// ========== 類型定義 ==========

type StatusType =
  | 'payment'
  | 'disbursement'
  | 'todo'
  | 'invoice'
  | 'tour'
  | 'order'
  | 'visa'
  | 'voucher'
  | 'esim'
  | 'receipt'
  | 'quote'
  | 'tour_request'

interface DateCellProps {
  date?: string | Date | null
  format?: 'short' | 'long' | 'time'
  fallback?: string
  className?: string
  showIcon?: boolean
}

interface StatusCellProps {
  type: StatusType
  status: string
  variant?: 'badge' | 'text'
  showIcon?: boolean
  className?: string
}

interface CurrencyCellProps {
  amount: number
  currency?: 'TWD' | 'USD' | 'CNY'
  variant?: 'default' | 'income' | 'expense'
  showSign?: boolean
  className?: string
}

interface DateRangeCellProps {
  start?: string | Date | null
  end?: string | Date | null
  format?: 'short' | 'long'
  showDuration?: boolean
  className?: string
}

interface ActionButton {
  icon: LucideIcon
  label: string
  onClick: () => void
  variant?: 'default' | 'danger' | 'success' | 'warning'
  disabled?: boolean
}

interface ActionCellProps {
  actions: ActionButton[]
  className?: string
  /** 只顯示圖示、不顯示文字（報價單等空間極度有限的情況用） */
  iconOnly?: boolean
}

interface AvatarCellProps {
  name: string
  imageUrl?: string | null
  subtitle?: string
  className?: string
}

interface LinkCellProps {
  href: string
  text: string
  external?: boolean
  className?: string
}

interface BadgeCellProps {
  text: string
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  className?: string
}

// ========== 輔助函數 ==========

/**
 * 格式化日期（使用統一的格式化工具）
 */
function formatDate(date: Date, format: 'short' | 'long' | 'time' = 'short'): string {
  if (format === 'time') {
    return formatDateTime(date)
  }

  if (format === 'long') {
    // 長格式：2024年1月15日 (週一)
    const weekdays = ['週日', '週一', '週二', '週三', '週四', '週五', '週六']
    const weekday = weekdays[date.getDay()]
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 (${weekday})`
  }

  // short format (default) - 使用統一的 formatDateTW
  return formatDateTW(date)
}

/**
 * 計算日期區間天數
 */
function calculateDuration(start: Date, end: Date): number {
  const diff = end.getTime() - start.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1 // +1 包含起始日
}

/**
 * 格式化金額（使用統一的格式化工具）
 */
function formatCurrency(amount: number, currency: 'TWD' | 'USD' | 'CNY' = 'TWD'): string {
  return formatCurrencyUtil(amount, currency)
}

// ========== 組件 ==========

/**
 * DateCell - 日期單元格
 *
 * 統一的日期顯示組件，處理空值、無效日期等邊界情況
 *
 * @example
 * ```tsx
 * <DateCell date={tour.departure_date} showIcon />
 * <DateCell date={order.created_at} format="time" />
 * ```
 */
export function DateCell({
  date,
  format = 'short',
  fallback = '未設定',
  className,
  showIcon = true,
}: DateCellProps) {
  if (!date) {
    return <span className={cn('text-sm text-morandi-red', className)}>{fallback}</span>
  }

  const dateObj = new Date(date)
  if (isNaN(dateObj.getTime())) {
    return (
      <span className={cn('text-sm text-morandi-red', className)}>
        {TABLE_CELLS_LABELS.LABEL_5349}
      </span>
    )
  }

  return (
    <div className={cn('flex items-center gap-2 text-sm text-morandi-primary', className)}>
      {showIcon && <Calendar size={14} className="text-morandi-secondary flex-shrink-0" />}
      <span>{formatDate(dateObj, format)}</span>
    </div>
  )
}

/**
 * StatusCell - 狀態徽章單元格
 *
 * 統一的狀態顯示組件，使用 status-config 配置
 *
 * @example
 * ```tsx
 * <StatusCell type="tour" status={tour.status} />
 * <StatusCell type="payment" status={payment.status} variant="text" />
 * ```
 */
export function StatusCell({
  type,
  status,
  variant = 'badge',
  showIcon = false,
  className,
}: StatusCellProps) {
  const color = getStatusColor(type, status)
  const label = getStatusLabel(type, status)
  const IconComponent = getStatusIcon(type, status)

  if (variant === 'badge') {
    const bgColor = getStatusBgColor(type, status)
    // 統一樣式跟 StatusBadge 一致（soft pill，無 border、無 shadow、font-medium）
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
          bgColor,
          color,
          className
        )}
      >
        {showIcon && IconComponent && <IconComponent className="w-3 h-3 mr-1" />}
        {label}
      </span>
    )
  }

  // variant === 'text'
  return (
    <span className={cn('text-sm font-medium', color, className)}>
      {showIcon && IconComponent && <IconComponent className="w-3 h-3 mr-1 inline" />}
      {label}
    </span>
  )
}

/**
 * CurrencyCell - 金額單元格
 *
 * 統一的金額顯示組件，支援不同幣別和顏色變體
 *
 * @example
 * ```tsx
 * <CurrencyCell amount={tour.price} />
 * <CurrencyCell amount={payment.amount} variant="income" />
 * <CurrencyCell amount={-500} showSign />
 * ```
 */
export function CurrencyCell({
  amount,
  currency = 'TWD',
  variant = 'default',
  showSign = false,
  className,
}: CurrencyCellProps) {
  const isNegative = amount < 0

  const colorClass = cn(
    'text-sm font-medium',
    variant === 'income' && 'text-morandi-green',
    variant === 'expense' && 'text-morandi-red',
    variant === 'default' && isNegative && 'text-morandi-red',
    variant === 'default' && !isNegative && 'text-morandi-primary',
    className
  )

  return (
    <div className={colorClass}>
      {showSign && (isNegative ? '-' : '+')}
      {formatCurrency(amount, currency)}
    </div>
  )
}

/**
 * DateRangeCell - 日期區間單元格
 *
 * 顯示開始和結束日期，可選顯示天數
 *
 * @example
 * ```tsx
 * <DateRangeCell start={tour.departure_date} end={tour.return_date} showDuration />
 * ```
 */
function DateRangeCell({
  start,
  end,
  format = 'short',
  showDuration = true,
  className,
}: DateRangeCellProps) {
  if (!start || !end) {
    return <span className="text-sm text-morandi-secondary">-</span>
  }

  const startDate = new Date(start)
  const endDate = new Date(end)

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return <span className="text-sm text-morandi-red">{TABLE_CELLS_LABELS.LABEL_5349}</span>
  }

  const duration = calculateDuration(startDate, endDate)

  return (
    <div className={cn('text-sm', className)}>
      <div className="text-morandi-primary">
        {formatDate(startDate, format)} ~ {formatDate(endDate, format)}
      </div>
      {showDuration && (
        <div className="text-xs text-morandi-secondary">
          {TABLE_CELLS_LABELS.LABEL_5332} {duration} 天
        </div>
      )}
    </div>
  )
}

/**
 * ActionCell - 操作按鈕單元格
 *
 * 統一的操作按鈕顯示，自動處理點擊事件傳播
 *
 * @example
 * ```tsx
 * <ActionCell
 *   actions={[
 *     { icon: Edit2, label: '編輯', onClick: () => handleEdit(tour) },
 *     { icon: Trash2, label: '刪除', onClick: () => handleDelete(tour), variant: 'danger' },
 *   ]}
 * />
 * ```
 */
export function ActionCell({ actions, className, iconOnly = false }: ActionCellProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {actions.map((action, index) => {
        const IconComponent = action.icon
        const buttonClass = cn(
          'rounded transition-colors flex items-center gap-1 text-xs font-medium',
          iconOnly ? 'p-1' : 'px-2 py-1',
          action.variant === 'danger' && 'text-morandi-red hover:bg-morandi-red/10',
          action.variant === 'warning' && 'text-status-warning hover:bg-status-warning-bg',
          action.variant === 'success' && 'text-morandi-green hover:bg-morandi-green/10',
          (!action.variant || action.variant === 'default') &&
            'text-morandi-gold hover:bg-morandi-gold/10',
          action.disabled && 'opacity-50 cursor-not-allowed'
        )

        return (
          <button
            key={index}
            onClick={e => {
              e.stopPropagation()
              if (!action.disabled) {
                action.onClick()
              }
            }}
            className={buttonClass}
            title={action.label}
            disabled={action.disabled}
          >
            <IconComponent size={14} />
            {!iconOnly && <span>{action.label}</span>}
          </button>
        )
      })}
    </div>
  )
}

/**
 * TextCell - 文字單元格
 *
 * 簡單的文字顯示，支援截斷和 tooltip
 *
 * @example
 * ```tsx
 * <TextCell text={tour.description} maxLength={50} />
 * ```
 */
export function TextCell({
  text,
  maxLength,
  className,
}: {
  text: string
  maxLength?: number
  className?: string
}) {
  const displayText =
    maxLength && text.length > maxLength ? `${text.substring(0, maxLength)}...` : text

  return (
    <span
      className={cn('text-sm text-morandi-primary', className)}
      title={maxLength && text.length > maxLength ? text : undefined}
    >
      {displayText}
    </span>
  )
}

/**
 * NumberCell - 數字單元格
 *
 * 統一的數字顯示，支援格式化
 *
 * @example
 * ```tsx
 * <NumberCell value={tour.max_participants} suffix="人" />
 * ```
 */
function NumberCell({
  value,
  prefix,
  suffix,
  className,
}: {
  value: number
  prefix?: string
  suffix?: string
  className?: string
}) {
  return (
    <span className={cn('text-sm font-medium text-morandi-primary', className)}>
      {prefix}
      {value.toLocaleString()}
      {suffix}
    </span>
  )
}

/**
 * AvatarCell - 頭像+名稱單元格
 *
 * 顯示用戶頭像和名稱，支援副標題
 *
 * @example
 * ```tsx
 * <AvatarCell name="張三" subtitle="業務部" />
 * <AvatarCell name="李四" imageUrl="/avatars/li.jpg" />
 * ```
 */
function AvatarCell({ name, imageUrl, subtitle, className }: AvatarCellProps) {
  // 取名字第一個字作為頭像文字
  const initial = name?.charAt(0) || '?'

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-morandi-gold/20 flex items-center justify-center">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name || ''}
            width={32}
            height={32}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <span className="text-sm font-medium text-morandi-gold">{initial}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-morandi-primary truncate">{name}</div>
        {subtitle && <div className="text-xs text-morandi-secondary truncate">{subtitle}</div>}
      </div>
    </div>
  )
}

/**
 * LinkCell - 連結單元格
 *
 * 可點擊的連結，支援內部和外部連結
 *
 * @example
 * ```tsx
 * <LinkCell href="/tours/123" text="查看詳情" />
 * <LinkCell href="https://example.com" text="外部連結" external />
 * ```
 */
function LinkCell({ href, text, external = false, className }: LinkCellProps) {
  const linkClass = cn(
    'text-sm text-morandi-gold hover:text-morandi-gold-dark hover:underline transition-colors',
    className
  )

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
        {text} ↗
      </a>
    )
  }

  return (
    <a href={href} className={linkClass}>
      {text}
    </a>
  )
}

/**
 * BadgeCell - 徽章單元格
 *
 * 簡單的徽章顯示，與 StatusCell 不同，不依賴 status-config
 *
 * @example
 * ```tsx
 * <BadgeCell text="熱門" variant="warning" />
 * <BadgeCell text="新品" variant="success" />
 * ```
 */
function BadgeCell({ text, variant = 'default', className }: BadgeCellProps) {
  const variantClass = cn(
    'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
    variant === 'default' && 'bg-morandi-container text-morandi-primary',
    variant === 'success' && 'bg-morandi-green/10 text-morandi-green',
    variant === 'warning' && 'bg-morandi-gold/10 text-morandi-gold',
    variant === 'danger' && 'bg-morandi-red/10 text-morandi-red',
    variant === 'info' && 'bg-status-info-bg text-status-info',
    className
  )

  return <span className={variantClass}>{text}</span>
}
