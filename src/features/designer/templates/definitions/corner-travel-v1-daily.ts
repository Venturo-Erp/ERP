/**
 * COMPANY_NAME_EN 每日行程頁模板
 *
 * 參考 0209東京手冊 Day 頁面設計：
 * - 左頁：Day N 行程 + 城市介紹 + 大圖
 * - 右頁：Day N+1 行程 + 景點介紹 + 圖片
 */
import type { PageTemplate, TemplateData, DailyDetailData } from './types'
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

// 品牌色彩
const COLORS = {
  gold: '#c9aa7c',
  black: '#181511',
  gray: '#8b8680',
  lightGray: '#f5f5f5',
  white: '#ffffff',
}

/**
 * 生成餐食資訊區塊
 */
function generateMealBoxes(
  meals: { breakfast?: string; lunch?: string; dinner?: string },
  yPos: number,
  startZIndex: number
): CanvasElement[] {
  const elements: CanvasElement[] = []
  const boxWidth = 80
  const boxHeight = 32
  const spacing = 8
  let xPos = 32

  const mealTypes = [
    { label: '早餐', value: meals.breakfast },
    { label: '午餐', value: meals.lunch },
    { label: '晚餐', value: meals.dinner },
  ]

  mealTypes.forEach((meal, index) => {
    // 餐食標籤框
    const labelBox: ShapeElement = {
      id: `el-meal-label-${index}`,
      type: 'shape',
      name: `${meal.label}標籤`,
      variant: 'rectangle',
      x: xPos,
      y: yPos,
      width: 32,
      height: boxHeight,
      zIndex: startZIndex + index * 2,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      fill: COLORS.lightGray,
      stroke: '#e0e0e0',
      strokeWidth: 1,
    }
    elements.push(labelBox)

    // 餐食標籤文字
    const labelText: TextElement = {
      id: `el-meal-label-text-${index}`,
      type: 'text',
      name: `${meal.label}`,
      x: xPos,
      y: yPos + 8,
      width: 32,
      height: 16,
      zIndex: startZIndex + index * 2 + 1,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      content: meal.label,
      style: {
        fontFamily: 'Noto Sans TC',
        fontSize: 8,
        fontWeight: '500',
        fontStyle: 'normal',
        textAlign: 'center',
        lineHeight: 1,
        letterSpacing: 0,
        color: COLORS.black,
      },
    }
    elements.push(labelText)

    // 餐食內容
    const valueText: TextElement = {
      id: `el-meal-value-${index}`,
      type: 'text',
      name: `${meal.label}內容`,
      x: xPos + 36,
      y: yPos + 8,
      width: boxWidth - 36,
      height: 16,
      zIndex: startZIndex + index * 2 + 1,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      content: meal.value || '敬請自理',
      style: {
        fontFamily: 'Noto Sans TC',
        fontSize: 8,
        fontWeight: '400',
        fontStyle: 'normal',
        textAlign: 'left',
        lineHeight: 1,
        letterSpacing: 0,
        color: COLORS.gray,
      },
    }
    elements.push(valueText)

    xPos += boxWidth + spacing
  })

  return elements
}

/**
 * 每日行程頁（左頁）
 */
