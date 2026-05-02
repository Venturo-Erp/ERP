'use client'

import { Combobox } from '@/components/ui/combobox'
import { CompanyExpenseType, EXPENSE_TYPE_CONFIG } from '@/stores/types/finance.types'
import { EXPENSE_TYPE_SELECTOR_LABELS } from '../../constants/labels'

interface ExpenseTypeSelectorProps {
  value: CompanyExpenseType | ''
  onChange: (value: CompanyExpenseType | '') => void
  disabled?: boolean
  className?: string
}

// 費用類型選項
const expenseTypeOptions = Object.entries(EXPENSE_TYPE_CONFIG).map(([code, config]) => ({
  value: code as CompanyExpenseType,
  label: config.name,
}))

export function ExpenseTypeSelector({
  value,
  onChange,
  disabled = false,
  className,
}: ExpenseTypeSelectorProps) {
  return (
    <div className={className}>
      <label className="text-sm font-medium text-morandi-primary">
        {EXPENSE_TYPE_SELECTOR_LABELS.LABEL_6005}
      </label>
      <Combobox
        options={expenseTypeOptions}
        value={value}
        onChange={v => onChange(v as CompanyExpenseType | '')}
        placeholder={EXPENSE_TYPE_SELECTOR_LABELS.選擇費用類型}
        disabled={disabled}
        className="mt-1"
      />
    </div>
  )
}
