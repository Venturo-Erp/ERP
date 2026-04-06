#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabaseUrl = 'https://pfqvdacxowpgfamuvnsn.supabase.co'
const supabaseKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmcXZkYWN4b3dwZ2ZhbXV2bnNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTEwODMyMCwiZXhwIjoyMDc0Njg0MzIwfQ.kbJbdYHtOWudBGzV3Jv5OWzWQQZT4aBFFgfUczaVdIE'
const supabase = createClient(supabaseUrl, supabaseKey)

const filePath =
  '/Users/tokichin/.openclaw/media/inbound/TW260321A_Liz高爾夫球團10人-0115BL008290---0cb9771a-8e9f-4218-ae12-7c5c0c28ee52.pdf'
const fileName = 'TW260321A_Liz高爾夫球團10人-0115BL008290.pdf'
const tourCode = 'TW260321A'
const tourId = 'be97ebec-4cf9-4a94-b821-54a103689d21'
const workspaceId = '8ef05a74-1f87-48ab-afd3-9bfeb423935d'

async function upload() {
  try {
    const fileBuffer = fs.readFileSync(filePath)
    const timestamp = Date.now()
    // 移除檔名中文，避免 Storage API 錯誤
    const safeFileName = fileName.replace(/[^\x00-\x7F]/g, '')
    const storagePath = `tour-documents/${tourCode}/insurance/${timestamp}_${safeFileName}`

    console.log('📤 上傳中...')

    // 上傳到 Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, fileBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      })

    if (uploadError) {
      console.error('❌ 上傳失敗:', uploadError)
      process.exit(1)
    }

    console.log('✅ 上傳成功:', storagePath)

    // 建立 files 記錄
    const { error: dbError } = await supabase.from('files').insert({
      workspace_id: workspaceId,
      tour_id: tourId,
      category: 'insurance',
      filename: fileName,
      original_filename: fileName,
      storage_path: storagePath,
      storage_bucket: 'documents',
      content_type: 'application/pdf',
      size_bytes: fileBuffer.length,
      is_starred: false,
      is_archived: false,
      is_deleted: false,
    })

    if (dbError) {
      console.error('❌ DB 錯誤:', dbError)
      process.exit(1)
    }

    console.log('✅ DB 記錄建立成功')
    console.log('📁 檔案大小:', (fileBuffer.length / 1024).toFixed(0), 'KB')
    console.log('')
    console.log('🎉 歸檔完成！')
    console.log('📍 查看位置：http://100.89.92.46:3000/tours/TW260321A?tab=files')
  } catch (err) {
    console.error('❌ 錯誤:', err.message)
    process.exit(1)
  }
}

upload().catch(console.error)
