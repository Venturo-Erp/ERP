import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { logger } from '@/lib/utils/logger'

const LINE_API_URL = 'https://api.line.me/v2/bot/message/push'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      tourId,
      tourCode,
      tourName,
      departureDate,
      returnDate,
      groupId: requestedGroupId,
    } = body

    if (!tourId || !tourCode) {
      return NextResponse.json({ success: false, error: '缺少必要參數' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN!
    const supabase = createClient(supabaseUrl, supabaseKey)

    let targetGroup: { group_id: string; group_name: string | null }

    if (requestedGroupId) {
      const { data: group } = await supabase
        .from('line_groups')
        .select('group_id, group_name')
        .eq('group_id', requestedGroupId)
        .single()
      if (!group) {
        return NextResponse.json({ success: false, error: '指定的 LINE 群組不存在' })
      }
      targetGroup = group
    } else {
      // 預設發到 william筆記本
      const { data: group } = await supabase
        .from('line_groups')
        .select('group_id, group_name')
        .eq('group_name', 'william筆記本')
        .single()
      if (!group) {
        return NextResponse.json({ success: false, error: '找不到 william筆記本群組' })
      }
      targetGroup = group
    }

    // 2. 取團員（透過 order_members）
    const { data: orders } = await supabase.from('orders').select('id').eq('tour_id', tourId)

    const orderIds = orders?.map(o => o.id) || []

    let members: {
      customer: { name: string; national_id: string | null; birth_date: string | null } | null
    }[] = []
    if (orderIds.length > 0) {
      const { data } = await supabase
        .from('order_members')
        .select('customer:customer_id(name, national_id, birth_date)')
        .in('order_id', orderIds)
      members = (data as unknown as typeof members) || []
    }

    // 3. 產生 Excel
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('團員名單')

    ws.mergeCells('A1:D1')
    ws.getCell('A1').value = `${tourCode} ${tourName}`
    ws.getCell('A1').font = { bold: true, size: 14 }
    ws.getCell('A1').alignment = { horizontal: 'center' }

    ws.mergeCells('A2:D2')
    ws.getCell('A2').value =
      `出發: ${departureDate || '-'} | 回程: ${returnDate || '-'} | 人數: ${members.length} 人`
    ws.getCell('A2').alignment = { horizontal: 'center' }
    ws.getCell('A2').font = { size: 11 }

    ws.addRow([])

    const headers = ['序', '姓名', '身分證字號', '出生年月日']
    const headerRow = ws.addRow(headers)
    headerRow.font = { bold: true }
    headerRow.eachCell(c => {
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8DCC8' } }
      c.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      }
    })

    members.forEach((m, i) => {
      const c = m.customer || { name: '', national_id: null, birth_date: null }
      const row = ws.addRow([i + 1, c.name || '', c.national_id || '', c.birth_date || ''])
      row.eachCell(cell => {
        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' },
        }
      })
    })

    ws.columns = [{ width: 5 }, { width: 12 }, { width: 14 }, { width: 14 }]

    // 4. 上傳到 Supabase Storage
    const buffer = await wb.xlsx.writeBuffer()
    const fileName = `${tourCode}_members_${new Date().toISOString().slice(0, 10)}.xlsx`
    const storagePath = `tour-documents/${tourCode}/${fileName}`

    await supabase.storage.from('documents').upload(storagePath, buffer as ArrayBuffer, {
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      upsert: true,
    })

    // 4.5 取得公開 URL
    const { data: publicData } = supabase.storage.from('documents').getPublicUrl(storagePath)

    // 4.6 寫入 tour_documents 紀錄（供短網址查詢）
    await supabase.from('tour_documents').insert({
      workspace_id: '8ef05a74-1f87-48ab-afd3-9bfeb423935d',
      tour_id: tourId,
      name: `${tourCode} 保險團員名單`,
      description: '保險用團員名單 Excel',
      file_path: storagePath,
      public_url: publicData.publicUrl,
      file_name: fileName,
      file_size: (buffer as ArrayBuffer).byteLength,
      mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })

    // 5. 公開名單頁面（網頁版，手機可直接看）
    const memberPageUrl = `${process.env.NEXT_PUBLIC_APP_URL}/public/insurance/${tourCode}`

    // 6. 發 LINE — 純文字 + 短網址
    const textMsg = `📋 ${tourCode} ${tourName}
📅 出發: ${departureDate || '-'}
📅 回程: ${returnDate || '-'}
👥 團員人數: ${members.length} 人
🛡️ 旅遊責任險

📎 團員名單：${memberPageUrl}

請協助報價，謝謝！`

    const lineRes = await fetch(LINE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${lineToken}`,
      },
      body: JSON.stringify({
        to: targetGroup.group_id,
        messages: [{ type: 'text', text: textMsg }],
      }),
    })

    if (!lineRes.ok) {
      const err = await lineRes.text()
      return NextResponse.json({ success: false, error: `LINE API: ${err}` })
    }

    return NextResponse.json({
      success: true,
      groupName: targetGroup.group_name,
      memberCount: members.length,
      memberPageUrl,
    })
  } catch (error) {
    logger.error('[send-insurance]', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
