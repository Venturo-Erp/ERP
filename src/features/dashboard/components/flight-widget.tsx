'use client'

import { FLIGHT_WIDGET_LABELS, DASHBOARD_LABELS } from '../constants/labels'

import { getTodayString } from '@/lib/utils/format-date'

import { useState, useEffect, useTransition } from 'react'
import {
  Plane,
  Search,
  Calendar,
  Loader2,
  AlertCircle,
  Clock,
  ArrowRight,
  Building2,
  ChevronDown,
  PlaneTakeoff,
  PlaneLanding,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  searchFlightAction,
  searchAirportDeparturesAction,
  type FlightData,
  type AirportFlightItem,
} from '../actions/flight-actions'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type SearchMode = 'flight' | 'airport'
type AirportDirection = 'departure' | 'arrival'

const STORAGE_KEYS = {
  LAST_QUERY: 'flight-widget-last-query',
}

// 全形轉半形函數
const toHalfWidth = (str: string): string => {
  return str
    .replace(/[\uff01-\uff5e]/g, ch => {
      return String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
    })
    .replace(/\u3000/g, ' ')
}

// 常用機場
const COMMON_AIRPORTS = [
  { code: 'TPE', name: '桃園' },
  { code: 'TSA', name: '松山' },
  { code: 'KHH', name: '高雄' },
  { code: 'NRT', name: '成田' },
  { code: 'HND', name: '羽田' },
  { code: 'KIX', name: '關西' },
  { code: 'ICN', name: '仁川' },
  { code: 'HKG', name: '香港' },
]

