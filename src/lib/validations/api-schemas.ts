/**
 * API Route Zod Schemas
 *
 * 集中管理 API 輸入驗證 schema，確保前後端一致
 */

import { z } from 'zod'

// ==========================================
// 會計模組
// ==========================================

export const reverseVoucherSchema = z.object({
  voucher_id: z.string().min(1, '缺少傳票 ID'),
  reason: z.string().min(1, '請填寫反沖原因'),
})

// ==========================================
// 認證模組
// ==========================================

export const changePasswordSchema = z.object({
  employee_number: z.string().optional(),  // 可選，API 會用 session 的 employeeId
  workspace_code: z.string().optional(),
  current_password: z.string().min(1, '請輸入目前密碼'),
  new_password: z.string().min(6, '密碼至少需要 6 個字元'),
})

// ==========================================
// 發票模組
// ==========================================

const buyerInfoSchema = z.object({
  buyerName: z.string().min(1, '買受人名稱為必填'),
  buyerUBN: z.string().optional(),
  buyerEmail: z.string().email('Email 格式錯誤').optional().or(z.literal('')),
  buyerMobile: z.string().optional(),
  buyerAddress: z.string().optional(),
  carrierType: z.string().optional(),
  carrierNum: z.string().optional(),
  loveCode: z.string().optional(),
})

const invoiceItemSchema = z.object({
  item_name: z.string().min(1, '品項名稱為必填'),
  item_count: z.number().positive('數量必須大於 0'),
  item_unit: z.string(),
  item_price: z.number().min(0, '單價不可為負數'),
  itemAmt: z.number().min(0, '金額不可為負數'),
  itemTaxType: z.string().optional(),
  itemWord: z.string().optional(),
})

export const issueInvoiceSchema = z.object({
  invoice_date: z.string().min(1, '缺少發票日期'),
  total_amount: z.number().positive('金額必須大於 0'),
  tax_type: z.string().optional(),
  buyerInfo: buyerInfoSchema,
  items: z.array(invoiceItemSchema).min(1, '至少需要一個品項'),
  order_id: z.string().optional(),
  orders: z
    .array(
      z.object({
        order_id: z.string(),
        amount: z.number(),
      })
    )
    .optional(),
  tour_id: z.string().min(1, '缺少團別 ID'),
  created_by: z.string().nullish(),
  workspace_id: z.string().nullish(),
})

export const voidInvoiceSchema = z.object({
  invoiceId: z.string().min(1, '缺少發票 ID'),
  voidReason: z.string().min(1, '請填寫作廢原因'),
  operatedBy: z.string().optional(),
})

export const batchIssueInvoiceSchema = z.object({
  tour_id: z.string().min(1, '缺少團別 ID'),
  order_ids: z.array(z.string()).min(1, '至少選擇一筆訂單'),
  invoice_date: z.string().min(1, '缺少發票日期'),
  buyerInfo: buyerInfoSchema,
  created_by: z.string().nullish(),
  workspace_id: z.string().nullish(),
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
// Bot 通知
// ==========================================

export const botNotificationSchema = z.object({
  recipient_id: z.string().min(1, '缺少收件人 ID'),
  message: z.string().min(1, '訊息不能為空'),
  type: z.enum(['info', 'warning', 'error', 'success']).default('info'),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

// ==========================================
// 行程生成
// ==========================================

export const generateItinerarySchema = z.object({
  tourId: z.string().optional(),
  cityId: z.string().optional(),
  countryId: z.string().optional(),
  destination: z.string().optional(),
  days: z.number().int().positive().optional(),
  outboundFlight: z
    .object({
      arrivalTime: z.string().optional(),
    })
    .optional(),
  arrivalTime: z.string().optional(),
  returnFlight: z
    .object({
      departureTime: z.string().optional(),
    })
    .optional(),
  departureTime: z.string().optional(),
  preferences: z.record(z.string(), z.unknown()).optional(),
})

// ==========================================
// 會計過帳
// ==========================================

export const postCustomerReceiptSchema = z
  .object({
    receipt_id: z.string().min(1, '缺少收款單 ID'),
    amount: z.number().positive('金額必須大於 0'),
    payment_method: z.string().min(1, '缺少付款方式'),
  })
  .passthrough()

export const postGroupSettlementSchema = z
  .object({
    tour_id: z.string().min(1, '缺少團別 ID'),
    bank_account_id: z.string().min(1, '缺少銀行帳戶 ID'),
  })
  .passthrough()

export const postSupplierPaymentSchema = z
  .object({
    payout_id: z.string().min(1, '缺少出納單 ID'),
    amount: z.number().positive('金額必須大於 0'),
    bank_account_id: z.string().min(1, '缺少銀行帳戶 ID'),
  })
  .passthrough()

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

export const getEmployeeDataSchema = z.object({
  username: z.string().min(1, '缺少帳號'),
  code: z.string().min(1, '缺少代號'),
})

export const createEmployeeAuthSchema = z.object({
  employee_number: z.string().min(1, '缺少員工編號'),
  password: z.string().min(1, '缺少密碼'),
  workspace_code: z.string().optional(),
  email: z.string().email('Email 格式錯誤').optional(),
})

export const resetEmployeePasswordSchema = z.object({
  employee_id: z.string().min(1, '缺少員工 ID'),
  new_password: z.string().min(8, '密碼至少需要 8 個字元'),
})

export const adminResetPasswordSchema = z.object({
  email: z.string().min(1, '缺少電子郵件'),
  new_password: z.string().min(6, '密碼至少需要 6 個字元'),
})

export const validateLoginSchema = z.object({
  username: z.string().min(1, '請填寫帳號'),
  password: z.string().min(1, '請填寫密碼'),
  code: z.string().min(1, '請填寫代號'),
})

// ==========================================
// 發票折讓
// ==========================================

export const issueAllowanceSchema = z.object({
  invoiceId: z.string().min(1, '缺少發票 ID'),
  allowanceAmount: z.number().positive('折讓金額必須大於 0'),
  allowanceItems: z
    .array(
      z.object({
        item_name: z.string(),
        item_count: z.number(),
        item_unit: z.string(),
        item_price: z.number(),
        itemAmt: z.number(),
      })
    )
    .min(1, '至少需要一個折讓項目'),
  operatedBy: z.string().optional(),
})

// ==========================================
// Logan Chat
// ==========================================

export const loganChatSchema = z.object({
  message: z.string().optional(),
  action: z.enum(['chat', 'teach']).default('chat'),
  title: z.string().optional(),
  content: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  importance: z.number().optional(),
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

// ==========================================
// 檔案上傳（query params for DELETE）
// ==========================================

export const storageDeleteQuerySchema = z.object({
  bucket: z.string().min(1, '缺少 bucket'),
  path: z.string().min(1, '缺少路徑'),
})

// Type exports
export type ReverseVoucherInput = z.infer<typeof reverseVoucherSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
export type IssueInvoiceInput = z.infer<typeof issueInvoiceSchema>
export type VoidInvoiceInput = z.infer<typeof voidInvoiceSchema>
export type CreateLinkPayInput = z.infer<typeof createLinkPaySchema>
