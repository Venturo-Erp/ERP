/**
 * COMPANY_NAME_EN 官方風格範本 v1
 *
 * 參考 0209東京手冊設計：
 * - A5 尺寸，設計成跨頁配對（左/右）
 * - 簡約現代設計
 * - 金色調裝飾線
 * - 清晰的資訊層次
 */
import type { PageTemplate, TemplateData } from './types'
import { COMPANY_NAME, COMPANY_NAME_EN } from '@/lib/tenant'
import type {
  CanvasElement,
  TextElement,
  ShapeElement,
  ImageElement,
} from '@/features/designer/components/types'

// A5 尺寸（設計尺寸，96 DPI）
const A5_WIDTH = 559
const A5_HEIGHT = 794

// 品牌色彩
const COLORS = {
  gold: '#c9aa7c', // morandi-gold
  black: '#181511',
  gray: '#8b8680',
  lightGray: '#f5f5f5',
  white: '#ffffff',
}

/**
 * 封底頁（封面跨頁的左頁）
 * 包含：公司資訊、LINE QR Code、小圖片、Slogan
 */
export const cornerTravelV1BackCover: PageTemplate = {
  id: 'corner-travel-v1-back-cover',
  name: 'Corner 封底',
  description: '封底頁，含公司資訊和 QR Code',
  thumbnailUrl: '/thumbnails/corner-travel-v1-back-cover.jpg',
  category: 'cover',

  generateElements: (data: TemplateData): CanvasElement[] => {
    const elements: CanvasElement[] = []

    // 頂部標題區
    const headerText: TextElement = {
      id: 'el-header-text',
      type: 'text',
      name: '頂部標題',
      x: 32,
      y: 40,
      width: A5_WIDTH - 64,
      height: 60,
      zIndex: 1,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      content: `TRAVEL GUIDE FOR VISITING\n${data.destination?.toUpperCase() || 'JAPAN'}`,
      style: {
        fontFamily: 'Noto Sans TC',
        fontSize: 11,
        fontWeight: '600',
        fontStyle: 'normal',
        textAlign: 'left',
        lineHeight: 1.4,
        letterSpacing: 1.5,
        color: COLORS.black,
      },
    }
    elements.push(headerText)

    // 小圖片區塊（中央偏上）
    if (data.coverImage) {
      const smallImage: ImageElement = {
        id: 'el-small-cover-image',
        type: 'image',
        name: '小封面圖',
        x: 80,
        y: 180,
        width: 280,
        height: 320,
        zIndex: 2,
        rotation: 0,
        opacity: 1,
        locked: true,
        visible: true,
        src: data.coverImage,
        objectFit: 'cover',
      }
      elements.push(smallImage)
    }

    // Slogan
    const sloganText: TextElement = {
      id: 'el-slogan',
      type: 'text',
      name: 'Slogan',
      x: 80,
      y: 520,
      width: 280,
      height: 24,
      zIndex: 3,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      content: 'EXPLORE EVERY CORNER OF THE WORLD',
      style: {
        fontFamily: 'Noto Sans TC',
        fontSize: 9,
        fontWeight: '500',
        fontStyle: 'normal',
        textAlign: 'center',
        lineHeight: 1.2,
        letterSpacing: 2,
        color: COLORS.black,
      },
    }
    elements.push(sloganText)

    // 底部公司資訊
    const companyInfo: TextElement = {
      id: 'el-company-info',
      type: 'text',
      name: '公司資訊',
      x: 32,
      y: A5_HEIGHT - 120,
      width: 300,
      height: 80,
      zIndex: 4,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      content: `${data.companyName || ''}`,
      style: {
        fontFamily: 'Noto Sans TC',
        fontSize: 8,
        fontWeight: '400',
        fontStyle: 'normal',
        textAlign: 'left',
        lineHeight: 1.6,
        letterSpacing: 0.5,
        color: COLORS.gray,
      },
    }
    elements.push(companyInfo)

    // QR Code 區塊（佔位）
    const qrPlaceholder: ShapeElement = {
      id: 'el-qr-placeholder',
      type: 'shape',
      name: 'QR Code',
      variant: 'rectangle',
      x: A5_WIDTH - 100,
      y: A5_HEIGHT - 100,
      width: 60,
      height: 60,
      zIndex: 5,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      fill: COLORS.lightGray,
      stroke: COLORS.gray,
      strokeWidth: 1,
    }
    elements.push(qrPlaceholder)

    return elements
  },
}

/**
 * 封面頁（封面跨頁的右頁）
 * 包含：大圖片、標題、日期
 */
