'use client'

import { useState } from 'react'
import { Banknote, Search, Loader2, AlertCircle, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DASHBOARD_LABELS } from './constants/labels'

interface RemittanceOption {
  provider: string
  fee: number
  exchangeRate: number
  total: number
  deliveryTime: string
}

const COUNTRIES = [
  { code: 'TW', name: '台灣', currency: 'TWD', symbol: 'NT$' },
  { code: 'TH', name: '泰國', currency: 'THB', symbol: '฿' },
  { code: 'JP', name: '日本', currency: 'JPY', symbol: '¥' },
  { code: 'KR', name: '韓國', currency: 'KRW', symbol: '₩' },
  { code: 'CN', name: '中國', currency: 'CNY', symbol: '¥' },
  { code: 'VN', name: '越南', currency: 'VND', symbol: '₫' },
  { code: 'US', name: '美國', currency: 'USD', symbol: '$' },
  { code: 'GB', name: '英國', currency: 'GBP', symbol: '£' },
  { code: 'AU', name: '澳洲', currency: 'AUD', symbol: 'A$' },
]

export function RemittanceWidget() {
  const [from, setFrom] = useState('TW')
  const [to, setTo] = useState('TH')
  const [amount, setAmount] = useState('10000')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<RemittanceOption[]>([])

  const fromCountry = COUNTRIES.find(c => c.code === from)
  const toCountry = COUNTRIES.find(c => c.code === to)

  const compareRates = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError(DASHBOARD_LABELS.errorInvalidAmount)
      return
    }

    if (from === to) {
      setError(DASHBOARD_LABELS.errorSameCountry)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // const response = await fetch(`https://api.worldbank.org/v2/country/${from}/indicator/SI.RMT.COST.IB.ZS?format=json`);

      await new Promise(resolve => setTimeout(resolve, 1000))

      // 模擬資料
      const mockResults: RemittanceOption[] = [
        {
          provider: '銀行電匯',
          fee: parseFloat(amount) * 0.015,
          exchangeRate: getMockExchangeRate(from, to),
          total: 0,
          deliveryTime: '3-5 工作天',
        },
        {
          provider: 'Western Union',
          fee: parseFloat(amount) * 0.02,
          exchangeRate: getMockExchangeRate(from, to) * 0.98,
          total: 0,
          deliveryTime: '即時',
        },
        {
          provider: 'Wise (TransferWise)',
          fee: parseFloat(amount) * 0.005,
          exchangeRate: getMockExchangeRate(from, to) * 0.995,
          total: 0,
          deliveryTime: '1-2 工作天',
        },
      ]

      // 計算總成本
      mockResults.forEach(option => {
        option.total = (parseFloat(amount) - option.fee) * option.exchangeRate
      })

      // 按最划算排序
      mockResults.sort((a, b) => b.total - a.total)

      setResults(mockResults)
    } catch (err) {
      setError(err instanceof Error ? err.message : DASHBOARD_LABELS.errorQueryFailed)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const getMockExchangeRate = (from: string, to: string): number => {
    const rates: Record<string, Record<string, number>> = {
      TW: { TH: 1.05, JP: 4.5, US: 0.032 },
      US: { TW: 31.5, TH: 33, JP: 140 },
    }

    return rates[from]?.[to] || 1
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      compareRates()
    }
  }

  return (
    <div className="h-full">
      <div
        className={cn(
          'h-full rounded-2xl border border-border/70 shadow-lg backdrop-blur-md transition-all duration-300 hover:shadow-lg hover:border-border/80',
          'bg-gradient-to-br from-morandi-gold/10 via-card to-status-warning-bg'
        )}
      >
        <div className="p-5 space-y-4 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'rounded-full p-2.5 text-white shadow-lg shadow-black/10',
                'bg-gradient-to-br from-morandi-gold/60 to-status-warning-bg',
                'ring-2 ring-border/50 ring-offset-1 ring-offset-background/20'
              )}
            >
              <Banknote className="w-5 h-5 drop-shadow-sm" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-morandi-primary leading-tight tracking-wide">
                {DASHBOARD_LABELS.LABEL_790}
              </p>
              <p className="text-xs text-morandi-secondary/90 mt-1.5 leading-relaxed">
                {DASHBOARD_LABELS.LABEL_4154}
              </p>
            </div>
          </div>

          {/* 查詢表單 */}
          <div className="rounded-xl bg-card/70 p-3.5 shadow-md border border-border/40 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs font-semibold text-morandi-primary mb-2 block">
                  {DASHBOARD_LABELS.EXPORT_8161}
                </label>
                <Select value={from} onValueChange={setFrom}>
                  <SelectTrigger className="w-full px-2 py-2 text-xs font-medium border border-border/60 rounded-xl bg-card/90 hover:bg-card focus:bg-card transition-all outline-none shadow-sm backdrop-blur-sm">
                    <SelectValue placeholder={DASHBOARD_LABELS.SELECT_8015} />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map(country => (
                      <SelectItem key={country.code} value={country.code}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-morandi-primary mb-2 block">
                  {DASHBOARD_LABELS.LABEL_7349}
                </label>
                <Select value={to} onValueChange={setTo}>
                  <SelectTrigger className="w-full px-2 py-2 text-xs font-medium border border-border/60 rounded-xl bg-card/90 hover:bg-card focus:bg-card transition-all outline-none shadow-sm backdrop-blur-sm">
                    <SelectValue placeholder={DASHBOARD_LABELS.SELECT_8015} />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map(country => (
                      <SelectItem key={country.code} value={country.code}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-morandi-primary mb-2 block">
                  {DASHBOARD_LABELS.AMOUNT}
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="10000"
                  className="w-full px-2 py-2 text-xs font-medium border border-border/60 rounded-xl bg-card/90 hover:bg-card focus:bg-card transition-all outline-none shadow-sm backdrop-blur-sm"
                />
              </div>
            </div>

            <button
              onClick={compareRates}
              disabled={loading}
              className={cn(
                'w-full px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 shadow-md',
                'bg-gradient-to-br from-morandi-gold/60 to-status-warning-bg hover:from-morandi-gold/80 hover:to-status-warning',
                'text-morandi-primary disabled:opacity-50 disabled:cursor-not-allowed',
                'flex items-center justify-center gap-2'
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {DASHBOARD_LABELS.LABEL_1001}
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  {DASHBOARD_LABELS.LABEL_6440}
                </>
              )}
            </button>
          </div>

          {/* 錯誤訊息 */}
          {error && (
            <div className="rounded-xl bg-status-danger-bg/80 border border-status-danger/50 p-3.5 backdrop-blur-sm">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-status-danger flex-shrink-0 mt-0.5" />
                <p className="text-xs text-status-danger font-medium">{error}</p>
              </div>
            </div>
          )}

          {/* 比較結果 */}
          {results.length > 0 && !error && (
            <div className="flex-1 overflow-auto space-y-2">
              {results.map((option, index) => (
                <div
                  key={index}
                  className={cn(
                    'rounded-xl p-3 shadow-md border transition-all',
                    index === 0
                      ? 'bg-gradient-to-br from-status-success-bg/90 to-morandi-green/10/90 border-morandi-green/30'
                      : 'bg-card/70 border-border/40'
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {index === 0 && (
                        <div className="w-6 h-6 rounded-full bg-status-success flex items-center justify-center">
                          <TrendingDown className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                      <p
                        className={cn(
                          'font-bold text-sm',
                          index === 0 ? 'text-status-success' : 'text-morandi-primary'
                        )}
                      >
                        {option.provider}
                      </p>
                      {index === 0 && (
                        <span className="text-xs px-2 py-0.5 bg-status-success text-white rounded-full font-semibold">
                          {DASHBOARD_LABELS.LABEL_2930}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-morandi-secondary">{option.deliveryTime}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-card/50 rounded-lg p-2">
                      <p className="text-xs text-morandi-secondary mb-1">
                        {DASHBOARD_LABELS.LABEL_4924}
                      </p>
                      <p className="font-semibold text-xs text-status-danger">
                        -{fromCountry?.symbol}
                        {option.fee.toFixed(0)}
                      </p>
                    </div>
                    <div className="bg-card/50 rounded-lg p-2">
                      <p className="text-xs text-morandi-secondary mb-1">
                        {DASHBOARD_LABELS.LABEL_3165}
                      </p>
                      <p className="font-semibold text-xs text-morandi-primary">
                        {option.exchangeRate.toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-card/50 rounded-lg p-2">
                      <p className="text-xs text-morandi-secondary mb-1">
                        {DASHBOARD_LABELS.LABEL_433}
                      </p>
                      <p className="font-bold text-sm text-status-success">
                        {toCountry?.symbol}
                        {option.total.toFixed(0)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {/* 提示 */}
              <div className="bg-status-warning-bg rounded-lg p-3 border border-status-warning/30 mt-3">
                <p className="text-xs text-morandi-primary">
                  {DASHBOARD_LABELS.remittanceDisclaimer}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
