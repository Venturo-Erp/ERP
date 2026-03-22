/**
 * COMPANY_NAME_EN 注意事項頁模板
 *
 * 參考 0209東京手冊 備忘錄頁面設計：
 * - 行李規定表格
 * - 禁帶物品清單
 * - 旅遊注意事項
 */
import type { PageTemplate, TemplateData, MemoItem } from './types'
import { COMPANY_NAME, COMPANY_NAME_EN } from '@/lib/tenant'
import type { CanvasElement, TextElement, ShapeElement } from '@/features/designer/components/types'

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

// 預設行李規定
const DEFAULT_LUGGAGE_RULES = [
  { category: '手提行李', rule: '重量限制', value: '不得超過7公斤' },
  { category: '手提行李', rule: '尺寸限制', value: '各邊長寬高不得超過54×38×23（公分）' },
  { category: '託運行李', rule: '重量限制', value: '20公斤×1件' },
  { category: '託運行李', rule: '尺寸限制', value: '長寬高尺寸總和不得超過158（公分）' },
]

// 預設禁帶物品
const DEFAULT_PROHIBITED_ITEMS = [
  {
    category: '刀類',
    items:
      '如各種水果刀、剪刀、菜刀、西瓜刀、生魚片刀、開山刀、鎌刀、美工刀、牛排刀、折疊刀、手術刀、瑞士刀等具有切割功能之器具等\n※ 不含塑膠安全圓頭剪刀及圓頭之奶油餐刀',
  },
  {
    category: '尖銳物品類',
    items:
      '如弓箭、大型魚鉤、長度超過五公分之金屬釘、飛鏢、金屬毛線針、釘槍、醫療注射針頭等具有穿刺功能之器具',
  },
  {
    category: '棍棒、工具類',
    items:
      '各種材質之棍棒、鋤頭、鎚子、斧頭、螺絲起子、金屬耙、錐子、鋸子、鑿子、冰鑿、鐵鍊、厚度超過0.5毫米之金屬尺等可做為敲擊、穿刺之器具，金屬游標卡尺',
  },
  {
    category: '運動用品類',
    items:
      '如棒球棒、高爾夫球桿、曲棍球棍、板球球板、撞球桿、滑板、愛斯基摩划艇和獨木舟划槳、冰球球桿、釣魚竿、彈弓、冰／釘鞋等可能轉變為攻擊性武器之物品',
  },
  {
    category: '其他類',
    items: '攝影類的攝影機與相機腳架或自拍棒。其他經人為操作可能影響飛航安全之物品',
  },
]

// 預設液體規定
const DEFAULT_LIQUID_RULES = [
  '旅客隨身攜帶之液狀、膠狀、乳狀用品不得超過100毫升的容器，必須放置於1公升容量的透明封口袋內，每位旅客限制攜帶1個1公升的透明封口袋（尺寸大約為20×20公分），航程中所需之嬰兒食品及個人藥物不在此限。',
  '旅客可於報到櫃檯或登機門利用隨身行李測量器，檢查其所攜帶的手提行李是否符合體積之限制。',
  '超重或過大之手提行李，因客艙安全因素請旅客改為託運。如手提行李已超過免費託運行李額度，航空公司將收取超重（件）行李費。',
]

/**
 * 注意事項頁（左頁）- 行李規定
 */
