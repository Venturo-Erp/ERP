import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * 合約 PDF 下載 API
 * GET /api/contracts/[id]/pdf
 * 
 * 回傳合約的 PDF 版本（含簽名）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    // 1. 取得合約資料
    const { data: contract, error } = await supabase
      .from('contracts')
      .select(`
        *,
        tour:tours(code, name, departure_date, return_date),
        order:orders(code, customer_name)
      `)
      .eq('id', id)
      .single()

    if (error || !contract) {
      return NextResponse.json(
        { error: '找不到合約' },
        { status: 404 }
      )
    }

    // 2. 檢查是否已簽署
    if (contract.status !== 'signed' && contract.status !== 'completed') {
      return NextResponse.json(
        { error: '合約尚未簽署' },
        { status: 400 }
      )
    }

    // 3. 產生 HTML 內容
    const html = generateContractHTML(contract)

    // 4. 暫時回傳 HTML（之後可用 puppeteer 轉 PDF）
    // TODO: 整合 puppeteer 或 @react-pdf/renderer 產生真正的 PDF
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="contract-${contract.code || id}.html"`,
      },
    })
  } catch (err) {
    console.error('PDF generation error:', err)
    return NextResponse.json(
      { error: '產生 PDF 失敗' },
      { status: 500 }
    )
  }
}

/**
 * 產生合約 HTML
 */
function generateContractHTML(contract: Record<string, unknown>): string {
  const tour = contract.tour as Record<string, unknown> | null
  const order = contract.order as Record<string, unknown> | null
  const signatures = contract.signatures as Array<{
    name: string
    signature_data: string
    signed_at: string
  }> | null

  return `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <title>旅遊合約 - ${contract.code || ''}</title>
  <style>
    body {
      font-family: 'Noto Sans TC', sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
      color: #333;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #B8860B;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #B8860B;
      margin: 0;
    }
    .section {
      margin-bottom: 30px;
    }
    .section-title {
      font-size: 18px;
      font-weight: bold;
      color: #B8860B;
      margin-bottom: 10px;
      border-bottom: 1px solid #ddd;
      padding-bottom: 5px;
    }
    .info-row {
      display: flex;
      margin-bottom: 8px;
    }
    .info-label {
      width: 120px;
      color: #666;
    }
    .info-value {
      flex: 1;
    }
    .signatures {
      display: flex;
      justify-content: space-around;
      margin-top: 50px;
    }
    .signature-box {
      text-align: center;
      width: 200px;
    }
    .signature-box img {
      max-width: 180px;
      height: 80px;
      object-fit: contain;
    }
    .signature-name {
      border-top: 1px solid #333;
      padding-top: 10px;
      margin-top: 10px;
    }
    .footer {
      margin-top: 50px;
      text-align: center;
      color: #999;
      font-size: 12px;
    }
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>旅遊定型化契約</h1>
    <p>合約編號：${contract.code || contract.id}</p>
  </div>

  <div class="section">
    <div class="section-title">行程資訊</div>
    <div class="info-row">
      <span class="info-label">團號：</span>
      <span class="info-value">${tour?.code || '-'}</span>
    </div>
    <div class="info-row">
      <span class="info-label">行程名稱：</span>
      <span class="info-value">${tour?.name || '-'}</span>
    </div>
    <div class="info-row">
      <span class="info-label">出發日期：</span>
      <span class="info-value">${formatDate(tour?.departure_date as string)}</span>
    </div>
    <div class="info-row">
      <span class="info-label">回程日期：</span>
      <span class="info-value">${formatDate(tour?.return_date as string)}</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">旅客資訊</div>
    <div class="info-row">
      <span class="info-label">訂單編號：</span>
      <span class="info-value">${order?.code || '-'}</span>
    </div>
    <div class="info-row">
      <span class="info-label">旅客姓名：</span>
      <span class="info-value">${order?.customer_name || '-'}</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">合約內容</div>
    <div style="white-space: pre-wrap; line-height: 1.8;">
${contract.content || '（無內容）'}
    </div>
  </div>

  ${signatures && signatures.length > 0 ? `
  <div class="section">
    <div class="section-title">簽署</div>
    <div class="signatures">
      ${signatures.map(sig => `
        <div class="signature-box">
          <img src="${sig.signature_data}" alt="簽名" />
          <div class="signature-name">${sig.name}</div>
          <div style="font-size: 12px; color: #666;">
            ${formatDateTime(sig.signed_at)}
          </div>
        </div>
      `).join('')}
    </div>
  </div>
  ` : ''}

  <div class="footer">
    <p>本合約由 Venturo ERP 系統產生</p>
    <p>產生時間：${new Date().toLocaleString('zh-TW')}</p>
  </div>

  <div class="no-print" style="margin-top: 30px; text-align: center;">
    <button onclick="window.print()" style="
      padding: 10px 30px;
      background: #B8860B;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 16px;
    ">列印 / 另存 PDF</button>
  </div>
</body>
</html>
  `
}

function formatDate(date: string | null | undefined): string {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('zh-TW')
}

function formatDateTime(date: string | null | undefined): string {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-TW')
}