export const cornerTravelV1FrontCover: PageTemplate = {
  id: 'corner-travel-v1-front-cover',
  name: 'Corner 封面',
  description: '封面頁，含大圖片和標題',
  thumbnailUrl: '/thumbnails/corner-travel-v1-front-cover.jpg',
  category: 'cover',

  generateElements: (data: TemplateData): CanvasElement[] => {
    const elements: CanvasElement[] = []

    // 主圖片（幾乎滿版）
    if (data.coverImage) {
      const mainImage: ImageElement = {
        id: 'el-main-cover-image',
        type: 'image',
        name: '主封面圖',
        x: 0,
        y: 0,
        width: A5_WIDTH,
        height: A5_HEIGHT - 120,
        zIndex: 1,
        rotation: 0,
        opacity: 1,
        locked: true,
        visible: true,
        src: data.coverImage,
        objectFit: 'cover',
      }
      elements.push(mainImage)
    }

    // 底部白色區塊
    const bottomBar: ShapeElement = {
      id: 'el-bottom-bar',
      type: 'shape',
      name: '底部區塊',
      variant: 'rectangle',
      x: 0,
      y: A5_HEIGHT - 120,
      width: A5_WIDTH,
      height: 120,
      zIndex: 2,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      fill: COLORS.white,
      stroke: 'transparent',
      strokeWidth: 0,
    }
    elements.push(bottomBar)

    // 底部標題行
    const subheadingText: TextElement = {
      id: 'el-subheading',
      type: 'text',
      name: '副標題',
      x: 32,
      y: A5_HEIGHT - 110,
      width: A5_WIDTH - 64,
      height: 16,
      zIndex: 3,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      content: `TRAVEL GUIDE FOR VISITING ${data.destination?.split(',')[1]?.trim().toUpperCase() || 'JAPAN'}`,
      style: {
        fontFamily: 'Noto Sans TC',
        fontSize: 9,
        fontWeight: '500',
        fontStyle: 'normal',
        textAlign: 'center',
        lineHeight: 1.2,
        letterSpacing: 1.5,
        color: COLORS.gray,
      },
    }
    elements.push(subheadingText)

    // 主標題（城市名）
    const cityName = data.destination?.split(',')[0]?.trim().toUpperCase() || 'TOKYO'
    const mainTitleText: TextElement = {
      id: 'el-main-title',
      type: 'text',
      name: '主標題',
      x: 32,
      y: A5_HEIGHT - 90,
      width: 200,
      height: 50,
      zIndex: 4,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      content: cityName,
      style: {
        fontFamily: 'Noto Sans TC',
        fontSize: 36,
        fontWeight: '900',
        fontStyle: 'normal',
        textAlign: 'left',
        lineHeight: 1,
        letterSpacing: 3,
        color: COLORS.black,
      },
    }
    elements.push(mainTitleText)

    // 右側中文標題和日期
    const rightInfoText: TextElement = {
      id: 'el-right-info',
      type: 'text',
      name: '右側資訊',
      x: A5_WIDTH - 180,
      y: A5_HEIGHT - 90,
      width: 150,
      height: 50,
      zIndex: 5,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      content: `${data.mainTitle || '日本東京行程手冊'}\n${data.travelDates || ''}`,
      style: {
        fontFamily: 'Noto Sans TC',
        fontSize: 11,
        fontWeight: '500',
        fontStyle: 'normal',
        textAlign: 'right',
        lineHeight: 1.6,
        letterSpacing: 0.5,
        color: COLORS.black,
      },
    }
    elements.push(rightInfoText)

    return elements
  },
}

/**
 * 目錄頁（左頁）
 * 包含：行程索引、聯絡資訊
 */