export const cornerTravelV1MemoLeft: PageTemplate = {
  id: 'corner-travel-v1-memo-left',
  name: 'Corner 注意事項(左)',
  description: '注意事項左頁，含景點續介和行程結束',
  thumbnailUrl: '/thumbnails/corner-travel-v1-memo-left.jpg',
  category: 'memo',

  generateElements: (data: TemplateData): CanvasElement[] => {
    const elements: CanvasElement[] = []
    const lastDayData = data.dailyDetails?.[data.dailyDetails.length - 1]
    const lastDayNumber = lastDayData?.dayNumber || 5

    // 延續上一頁的景點介紹（如果有）
    if (data.continuedContent) {
      const continuedText: TextElement = {
        id: 'el-continued-text',
        type: 'text',
        name: '延續內容',
        x: 32,
        y: 32,
        width: A5_WIDTH - 64,
        height: 200,
        zIndex: 1,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        content: data.continuedContent,
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
      elements.push(continuedText)
    }

    // 景點圖片區域（上半部）
    if (data.memoImage1) {
      const image1: ShapeElement = {
        id: 'el-memo-image-1',
        type: 'shape',
        name: '圖片1預留',
        variant: 'rectangle',
        x: 32,
        y: data.continuedContent ? 250 : 32,
        width: A5_WIDTH - 64,
        height: 180,
        zIndex: 5,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        fill: COLORS.lightGray,
        stroke: '#e0e0e0',
        strokeWidth: 1,
      }
      elements.push(image1)
    }

    if (data.memoImage2) {
      const image2: ShapeElement = {
        id: 'el-memo-image-2',
        type: 'shape',
        name: '圖片2預留',
        variant: 'rectangle',
        x: 32,
        y: data.continuedContent ? 450 : 230,
        width: A5_WIDTH - 64,
        height: 180,
        zIndex: 6,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        fill: COLORS.lightGray,
        stroke: '#e0e0e0',
        strokeWidth: 1,
      }
      elements.push(image2)
    }

    // 最後一天行程（如果需要顯示）
    if (lastDayData) {
      const lastDayYPos = data.memoImage2 ? 650 : data.memoImage1 ? 430 : 250

      const lastDayTitle: TextElement = {
        id: 'el-last-day-title',
        type: 'text',
        name: '最後一天標題',
        x: 32,
        y: lastDayYPos,
        width: A5_WIDTH - 64,
        height: 24,
        zIndex: 10,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        content: `DAY ${lastDayNumber}｜${lastDayData.title || '自由活動／回程'}`,
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
      elements.push(lastDayTitle)

      // 餐食
      const meals = lastDayData.meals || {}
      const mealText = [
        meals.breakfast ? `早餐 ${meals.breakfast}` : '早餐 敬請自理',
        meals.lunch ? `午餐 ${meals.lunch}` : '午餐 敬請自理',
        meals.dinner ? `晚餐 ${meals.dinner}` : '晚餐 敬請自理',
      ].join('　　')

      const mealInfo: TextElement = {
        id: 'el-last-day-meals',
        type: 'text',
        name: '最後一天餐食',
        x: 32,
        y: lastDayYPos + 30,
        width: A5_WIDTH - 64,
        height: 16,
        zIndex: 11,
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

    // 航班資訊（回程）
    if (data.returnFlight) {
      const flightTitle: TextElement = {
        id: 'el-return-flight-title',
        type: 'text',
        name: '回程航班標題',
        x: 32,
        y: A5_HEIGHT - 100,
        width: 150,
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

      const flightInfo: TextElement = {
        id: 'el-return-flight-info',
        type: 'text',
        name: '回程航班資訊',
        x: 32,
        y: A5_HEIGHT - 80,
        width: A5_WIDTH - 64,
        height: 30,
        zIndex: 51,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        content: data.returnFlight,
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
      content: '11',
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
 * 注意事項頁（右頁）- 行李規定和禁帶物品
 */
export const cornerTravelV1MemoRight: PageTemplate = {
  id: 'corner-travel-v1-memo-right',
  name: 'Corner 注意事項(右)',
  description: '注意事項右頁，含行李規定和禁帶物品',
  thumbnailUrl: '/thumbnails/corner-travel-v1-memo-right.jpg',
  category: 'memo',

  generateElements: (data: TemplateData): CanvasElement[] => {
    const elements: CanvasElement[] = []
    const luggageRules = data.luggageRules || DEFAULT_LUGGAGE_RULES
    const prohibitedItems = data.prohibitedItems || DEFAULT_PROHIBITED_ITEMS
    const liquidRules = data.liquidRules || DEFAULT_LIQUID_RULES

    // 標題
    const title: TextElement = {
      id: 'el-luggage-title',
      type: 'text',
      name: '行李規定標題',
      x: 32,
      y: 32,
      width: A5_WIDTH - 64,
      height: 24,
      zIndex: 1,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      content: 'LUGGAGE｜國際線手提／託運行李限制及規定',
      style: {
        fontFamily: 'Noto Sans TC',
        fontSize: 11,
        fontWeight: '700',
        fontStyle: 'normal',
        textAlign: 'left',
        lineHeight: 1.2,
        letterSpacing: 0.5,
        color: COLORS.black,
      },
    }
    elements.push(title)

    // 分隔線
    const divider: ShapeElement = {
      id: 'el-divider',
      type: 'shape',
      name: '分隔線',
      variant: 'rectangle',
      x: 32,
      y: 60,
      width: A5_WIDTH - 64,
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

    // 行李規定表格
    let yPos = 75

    // 表頭
    const tableHeader: ShapeElement = {
      id: 'el-table-header-bg',
      type: 'shape',
      name: '表頭背景',
      variant: 'rectangle',
      x: 32,
      y: yPos,
      width: A5_WIDTH - 64,
      height: 24,
      zIndex: 3,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      fill: COLORS.lightGray,
      stroke: '#e0e0e0',
      strokeWidth: 1,
    }
    elements.push(tableHeader)

    const headerText: TextElement = {
      id: 'el-table-header-text',
      type: 'text',
      name: '表頭文字',
      x: 32,
      y: yPos + 6,
      width: A5_WIDTH - 64,
      height: 14,
      zIndex: 4,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      content: '航空公司　　　　　　　　　　　　　　　　　　酷航',
      style: {
        fontFamily: 'Noto Sans TC',
        fontSize: 8,
        fontWeight: '600',
        fontStyle: 'normal',
        textAlign: 'center',
        lineHeight: 1,
        letterSpacing: 0.5,
        color: COLORS.black,
      },
    }
    elements.push(headerText)

    yPos += 28

    // 表格內容
    luggageRules.forEach((rule, index) => {
      const rowBg: ShapeElement = {
        id: `el-row-bg-${index}`,
        type: 'shape',
        name: `行${index + 1}背景`,
        variant: 'rectangle',
        x: 32,
        y: yPos,
        width: A5_WIDTH - 64,
        height: 22,
        zIndex: 5 + index,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        fill: index % 2 === 0 ? COLORS.white : COLORS.lightGray,
        stroke: '#e0e0e0',
        strokeWidth: 1,
      }
      elements.push(rowBg)

      const rowText: TextElement = {
        id: `el-row-text-${index}`,
        type: 'text',
        name: `行${index + 1}內容`,
        x: 36,
        y: yPos + 5,
        width: A5_WIDTH - 72,
        height: 14,
        zIndex: 5 + index,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        content: `${rule.category}　　${rule.rule}　　　　　　${rule.value}`,
        style: {
          fontFamily: 'Noto Sans TC',
          fontSize: 8,
          fontWeight: '400',
          fontStyle: 'normal',
          textAlign: 'left',
          lineHeight: 1,
          letterSpacing: 0.3,
          color: COLORS.gray,
        },
      }
      elements.push(rowText)

      yPos += 22
    })

    yPos += 20

    // 禁帶物品標題
    const prohibitedTitle: TextElement = {
      id: 'el-prohibited-title',
      type: 'text',
      name: '禁帶物品標題',
      x: 32,
      y: yPos,
      width: A5_WIDTH - 64,
      height: 20,
      zIndex: 20,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      content: '禁止隨身攜帶上機之物品（須託運）',
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
    elements.push(prohibitedTitle)

    yPos += 25

    // 禁帶物品表格
    prohibitedItems.forEach((item, index) => {
      const itemHeight = item.items.split('\n').length * 12 + 16

      const itemBg: ShapeElement = {
        id: `el-prohibited-bg-${index}`,
        type: 'shape',
        name: `禁帶${index + 1}背景`,
        variant: 'rectangle',
        x: 32,
        y: yPos,
        width: A5_WIDTH - 64,
        height: Math.min(itemHeight, 50),
        zIndex: 21 + index,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        fill: index % 2 === 0 ? COLORS.white : COLORS.lightGray,
        stroke: '#e0e0e0',
        strokeWidth: 1,
      }
      elements.push(itemBg)

      const categoryText: TextElement = {
        id: `el-prohibited-cat-${index}`,
        type: 'text',
        name: `禁帶${index + 1}類別`,
        x: 36,
        y: yPos + 5,
        width: 50,
        height: 14,
        zIndex: 21 + index,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        content: item.category,
        style: {
          fontFamily: 'Noto Sans TC',
          fontSize: 8,
          fontWeight: '500',
          fontStyle: 'normal',
          textAlign: 'left',
          lineHeight: 1,
          letterSpacing: 0,
          color: COLORS.black,
        },
      }
      elements.push(categoryText)

      const itemsText: TextElement = {
        id: `el-prohibited-items-${index}`,
        type: 'text',
        name: `禁帶${index + 1}內容`,
        x: 90,
        y: yPos + 5,
        width: A5_WIDTH - 130,
        height: Math.min(itemHeight - 10, 40),
        zIndex: 21 + index,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        content: item.items.substring(0, 100) + (item.items.length > 100 ? '...' : ''),
        style: {
          fontFamily: 'Noto Sans TC',
          fontSize: 7,
          fontWeight: '400',
          fontStyle: 'normal',
          textAlign: 'left',
          lineHeight: 1.4,
          letterSpacing: 0.2,
          color: COLORS.gray,
        },
      }
      elements.push(itemsText)

      yPos += Math.min(itemHeight, 50)
    })

    yPos += 15

    // 液體規定
    liquidRules.forEach((rule, index) => {
      const ruleText: TextElement = {
        id: `el-liquid-rule-${index}`,
        type: 'text',
        name: `液體規定${index + 1}`,
        x: 32,
        y: yPos,
        width: A5_WIDTH - 64,
        height: 36,
        zIndex: 50 + index,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        content: `${index + 1}. ${rule.substring(0, 120)}${rule.length > 120 ? '...' : ''}`,
        style: {
          fontFamily: 'Noto Sans TC',
          fontSize: 7,
          fontWeight: '400',
          fontStyle: 'normal',
          textAlign: 'left',
          lineHeight: 1.5,
          letterSpacing: 0.2,
          color: COLORS.gray,
        },
      }
      elements.push(ruleText)

      yPos += 38
    })

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
      content: '12',
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
