/**
 * 藍新金流 旅行業代收轉付電子收據 API 客戶端
 *
 * 正式環境：https://api.travelinvoice.com.tw
 * 測試環境：https://capi.travelinvoice.com.tw
 *
 * 資料交換方式：
 * - HTTP Method: POST
 * - Content-Type: application/x-www-form-urlencoded
 * - 編碼格式: UTF-8
 * - 欄位連接符號: &
 *
 * IP 白名單：
 * - 藍新 API 需要 IP 白名單，Vercel 無固定 IP
 * - 使用 Quotaguard Static proxy 取得固定 IP
 * - 環境變數：QUOTAGUARD_STATIC_URL
 */

import {
  aesEncrypt,
  aesDecrypt,
  generateTransactionNo,
  convertTaxType,
  formatInvoiceDate,
} from './crypto'
import { ProxyAgent, fetch as undiciFetch } from 'undici'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

// API 端點
const API_ENDPOINTS = {
  production: 'https://api.travelinvoice.com.tw',
  test: 'https://capi.travelinvoice.com.tw',
}

// API 路徑（注意：沒有 /Api 前綴）
const API_PATHS = {
  issue: '/invoice_issue', // 開立收據
  void: '/invoice_invalid', // 作廢收據
  allowance: '/allowance_issue', // 開立折讓
  query: '/invoice_search', // 查詢收據
}

interface NewebPayConfig {
  merchantId: string
  hashKey: string
  hashIV: string
  isProduction: boolean
}

interface BuyerInfo {
  buyerName: string
  buyerUBN?: string
  buyerAddress?: string
  buyerEmail?: string
  buyerMobileCode?: string
  buyerMobile?: string
  carrierType?: string
  carrierNum?: string
  loveCode?: string
  printFlag?: 'Y' | 'N'
}

interface InvoiceItem {
  item_name: string
  item_count: number
  item_unit: string
  item_price: number
  itemAmt: number
  itemTaxType?: string
  itemWord?: string
}

interface IssueInvoiceParams {
  invoiceDate: string
  totalAmount: number
  taxType: string
  buyerInfo: BuyerInfo
  items: InvoiceItem[]
}

interface VoidInvoiceParams {
  invoiceNumber: string
  invoiceDate: string
  voidReason: string
}

interface AllowanceParams {
  invoiceNumber: string
  invoiceDate: string
  allowanceAmount: number
  items: InvoiceItem[]
}

interface QueryParams {
  invoiceNumber?: string
  transactionNo?: string
  startDate?: string
  endDate?: string
}

/**
 * 從 Supabase 獲取藍新金流設定
 */
async function getNewebPayConfig(workspaceId: string): Promise<NewebPayConfig> {
  const supabase = getSupabaseAdminClient()

  // 從 system_settings 表獲取設定（依 workspace_id 隔離）
  const { data, error } = await supabase
    .from('system_settings')
    .select('id, category, description, settings, is_active, workspace_id, created_at, updated_at')
    .eq('category', 'newebpay')
    .eq('workspace_id', workspaceId)
    .single()

  if (error || !data) {
    throw new Error('無法獲取藍新金流設定，請先在系統設定中配置')
  }

  const settings = data.settings as Record<string, string | boolean>

  if (!settings.merchantId || !settings.hashKey || !settings.hashIV) {
    throw new Error('藍新金流設定不完整，請確認 MerchantID、HashKey、HashIV')
  }

  return {
    merchantId: settings.merchantId as string,
    hashKey: settings.hashKey as string,
    hashIV: settings.hashIV as string,
    isProduction: settings.isProduction === true, // 依照設定決定環境
  }
}

/**
 * 將物件轉為 URL encoded 字串
 * 注意：欄位內容不可包含 & 字元
 */
function toUrlEncoded(data: Record<string, unknown>): string {
  const params: string[] = []
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null && value !== '') {
      // 確保值是字串，並進行 URL encode
      const strValue = String(value)
      params.push(`${encodeURIComponent(key)}=${encodeURIComponent(strValue)}`)
    }
  }
  return params.join('&')
}

