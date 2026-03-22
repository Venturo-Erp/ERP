import type { DesignComponent, ComponentGenerateOptions } from '../types'
import { COMPANY_NAME, COMPANY_NAME_EN } from '@/lib/tenant'
import { DEFAULT_PALETTE } from '../types'
import type { CanvasElement, TextElement, ShapeElement } from '../../types'

export const footerComponent: DesignComponent = {
  id: 'page-footer',
  name: '頁腳',
  category: 'layout',
  icon: 'PanelBottom',
  description: '頁碼 + 公司名稱',
  defaultWidth: 495,
  defaultHeight: 30,
  generate: (options: ComponentGenerateOptions): CanvasElement[] => {
    const { x, y, width } = options
    const ts = Date.now()
    const data = options.data || {}
    const p = DEFAULT_PALETTE

    return [
      {
        id: `comp-ftr-line-${ts}`,
        type: 'shape',
        name: '頁腳頂線',
        variant: 'rectangle',
        x,
        y,
        width,
        height: 1,
        zIndex: 1,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        fill: p.border,
        stroke: 'transparent',
        strokeWidth: 0,
      } as ShapeElement,
      {
        id: `comp-ftr-company-${ts}`,
        type: 'text',
        name: '公司名稱',
        x,
        y: y + 8,
        width: width / 2,
        height: 14,
        zIndex: 1,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        content: (data.companyName as string) || {COMPANY_NAME_EN},
        style: {
          fontFamily: p.fontFamily,
          fontSize: 7,
          fontWeight: '400',
          fontStyle: 'normal',
          color: p.muted,
          textAlign: 'left',
          lineHeight: 1,
          letterSpacing: 1,
        },
      } as TextElement,
      {
        id: `comp-ftr-page-${ts}`,
        type: 'text',
        name: '頁碼',
        x: x + width / 2,
        y: y + 8,
        width: width / 2,
        height: 14,
        zIndex: 1,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        content: (data.pageNumber as string) || '01',
        style: {
          fontFamily: p.fontFamily,
          fontSize: 8,
          fontWeight: '500',
          fontStyle: 'normal',
          color: p.accent,
          textAlign: 'right',
          lineHeight: 1,
          letterSpacing: 0,
        },
      } as TextElement,
    ]
  },
}
