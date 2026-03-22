/**
 * 日系風格範本
 *
 * 簡約、留白、優雅的日式設計風格
 */
import type { PageTemplate, TemplateData } from './types'
import { COMPANY_NAME, COMPANY_NAME_EN } from '@/lib/tenant'
import type {
  CanvasElement,
  TextElement,
  ShapeElement,
  ImageElement,
} from '@/features/designer/components/types'

// A5 尺寸
const A5_WIDTH = 559
const A5_HEIGHT = 794

export const japaneseStyleV1: PageTemplate = {
  id: 'japanese-style-v1',
  name: '日系風格',
  description: '簡約、留白、優雅的日式設計風格',
  thumbnailUrl: '/thumbnails/japanese-style-v1.jpg',
  category: 'cover',

  generateElements: (data: TemplateData): CanvasElement[] => {
    const elements: CanvasElement[] = []

    // 1. 公司名稱
    const companyText: TextElement = {
      id: 'el-company',
      type: 'text',
      name: '公司名稱',
      x: 0,
      y: 80,
      width: A5_WIDTH,
      height: 20,
      zIndex: 1,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      content: data.companyName || {COMPANY_NAME_EN},
      style: {
        fontFamily: 'Noto Sans TC',
        fontSize: 10,
        fontWeight: '800',
        fontStyle: 'normal',
        textAlign: 'center',
        lineHeight: 1.2,
        letterSpacing: 2.4,
        color: '#181511',
      },
    }
    elements.push(companyText)

    // 2. 公司名稱底線
    const companyUnderline: ShapeElement = {
      id: 'el-company-underline',
      type: 'shape',
      name: '公司底線',
      variant: 'rectangle',
      x: (A5_WIDTH - 50) / 2,
      y: 100,
      width: 50,
      height: 2,
      zIndex: 2,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      fill: '#c9aa7c', // morandi-gold
      stroke: '#c9aa7c',
      strokeWidth: 0.5,
    }
    elements.push(companyUnderline)

    // 3. 封面區域
    const coverX = 32
    const coverY = 140
    const coverWidth = A5_WIDTH - 64
    const coverHeight = 350

    if (data.coverImage) {
      // 有封面圖片時顯示圖片（圓拱形狀）
      const coverImage: ImageElement = {
        id: 'el-cover-image',
        type: 'image',
        name: '封面圖片',
        x: coverX,
        y: coverY,
        width: coverWidth,
        height: coverHeight,
        zIndex: 3,
        rotation: 0,
        opacity: 1,
        locked: true, // 鎖定位置，使用「調整位置」按鈕來調整圖片
        visible: true,
        src: data.coverImage,
        objectFit: 'cover',
        // 圓拱形狀：上方大圓角，下方小圓角
        borderRadius: {
          topLeft: 100,
          topRight: 100,
          bottomLeft: 4,
          bottomRight: 4,
        },
        // 使用者調整的位置設定
        position: data.coverImagePosition
          ? {
              x: data.coverImagePosition.x,
              y: data.coverImagePosition.y,
              scale: data.coverImagePosition.scale,
            }
          : undefined,
      }
      elements.push(coverImage)
    } else {
      // 沒有封面圖片時顯示圓拱形狀占位框（與圖片遮罩相同形狀）
      const placeholder: ShapeElement = {
        id: 'el-cover-placeholder',
        type: 'shape',
        name: '封面占位',
        variant: 'rectangle',
        x: coverX,
        y: coverY,
        width: coverWidth,
        height: coverHeight,
        zIndex: 3,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        fill: '#f8f6f3',
        stroke: '#c9aa7c',
        strokeWidth: 2,
        strokeDashArray: [8, 4],
        // 使用與圖片相同的圓拱形狀
        borderRadius: {
          topLeft: 100,
          topRight: 100,
          bottomLeft: 4,
          bottomRight: 4,
        },
      }
      elements.push(placeholder)

      // 上傳提示文字
      const uploadHint: TextElement = {
        id: 'el-upload-hint',
        type: 'text',
        name: '上傳提示',
        x: coverX,
        y: coverY + coverHeight / 2 - 20,
        width: coverWidth,
        height: 40,
        zIndex: 4,
        rotation: 0,
        opacity: 0.6,
        locked: false,
        visible: true,
        content: '雙擊此處上傳封面圖片',
        style: {
          fontFamily: 'Noto Sans TC',
          fontSize: 14,
          fontWeight: '500',
          fontStyle: 'normal',
          textAlign: 'center',
          lineHeight: 1.4,
          letterSpacing: 0.5,
          color: '#887863',
        },
      }
      elements.push(uploadHint)
    }

    // 4. 地點前的橫線
    const destLine: ShapeElement = {
      id: 'el-dest-line',
      type: 'shape',
      name: '地點橫線',
      variant: 'rectangle',
      x: 40,
      y: 520,
      width: 32,
      height: 1,
      zIndex: 4,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      fill: '#c9aa7c',
      stroke: '#c9aa7c',
      strokeWidth: 0.5,
    }
    elements.push(destLine)

    // 5. 地點文字
    const destinationText: TextElement = {
      id: 'el-destination',
      type: 'text',
      name: '地點',
      x: 82,
      y: 513,
      width: 200,
      height: 20,
      zIndex: 5,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      content: data.destination || '',
      style: {
        fontFamily: 'Noto Sans TC',
        fontSize: 10,
        fontWeight: '500',
        fontStyle: 'normal',
        textAlign: 'left',
        lineHeight: 1.2,
        letterSpacing: 1.6,
        color: '#887863',
      },
    }
    elements.push(destinationText)

    // 6. 主標題
    const mainTitle: TextElement = {
      id: 'el-main-title',
      type: 'text',
      name: '主標題',
      x: 40,
      y: 540,
      width: 400,
      height: 120,
      zIndex: 6,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      content: data.mainTitle || '',
      style: {
        fontFamily: 'Noto Sans TC',
        fontSize: 42,
        fontWeight: '800',
        fontStyle: 'normal',
        textAlign: 'left',
        lineHeight: 1.0,
        letterSpacing: -0.5,
        color: '#181511',
      },
    }
    elements.push(mainTitle)

    // 7. Travel Handbook 副標
    const subTitle: TextElement = {
      id: 'el-sub-title',
      type: 'text',
      name: '副標題',
      x: 40,
      y: 680,
      width: 300,
      height: 40,
      zIndex: 7,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      content: data.subtitle || 'Travel Handbook',
      style: {
        fontFamily: 'Noto Sans TC',
        fontSize: 32,
        fontWeight: '800',
        fontStyle: 'normal',
        textAlign: 'left',
        lineHeight: 1.2,
        letterSpacing: 1.6,
        color: '#181511',
      },
    }
    elements.push(subTitle)

    // 8. 日期
    const datesText: TextElement = {
      id: 'el-dates',
      type: 'text',
      name: '日期',
      x: A5_WIDTH - 200 - 40,
      y: 715,
      width: 200,
      height: 14,
      zIndex: 8,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      content: data.travelDates || '',
      style: {
        fontFamily: 'Noto Sans TC',
        fontSize: 10,
        fontWeight: '800',
        fontStyle: 'normal',
        textAlign: 'right',
        lineHeight: 1.2,
        letterSpacing: 0,
        color: '#c9aa7c',
      },
    }
    elements.push(datesText)

    // 9. 團號（如果有的話）
    if (data.tourCode) {
      const tourCodeText: TextElement = {
        id: 'el-tour-code',
        type: 'text',
        name: '團號',
        x: 40,
        y: 750,
        width: 200,
        height: 14,
        zIndex: 9,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        content: data.tourCode,
        style: {
          fontFamily: 'Noto Sans TC',
          fontSize: 8,
          fontWeight: '500',
          fontStyle: 'normal',
          textAlign: 'left',
          lineHeight: 1.2,
          letterSpacing: 0,
          color: '#887863',
        },
      }
      elements.push(tourCodeText)
    }

    return elements
  },
}