/**
 * 解析 URL encoded 回應
 * 回應格式：key=value&key=value&EndStr=##
 */
function parseUrlEncodedResponse(responseText: string): Record<string, string> {
  const result: Record<string, string> = {}
  const pairs = responseText.split('&')
  for (const pair of pairs) {
    const [key, ...valueParts] = pair.split('=')
    if (key) {
      result[decodeURIComponent(key)] = decodeURIComponent(valueParts.join('='))
    }
  }
  return result
}

/**
 * 發送請求到藍新 API
 */
async function sendRequest(
  path: string,
  postData: Record<string, unknown>,
  workspaceId: string
): Promise<Record<string, string>> {
  const config = await getNewebPayConfig(workspaceId)
  const baseUrl = config.isProduction ? API_ENDPOINTS.production : API_ENDPOINTS.test

  // 將資料轉為 URL encoded 字串，然後加密
  const urlEncodedData = toUrlEncoded(postData)
  const encryptedData = aesEncrypt(urlEncodedData, config.hashKey, config.hashIV)

  logger.log('[NewebPay] 發送請求:', {
    url: `${baseUrl}${path}`,
    merchantId: config.merchantId,
    isProduction: config.isProduction,
    postDataKeys: Object.keys(postData),
  })
  logger.log('[NewebPay] URL Encoded Data (解密前):', urlEncodedData)

  // 準備請求選項
  const requestUrl = `${baseUrl}${path}`
  const requestBody = new URLSearchParams({
    MerchantID_: config.merchantId,
    PostData_: encryptedData,
  }).toString()
  const requestHeaders = {
    'Content-Type': 'application/x-www-form-urlencoded',
  }

  // 檢查是否有 Quotaguard proxy 設定（用於 Vercel 等無固定 IP 的環境）
  const proxyUrl = process.env.QUOTAGUARD_STATIC_URL

  let response: Response
  if (proxyUrl) {
    logger.log('[NewebPay] 使用 Quotaguard proxy 發送請求')
    const proxyAgent = new ProxyAgent(proxyUrl)
    response = (await undiciFetch(requestUrl, {
      method: 'POST',
      headers: requestHeaders,
      body: requestBody,
      dispatcher: proxyAgent,
    })) as unknown as Response
  } else {
    // 本地開發或有固定 IP 的環境直接發送
    response = await fetch(requestUrl, {
      method: 'POST',
      headers: requestHeaders,
      body: requestBody,
    })
  }

  if (!response.ok) {
    throw new Error(`API 請求失敗: ${response.status}`)
  }

  const responseText = await response.text()
  logger.log('[NewebPay] 原始回應:', responseText.substring(0, 200))

  // 解析回應（URL encoded 格式）
  // 回應結尾會有 EndStr=## 用於確認資料完整性
  const parsed = parseUrlEncodedResponse(responseText)

  // 檢查是否有加密的回應資料需要解密
  if (parsed.Result) {
    try {
      const decrypted = aesDecrypt(parsed.Result, config.hashKey, config.hashIV)
      const decryptedParsed = parseUrlEncodedResponse(decrypted)
      return { ...parsed, ...decryptedParsed }
    } catch (e) {
      logger.log('[NewebPay] Result 解密失敗，可能是明文:', e)
    }
  }

  return parsed
}

/**
 * 開立收據
 *
 * 必填欄位：
 * - Version: 串接版本，固定 "1.1"
 * - TimeStamp: Unix 時間戳記
 * - MerchantOrderNo: 自訂編號（最多30字，英數字和底線）
 * - Status: 開立方式（1=即時, 2=預約）
 * - Category: 收據種類（B2B 或 B2C）
 * - BuyerName: 買受人名稱（B2B必填）
 * - BuyerEmail: 買受人信箱
 * - SellerName: 經辦人名稱
 * - TotalAmt: 收據金額
 * - ItemName/ItemCount/ItemUnit/ItemPrice/ItemAmt: 商品資訊（多項用 | 分隔）
 */
