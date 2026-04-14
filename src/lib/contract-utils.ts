/**
 * 合約資料處理工具函數
 */

import { Tour } from '@/types/tour.types'
import { Order, Member } from '@/types/order.types'
import { Itinerary } from '@/stores/types'

export interface ContractData {
  // 審閱日期
  reviewYear: string
  reviewMonth: string
  reviewDay: string

  // 旅客資訊
  travelerName: string
  travelerAddress: string
  travelerIdNumber: string
  travelerPhone: string

  // 緊急聯絡人資訊
  emergencyContactName: string
  emergencyContactRelation: string
  emergencyContactPhone: string

  // 旅遊團資訊
  tourName: string
  tourDestination: string
  tourCode: string

  // 集合資訊
  gatherYear: string
  gatherMonth: string
  gatherDay: string
  gatherHour: string
  gatherMinute: string
  gatherLocation: string

  // 費用資訊
  totalAmount: string
  depositAmount: string
  paymentMethod: string
  finalPaymentMethod: string

  // 保險金額
  deathInsurance: string
  medicalInsurance: string

  // 旅遊團資訊
  minParticipants: string

  // 乙方資訊
  companyExtension: string
}

/**
 * 計算集合時間（起飛時間 - 3小時）
 */
function calculateGatherTime(departureTime: string): { hour: string; minute: string } {
  const [hourStr, minuteStr] = departureTime.split(':')
  let hour = parseInt(hourStr)
  const minute = parseInt(minuteStr)

  // 減3小時
  hour = hour - 3
  if (hour < 0) {
    hour = hour + 24
  }

  return {
    hour: hour.toString().padStart(2, '0'),
    minute: minute.toString().padStart(2, '0'),
  }
}

/**
 * 根據航空公司判斷桃園機場航廈
 * 參考：https://www.taoyuan-airport.com/airlines
 */
function getTerminalByAirline(airline: string): string {
  // 第一航廈的航空公司
  const terminal1Airlines = [
    '國泰航空',
    'CX',
    'Cathay',
    '港龍航空',
    'KA',
    '菲律賓航空',
    'PR',
    '越南航空',
    'VN',
    '馬來西亞航空',
    'MH',
    '新加坡航空',
    'SQ',
    '泰國航空',
    'TG',
    '韓亞航空',
    'OZ',
    '大韓航空',
    'KE',
    '日本航空',
    'JL',
    'JAL',
    '全日空',
    'NH',
    'ANA',
    '阿聯酋航空',
    'EK',
    '土耳其航空',
    'TK',
    '荷蘭皇家航空',
    'KL',
  ]

  // 第二航廈的航空公司
  const terminal2Airlines = [
    '中華航空',
    'CI',
    'China Airlines',
    '華航',
    '長榮航空',
    'BR',
    'EVA',
    'EVA Air',
    '星宇航空',
    'JX',
    'Starlux',
    '台灣虎航',
    'IT',
    'Tigerair',
    '樂桃航空',
    'MM',
    'Peach',
    '捷星航空',
    'GK',
    'Jetstar',
    '酷航',
    'TR',
    'Scoot',
    '亞洲航空',
    'AK',
    'D7',
    'AirAsia',
  ]

  const airlineUpper = airline.toUpperCase()

  for (const t1 of terminal1Airlines) {
    if (airlineUpper.includes(t1.toUpperCase())) {
      return '桃園國際機場第一航廈'
    }
  }

  for (const t2 of terminal2Airlines) {
    if (airlineUpper.includes(t2.toUpperCase())) {
      return '桃園國際機場第二航廈'
    }
  }

  // 無法判斷時返回空字串
  return ''
}

/**
 * 從各種資料來源準備合約資料
 * @param tour 旅遊團資料
 * @param order 訂單資料（用於聯絡人資訊）
 * @param member 團員資料（選填，用於身分證、緊急聯絡人等資訊）
 * @param itinerary 行程資料（選填，用於航班資訊）
 * @param depositAmount 訂金金額（選填）
 */
