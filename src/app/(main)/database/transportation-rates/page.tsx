'use client'

import { useState, useCallback } from 'react'
import useSWR from 'swr'
import { Bus, Plus } from 'lucide-react'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CountryList } from '@/features/transportation-rates/components/CountryList'
import { RatesDetailDialog } from '@/features/transportation-rates/components/RatesDetailDialog'
import { supabase } from '@/lib/supabase/client'
import { TransportationRate } from '@/types/transportation-rates.types'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { TRANSPORTATION_RATES_LABELS } from './constants/labels'

const fetchRates = async (): Promise<TransportationRate[]> => {
  const { data, error } = await supabase
    .from('transportation_rates')
    .select(
      'id, country_id, country_name, vehicle_type, category, supplier, route, trip_type, cost_vnd, price_twd, kkday_selling_price, kkday_cost, kkday_profit, is_backup, price, currency, unit, notes, is_active, display_order, workspace_id, created_at, updated_at'
    )
    .order('category')
    .order('supplier')
    .order('route')
    .limit(500)

  if (error) {
    toast.error(TRANSPORTATION_RATES_LABELS.LOAD_ERROR)
    throw error
  }

  return data ?? []
}

export default function TransportationRatesPage() {
  const { user } = useAuthStore()
  const {
    data: rates = [],
    isLoading: loading,
    mutate,
  } = useSWR('transportation_rates', fetchRates)
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isAddingNewCountry, setIsAddingNewCountry] = useState(false)
  const [newCountryName, setNewCountryName] = useState('')

  const handleRefresh = useCallback(() => {
    void mutate()
  }, [mutate])

  // 打開國家詳細表格
  const handleOpenCountry = (countryName: string, editMode: boolean) => {
    setSelectedCountry(countryName)
    setIsEditMode(editMode)
    setIsDialogOpen(true)
  }

  // 新增國家
  const handleAddNewCountry = () => {
    if (!newCountryName.trim()) {
      toast.error(TRANSPORTATION_RATES_LABELS.COUNTRY_NAME_REQUIRED)
      return
    }

    // 檢查國家是否已存在
    if (rates.some(rate => rate.country_name === newCountryName.trim())) {
      toast.error(TRANSPORTATION_RATES_LABELS.COUNTRY_EXISTS)
      return
    }

    setSelectedCountry(newCountryName.trim())
    setIsEditMode(true)
    setIsAddingNewCountry(false)
    setIsDialogOpen(true)
    setNewCountryName('')
  }

  return (
    <ContentPageLayout
      title={TRANSPORTATION_RATES_LABELS.PAGE_TITLE}
      icon={Bus}
      breadcrumb={[
        { label: TRANSPORTATION_RATES_LABELS.BREADCRUMB_HOME, href: '/dashboard' },
        { label: TRANSPORTATION_RATES_LABELS.BREADCRUMB_DATABASE, href: '/database' },
        {
          label: TRANSPORTATION_RATES_LABELS.BREADCRUMB_RATES,
          href: '/database/transportation-rates',
        },
      ]}
      primaryAction={{
        label: TRANSPORTATION_RATES_LABELS.ADD_COUNTRY,
        icon: Plus,
        onClick: () => setIsAddingNewCountry(true),
      }}
    >
      <CountryList rates={rates} loading={loading} onOpenCountry={handleOpenCountry} />

      {/* 新增國家 Dialog */}
      <Dialog open={isAddingNewCountry} onOpenChange={setIsAddingNewCountry}>
        <DialogContent level={1} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{TRANSPORTATION_RATES_LABELS.ADD_COUNTRY_DIALOG_TITLE}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-morandi-primary mb-2 block">
                {TRANSPORTATION_RATES_LABELS.COUNTRY_NAME_LABEL}
              </label>
              <Input
                placeholder={TRANSPORTATION_RATES_LABELS.COUNTRY_NAME_PLACEHOLDER}
                value={newCountryName}
                onChange={e => setNewCountryName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handleAddNewCountry()
                  }
                }}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddingNewCountry(false)
                  setNewCountryName('')
                }}
              >
                {TRANSPORTATION_RATES_LABELS.CANCEL}
              </Button>
              <Button onClick={handleAddNewCountry}>
                {TRANSPORTATION_RATES_LABELS.ADD_COUNTRY}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 大型懸浮視窗 - 顯示該國車資詳細表格 */}
      {selectedCountry && (
        <RatesDetailDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          countryName={selectedCountry}
          rates={rates.filter(rate => rate.country_name === selectedCountry)}
          onUpdate={handleRefresh}
          isEditMode={isEditMode}
        />
      )}
    </ContentPageLayout>
  )
}