export function FlightWidget() {
  // 查詢模式
  const [searchMode, setSearchMode] = useState<SearchMode>('flight')

  // 航班號查詢
  const [flightNumber, setFlightNumber] = useState('')
  const [queryDate, setQueryDate] = useState(getTodayString())
  const [flightData, setFlightData] = useState<FlightData | null>(null)

  // 機場查詢
  const [airportCode, setAirportCode] = useState('TPE')
  const [direction, setDirection] = useState<AirportDirection>('departure')
  const [destinationFilter, setDestinationFilter] = useState('')
  const [airportFlights, setAirportFlights] = useState<AirportFlightItem[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // 共用狀態
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // 載入上次查詢
  useEffect(() => {
    const lastQuery = localStorage.getItem(STORAGE_KEYS.LAST_QUERY)
    if (lastQuery) {
      try {
        const query = JSON.parse(lastQuery)
        if (query.mode) setSearchMode(query.mode)
        if (query.flightNumber) setFlightNumber(query.flightNumber)
        if (query.date) setQueryDate(query.date)
        if (query.airportCode) setAirportCode(query.airportCode)
        if (query.direction) setDirection(query.direction)
      } catch {
        // ignore
      }
    }
  }, [])

  // 儲存查詢
  const saveQuery = () => {
    localStorage.setItem(
      STORAGE_KEYS.LAST_QUERY,
      JSON.stringify({
        mode: searchMode,
        flightNumber,
        date: queryDate,
        airportCode,
        direction,
      })
    )
  }

  // 查詢航班號
  const handleSearchFlight = () => {
    if (!flightNumber.trim()) {
      setError(DASHBOARD_LABELS.errorFlightNumberRequired)
      return
    }

    startTransition(async () => {
      setError(null)
      setFlightData(null)
      setAirportFlights([])
      const result = await searchFlightAction(flightNumber, queryDate)

      if (result.error) {
        setError(result.error)
      } else if (result.data) {
        setFlightData(result.data)
        saveQuery()
      }
    })
  }

  // 查詢機場航班
  const handleSearchAirport = () => {
    if (!airportCode.trim()) {
      setError(DASHBOARD_LABELS.errorAirportRequired)
      return
    }

    startTransition(async () => {
      setError(null)
      setFlightData(null)
      setAirportFlights([])

      const result = await searchAirportDeparturesAction(
        airportCode,
        queryDate,
        destinationFilter || undefined
      )

      if (result.error) {
        setError(result.error)
      } else if (result.data) {
        setAirportFlights(result.data)
        setIsDialogOpen(true)
        saveQuery()
      }
    })
  }

  const handleSearch = () => {
    if (searchMode === 'flight') {
      handleSearchFlight()
    } else {
      handleSearchAirport()
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  // 狀態顏色
  const getStatusColor = (status: string) => {
    if (status.includes('延誤') || status.includes('取消')) {
      return 'bg-status-danger-bg text-status-danger'
    }
    if (status.includes('飛行中') || status.includes('登機')) {
      return 'bg-status-info-bg text-status-info'
    }
    if (status.includes('抵達') || status.includes('起飛')) {
      return 'bg-status-success-bg text-status-success'
    }
    return 'bg-muted text-morandi-primary'
  }

  return (
    <div className="h-full">
      <div
        className={cn(
          'h-full rounded-2xl border border-border/70 shadow-lg backdrop-blur-md transition-all duration-300 hover:shadow-lg hover:border-border/80',
          'bg-gradient-to-br from-status-info-bg via-card to-status-info-bg'
        )}
      >
        <div className="p-5 space-y-4 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'rounded-full p-2.5 text-white shadow-lg shadow-black/10',
                'bg-gradient-to-br from-morandi-gold/10 to-status-info-bg/60',
                'ring-2 ring-border/50 ring-offset-1 ring-offset-background/20'
              )}
            >
              <Plane className="w-5 h-5 drop-shadow-sm" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-morandi-primary leading-tight tracking-wide">
                {FLIGHT_WIDGET_LABELS.QUERYING_9420}
              </p>
              <p className="text-xs text-morandi-secondary/90 mt-1 leading-relaxed">
                {FLIGHT_WIDGET_LABELS.QUERYING_4439}
              </p>
            </div>
          </div>

          {/* 查詢模式切換 */}
          <div className="flex rounded-xl bg-card/50 p-1 gap-1">
            <button
              onClick={() => setSearchMode('flight')}
              className={cn(
                'flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5',
                searchMode === 'flight'
                  ? 'bg-card shadow-sm text-morandi-primary'
                  : 'text-morandi-secondary hover:bg-card/50'
              )}
            >
              <Plane className="w-3.5 h-3.5" />
              {FLIGHT_WIDGET_LABELS.LABEL_7892}
            </button>
            <button
              onClick={() => setSearchMode('airport')}
              className={cn(
                'flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5',
                searchMode === 'airport'
                  ? 'bg-card shadow-sm text-morandi-primary'
                  : 'text-morandi-secondary hover:bg-card/50'
              )}
            >
              <Building2 className="w-3.5 h-3.5" />
              {FLIGHT_WIDGET_LABELS.LABEL_4790}
            </button>
          </div>

          {/* 查詢表單 */}
          <div className="rounded-xl bg-card/70 p-3.5 shadow-md border border-border/40 space-y-3">
            {searchMode === 'flight' ? (
              /* 航班號查詢表單 */
              <div>
                <label className="text-xs font-semibold text-morandi-primary mb-2 flex items-center gap-1.5">
                  <Plane className="w-3.5 h-3.5" />
                  {FLIGHT_WIDGET_LABELS.LABEL_8457}
                </label>
                <input
                  type="text"
                  value={flightNumber}
                  onChange={e => setFlightNumber(toHalfWidth(e.target.value).toUpperCase())}
                  onKeyPress={handleKeyPress}
                  placeholder={FLIGHT_WIDGET_LABELS.EXAMPLE_5877}
                  className="w-full px-3 py-2.5 text-sm font-medium border border-border/60 rounded-xl bg-card/90 hover:bg-card focus:bg-card transition-all outline-none shadow-sm backdrop-blur-sm placeholder:text-morandi-secondary/50"
                />
              </div>
            ) : (
              /* 機場查詢表單 - 出發和目的地左右並排 */
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-morandi-primary mb-2 flex items-center gap-1.5">
                    <PlaneTakeoff className="w-3.5 h-3.5" />
                    {FLIGHT_WIDGET_LABELS.DEPARTURE}
                  </label>
                  <Select value={airportCode} onValueChange={setAirportCode}>
                    <SelectTrigger className="w-full px-3 py-2.5 text-sm font-medium border border-border/60 rounded-xl bg-card/90 hover:bg-card focus:bg-card transition-all outline-none shadow-sm backdrop-blur-sm">
                      <SelectValue placeholder={FLIGHT_WIDGET_LABELS.SELECT} />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_AIRPORTS.map(airport => (
                        <SelectItem key={airport.code} value={airport.code}>
                          {airport.code} - {airport.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-morandi-primary mb-2 flex items-center gap-1.5">
                    <PlaneLanding className="w-3.5 h-3.5" />
                    {FLIGHT_WIDGET_LABELS.LABEL_5475}
                  </label>
                  <input
                    type="text"
                    value={destinationFilter}
                    onChange={e => setDestinationFilter(toHalfWidth(e.target.value).toUpperCase())}
                    onKeyPress={handleKeyPress}
                    placeholder="NRT"
                    className="w-full px-3 py-2.5 text-sm font-medium border border-border/60 rounded-xl bg-card/90 hover:bg-card focus:bg-card transition-all outline-none shadow-sm backdrop-blur-sm placeholder:text-morandi-secondary/50"
                  />
                </div>
              </div>
            )}

            {/* 日期選擇 */}
            <div>
              <label className="text-xs font-semibold text-morandi-primary mb-2 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {FLIGHT_WIDGET_LABELS.DATE}
              </label>
              <DatePicker
                value={queryDate}
                onChange={date => setQueryDate(date)}
                placeholder={FLIGHT_WIDGET_LABELS.SELECT_5234}
                className="w-full px-3 py-2.5 text-sm font-medium border border-border/60 rounded-xl bg-card/90 hover:bg-card focus:bg-card transition-all outline-none shadow-sm backdrop-blur-sm"
              />
            </div>

            <button
              onClick={handleSearch}
              disabled={isPending}
              className={cn(
                'w-full px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 shadow-md',
                'bg-gradient-to-br from-morandi-gold/10 to-status-info-bg/60 hover:from-morandi-gold/15 hover:to-status-info-bg/60',
                'text-morandi-primary disabled:opacity-50 disabled:cursor-not-allowed',
                'flex items-center justify-center gap-2'
              )}
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {FLIGHT_WIDGET_LABELS.QUERYING_974}
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  {FLIGHT_WIDGET_LABELS.QUERYING_754}
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

          {/* 航班號查詢結果 */}
          {flightData && !error && (
            <div className="flex-1 rounded-xl bg-card/70 p-4 shadow-md border border-border/40 overflow-auto space-y-3">
              {/* 航班號與狀態 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-morandi-gold/10 to-status-info-bg/60 flex items-center justify-center">
                    <Plane className="w-4 h-4 text-morandi-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-lg text-morandi-primary">
                      {flightData.flightNumber}
                    </p>
                    <p className="text-xs text-morandi-secondary">{flightData.airline}</p>
                  </div>
                </div>
                <span
                  className={cn(
                    'text-xs px-2.5 py-1 rounded-full font-semibold',
                    getStatusColor(flightData.statusText)
                  )}
                >
                  {flightData.statusText}
                </span>
              </div>

              {/* 航線資訊 */}
              <div className="bg-card/50 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-xs text-morandi-secondary mb-1">
                      {FLIGHT_WIDGET_LABELS.DEPARTURE}
                    </p>
                    <p className="font-bold text-base text-morandi-primary">
                      {flightData.departure.iata}
                    </p>
                    <p className="text-xs text-morandi-secondary truncate">
                      {flightData.departure.airport}
                    </p>
                  </div>
                  <div className="flex flex-col items-center">
                    <ArrowRight className="w-5 h-5 text-morandi-secondary/50" />
                    {flightData.duration && (
                      <p className="text-[10px] text-morandi-secondary mt-1">
                        {flightData.duration}
                      </p>
                    )}
                  </div>
                  <div className="flex-1 text-right">
                    <p className="text-xs text-morandi-secondary mb-1">
                      {FLIGHT_WIDGET_LABELS.ARRIVAL}
                    </p>
                    <p className="font-bold text-base text-morandi-primary">
                      {flightData.arrival.iata}
                    </p>
                    <p className="text-xs text-morandi-secondary truncate">
                      {flightData.arrival.airport}
                    </p>
                  </div>
                </div>
              </div>

              {/* 時間與航廈資訊 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-card/50 rounded-lg p-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <PlaneTakeoff className="w-3 h-3 text-morandi-secondary" />
                    <p className="text-xs text-morandi-secondary">{FLIGHT_WIDGET_LABELS.TAKEOFF}</p>
                  </div>
                  <p className="font-semibold text-sm text-morandi-primary">
                    {flightData.departure.time}
                  </p>
                  {flightData.departure.terminal && (
                    <p className="text-xs text-morandi-secondary mt-1">
                      T{flightData.departure.terminal}
                      {flightData.departure.gate && ` · ${flightData.departure.gate}`}
                    </p>
                  )}
                </div>
                <div className="bg-card/50 rounded-lg p-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <PlaneLanding className="w-3 h-3 text-morandi-secondary" />
                    <p className="text-xs text-morandi-secondary">{FLIGHT_WIDGET_LABELS.LANDING}</p>
                  </div>
                  <p className="font-semibold text-sm text-morandi-primary">
                    {flightData.arrival.time}
                  </p>
                  {flightData.arrival.terminal && (
                    <p className="text-xs text-morandi-secondary mt-1">
                      T{flightData.arrival.terminal}
                    </p>
                  )}
                </div>
              </div>

              {/* 機型 */}
              {flightData.aircraft && (
                <div className="bg-card/50 rounded-lg p-2.5">
                  <p className="text-xs text-morandi-secondary mb-1">
                    {FLIGHT_WIDGET_LABELS.AIRCRAFT}
                  </p>
                  <p className="font-semibold text-sm text-morandi-primary">
                    {flightData.aircraft}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 機場航班列表 Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent level={1} className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-morandi-gold/10">
                <PlaneTakeoff className="w-5 h-5 text-morandi-gold" />
              </div>
              <div>
                <span className="text-lg font-semibold text-morandi-primary">
                  {COMMON_AIRPORTS.find(a => a.code === airportCode)?.name || airportCode}
                  {FLIGHT_WIDGET_LABELS.AIRPORT_FLIGHTS_SUFFIX}
                </span>
                <p className="text-sm text-morandi-secondary font-normal mt-0.5">
                  {queryDate}
                  {FLIGHT_WIDGET_LABELS.FLIGHT_COUNT_PREFIX}
                  {airportFlights.length}
                  {FLIGHT_WIDGET_LABELS.FLIGHT_COUNT_SUFFIX}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto mt-4 rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="px-3 py-3 text-left font-semibold text-morandi-primary">
                    {FLIGHT_WIDGET_LABELS.TIME}
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-morandi-primary">
                    {FLIGHT_WIDGET_LABELS.FLIGHT}
                  </th>
                  <th className="px-3 py-3 text-center font-semibold text-morandi-primary">
                    {FLIGHT_WIDGET_LABELS.DEPARTURE}
                  </th>
                  <th className="px-2 py-3 text-center font-semibold text-morandi-secondary w-8"></th>
                  <th className="px-3 py-3 text-center font-semibold text-morandi-primary">
                    {FLIGHT_WIDGET_LABELS.ARRIVAL}
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-morandi-primary">
                    {FLIGHT_WIDGET_LABELS.TERMINAL}
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-morandi-primary">
                    {FLIGHT_WIDGET_LABELS.STATUS}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {airportFlights.map((flight, idx) => (
                  <tr
                    key={`${flight.flightNumber}-${idx}`}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    <td className="px-3 py-3">
                      <p className="font-semibold text-morandi-primary">{flight.scheduledTime}</p>
                      {flight.estimatedTime && flight.estimatedTime !== flight.scheduledTime && (
                        <p className="text-xs text-morandi-secondary">
                          {FLIGHT_WIDGET_LABELS.LABEL_6009} {flight.estimatedTime}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-mono font-medium text-morandi-primary">
                        {flight.flightNumber}
                      </p>
                      <p className="text-xs text-morandi-secondary truncate max-w-[100px]">
                        {flight.airline}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <p className="font-bold text-morandi-primary">{airportCode}</p>
                      <p className="text-xs text-morandi-secondary">
                        {COMMON_AIRPORTS.find(a => a.code === airportCode)?.name || ''}
                      </p>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <ArrowRight className="w-4 h-4 text-morandi-secondary/50 mx-auto" />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <p className="font-bold text-morandi-primary">{flight.destinationIata}</p>
                      <p className="text-xs text-morandi-secondary truncate max-w-[80px] mx-auto">
                        {flight.destination}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-morandi-secondary text-xs">
                      {flight.terminal ? `T${flight.terminal}` : '-'}
                      {flight.gate && ` · ${flight.gate}`}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          'text-xs px-2 py-1 rounded-full font-medium',
                          getStatusColor(flight.status)
                        )}
                      >
                        {flight.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
