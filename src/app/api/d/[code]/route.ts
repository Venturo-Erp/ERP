import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/api-client'

/**
 * GET /api/d/[code]
 *
 * 公開 API：短網址下載團員名冊（無需登入）
 * 透過團號取得最新的團員名冊並 redirect 到簽名 URL
 */
export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const supabase = createServiceClient()
  const { code } = await params

  // 1. 先查團號對應的 tour UUID
  const { data: tour } = await supabase.from('tours').select('id').eq('code', code).single()

  if (!tour) {
    return NextResponse.json({ error: 'Tour not found', code }, { status: 404 })
  }

  // 2. 查詢 tour_documents 表（用 UUID）
  const { data, error } = await supabase
    .from('tour_documents')
    .select('file_path')
    .eq('tour_id', tour.id)
    .like('file_name', `${code}_members%`)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'File not found', tourId: tour.id }, { status: 404 })
  }

  // 生成 24hr signed URL
  const { data: signedData } = await supabase.storage
    .from('documents')
    .createSignedUrl(data.file_path, 86400) // 24hr

  if (!signedData?.signedUrl) {
    return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 })
  }

  // 302 redirect to signed URL
  return NextResponse.redirect(signedData.signedUrl)
}