export const cornerTravelV1DailyLeft: PageTemplate = {
  id: 'corner-travel-v1-daily-left',
  name: 'Corner 每日行程(左)',
  description: '每日行程左頁，含大圖和城市介紹',
  thumbnailUrl: '/thumbnails/corner-travel-v1-daily-left.jpg',
  category: 'daily',

  generateElements: (data: TemplateData): CanvasElement[] => {
    const elements: CanvasElement[] = []
    const dayData = data.currentDayData || data.dailyDetails?.[0]
    const dayNumber = dayData?.dayNumber || 1

    // DAY 標題
    const dayTitle: TextElement = {
      id: 'el-day-title',
      type: 'text',
      name: 'DAY 標題',
      x: 32,
      y: 32,
      width: A5_WIDTH - 64,
      height: 24,
      zIndex: 1,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      content: `DAY ${dayNumber}｜${dayData?.title || '行程待確認'}`,
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
    elements.push(dayTitle)

    // 餐食資訊
    const meals = dayData?.meals || { breakfast: '', lunch: '', dinner: '' }
    elements.push(...generateMealBoxes(meals, 65, 10))

    // 住宿資訊
    const hotelBox: ShapeElement = {
      id: 'el-hotel-box',
      type: 'shape',
      name: '住宿框',
      variant: 'rectangle',
      x: 32,
      y: 105,
      width: 32,
      height: 32,
      zIndex: 20,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      fill: COLORS.lightGray,
      stroke: '#e0e0e0',
      strokeWidth: 1,
    }
    elements.push(hotelBox)

    const hotelLabel: TextElement = {
      id: 'el-hotel-label',
      type: 'text',
      name: '住宿標籤',
      x: 32,
      y: 113,
      width: 32,
      height: 16,
      zIndex: 21,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      content: '住宿',
      style: {
        fontFamily: 'Noto Sans TC',
        fontSize: 8,
        fontWeight: '500',
        fontStyle: 'normal',
        textAlign: 'center',
        lineHeight: 1,
        letterSpacing: 0,
        color: COLORS.black,
      },
    }
    elements.push(hotelLabel)

    const hotelValue: TextElement = {
      id: 'el-hotel-value',
      type: 'text',
      name: '住宿名稱',
      x: 68,
      y: 113,
      width: A5_WIDTH - 100,
      height: 16,
      zIndex: 22,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      content: data.hotelName || '飯店待確認',
      style: {
        fontFamily: 'Noto Sans TC',
        fontSize: 8,
        fontWeight: '400',
        fontStyle: 'normal',
        textAlign: 'left',
        lineHeight: 1,
        letterSpacing: 0,
        color: COLORS.gray,
      },
    }
    elements.push(hotelValue)

    // 分隔線
    const divider: ShapeElement = {
      id: 'el-divider',
      type: 'shape',
      name: '分隔線',
      variant: 'rectangle',
      x: 32,
      y: 150,
      width: A5_WIDTH - 64,
      height: 1,
      zIndex: 25,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      fill: COLORS.gold,
      stroke: 'transparent',
      strokeWidth: 0,
    }
    elements.push(divider)

    // 城市介紹標題
    const cityTitle: TextElement = {
      id: 'el-city-title',
      type: 'text',
      name: '城市標題',
      x: 32,
      y: 165,
      width: A5_WIDTH - 64,
      height: 20,
      zIndex: 30,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      content: `${data.destination?.split(',')[0] || '東京'} ${data.destination?.split(',')[0]?.toUpperCase() || 'TOKYO'}`,
      style: {
        fontFamily: 'Noto Sans TC',
        fontSize: 11,
        fontWeight: '600',
        fontStyle: 'normal',
        textAlign: 'left',
        lineHeight: 1.2,
        letterSpacing: 1,
        color: COLORS.black,
      },
    }
    elements.push(cityTitle)

    // 城市介紹內容
    const cityDesc: TextElement = {
      id: 'el-city-desc',
      type: 'text',
      name: '城市介紹',
      x: 32,
      y: 190,
      width: A5_WIDTH - 64,
      height: 120,
      zIndex: 31,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      content:
        data.cityDescription ||
        '作為日本的政治、經濟與文化中心，東京是一座將傳統與現代完美融合的國際大都會。這座從江戶時代演變而來的城市，在明治維新後改名東京，逐步發展成為世界級的超大型都市圈。',
      style: {
        fontFamily: 'Noto Sans TC',
        fontSize: 9,
        fontWeight: '400',
        fontStyle: 'normal',
        textAlign: 'left',
        lineHeight: 1.8,
        letterSpacing: 0.3,
        color: COLORS.gray,
      },
    }
    elements.push(cityDesc)

    // 大圖片區域
    if (dayData?.coverImage || data.coverImage) {
      const mainImage: ImageElement = {
        id: 'el-main-image',
        type: 'image',
        name: '主圖片',
        x: 32,
        y: 320,
        width: A5_WIDTH - 64,
        height: 300,
        zIndex: 40,
        rotation: 0,
        opacity: 1,
        locked: true,
        visible: true,
        src: dayData?.coverImage || data.coverImage || '',
        objectFit: 'cover',
      }
      elements.push(mainImage)
    }

    // 航班資訊（如果是第一天）
    if (dayNumber === 1 && data.outboundFlight) {
      const flightInfo: TextElement = {
        id: 'el-flight-info',
        type: 'text',
        name: '航班資訊',
        x: 32,
        y: A5_HEIGHT - 80,
        width: A5_WIDTH - 64,
        height: 40,
        zIndex: 50,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        content: `航班資訊 FLIGHT\n${data.outboundFlight}`,
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
      elements.push(flightInfo)
    }

    // 頁碼
    const pageNum: TextElement = {
      id: 'el-page-num',
      type: 'text',
      name: '頁碼',
      x: 20,
      y: A5_HEIGHT - 30,
      width: 30,
      height: 14,
      zIndex: 100,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      content: String(dayNumber * 2 + 1).padStart(2, '0'),
      style: {
        fontFamily: 'Noto Sans TC',
        fontSize: 8,
        fontWeight: '400',
        fontStyle: 'normal',
        textAlign: 'left',
        lineHeight: 1,
        letterSpacing: 0,
        color: COLORS.gray,
      },
    }
    elements.push(pageNum)

    return elements
  },
}

/**
 * 每日行程頁（右頁）
 */
export const cornerTravelV1DailyRight: PageTemplate = {
  id: 'corner-travel-v1-daily-right',
  name: 'Corner 每日行程(右)',
  description: '每日行程右頁，含景點介紹和圖片',
  thumbnailUrl: '/thumbnails/corner-travel-v1-daily-right.jpg',
  category: 'daily',

  generateElements: (data: TemplateData): CanvasElement[] => {
    const elements: CanvasElement[] = []
    const dayData = data.currentDayData || data.dailyDetails?.[1]
    const dayNumber = dayData?.dayNumber || 2

    // DAY 標題
    const dayTitle: TextElement = {
      id: 'el-day-title',
      type: 'text',
      name: 'DAY 標題',
      x: 32,
      y: 32,
      width: A5_WIDTH - 64,
      height: 24,
      zIndex: 1,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      content: `DAY ${dayNumber}｜${dayData?.title || '行程待確認'}`,
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
    elements.push(dayTitle)

    // 餐食資訊
    const meals = dayData?.meals || { breakfast: '', lunch: '', dinner: '' }
    elements.push(...generateMealBoxes(meals, 65, 10))

    // 住宿資訊
    const hotelBox: ShapeElement = {
      id: 'el-hotel-box',
      type: 'shape',
      name: '住宿框',
      variant: 'rectangle',
      x: 32,
      y: 105,
      width: 32,
      height: 32,
      zIndex: 20,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      fill: COLORS.lightGray,
      stroke: '#e0e0e0',
      strokeWidth: 1,
    }
    elements.push(hotelBox)

    const hotelLabel: TextElement = {
      id: 'el-hotel-label',
      type: 'text',
      name: '住宿標籤',
      x: 32,
      y: 113,
      width: 32,
      height: 16,
      zIndex: 21,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      content: '住宿',
      style: {
        fontFamily: 'Noto Sans TC',
        fontSize: 8,
        fontWeight: '500',
        fontStyle: 'normal',
        textAlign: 'center',
        lineHeight: 1,
        letterSpacing: 0,
        color: COLORS.black,
      },
    }
    elements.push(hotelLabel)

    const hotelValue: TextElement = {
      id: 'el-hotel-value',
      type: 'text',
      name: '住宿名稱',
      x: 68,
      y: 113,
      width: A5_WIDTH - 100,
      height: 16,
      zIndex: 22,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      content: data.hotelName || '飯店待確認',
      style: {
        fontFamily: 'Noto Sans TC',
        fontSize: 8,
        fontWeight: '400',
        fontStyle: 'normal',
        textAlign: 'left',
        lineHeight: 1,
        letterSpacing: 0,
        color: COLORS.gray,
      },
    }
    elements.push(hotelValue)

    // 分隔線
    const divider: ShapeElement = {
      id: 'el-divider',
      type: 'shape',
      name: '分隔線',
      variant: 'rectangle',
      x: 32,
      y: 150,
      width: A5_WIDTH - 64,
      height: 1,
      zIndex: 25,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      fill: COLORS.gold,
      stroke: 'transparent',
      strokeWidth: 0,
    }
    elements.push(divider)

    // 景點介紹標題
    const attractionTitle: TextElement = {
      id: 'el-attraction-title',
      type: 'text',
      name: '景點標題',
      x: 32,
      y: 165,
      width: A5_WIDTH - 64,
      height: 20,
      zIndex: 30,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      content: data.attractionName || '富士山 MOUNT FUJI',
      style: {
        fontFamily: 'Noto Sans TC',
        fontSize: 11,
        fontWeight: '600',
        fontStyle: 'normal',
        textAlign: 'left',
        lineHeight: 1.2,
        letterSpacing: 1,
        color: COLORS.black,
      },
    }
    elements.push(attractionTitle)

    // 景點介紹內容
    const attractionDesc: TextElement = {
      id: 'el-attraction-desc',
      type: 'text',
      name: '景點介紹',
      x: 32,
      y: 190,
      width: A5_WIDTH - 64,
      height: 80,
      zIndex: 31,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      content:
        data.attractionDescription ||
        '標高3,776公尺的富士山是日本最高峰，也是最具代表性的自然地標。這座休眠火山以其完美的圓錐形山體聞名於世，四季呈現不同風貌，無論遠觀近賞都令人震撼。',
      style: {
        fontFamily: 'Noto Sans TC',
        fontSize: 9,
        fontWeight: '400',
        fontStyle: 'normal',
        textAlign: 'left',
        lineHeight: 1.8,
        letterSpacing: 0.3,
        color: COLORS.gray,
      },
    }
    elements.push(attractionDesc)

    // 景點圖片
    if (data.attractionImage || data.coverImage) {
      const attractionImage: ImageElement = {
        id: 'el-attraction-image',
        type: 'image',
        name: '景點圖片',
        x: 32,
        y: 280,
        width: A5_WIDTH - 64,
        height: 250,
        zIndex: 40,
        rotation: 0,
        opacity: 1,
        locked: true,
        visible: true,
        src: data.attractionImage || data.coverImage || '',
        objectFit: 'cover',
      }
      elements.push(attractionImage)
    }

    // 附加景點介紹
    if (data.secondaryAttractionName) {
      const secondaryTitle: TextElement = {
        id: 'el-secondary-title',
        type: 'text',
        name: '次要景點標題',
        x: 32,
        y: 545,
        width: A5_WIDTH - 64,
        height: 18,
        zIndex: 50,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        content: data.secondaryAttractionName,
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
      elements.push(secondaryTitle)

      const secondaryDesc: TextElement = {
        id: 'el-secondary-desc',
        type: 'text',
        name: '次要景點介紹',
        x: 32,
        y: 565,
        width: A5_WIDTH - 64,
        height: 60,
        zIndex: 51,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        content: data.secondaryAttractionDescription || '',
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
      elements.push(secondaryDesc)
    }

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
      content: String(dayNumber * 2 + 2).padStart(2, '0'),
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
