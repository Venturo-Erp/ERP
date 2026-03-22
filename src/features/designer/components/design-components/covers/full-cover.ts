import type { DesignComponent, ComponentGenerateOptions } from '../types'
import { COMPANY_NAME, COMPANY_NAME_EN } from '@/lib/tenant'
import { DEFAULT_PALETTE } from '../types'
import type { CanvasElement, TextElement, ShapeElement } from '../../types'

const A5_WIDTH = 559
const A5_HEIGHT = 794

export const fullCover: DesignComponent = {
  id: 'full-cover',
  name: '全頁封面',
  category: 'cover',
  icon: 'BookOpen',
  description: '背景圖 + 標題 + 副標題 + 日期 + 團號',
  defaultWidth: A5_WIDTH,
  defaultHeight: A5_HEIGHT,
  generate: (options: ComponentGenerateOptions): CanvasElement[] => {
    const ts = Date.now()
    const data = options.data || {}
    const p = DEFAULT_PALETTE
    const elements: CanvasElement[] = []

    // 公司名稱
    elements.push({
      id: `comp-fc-company-${ts}`,
      type: 'text',
      name: '公司名稱',
      x: 0,
      y: 72,
      width: A5_WIDTH,
      height: 24,
      zIndex: 10,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      content: (data.companyName as string) || { COMPANY_NAME_EN },
      style: {
        fontFamily: p.fontFamily,
        fontSize: 12,
        fontWeight: '800',
        fontStyle: 'normal',
        textAlign: 'center',
        lineHeight: 1.2,
        letterSpacing: 3,
        color: p.primary,
      },
    } as TextElement)

    // 底線
    elements.push({
      id: `comp-fc-underline-${ts}`,
      type: 'shape',
      name: '公司底線',
      variant: 'rectangle',
      x: (A5_WIDTH - 50) / 2,
      y: 100,
      width: 50,
      height: 2,
      zIndex: 11,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      fill: p.accent,
      stroke: 'transparent',
      strokeWidth: 0,
    } as ShapeElement)

    // 封面圖片佔位
    elements.push({
      id: `comp-fc-placeholder-${ts}`,
      type: 'shape',
      name: '封面圖片區',
      variant: 'rectangle',
      x: 40,
      y: 140,
      width: A5_WIDTH - 80,
      height: 350,
      zIndex: 3,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      fill: p.lightBg,
      stroke: p.accent,
      strokeWidth: 1,
      borderRadius: { topLeft: 100, topRight: 100, bottomLeft: 4, bottomRight: 4 },
    } as ShapeElement)

    // 主標題
    elements.push({
      id: `comp-fc-title-${ts}`,
      type: 'text',
      name: '主標題',
      x: 40,
      y: 524,
      width: A5_WIDTH - 80,
      height: 48,
      zIndex: 12,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      content: (data.tourName as string) || '東京五日遊',
      style: {
        fontFamily: p.fontFamily,
        fontSize: 30,
        fontWeight: '900',
        fontStyle: 'normal',
        textAlign: 'center',
        lineHeight: 1.3,
        letterSpacing: 3,
        color: p.primary,
      },
    } as TextElement)

    // 副標題
    elements.push({
      id: `comp-fc-subtitle-${ts}`,
      type: 'text',
      name: '副標題',
      x: 40,
      y: 580,
      width: A5_WIDTH - 80,
      height: 24,
      zIndex: 12,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      content: (data.subtitle as string) || 'TRAVEL GUIDE',
      style: {
        fontFamily: p.fontFamily,
        fontSize: 12,
        fontWeight: '400',
        fontStyle: 'normal',
        textAlign: 'center',
        lineHeight: 1.4,
        letterSpacing: 4,
        color: p.secondary,
      },
    } as TextElement)

    // 裝飾線
    elements.push({
      id: `comp-fc-gold-line-${ts}`,
      type: 'shape',
      name: '裝飾線',
      variant: 'rectangle',
      x: (A5_WIDTH - 80) / 2,
      y: 610,
      width: 80,
      height: 1,
      zIndex: 12,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      fill: p.accent,
      stroke: 'transparent',
      strokeWidth: 0,
    } as ShapeElement)

    // 日期
    elements.push({
      id: `comp-fc-date-${ts}`,
      type: 'text',
      name: '日期',
      x: 40,
      y: 625,
      width: A5_WIDTH - 80,
      height: 22,
      zIndex: 12,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      content: (data.dateRange as string) || '2025.01.15 — 2025.01.19',
      style: {
        fontFamily: p.fontFamily,
        fontSize: 11,
        fontWeight: '400',
        fontStyle: 'normal',
        textAlign: 'center',
        lineHeight: 1.4,
        letterSpacing: 2,
        color: p.secondary,
      },
    } as TextElement)

    // 團號
    elements.push({
      id: `comp-fc-tour-code-${ts}`,
      type: 'text',
      name: '團號',
      x: 40,
      y: 652,
      width: A5_WIDTH - 80,
      height: 18,
      zIndex: 12,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      content: (data.tourCode as string) || 'TYO250115A',
      style: {
        fontFamily: p.fontFamily,
        fontSize: 10,
        fontWeight: '500',
        fontStyle: 'normal',
        textAlign: 'center',
        lineHeight: 1.2,
        letterSpacing: 3,
        color: p.muted,
      },
    } as TextElement)

    return elements
  },
}
