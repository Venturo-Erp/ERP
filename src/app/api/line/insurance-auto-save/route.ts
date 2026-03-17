import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const LINE_API_URL = 'https://api-data.line.me/v2/bot/message'
const INSURANCE_GROUP_ID = 'C03f53517dc822913b394411981a100bf' // 喜多里保代

// 可信任的保險公司發送者（LINE userId）
// 🔧 設定方式：docs/line-insurance-setup.md
const TRUSTED_SENDERS = [
  // 'U1234567890abcdef', // 喜多里保代（待補）
  // 'Uabcdef1234567890', // 其他保險公司（待補）
]

// 從檔名解析團號
function parseTourCode(fileName: string): { tourCode: string; prefix: string } | null {
  const match = fileName.match(/^(TW|TC)(\d{6}[A-Z])/)
  if (!match) return null

  return {
    tourCode: match[0], // TW260321A
    prefix: match[1], // TW or TC
  }
}

// 檢查發送者是否為保險公司
function isTrustedSender(userId?: string): boolean {
  if (!userId) return false

  // 暫時：如果 TRUSTED_SENDERS 為空，允許所有人（測試用）
  if (TRUSTED_SENDERS.length === 0) {
    console.warn('[insurance] ⚠️  TRUSTED_SENDERS 未設定，允許所有發送者')
    return true
  }

  return TRUSTED_SENDERS.includes(userId)
}

// Webhook 處理（從 /api/line/webhook 呼叫）
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const events = body.events || []

    if (events.length === 0) {
      return NextResponse.json({ ok: true, message: 'No events' })
    }

    const event = events[0]

    // 1. 檢查是否為保險群組的檔案訊息
    if (event.source?.groupId !== INSURANCE_GROUP_ID) {
      return NextResponse.json({ ok: true, skipped: '非保險群組' })
    }

    if (event.type !== 'message' || event.message?.type !== 'file') {
      return NextResponse.json({ ok: true, skipped: '非檔案訊息' })
    }

    const fileName = event.message.fileName
    const messageId = event.message.id
    const userId = event.source?.userId

    if (!fileName.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ ok: true, skipped: '非 PDF' })
    }

    // 2. 檢查發送者
    if (!isTrustedSender(userId)) {
      console.log(`[insurance] ⚠️  非保險公司發送: ${fileName} (${userId})`)
      return NextResponse.json({ ok: true, skipped: '非保險公司發送' })
    }

    // 3. 解析團號
    const parsed = parseTourCode(fileName)
    if (!parsed) {
      // Telegram 通知 William
      await notifyError({
        type: 'parse_error',
        fileName,
        userId,
        messageId,
        reason: '無法解析團號',
      })
      return NextResponse.json({ ok: true, error: '無法解析團號' })
    }

    // 4. 查詢團體
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: tour, error: tourError } = await supabase
      .from('tours')
      .select('id, workspace_id, code')
      .eq('code', parsed.tourCode)
      .single()

    if (tourError || !tour) {
      // ERP 查不到 → 可能是舊團或台中的團
      console.log(`[insurance] ⚠️  團號 ${parsed.tourCode} 不在 ERP（可能是舊團或台中）`)
      
      // 簡單記錄 log，不發 Telegram（避免太吵）
      // William 可以從 Vercel logs 查看
      return NextResponse.json({ 
        ok: true, 
        skipped: '團號不在 ERP',
        tourCode: parsed.tourCode,
        reason: '可能是舊團或台中的團'
      })
    }

    // 5. 下載 PDF
    const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN!
    const downloadUrl = `${LINE_API_URL}/${messageId}/content`

    const pdfRes = await fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${lineToken}` },
    })

    if (!pdfRes.ok) {
      throw new Error(`下載失敗: ${pdfRes.statusText}`)
    }

    const pdfBuffer = await pdfRes.arrayBuffer()

    // 6. 上傳 Supabase Storage
    const timestamp = Date.now()
    const storagePath = `tour-documents/${tour.code}/insurance/${timestamp}_${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      })

    if (uploadError) {
      throw new Error(`上傳失敗: ${uploadError.message}`)
    }

    // 7. 建立 files 記錄
    const { error: dbError } = await supabase.from('files').insert({
      workspace_id: tour.workspace_id,
      tour_id: tour.id,
      category: 'insurance',
      filename: fileName,
      original_filename: fileName,
      storage_path: storagePath,
      storage_bucket: 'documents',
      content_type: 'application/pdf',
      size_bytes: pdfBuffer.byteLength,
      is_starred: false,
      is_archived: false,
      is_deleted: false,
    })

    if (dbError) {
      throw new Error(`建立 DB 記錄失敗: ${dbError.message}`)
    }

    // 8. Telegram 通知成功
    await notifySuccess({
      tourCode: tour.code,
      fileName,
      size: (pdfBuffer.byteLength / 1024).toFixed(0),
    })

    return NextResponse.json({ ok: true, tourCode: tour.code, fileName })
  } catch (error) {
    console.error('[insurance-auto-save]', error)
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 })
  }
}

// Telegram 通知（成功）
async function notifySuccess({ tourCode, fileName, size }: { tourCode: string; fileName: string; size: string }) {
  try {
    const telegramToken = process.env.TELEGRAM_BOT_TOKEN
    const chatId = '8559214126'

    if (!telegramToken) return

    const message = `✅ 保險 PDF 已自動歸檔\n\n團號：${tourCode}\n檔案：${fileName}\n大小：${size} KB\n\n📁 查看：團詳細頁 → 檔案 → 🛡️ 保險`

    await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message }),
    })
  } catch (err) {
    console.error('[telegram]', err)
  }
}

// Telegram 通知（錯誤）— 只通知「無法解析團號」
async function notifyError(params: {
  type: string
  fileName: string
  userId?: string
  messageId: string
  reason: string
}) {
  try {
    const telegramToken = process.env.TELEGRAM_BOT_TOKEN
    const chatId = '8559214126'

    if (!telegramToken) return

    // 只通知無法解析團號（真的需要處理）
    if (params.type !== 'parse_error') return

    const message = `❌ 保險 PDF 無法歸檔\n\n檔案：${params.fileName}\n原因：${params.reason}\n\n💡 請確認檔名包含團號：TW260321A.pdf 或 TC260321A.pdf\n\n手動處理：\nnode scripts/manual-insurance-save.cjs ${params.messageId} "${params.fileName}"`

    await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message }),
    })
  } catch (err) {
    console.error('[telegram]', err)
  }
}
