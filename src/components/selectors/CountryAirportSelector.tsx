'use client'

import { useState, useMemo, useCallback } from 'react'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { FormDialog } from '@/components/dialog/form-dialog'
import { useAirports, type Airport } from '@/features/tours/hooks/useAirports'
import { useCountries } from '@/data'  // 🔧 核心表架構
import { SELECTORS_LABELS } from './constants/labels'

// 判斷是否為台灣（支援多種寫法）
const isTaiwanCountry = (country: string | undefined | null): boolean => {
  if (!country) return false
  const normalized = country.trim().toLowerCase()
  return normalized === '台灣' || normalized === 'taiwan' || normalized === '臺灣'
}

interface CountryAirportSelectorProps {
  /** 國家值（向下相容，優先用 countryName）*/
  country?: string
  /** 國家名稱（新版，建議使用） */
  countryName?: string
  /** 機場代碼值 */
  airportCode: string
  /** 國家變更回調（🔧 核心表架構：傳完整資料）*/
  onCountryChange: (data: { id: string; name: string; code: string }) => void
  /** 機場代碼變更回調 */
  onAirportChange: (airportCode: string, cityName: string) => void
  /** 是否在 Dialog 內使用（禁用 Portal） */
  disablePortal?: boolean
  /** 是否顯示國家標籤 */
  showLabels?: boolean
  /** 國家列表（可選，不傳則從 hook 取得） */
  countries?: Array<{ id: string; name: string; is_active: boolean }>
}

