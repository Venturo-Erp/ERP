'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { calculateExpression } from '@/hooks/useCalculableInput'

interface CalcInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'value'
> {
  value: number | null | undefined
  onChange: (value: number | null) => void
  /** Excel 式公式儲存：原始公式（如 "100+50"） */
  formula?: string
  /** Excel 式公式儲存：公式變更回調 */
  onFormulaChange?: (formula: string | undefined) => void
}

/**
 * 可計算的輸入框（Excel 式行為）
 * - 支援輸入數學表達式，按 Enter 或失焦時計算結果
 * - 例如：132+10 → 142、100*1.1 → 110
 * - Excel 式顯示：平時顯示計算結果，點擊後顯示原本的公式
 */
export const CalcInput: React.FC<CalcInputProps> = ({
  value,
  onChange,
  formula,
  onFormulaChange,
  className,
  onKeyDown,
  onBlur,
  onFocus,
  ...props
}) => {
  const [displayValue, setDisplayValue] = useState<string>(value != null ? String(value) : '')
  const [isExpression, setIsExpression] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // 格式化數字（加千分位）
  const formatNumber = (num: number) => num.toLocaleString('en-US')

  // 當外部 value 改變且不在編輯中時，更新顯示（帶千分位格式）
  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(value != null ? formatNumber(value) : '')
      setIsExpression(false)
    }
  }, [value, isFocused])

  // 計算並更新值
  const calculate = useCallback(() => {
    const trimmed = displayValue.trim()

    // 空值
    if (!trimmed) {
      onChange(null)
      onFormulaChange?.(undefined)
      setIsExpression(false)
      return
    }

    // 檢查是否包含運算符（是表達式）
    const hasOperator = /[+\-*/]/.test(trimmed.slice(1))

    if (hasOperator) {
      const result = calculateExpression(trimmed)
      if (result !== null) {
        const finalValue = Math.round(result)
        onChange(finalValue)
        // 儲存公式（Excel 式行為）
        onFormulaChange?.(trimmed)
        setDisplayValue(formatNumber(finalValue))
      }
    } else {
      // 移除千分位後解析
      const cleanedValue = trimmed.replace(/,/g, '')
      const num = parseFloat(cleanedValue)
      if (!isNaN(num)) {
        const finalValue = Math.round(num)
        onChange(finalValue)
        // 純數字不需要儲存公式
        onFormulaChange?.(undefined)
        setDisplayValue(formatNumber(finalValue))
      }
    }

    setIsExpression(false)
  }, [displayValue, onChange, onFormulaChange])

  // 處理輸入變更
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 全形數字 + 全形符號 → 半形
    let newValue = e.target.value
      .replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))  // 全形數字
      .replace(/[＋－＊／]/g, c => {  // 全形符號
        const map: Record<string, string> = { '＋': '+', '－': '-', '＊': '*', '／': '/' }
        return map[c] || c
      })
    setDisplayValue(newValue)

    const hasOperator = /[+\-*/]/.test(newValue.slice(1))
    setIsExpression(hasOperator)

    // 純數字即時更新（移除千分位後解析）
    if (!hasOperator) {
      const cleanedValue = newValue.replace(/,/g, '')
      const num = parseFloat(cleanedValue)
      if (!isNaN(num)) {
        onChange(Math.round(num))
      }
    }
  }

  // 處理按鍵
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      calculate()
      setIsFocused(false)
      inputRef.current?.blur()
    }
    onKeyDown?.(e)
  }

  // 處理聚焦 - Excel 式行為：顯示公式或原始數字
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true)
    // 如果有儲存的公式，顯示公式而非計算結果
    if (formula) {
      setDisplayValue(formula)
      setIsExpression(true)
    } else if (value != null) {
      // 沒有公式時，顯示原始數字（不帶千分位，方便編輯）
      setDisplayValue(String(value))
    }
    onFocus?.(e)
  }

  // 處理失焦
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    calculate()
    setIsFocused(false)
    onBlur?.(e)
  }

  // 判斷是否有公式（用於顯示視覺提示）
  const hasFormula = !!formula

  return (
    <input
      {...props}
      ref={inputRef}
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={`${className || ''} ${isExpression ? '!bg-amber-50' : ''} ${hasFormula && !isFocused ? '!text-blue-600' : ''}`}
      title={hasFormula ? `公式: ${formula}` : undefined}
    />
  )
}
