import ExcelJS from 'exceljs'
import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

// Config
const SUPABASE_URL = 'https://pfqvdacxowpgfamuvnsn.supabase.co'
const envFile = fs.readFileSync(path.join(process.env.HOME, 'Projects/venturo-erp/.env.local'), 'utf8')
const SUPABASE_KEY = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1] || envFile.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)?.[1]
const LINE_TOKEN = fs.readFileSync(path.join(process.env.HOME, 'Projects/venturo-erp/.env.local'), 'utf8').match(/LINE_CHANNEL_ACCESS_TOKEN=(.*)/)?.[1]
const LINE_GROUP_ID = 'Cef588e4998134cdb9313b80667924bdb' // william筆記本

const TOUR_CODE = 'TW260321A'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function main() {
  // 1. 取團資料
  const { data: tour } = await supabase
    .from('tours')
    .select('id, code, name, departure_date, group_size')
    .eq('code', TOUR_CODE)
    .single()

  if (!tour) { console.error('Tour not found'); return }
  console.log(`📋 團: ${tour.code} ${tour.name} (${tour.departure_date})`)

  // 2. 取團員
  const { data: members } = await supabase
    .from('tour_members')
    .select('*, customer:customers(chinese_name, english_name, passport_number, passport_expiry, birth_date, gender, id_number, dietary_preference)')
    .eq('tour_id', tour.id)

  if (!members?.length) { console.error('No members'); return }
  console.log(`👥 團員: ${members.length} 人`)

  // 3. 產生 Excel
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('團員名單')

  // 標題
  ws.mergeCells('A1:H1')
  ws.getCell('A1').value = `${tour.code} ${tour.name} - 團員名單`
  ws.getCell('A1').font = { bold: true, size: 14 }
  ws.getCell('A1').alignment = { horizontal: 'center' }

  ws.mergeCells('A2:H2')
  ws.getCell('A2').value = `出發日期: ${tour.departure_date} | 人數: ${members.length} 人`
  ws.getCell('A2').alignment = { horizontal: 'center' }

  // 表頭
  const headers = ['序', '中文姓名', '護照拼音', '出生年月日', '性別', '身分證號', '護照號碼', '護照效期', '飲食禁忌', '備註']
  const headerRow = ws.addRow(headers)
  headerRow.font = { bold: true }
  headerRow.eachCell(c => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8DCC8' } }
    c.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }
  })

  // 資料
  members.forEach((m, i) => {
    const c = m.customer || {}
    const row = ws.addRow([
      i + 1,
      c.chinese_name || '',
      c.english_name || '',
      c.birth_date || '',
      c.gender === 'M' ? '男' : c.gender === 'F' ? '女' : '',
      c.id_number || '',
      c.passport_number || '',
      c.passport_expiry || '',
      c.dietary_preference || '',
      m.note || '',
    ])
    row.eachCell(cell => {
      cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }
    })
  })

  // 欄寬
  ws.columns = [
    { width: 5 }, { width: 12 }, { width: 20 }, { width: 14 },
    { width: 6 }, { width: 14 }, { width: 14 }, { width: 14 },
    { width: 10 }, { width: 15 },
  ]

  const filePath = `/tmp/${tour.code}_團員名單.xlsx`
  await wb.xlsx.writeFile(filePath)
  console.log(`📄 Excel: ${filePath}`)

  // 4. 上傳到 Supabase Storage
  const fileBuffer = fs.readFileSync(filePath)
  const storagePath = `tour-documents/${tour.code}/團員名單_${new Date().toISOString().slice(0, 10)}.xlsx`

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, fileBuffer, {
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      upsert: true,
    })

  if (uploadError) {
    console.error('Upload error:', uploadError)
    // 直接用本地檔案發 LINE
  } else {
    console.log('📤 Uploaded:', uploadData.path)
  }

  // 5. 取得公開 URL
  const { data: urlData } = supabase.storage.from('documents').getPublicUrl(storagePath)
  const publicUrl = urlData?.publicUrl
  console.log('🔗 URL:', publicUrl)

  // 6. 發 LINE 訊息
  const messageText = `📋 ${tour.code} ${tour.name}\n📅 出發日期: ${tour.departure_date}\n👥 團員人數: ${members.length} 人\n\n📎 團員名單 Excel:\n${publicUrl}`

  const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${LINE_TOKEN}`,
    },
    body: JSON.stringify({
      to: LINE_GROUP_ID,
      messages: [{
        type: 'text',
        text: messageText,
      }],
    }),
  })

  if (lineRes.ok) {
    console.log('✅ LINE 發送成功!')
  } else {
    const err = await lineRes.text()
    console.error('❌ LINE 發送失敗:', lineRes.status, err)
  }
}

main().catch(console.error)