export async function issueInvoice(params: IssueInvoiceParams & { workspaceId: string }): Promise<{
  success: boolean
  message: string
  data?: {
    transactionNo: string
    invoiceNumber: string
    randomNum: string
    barcode?: string
    qrcodeL?: string
    qrcodeR?: string
    isScheduled?: boolean // 是否為預約開立
  }
}> {
  const transactionNo = generateTransactionNo()

  // 組裝商品明細（多項用 | 分隔）
  const itemNames = params.items.map(item => item.item_name).join('|')
  const itemCounts = params.items.map(item => item.item_count).join('|')
  const itemUnits = params.items.map(item => item.item_unit).join('|')
  const itemPrices = params.items.map(item => item.item_price).join('|')
  const itemAmts = params.items.map(item => item.itemAmt).join('|')

  // 驗證並清理統編（必須是 8 碼數字）
  const cleanUBN = params.buyerInfo.buyerUBN?.trim()
  const isValidUBN = cleanUBN && /^\d{8}$/.test(cleanUBN)

  // 判斷是 B2B 還是 B2C
  const category = isValidUBN ? 'B2B' : 'B2C'
  logger.log('[NewebPay] 發票類型判斷:', {
    原始UBN: params.buyerInfo.buyerUBN,
    清理後UBN: cleanUBN,
    是否有效: isValidUBN,
    類型: category,
  })

  // 判斷是即時開立還是預約開立
  // 比較日期（只比較年月日，忽略時間）
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const invoiceDateObj = new Date(params.invoiceDate)
  invoiceDateObj.setHours(0, 0, 0, 0)
  const isScheduled = invoiceDateObj.getTime() > today.getTime()

  const postData: Record<string, unknown> = {
    Version: '1.1',
    TimeStamp: Math.floor(Date.now() / 1000),
    MerchantOrderNo: transactionNo,
    Status: isScheduled ? 3 : 1, // 1: 即時開立, 3: 預約開立
    Category: category,
    BuyerName: params.buyerInfo.buyerName,
    BuyerEmail: params.buyerInfo.buyerEmail || 'no-reply@example.com', // 必填
    SellerName: '系統管理員', // 經辦人名稱（必填）
    TotalAmt: params.totalAmount,
    ItemName: itemNames,
    ItemCount: itemCounts,
    ItemUnit: itemUnits,
    ItemPrice: itemPrices,
    ItemAmt: itemAmts,
  }

  // B2B 必填統編（使用驗證過的 cleanUBN）
  if (isValidUBN) {
    postData.BuyerUBN = cleanUBN
  }

  // 選填欄位
  if (params.buyerInfo.buyerAddress) {
    postData.BuyerAddress = params.buyerInfo.buyerAddress
  }
  if (params.buyerInfo.buyerMobile) {
    postData.BuyerPhone = params.buyerInfo.buyerMobile
  }

  // 預約開立：設定預約日期
  if (isScheduled) {
    postData.CreateStatusTime = formatInvoiceDate(params.invoiceDate)
    logger.log('[NewebPay] 預約開立發票，預定日期:', params.invoiceDate)
  }

  logger.log('[NewebPay] 開立收據 PostData:', JSON.stringify(postData, null, 2))
  logger.log('[NewebPay] buyerInfo 原始值:', JSON.stringify(params.buyerInfo, null, 2))

  try {
    const result = await sendRequest(API_PATHS.issue, postData, params.workspaceId)

    logger.log('[NewebPay] 開立收據回應:', result)

    // 檢查回應狀態
    if (result.Status === 'SUCCESS' || result.Status === '1') {
      return {
        success: true,
        message: isScheduled ? `已預約於 ${params.invoiceDate} 開立` : '開立成功',
        data: {
          transactionNo,
          invoiceNumber: result.InvoiceNumber || result.InvoiceNo || '',
          randomNum: result.RandomNum || '',
          barcode: result.Barcode,
          qrcodeL: result.QRcodeL,
          qrcodeR: result.QRcodeR,
          isScheduled, // 是否為預約開立
        },
      }
    } else {
      return {
        success: false,
        message: result.Message || result.Msg || '開立失敗',
      }
    }
  } catch (error) {
    logger.error('[NewebPay] 開立收據錯誤:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '開立失敗',
    }
  }
}

