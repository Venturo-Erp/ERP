#!/usr/bin/env node
/**
 * 手動歸檔保險 PDF
 * 用法：node scripts/manual-insurance-save.cjs <messageId>
 */

const https = require('https')
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || 'YOUR_LINE_TOKEN'
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pfqvdacxowpgfamuvnsn.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_KEY'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// 從檔名解析團號和公司
function parseFileName(fileName) {
  // 格式：TW260321A Liz高爾夫球团 10人-0115BL008290.pdf
  // 或：TC260321A XXX
  const match = fileName.match(/^(TW|TC)(\d{6}[A-Z])/)
  if (!match) return null

  const prefix = match[1] // TW or TC
  const tourCode = match[0] // TW260321A
  const company = prefix === 'TW' ? 'Corner' : 'Corner-TC' // 台北 or 台中

  return { tourCode, company, prefix }
}

// 下載 LINE 訊息內容
async function downloadLineContent(messageId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api-data.line.me',
      path: `/v2/bot/message/${messageId}/content`,
      headers: {
        Authorization: `Bearer ${LINE_TOKEN}`,
      },
    }

    https.get(options, res => {
      const chunks = []
      res.on('data', chunk => chunks.push(chunk))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    })
  })
}

// 主流程
async function main() {
  const messageId = process.argv[2]
  const fileName = process.argv[3]

  if (!messageId || !fileName) {
    console.error('用法: node manual-insurance-save.cjs <messageId> <fileName>')
    console.error('範例: node manual-insurance-save.cjs 123456 "TW260321A 保險單.pdf"')
    process.exit(1)
  }

  console.log(`📥 處理檔案: ${fileName}`)

  // 1. 解析團號
  const parsed = parseFileName(fileName)
  if (!parsed) {
    console.error('❌ 無法解析團號，檔名格式錯誤')
    console.error('📋 建議：手動處理或通知 William')
    process.exit(1)
  }

  console.log(`✅ 團號: ${parsed.tourCode} (${parsed.company})`)

  // 2. 查詢 tour_id
  const { data: tour, error: tourError } = await supabase
    .from('tours')
    .select('id, workspace_id, code')
    .eq('code', parsed.tourCode)
    .single()

  if (tourError || !tour) {
    console.error(`❌ 找不到團號 ${parsed.tourCode}`)
    console.error('📋 建議：確認團號是否正確，或該團尚未建立')
    process.exit(1)
  }

  console.log(`✅ 找到團體: ${tour.code} (workspace: ${tour.workspace_id})`)

  // 3. 下載檔案
  console.log('📥 下載 PDF...')
  const pdfBuffer = await downloadLineContent(messageId)
  console.log(`✅ 下載完成 (${(pdfBuffer.length / 1024).toFixed(0)} KB)`)

  // 4. 上傳到 Supabase Storage
  const timestamp = Date.now()
  const storagePath = `tour-documents/${tour.code}/insurance/${timestamp}_${fileName}`

  console.log('📤 上傳到 Supabase Storage...')
  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: false,
    })

  if (uploadError) {
    console.error('❌ 上傳失敗:', uploadError.message)
    process.exit(1)
  }

  console.log(`✅ 上傳成功: ${storagePath}`)

  // 5. 建立 files 記錄
  const { error: dbError } = await supabase.from('files').insert({
    workspace_id: tour.workspace_id,
    tour_id: tour.id,
    category: 'insurance',
    filename: fileName,
    original_filename: fileName,
    storage_path: storagePath,
    storage_bucket: 'documents',
    content_type: 'application/pdf',
    size_bytes: pdfBuffer.length,
    is_starred: false,
    is_archived: false,
    is_deleted: false,
  })

  if (dbError) {
    console.error('❌ 建立 DB 記錄失敗:', dbError.message)
    process.exit(1)
  }

  console.log('✅ DB 記錄建立完成')
  console.log('')
  console.log('🎉 歸檔完成！')
  console.log(`📁 位置: 團詳細頁 → 檔案 → 🛡️ 保險`)
}

main().catch(err => {
  console.error('❌ 錯誤:', err.message)
  process.exit(1)
})
