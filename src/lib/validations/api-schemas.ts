/**
 * API Route Zod Schemas
 *
 * 集中管理 API 輸入驗證 schema，確保前後端一致
 */

import { z } from 'zod'

// ==========================================
// 認證模組
// ==========================================

export const changePasswordSchema = z.object({
  employee_number: z.string().optional(), // 可選，API 會用 session 的 employeeId
  workspace_code: z.string().optional(),
  current_password: z.string().min(1, '請輸入目前密碼'),
  new_password: z.string().min(6, '密碼至少需要 6 個字元'),
})

// ==========================================
// LinkPay
// ==========================================

export const createLinkPaySchema = z.object({
  receipt_number: z.string().min(1, '缺少收款單號'),
  user_name: z.string().min(1, '缺少付款人姓名'),
  email: z.string().email('Email 格式錯誤'),
  payment_name: z.string().optional(),
  create_user: z.string().optional(),
  amount: z.number().positive('金額必須大於 0'),
  end_date: z.string().min(1, '缺少付款期限'),
  gender: z.number().optional(),
})

// ==========================================
// 報價確認
// ==========================================

export const revokeQuoteConfirmationSchema = z.object({
  quote_id: z.string().min(1, '缺少報價單 ID'),
  staff_id: z.string().min(1, '缺少員工 ID'),
  staff_name: z.string().min(1, '缺少員工姓名'),
  reason: z.string().min(1, '請填寫撤銷原因'),
})

export const staffConfirmQuoteSchema = z.object({
  quote_id: z.string().min(1, '缺少報價單 ID'),
  staff_id: z.string().min(1, '缺少員工 ID'),
  staff_name: z.string().min(1, '缺少員工姓名'),
  notes: z.string().optional(),
})

export const sendQuoteConfirmationSchema = z.object({
  quote_id: z.string().min(1, '缺少報價單 ID'),
  expires_in_days: z.number().int().positive().default(7),
  staff_id: z.string().optional(),
})

export const customerConfirmQuoteSchema = z.object({
  token: z.string().min(1, '缺少確認 Token'),
  name: z.string().min(1, '請填寫您的姓名'),
  email: z.string().email('Email 格式錯誤').optional().or(z.literal('')),
  phone: z.string().optional(),
  notes: z.string().optional(),
})

// ==========================================
// 認證模組（擴充）
// ==========================================

export const syncEmployeeSchema = z.object({
  employee_id: z.string().min(1, '缺少員工 ID'),
  supabase_user_id: z.string().min(1, '缺少 Supabase User ID'),
  workspace_id: z.string().optional(),
  access_token: z.string().optional(),
})

export const resetEmployeePasswordSchema = z.object({
  employee_id: z.string().min(1, '缺少員工 ID'),
  new_password: z.string().min(8, '密碼至少需要 8 個字元'),
})

export const validateLoginSchema = z.object({
  username: z.string().min(1, '請填寫帳號'),
  password: z.string().min(1, '請填寫密碼'),
  code: z.string().min(1, '請填寫代號'),
})

// ==========================================
// Gemini 圖片生成
// ==========================================

export const generateImageSchema = z.object({
  prompt: z.string().min(1, '請提供 Prompt'),
  style: z.string().optional(),
  aspectRatio: z.string().default('16:9'),
})

// ==========================================
// OCR 批次重處理
// ==========================================

export const batchReprocessSchema = z.object({
  table: z.enum(['all', 'customers', 'order_members']).default('all'),
  limit: z.number().int().positive().max(100).default(10),
})

// ==========================================
// 頻道成員
// ==========================================

export const addChannelMembersSchema = z.object({
  employeeIds: z.array(z.string()).min(1, '至少選擇一位成員'),
  role: z.string().default('member'),
})

export const removeChannelMemberSchema = z.object({
  memberId: z.string().min(1, '缺少成員 ID'),
})

// ==========================================
// Bot 通知
// ==========================================

export const botNotificationRequestSchema = z.object({
  recipient_id: z.string().min(1, '缺少收件人 ID'),
  message: z.string().min(1, '訊息不能為空'),
  type: z.enum(['info', 'warning', 'error']).default('info'),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

// ==========================================
// 行程生成
// ==========================================

export const generateItineraryRequestSchema = z.object({
  cityId: z.string().optional(),
  countryId: z.string().optional(),
  destination: z.string().optional(),
  numDays: z.number().int().min(1).max(30, '天數必須在 1-30 天之間'),
  departureDate: z.string().min(1, '請提供出發日期'),
  outboundFlight: z.object({ arrivalTime: z.string().optional() }).optional(),
  returnFlight: z.object({ departureTime: z.string().optional() }).optional(),
  arrivalTime: z.string().optional(),
  departureTime: z.string().optional(),
  accommodations: z.array(z.unknown()).optional(),
  style: z.string().optional(),
  theme: z.string().optional(),
})

// ==========================================
// AI 景點補充
// ==========================================

export const suggestAttractionSchema = z.object({
  name: z.string().min(1, '請提供景點名稱'),
  city: z.string().optional(),
  country: z.string().optional(),
  category: z.string().optional(),
  existingData: z
    .object({
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      duration_minutes: z.number().optional(),
      ticket_price: z.string().optional(),
      opening_hours: z.string().optional(),
      description: z.string().optional(),
    })
    .optional(),
})

// ==========================================
// AI 圖片編輯
// ==========================================

export const editImageSchema = z.object({
  imageUrl: z.string().min(1, '請提供圖片 URL'),
  action: z.string().optional(),
  customPrompt: z.string().optional(),
})

// ==========================================
// 圖片代理
// ==========================================

export const fetchImageSchema = z.object({
  url: z.string().url('無效的 URL'),
})

// ==========================================
// Bot 開票狀態
// ==========================================

export const ticketStatusPostSchema = z.object({
  workspace_id: z.string().optional(),
  channel_id: z.string().optional(),
  notify_sales: z.boolean().default(true),
  days: z.number().int().positive().default(14),
})

export const ticketStatusPatchSchema = z.object({
  member_ids: z.array(z.string()).optional(),
  order_id: z.string().optional(),
  flight_self_arranged: z.boolean(),
})

// ==========================================
// 錯誤日誌
// ==========================================

export const logErrorSchema = z
  .object({
    message: z.string().optional(),
    stack: z.string().optional(),
    componentStack: z.string().optional(),
    url: z.string().optional(),
  })
  .passthrough()