export const cornerTravelV1TocLeft: PageTemplate = {
  id: 'corner-travel-v1-toc-left',
  name: 'Corner 目錄(左)',
  description: '目錄頁左側，含行程索引',
  thumbnailUrl: '/thumbnails/corner-travel-v1-toc-left.jpg',
  category: 'toc',

  generateElements: (data: TemplateData): CanvasElement[] => {
    const elements: CanvasElement[] = []

    // 頂部標題
    const headerText: TextElement = {
      id: 'el-toc-header',
      type: 'text',
      name: '頁首',
      x: 32,
      y: 32,
      width: A5_WIDTH - 64,
      height: 50,
      zIndex: 1,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      content: `TRAVEL GUIDE FOR VISITING JAPAN\n${data.destination?.split(',')[0]?.toUpperCase() || 'TOKYO'}`,
      style: {
        fontFamily: 'Noto Sans TC',
        fontSize: 10,
        fontWeight: '600',
        fontStyle: 'normal',
        textAlign: 'left',
        lineHeight: 1.4,
        letterSpacing: 1.5,
        color: COLORS.black,
      },
    }
    elements.push(headerText)

    // 分隔線
    const divider: ShapeElement = {
      id: 'el-toc-divider',
      type: 'shape',
      name: '分隔線',
      variant: 'rectangle',
      x: 32,
      y: 95,
      width: 100,
      height: 1,
      zIndex: 2,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      fill: COLORS.gold,
      stroke: 'transparent',
      strokeWidth: 0,
    }
    elements.push(divider)

    // INDEX 標題
    const indexTitle: TextElement = {
      id: 'el-index-title',
      type: 'text',
      name: 'INDEX 標題',
      x: 32,
      y: 110,
      width: A5_WIDTH - 64,
      height: 24,
      zIndex: 3,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      content: 'INDEX｜行程規劃及索引',
      style: {
        fontFamily: 'Noto Sans TC',
        fontSize: 12,
        fontWeight: '700',
        fontStyle: 'normal',
        textAlign: 'left',
        lineHeight: 1.2,
        letterSpacing: 1,
        color: COLORS.black,
      },
    }
    elements.push(indexTitle)

    // 每日行程列表（動態生成）
    const dailyItineraries = data.dailyItineraries || []
    let yPos = 150

    dailyItineraries.forEach((day, index) => {
      // 天數標題
      const dayTitle: TextElement = {
        id: `el-day-${index + 1}-title`,
        type: 'text',
        name: `第${index + 1}天標題`,
        x: 32,
        y: yPos,
        width: A5_WIDTH - 64,
        height: 20,
        zIndex: 10 + index,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        content: `第${index + 1}天行程 DAY ${index + 1}`,
        style: {
          fontFamily: 'Noto Sans TC',
          fontSize: 10,
          fontWeight: '600',
          fontStyle: 'normal',
          textAlign: 'left',
          lineHeight: 1.2,
          letterSpacing: 0.5,
          color: COLORS.black,
        },
      }
      elements.push(dayTitle)

      // 行程內容
      const dayContent: TextElement = {
        id: `el-day-${index + 1}-content`,
        type: 'text',
        name: `第${index + 1}天內容`,
        x: 32,
        y: yPos + 22,
        width: A5_WIDTH - 64,
        height: 16,
        zIndex: 10 + index,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        content: day.title || '',
        style: {
          fontFamily: 'Noto Sans TC',
          fontSize: 9,
          fontWeight: '400',
          fontStyle: 'normal',
          textAlign: 'left',
          lineHeight: 1.4,
          letterSpacing: 0.3,
          color: COLORS.gray,
        },
      }
      elements.push(dayContent)

      // 餐食資訊
      const meals = day.meals || {}
      const mealText = [
        meals.breakfast ? `早餐 ${meals.breakfast}` : '',
        meals.lunch ? `午餐 ${meals.lunch}` : '',
        meals.dinner ? `晚餐 ${meals.dinner}` : '',
      ]
        .filter(Boolean)
        .join('　')

      if (mealText) {
        const mealInfo: TextElement = {
          id: `el-day-${index + 1}-meals`,
          type: 'text',
          name: `第${index + 1}天餐食`,
          x: 32,
          y: yPos + 40,
          width: A5_WIDTH - 64,
          height: 14,
          zIndex: 10 + index,
          rotation: 0,
          opacity: 1,
          locked: false,
          visible: true,
          content: mealText,
          style: {
            fontFamily: 'Noto Sans TC',
            fontSize: 8,
            fontWeight: '400',
            fontStyle: 'normal',
            textAlign: 'left',
            lineHeight: 1.2,
            letterSpacing: 0.3,
            color: COLORS.gray,
          },
        }
        elements.push(mealInfo)
      }

      // 住宿資訊
      if (day.accommodation) {
        const hotelInfo: TextElement = {
          id: `el-day-${index + 1}-hotel`,
          type: 'text',
          name: `第${index + 1}天住宿`,
          x: 32,
          y: yPos + 56,
          width: A5_WIDTH - 64,
          height: 14,
          zIndex: 10 + index,
          rotation: 0,
          opacity: 1,
          locked: false,
          visible: true,
          content: `住宿 ${day.accommodation}`,
          style: {
            fontFamily: 'Noto Sans TC',
            fontSize: 8,
            fontWeight: '400',
            fontStyle: 'normal',
            textAlign: 'left',
            lineHeight: 1.2,
            letterSpacing: 0.3,
            color: COLORS.gray,
          },
        }
        elements.push(hotelInfo)
      }

      yPos += 85
    })

    // 底部聯絡資訊
    const contactTitle: TextElement = {
      id: 'el-contact-title',
      type: 'text',
      name: '聯絡資訊標題',
      x: 32,
      y: A5_HEIGHT - 100,
      width: 200,
      height: 16,
      zIndex: 50,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      content: '聯絡資訊 CONTACTS',
      style: {
        fontFamily: 'Noto Sans TC',
        fontSize: 9,
        fontWeight: '600',
        fontStyle: 'normal',
        textAlign: 'left',
        lineHeight: 1.2,
        letterSpacing: 0.5,
        color: COLORS.black,
      },
    }
    elements.push(contactTitle)

    const contactInfo: TextElement = {
      id: 'el-contact-info',
      type: 'text',
      name: '聯絡資訊',
      x: 32,
      y: A5_HEIGHT - 80,
      width: 250,
      height: 40,
      zIndex: 51,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      content: `隨團人員｜${data.leaderName || '待確認'} ${data.leaderPhone || ''}\n送機人員｜待確認`,
      style: {
        fontFamily: 'Noto Sans TC',
        fontSize: 8,
        fontWeight: '400',
        fontStyle: 'normal',
        textAlign: 'left',
        lineHeight: 1.6,
        letterSpacing: 0.3,
        color: COLORS.gray,
      },
    }
    elements.push(contactInfo)

    return elements
  },
}