/**
 * 作廢收據
 */
export async function voidInvoice(params: VoidInvoiceParams & { workspaceId: string }): Promise<{
  success: boolean
  message: string
}> {
  const postData = {
    Version: '1.1',
    TimeStamp: Math.floor(Date.now() / 1000),
    InvoiceNumber: params.invoiceNumber,
    InvoiceDate: formatInvoiceDate(params.invoiceDate),
    InvalidReason: params.voidReason,
  }

  try {
    const result = await sendRequest(API_PATHS.void, postData, params.workspaceId)

    if (result.Status === 'SUCCESS' || result.Status === '1') {
      return {
        success: true,
        message: '作廢成功',
      }
    } else {
      return {
        success: false,
        message: result.Message || result.Msg || '作廢失敗',
      }
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '作廢失敗',
    }
  }
}

/**
 * 開立折讓
 */
export async function issueAllowance(params: AllowanceParams & { workspaceId: string }): Promise<{
  success: boolean
  message: string
  data?: {
    allowanceNo: string
  }
}> {
  // 組裝商品明細（多項用 | 分隔）
  const itemNames = params.items.map(item => item.item_name).join('|')
  const itemCounts = params.items.map(item => item.item_count).join('|')
  const itemUnits = params.items.map(item => item.item_unit).join('|')
  const itemPrices = params.items.map(item => item.item_price).join('|')
  const itemAmts = params.items.map(item => item.itemAmt).join('|')

  const postData = {
    Version: '1.1',
    TimeStamp: Math.floor(Date.now() / 1000),
    InvoiceNumber: params.invoiceNumber,
    InvoiceDate: formatInvoiceDate(params.invoiceDate),
    AllowanceAmt: params.allowanceAmount,
    ItemName: itemNames,
    ItemCount: itemCounts,
    ItemUnit: itemUnits,
    ItemPrice: itemPrices,
    ItemAmt: itemAmts,
  }

  try {
    const result = await sendRequest(API_PATHS.allowance, postData, params.workspaceId)

    if (result.Status === 'SUCCESS' || result.Status === '1') {
      return {
        success: true,
        message: '折讓開立成功',
        data: {
          allowanceNo: result.AllowanceNo || '',
        },
      }
    } else {
      return {
        success: false,
        message: result.Message || result.Msg || '折讓開立失敗',
      }
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '折讓開立失敗',
    }
  }
}

/**
 * 查詢收據
 */
export async function queryInvoice(params: QueryParams & { workspaceId: string }): Promise<{
  success: boolean
  message: string
  data?: Record<string, string>
}> {
  const postData: Record<string, unknown> = {
    Version: '1.1',
    TimeStamp: Math.floor(Date.now() / 1000),
  }

  if (params.invoiceNumber) {
    postData.InvoiceNumber = params.invoiceNumber
  }
  if (params.transactionNo) {
    postData.MerchantOrderNo = params.transactionNo
  }
  if (params.startDate) {
    postData.BeginDate = formatInvoiceDate(params.startDate)
  }
  if (params.endDate) {
    postData.EndDate = formatInvoiceDate(params.endDate)
  }

  try {
    const result = await sendRequest(API_PATHS.query, postData, params.workspaceId)

    if (result.Status === 'SUCCESS' || result.Status === '1') {
      return {
        success: true,
        message: '查詢成功',
        data: result,
      }
    } else {
      return {
        success: false,
        message: result.Message || result.Msg || '查詢失敗',
      }
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '查詢失敗',
    }
  }
}