export function CountryAirportSelector({
  country,
  countryName,
  airportCode,
  onCountryChange,
  onAirportChange,
  disablePortal = false,
  showLabels = true,
  countries: externalCountries,
}: CountryAirportSelectorProps) {
  // 🔧 核心表架構：用 useCountries 取得完整資料
  const { items: countriesData } = useCountries()
  
  const {
    countries: hookCountries,
    countryNameToCode,
    getAirportsByCountry,
    getAirport,
    addAirport,
    loading,
  } = useAirports({ enabled: true })
  
  // 向下相容：優先用 countryName，fallback 到 country
  const displayCountryName = countryName || country || ''

  // 新增機場 Dialog 狀態
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newCityName, setNewCityName] = useState('')
  const [newIataCode, setNewIataCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 國家選項（優先使用外部傳入的）
  const countryOptions = useMemo(() => {
    if (externalCountries) {
      return externalCountries.filter(c => c.is_active).map(c => ({ value: c.name, label: c.name }))
    }
    return hookCountries.map(c => ({ value: c, label: c }))
  }, [externalCountries, hookCountries])

  // 根據國家取得機場列表
  const availableAirports = useMemo(() => {
    if (!displayCountryName) return []

    const airports = getAirportsByCountry(displayCountryName)

    // favorite 已經排在前面了（由 useAirports 處理）
    return airports.map(a => ({
      value: a.iata_code,
      label: formatAirportLabel(a),
    }))
  }, [displayCountryName, getAirportsByCountry])

  // 格式化機場顯示（只顯示城市名）
  function formatAirportLabel(airport: Airport): string {
    const city = airport.city_name_zh || airport.city_name_en || airport.iata_code
    return `${city} (${airport.iata_code})`
  }

  // 🔧 核心表架構：傳完整國家資料
  const handleCountryChange = useCallback(
    (newCountryName: string) => {
      // 從核心表取得完整資料
      const countryData = countriesData.find(c => c.name === newCountryName)
      
      if (!countryData) {
        console.warn(`找不到國家資料: ${newCountryName}`)
        // Fallback：用舊格式（但這不應該發生）
        return
      }
      
      // 傳完整資料給父元件
      onCountryChange({
        id: countryData.id,
        name: countryData.name,
        code: countryData.code || '',
      })
    },
    [countriesData, onCountryChange]
  )

  // 處理機場代碼變更
  const handleAirportChange = useCallback(
    (code: string) => {
      const airport = getAirport(code)
      const cityName = airport?.city_name_zh || airport?.city_name_en || code
      onAirportChange(code, cityName)
    },
    [getAirport, onAirportChange]
  )

  // 處理快速新增機場（Combobox onCreate 回調）
  const handleCreateAirport = useCallback(async (searchText: string) => {
    setNewCityName(searchText)
    setNewIataCode('')
    setCreateDialogOpen(true)
    return null // 不自動選取，等 Dialog 提交後手動處理
  }, [])

  // 提交新增機場
  const handleDialogSubmit = async () => {
    const code = newIataCode.trim().toUpperCase()
    if (code.length !== 3) return

    const countryCode = countryNameToCode[displayCountryName]
    if (!countryCode) return

    setIsSubmitting(true)
    try {
      await addAirport({
        iata_code: code,
        city_name_zh: newCityName.trim(),
        country_code: countryCode,
      })
      handleAirportChange(code)
      setCreateDialogOpen(false)
    } catch {
      // addAirport 內部已記錄錯誤
    } finally {
      setIsSubmitting(false)
    }
  }

  const isTaiwan = isTaiwanCountry(displayCountryName)

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4">
        {/* 國家選擇 */}
        <div>
          {showLabels && (
            <label className="text-sm font-medium text-morandi-primary mb-2 block">
              {SELECTORS_LABELS.LABEL_5040}
            </label>
          )}
          <Combobox
            value={displayCountryName}
            onChange={handleCountryChange}
            options={countryOptions}
            placeholder={SELECTORS_LABELS.SELECT_7169}
            emptyMessage={loading ? '載入中...' : '找不到符合的國家'}
            showSearchIcon
            showClearButton
            disablePortal={disablePortal}
          />
        </div>

        {/* 機場代碼選擇（台灣不需要） */}
        {!isTaiwan ? (
          <div>
            {showLabels && (
              <label className="text-sm font-medium text-morandi-primary mb-2 block">
                {SELECTORS_LABELS.LABEL_5022}
              </label>
            )}
            <Combobox
              value={airportCode}
              onChange={handleAirportChange}
              options={availableAirports}
              placeholder={!displayCountryName ? '請先選擇國家' : '搜尋城市或機場...'}
              emptyMessage={loading ? '載入中...' : '找不到符合的機場'}
              showSearchIcon
              showClearButton
              disabled={!displayCountryName}
              disablePortal={disablePortal}
              onCreate={displayCountryName ? handleCreateAirport : undefined}
            />
          </div>
        ) : (
          <div className="flex items-center">
            {showLabels && <div className="mb-2 h-5" />}
            <p className="text-sm text-morandi-secondary">{SELECTORS_LABELS.SELECT_7771}</p>
          </div>
        )}
      </div>

      {/* 顯示當前選擇的城市代碼（非台灣團）*/}
      {airportCode && !isTaiwan && (
        <p className="text-xs text-morandi-secondary">
          團號城市代碼：<span className="font-mono font-semibold">{airportCode}</span>
        </p>
      )}

      {/* 新增機場 Dialog */}
      <FormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        title={SELECTORS_LABELS.ADD_1468}
        subtitle={`國家：${country}`}
        onSubmit={handleDialogSubmit}
        submitLabel="新增"
        loading={isSubmitting}
        submitDisabled={newIataCode.trim().length !== 3}
        maxWidth="sm"
      >
        <div>
          <label className="text-sm font-medium text-morandi-primary mb-2 block">
            {SELECTORS_LABELS.LABEL_7192}
          </label>
          <Input value={newCityName} onChange={e => setNewCityName(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium text-morandi-primary mb-2 block">
            IATA 機場代碼
          </label>
          <Input
            value={newIataCode}
            onChange={e =>
              setNewIataCode(
                e.target.value
                  .toUpperCase()
                  .replace(/[^A-Z]/g, '')
                  .slice(0, 3)
              )
            }
            placeholder={SELECTORS_LABELS.EXAMPLE_7494}
            maxLength={3}
          />
          <p className="text-xs text-morandi-secondary mt-1">
            3 碼大寫英文，例如 XIY（西安咸陽機場）
          </p>
        </div>
      </FormDialog>
    </div>
  )
}