/**
 * 目錄頁（右頁）
 * 包含：後半行程、航班資訊、行李規定
 */
export const cornerTravelV1TocRight: PageTemplate = {
  id: 'corner-travel-v1-toc-right',
  name: 'Corner 目錄(右)',
  description: '目錄頁右側，含航班和行李資訊',
  thumbnailUrl: '/thumbnails/corner-travel-v1-toc-right.jpg',
  category: 'toc',

  generateElements: (data: TemplateData): CanvasElement[] => {
    const elements: CanvasElement[] = []

    // 頂部右對齊標題
    const headerText: TextElement = {
      id: 'el-toc-right-header',
      type: 'text',
      name: '頁首',
      x: 32,
      y: 32,
      width: A5_WIDTH - 64,
      height: 50,
      zIndex: 1,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      content: `${data.destination?.split(',')[0]?.toUpperCase() || 'TOKYO'} × JAPAN\n${data.mainTitle || '日本東京行程手冊'}`,
      style: {
        fontFamily: 'Noto Sans TC',
        fontSize: 10,
        fontWeight: '600',
        fontStyle: 'normal',
        textAlign: 'right',
        lineHeight: 1.4,
        letterSpacing: 1.5,
        color: COLORS.black,
      },
    }
    elements.push(headerText)

    // 分隔線
    const divider: ShapeElement = {
      id: 'el-toc-right-divider',
      type: 'shape',
      name: '分隔線',
      variant: 'rectangle',
      x: A5_WIDTH - 132,
      y: 95,
      width: 100,
      height: 1,
      zIndex: 2,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      fill: COLORS.gold,
      stroke: 'transparent',
      strokeWidth: 0,
    }
    elements.push(divider)

    // 航班資訊標題
    const flightTitle: TextElement = {
      id: 'el-flight-title',
      type: 'text',
      name: '航班資訊標題',
      x: 32,
      y: A5_HEIGHT - 180,
      width: A5_WIDTH - 64,
      height: 16,
      zIndex: 50,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      content: '航班資訊 FLIGHT',
      style: {
        fontFamily: 'Noto Sans TC',
        fontSize: 9,
        fontWeight: '600',
        fontStyle: 'normal',
        textAlign: 'left',
        lineHeight: 1.2,
        letterSpacing: 0.5,
        color: COLORS.black,
      },
    }
    elements.push(flightTitle)

    // 航班資訊
    const flightInfo: TextElement = {
      id: 'el-flight-info',
      type: 'text',
      name: '航班資訊',
      x: 32,
      y: A5_HEIGHT - 160,
      width: A5_WIDTH - 64,
      height: 50,
      zIndex: 51,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      content: `${data.outboundFlight || '去程航班待確認'}\n${data.returnFlight || '回程航班待確認'}`,
      style: {
        fontFamily: 'Noto Sans TC',
        fontSize: 8,
        fontWeight: '400',
        fontStyle: 'normal',
        textAlign: 'left',
        lineHeight: 1.8,
        letterSpacing: 0.3,
        color: COLORS.gray,
      },
    }
    elements.push(flightInfo)

    // 頁碼
    const pageNum: TextElement = {
      id: 'el-page-num',
      type: 'text',
      name: '頁碼',
      x: A5_WIDTH - 50,
      y: A5_HEIGHT - 30,
      width: 30,
      height: 14,
      zIndex: 100,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      content: '02',
      style: {
        fontFamily: 'Noto Sans TC',
        fontSize: 8,
        fontWeight: '400',
        fontStyle: 'normal',
        textAlign: 'right',
        lineHeight: 1,
        letterSpacing: 0,
        color: COLORS.gray,
      },
    }
    elements.push(pageNum)

    return elements
  },
}
