#!/usr/bin/env node
/**
 * LINE 保險群組檔案過濾與歸檔
 *
 * 規則：
 * 1. 只處理保險公司傳的 PDF
 * 2. 檔名 = 團號（TW260321A 或 TC260321A）
 * 3. 其他人傳的檔案 → 略過 + 記錄
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// 可信任的保險公司發送者（LINE displayName 或 userId）
const TRUSTED_SENDERS = [
  '喜多里保代', // displayName
  '喜多里',
  '保險公司',
  // 'U1234567890abcdef', // 或用 userId（更可靠）
]

// 從檔名解析團號
function parseTourCode(fileName) {
  // 檔名格式：TW260321A.pdf 或 TC260321A 保險單.pdf
  const match = fileName.match(/^(TW|TC\d{6}[A-Z])/)
  if (!match) return null

  const tourCode = match[1]
  const prefix = tourCode.substring(0, 2)
  const workspace = prefix === 'TW' ? 'Corner' : 'Corner-TC'

  return { tourCode, prefix, workspace }
}

// 檢查發送者是否可信任
function isTrustedSender(event) {
  const userId = event.source?.userId
  const displayName = event.source?.displayName // 可能沒有（需要 profile API）

  // 方法 1：檢查 userId（最可靠）
  if (userId && TRUSTED_SENDERS.includes(userId)) {
    return { trusted: true, sender: userId, method: 'userId' }
  }

  // 方法 2：檢查 displayName（需要額外查詢）
  if (displayName && TRUSTED_SENDERS.some(name => displayName.includes(name))) {
    return { trusted: true, sender: displayName, method: 'displayName' }
  }

  return { trusted: false, sender: userId || displayName || '未知' }
}

// 查詢 LINE 使用者名稱（如果需要）
async function getLineProfile(userId, lineToken) {
  try {
    const res = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
      headers: { Authorization: `Bearer ${lineToken}` },
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.displayName
  } catch {
    return null
  }
}

// 處理單一 webhook event
async function processEvent(event, lineToken) {
  // 1. 檢查是否為檔案訊息
  if (event.type !== 'message' || event.message?.type !== 'file') {
    return { action: 'skip', reason: '不是檔案訊息' }
  }

  const fileName = event.message.fileName
  const messageId = event.message.id
  const userId = event.source?.userId

  // 2. 檢查是否為 PDF
  if (!fileName.toLowerCase().endsWith('.pdf')) {
    return { action: 'skip', reason: '不是 PDF', fileName }
  }

  // 3. 檢查發送者（先用 userId，沒有就查 profile）
  let senderCheck = isTrustedSender(event)

  if (!senderCheck.trusted && userId) {
    // 查詢 displayName 再檢查一次
    const displayName = await getLineProfile(userId, lineToken)
    if (displayName) {
      event.source.displayName = displayName
      senderCheck = isTrustedSender(event)
    }
  }

  if (!senderCheck.trusted) {
    return {
      action: 'reject',
      reason: '非保險公司發送',
      sender: senderCheck.sender,
      fileName,
      messageId,
    }
  }

  // 4. 解析團號
  const parsed = parseTourCode(fileName)
  if (!parsed) {
    return {
      action: 'error',
      reason: '無法解析團號',
      fileName,
      sender: senderCheck.sender,
      messageId,
    }
  }

  // 5. 查詢團體
  const { data: tour, error } = await supabase
    .from('tours')
    .select('id, workspace_id, code')
    .eq('code', parsed.tourCode)
    .single()

  if (error || !tour) {
    return {
      action: 'error',
      reason: `找不到團號 ${parsed.tourCode}`,
      fileName,
      sender: senderCheck.sender,
      messageId,
    }
  }

  // 6. 返回待處理
  return {
    action: 'process',
    tourCode: parsed.tourCode,
    tourId: tour.id,
    workspaceId: tour.workspace_id,
    fileName,
    messageId,
    sender: senderCheck.sender,
  }
}

// Webhook 處理函數（給 API route 呼叫）
async function handleWebhook(req) {
  const events = req.body?.events || []
  const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN

  const results = []

  for (const event of events) {
    const result = await processEvent(event, lineToken)
    results.push(result)

    // 根據 action 決定後續處理
    if (result.action === 'process') {
      console.log(`✅ 待處理: ${result.fileName} (${result.sender})`)
      // 這裡可以觸發下載+歸檔
    } else if (result.action === 'reject') {
      console.log(`⚠️  略過: ${result.fileName} - ${result.reason} (${result.sender})`)
      // 可選：Telegram 通知 William
    } else if (result.action === 'error') {
      console.log(`❌ 錯誤: ${result.fileName} - ${result.reason}`)
      // Telegram 通知 William 處理
    }
  }

  return results
}

module.exports = { handleWebhook, parseTourCode, isTrustedSender }

// CLI 測試
if (require.main === module) {
  // 測試解析
  console.log('測試檔名解析:')
  console.log(parseTourCode('TW260321A.pdf'))
  console.log(parseTourCode('TC260321A 保險單.pdf'))
  console.log(parseTourCode('其他檔案.pdf'))
}
