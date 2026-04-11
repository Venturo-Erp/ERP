import {
  Calculator,
  DollarSign,
  Clock,
  Clipboard,
  Cloud,
  Plane,
  CloudSun,
  ClipboardList,
} from 'lucide-react'
import type { WidgetConfig } from '../types'
import { CalculatorWidget } from './calculator-widget'
import { CurrencyWidget } from './currency-widget'
import { TimerWidget } from './timer-widget'
import { NotesWidget } from './notes-widget'
import { WeatherWidget } from './weather-widget'
import { WeatherWidgetWeekly } from './weather-widget-weekly'
import { FlightWidget } from './flight-widget'
import { SupplierQuickActionsWidget } from './supplier-quick-actions-widget'
import { ClockInWidget } from './clock-in-widget'
// PNR widget 已移至團內操作（TourPnrToolDialog）

// 小工具配置
export const AVAILABLE_WIDGETS: Array<Omit<WidgetConfig, 'id'> & { id: string }> = [
  {
    id: 'clock-in',
    name: '人資中心',
    icon: Clock,
    component: ClockInWidget,
    span: 1,
  },
  {
    id: 'supplier-quick-actions',
    name: '供應商專區',
    icon: ClipboardList,
    component: SupplierQuickActionsWidget,
    span: 1,
    // 只對供應商顯示（在 DashboardClient 中會根據 workspace_type 過濾）
  },
  {
    id: 'flight',
    name: '航班查詢',
    icon: Plane,
    component: FlightWidget,
    span: 1,
  },
  {
    id: 'weather',
    name: '天氣查詢',
    icon: Cloud,
    component: WeatherWidget,
    span: 1,
  },
  {
    id: 'weather-weekly',
    name: '天氣週報',
    icon: CloudSun,
    component: WeatherWidgetWeekly,
    span: 2,
  },
  {
    id: 'calculator',
    name: '計算機',
    icon: Calculator,
    component: CalculatorWidget,
    span: 1,
  },
  {
    id: 'currency',
    name: '匯率換算',
    icon: DollarSign,
    component: CurrencyWidget,
    span: 1,
  },
  {
    id: 'timer',
    name: '計時器',
    icon: Clock,
    component: TimerWidget,
    span: 1,
  },
  {
    id: 'notes',
    name: '便條紙',
    icon: Clipboard,
    component: NotesWidget,
    span: 1,
  },
]