export function prepareContractData(
  tour: Tour,
  order: Order,
  member?: Member,
  itinerary?: Itinerary,
  depositAmount?: number,
  // SSOT：tour 的目的地顯示字串請由呼叫端用 useTourDisplay 解析後傳入，
  // 不再從已廢棄的 tour.location 讀
  tourDestinationDisplay = ''
): Partial<ContractData> {
  const today = new Date()

  // 集合資訊預設為空
  let gatherHour = ''
  let gatherMinute = ''
  let gatherYear = ''
  let gatherMonth = ''
  let gatherDay = ''
  let gatherLocation = ''

  // 如果有行程表
  if (itinerary) {
    // 優先使用行程表的集合資訊
    if (itinerary.meeting_info?.location) {
      gatherLocation = itinerary.meeting_info.location
    }

    // 優先使用行程表的集合時間
    if (itinerary.meeting_info?.time) {
      // meeting_info.time 格式可能是 "08:30" 或 ISO 8601
      const timeStr = itinerary.meeting_info.time
      if (timeStr.includes('T')) {
        // ISO 8601 格式：2026-02-09T08:30:00
        const meetingDate = new Date(timeStr)
        gatherYear = meetingDate.getFullYear().toString()
        gatherMonth = (meetingDate.getMonth() + 1).toString()
        gatherDay = meetingDate.getDate().toString()
        gatherHour = meetingDate.getHours().toString().padStart(2, '0')
        gatherMinute = meetingDate.getMinutes().toString().padStart(2, '0')
      } else if (timeStr.includes(':')) {
        // 時間格式：08:30
        const [hour, minute] = timeStr.split(':')
        gatherHour = hour.padStart(2, '0')
        gatherMinute = minute.padStart(2, '0')
        // 日期仍從出發日期取
        if (tour.departure_date) {
          const departureDate = new Date(tour.departure_date)
          gatherYear = departureDate.getFullYear().toString()
          gatherMonth = (departureDate.getMonth() + 1).toString()
          gatherDay = departureDate.getDate().toString()
        }
      }
    } else {
      // 沒有設定集合時間，從航班資訊計算（起飛前3小時）
      const outboundFlight = Array.isArray(itinerary.outbound_flight)
        ? itinerary.outbound_flight[0]
        : itinerary.outbound_flight
      if (outboundFlight?.departureTime) {
        const gatherTime = calculateGatherTime(outboundFlight.departureTime)
        gatherHour = gatherTime.hour
        gatherMinute = gatherTime.minute

        // 從旅遊團出發日期取得集合日期
        if (tour.departure_date) {
          const departureDate = new Date(tour.departure_date)
          gatherYear = departureDate.getFullYear().toString()
          gatherMonth = (departureDate.getMonth() + 1).toString()
          gatherDay = departureDate.getDate().toString()
        }
      } else if (tour.departure_date) {
        // 沒有集合時間也沒有航班資訊，只帶入出發日期
        const departureDate = new Date(tour.departure_date)
        gatherYear = departureDate.getFullYear().toString()
        gatherMonth = (departureDate.getMonth() + 1).toString()
        gatherDay = departureDate.getDate().toString()
      }

      // 如果沒有設定集合地點，根據航空公司判斷航廈
      if (!gatherLocation && outboundFlight?.airline) {
        gatherLocation = getTerminalByAirline(outboundFlight.airline)
      }
    }
  } else if (tour.departure_date) {
    // 沒有行程表，只帶入出發日期，時間和地點留空
    const departureDate = new Date(tour.departure_date)
    gatherYear = departureDate.getFullYear().toString()
    gatherMonth = (departureDate.getMonth() + 1).toString()
    gatherDay = departureDate.getDate().toString()
  }

  return {
    // 審閱日期（今天）
    reviewYear: today.getFullYear().toString(),
    reviewMonth: (today.getMonth() + 1).toString(),
    reviewDay: today.getDate().toString(),

    // 旅客資訊（優先使用訂單聯絡人，若有團員資料則補充）
    travelerName: order.contact_person || '',
    travelerAddress: '', // 需手動填寫
    travelerIdNumber: member?.id_number || '',
    travelerPhone: order.contact_phone || member?.phone || '',

    // 緊急聯絡人資訊（來自團員資料）
    emergencyContactName: member?.emergency_contact || '',
    emergencyContactRelation: '', // 需手動填寫
    emergencyContactPhone: member?.emergency_phone || '',

    // 旅遊團資訊
    tourName: tour.name,
    tourDestination: tourDestinationDisplay,
    tourCode: tour.code,

    // 集合資訊
    gatherYear,
    gatherMonth,
    gatherDay,
    gatherHour,
    gatherMinute,
    gatherLocation,

    // 費用資訊
    totalAmount: order.total_amount?.toString() || '',
    depositAmount:
      depositAmount?.toString() ||
      (order.total_amount ? (order.total_amount * 0.3).toFixed(0) : ''),
    paymentMethod: '現金',
    finalPaymentMethod: '現金',

    // 保險金額（固定）
    deathInsurance: '2,500,000',
    medicalInsurance: '100,000',

    // 旅遊團資訊
    minParticipants: tour.max_participants?.toString() || '16',

    // 乙方資訊
    companyExtension: '', // 需手動填寫
  }
}

/**
 * 替換合約範本中的變數
 */
export function replaceContractVariables(template: string, data: Partial<ContractData>): string {
  let result = template

  // 替換所有 {{變數名}} 格式的變數
  Object.entries(data).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g')
    result = result.replace(regex, value || '')
  })

  return result
}
