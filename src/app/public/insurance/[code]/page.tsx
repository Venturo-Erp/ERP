import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { COMPANY_NAME, COMPANY_NAME_EN } from '@/lib/tenant'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

type Member = {
  name: string
  national_id: string | null
  birth_date: string | null
}

async function getTourMembers(code: string) {
  const supabase = getSupabaseAdminClient()

  // 1. 查團（含 workspace 公司名稱）
  const { data: tour } = await supabase
    .from('tours')
    .select('id, code, name, departure_date, return_date, workspace_id')
    .eq('code', code)
    .single()

  if (!tour) return null

  // 2. 查公司名稱 + 團員訂單 + Excel 連結（並行）
  const [wsResult, { data: orders }, docResult] = await Promise.all([
    tour.workspace_id
      ? supabase
          .from('workspaces')
          .select('name')
          .eq('id', tour.workspace_id)
          .single()
          .then(r => r as unknown as { data: { name: string } | null })
      : Promise.resolve({ data: null } as { data: { name: string } | null }),
    supabase.from('orders').select('id').eq('tour_id', tour.id),
    supabase
      .from('tour_documents')
      .select('file_path')
      .eq('tour_id', tour.id)
      .like('file_name', `${code}_members%`)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
      .then(r => r as unknown as { data: { file_path: string } | null }),
  ])

  let companyName = COMPANY_NAME
  if (wsResult.data?.name) companyName = wsResult.data.name

  const orderIds = orders?.map(o => o.id) || []

  // 3. 查團員 + Excel 簽名 URL（並行）
  const [membersResult, signedUrlResult] = await Promise.all([
    orderIds.length > 0
      ? supabase
          .from('order_members')
          .select('customer:customer_id(name, national_id, birth_date)')
          .in('order_id', orderIds)
          .then(r => r as unknown as { data: { customer: Member | null }[] | null })
      : Promise.resolve({ data: null } as { data: { customer: Member | null }[] | null }),
    docResult.data
      ? supabase.storage.from('documents').createSignedUrl(docResult.data.file_path, 86400)
      : Promise.resolve({ data: null }),
  ])

  const members = (membersResult.data || [])
    .map(m => m.customer)
    .filter((c): c is Member => c !== null)
  const excelUrl = signedUrlResult.data?.signedUrl || null

  return { tour, members, excelUrl, companyName }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
  } catch {
    return dateStr
  }
}

function maskId(id: string | null): string {
  if (!id) return '-'
  if (id.length <= 4) return id
  // 顯示前2後2，中間遮罩
  return id.slice(0, 2) + '●'.repeat(id.length - 4) + id.slice(-2)
}

export default async function InsuranceMemberPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const result = await getTourMembers(code.toUpperCase())

  if (!result) {
    notFound()
  }

  const { tour, members, excelUrl, companyName } = result

  return (
    <html lang="zh-TW">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex, nofollow" />
        <title>{tour.code} 團員名單 - 保險用</title>
      </head>
      <body
        style={{
          margin: 0,
          padding: '16px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          backgroundColor: '#f8f6f3',
          color: '#333',
        }}
      >
        {/* Header */}
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <div style={{ fontSize: '12px', color: 'var(--morandi-muted)', marginBottom: '4px' }}>
            🛡️ 旅遊責任險 團員名單
          </div>
          <h1 style={{ margin: '0 0 12px', fontSize: '20px', color: 'var(--morandi-primary)' }}>
            {tour.code} {tour.name}
          </h1>
          <div style={{ fontSize: '14px', color: 'var(--morandi-secondary)', lineHeight: '1.6' }}>
            <div>📅 出發：{formatDate(tour.departure_date)}</div>
            <div>📅 回程：{formatDate(tour.return_date)}</div>
            <div>👥 人數：{members.length} 人</div>
          </div>
        </div>

        {/* Member List */}
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px',
            }}
          >
            <thead>
              <tr style={{ backgroundColor: 'var(--morandi-container)' }}>
                <th style={{ padding: '10px 8px', textAlign: 'center', width: '36px' }}>#</th>
                <th style={{ padding: '10px 8px', textAlign: 'left' }}>姓名</th>
                <th style={{ padding: '10px 8px', textAlign: 'center' }}>出生日期</th>
                <th style={{ padding: '10px 8px', textAlign: 'center' }}>身分證字號</th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    style={{ padding: '24px', textAlign: 'center', color: 'var(--morandi-muted)' }}
                  >
                    尚無團員資料
                  </td>
                </tr>
              ) : (
                members.map((m, i) => (
                  <tr
                    key={i}
                    style={{
                      borderBottom: '1px solid #f0ece6',
                      backgroundColor: i % 2 === 0 ? '#fff' : '#faf8f5',
                    }}
                  >
                    <td
                      style={{
                        padding: '10px 8px',
                        textAlign: 'center',
                        color: 'var(--morandi-muted)',
                      }}
                    >
                      {i + 1}
                    </td>
                    <td style={{ padding: '10px 8px', fontWeight: 500 }}>{m.name}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                      {formatDate(m.birth_date)}
                    </td>
                    <td
                      style={{ padding: '10px 8px', textAlign: 'center', fontFamily: 'monospace' }}
                    >
                      {m.national_id || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Download */}
        {excelUrl && (
          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <a
              href={excelUrl}
              style={{
                display: 'inline-block',
                padding: '12px 24px',
                backgroundColor: '#5b8c5a',
                color: '#fff',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '14px',
              }}
            >
              📥 下載 Excel 檔案
            </a>
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            marginTop: '24px',
            textAlign: 'center',
            fontSize: '12px',
            color: '#bbb',
          }}
        >
          {companyName}
        </div>
      </body>
    </html>
  )
}
