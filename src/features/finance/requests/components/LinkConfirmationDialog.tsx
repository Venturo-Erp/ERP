'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { LINK_CONFIRMATION_LABELS } from '../../constants/labels'
import { formatMoney } from '@/lib/utils/format-currency'

interface ConfirmationItem {
  id: string
  category: string
  title: string
  supplier_name: string | null
  unit_price: number | null
  currency: string | null
  service_date: string | null
  day_label: string | null
}

interface LinkConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tourId: string | null
  category?: string
  currentItemId: string | null
  onSelect: (confirmationItemId: string | null) => void
}

const CATEGORY_ICONS: Record<string, string> = {
  accommodation: '🏨',
  transportation: '🚌',
  meal: '🍽️',
  activity: '🎫',
  guide: '👤',
  other: '📦',
}

export function LinkConfirmationDialog({
  open,
  onOpenChange,
  tourId,
  category,
  currentItemId,
  onSelect,
}: LinkConfirmationDialogProps) {
  const [items, setItems] = useState<ConfirmationItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<string | null>(currentItemId)

  useEffect(() => {
    if (!open || !tourId) return
    setSelected(currentItemId)
    fetchItems()
  }, [open, tourId, category])

  const fetchItems = async () => {
    if (!tourId) return
    setLoading(true)
    try {
      const db = supabase
      // 找該團的確認單
      const { data: sheet } = await db
        .from('tour_confirmation_sheets')
        .select('id')
        .eq('tour_id', tourId)
        .maybeSingle()

      if (!sheet) {
        setItems([])
        return
      }

      let query = db
        .from('tour_confirmation_items')
        .select('id, category, title, supplier_name, unit_price, currency, service_date, day_label')
        .eq('sheet_id', sheet.id)
        .order('sort_order', { ascending: true })

      if (category) {
        query = query.eq('category', category)
      }

      const { data, error } = await query
      if (error) throw error
      setItems(data || [])
    } catch (err) {
      logger.error('Failed to fetch confirmation items:', err)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = () => {
    onSelect(selected)
    onOpenChange(false)
  }

  const handleClear = () => {
    onSelect(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" level={2}>
        <DialogHeader>
          <DialogTitle className="text-base">{LINK_CONFIRMATION_LABELS.TITLE}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-sm text-morandi-secondary">
            {LINK_CONFIRMATION_LABELS.LOADING}
          </div>
        ) : items.length === 0 ? (
          <div className="py-8 text-center text-sm text-morandi-secondary">
            {LINK_CONFIRMATION_LABELS.EMPTY}
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[360px] overflow-y-auto">
            {items.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelected(item.id === selected ? null : item.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors cursor-pointer ${
                  item.id === selected
                    ? 'border-morandi-accent bg-morandi-accent/5'
                    : 'border-morandi-container/40 hover:border-morandi-container'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{CATEGORY_ICONS[item.category] || '📦'}</span>
                    <span className="text-sm font-medium text-morandi-primary">{item.title}</span>
                  </div>
                  {item.unit_price ? (
                    <span className="text-sm text-morandi-secondary">
                      {item.currency || 'TWD'} {formatMoney(item.unit_price)}
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-morandi-secondary">
                  {item.day_label ? <span>{item.day_label}</span> : null}
                  {item.service_date ? <span>{item.service_date}</span> : null}
                  {item.supplier_name ? <span>{item.supplier_name}</span> : null}
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-between pt-2">
          {currentItemId ? (
            <Button variant="ghost" size="sm" onClick={handleClear}>
              {LINK_CONFIRMATION_LABELS.CLEAR}
            </Button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              {LINK_CONFIRMATION_LABELS.CANCEL}
            </Button>
            <Button size="sm" onClick={handleConfirm} disabled={items.length === 0}>
              {LINK_CONFIRMATION_LABELS.CONFIRM}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
