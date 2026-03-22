/**
 * 交通需求單列印工具
 */

import { COMPANY_NAME } from '@/lib/tenant'

interface TransportDay {
  dayNumber: number
  date: string
  route: string
}

interface TransportRequirementData {
  supplierName: string
  tourCode: string
  tourName: string
  totalPax: number
  departureDate?: string
  returnDate?: string
  transportDays: TransportDay[]
  vehicleType?: string
  note?: string
  invoiceSealUrl?: string
}

export function printTransportRequirement(data: TransportRequirementData) {
  const {
    supplierName,
    tourCode,
    tourName,
    totalPax,
    departureDate,
    returnDate,
    transportDays,
    vehicleType,
    note,
    invoiceSealUrl,
  } = data

  const transportRows = transportDays
    .map(
      day => `
    <tr>
      <td>Day ${day.dayNumber}</td>
      <td>${day.date}</td>
      <td>${day.route}</td>
      <td></td>
      <td></td>
    </tr>
  `
    )
    .join('')

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>交通需求單 - ${tourCode}</title>
  <style>
    @media print {
      @page {
        size: A4;
        margin: 1.5cm;
      }
      body {
        margin: 0;
      }
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Microsoft JhengHei', 'PingFang TC', sans-serif;
      font-size: 12pt;
      line-height: 1.6;
      max-width: 21cm;
      margin: 0 auto;
      padding: 2cm;
      background: white;
    }
    .header {
      text-align: center;
      margin-bottom: 1.5cm;
    }
    .header h1 {
      font-size: 20pt;
      font-weight: bold;
      margin: 0 0 0.5cm 0;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1cm;
      margin-bottom: 1cm;
      border: 1px solid #000;
      padding: 0.5cm;
    }
    .info-section h3 {
      font-size: 14pt;
      font-weight: bold;
      margin: 0 0 0.3cm 0;
      border-bottom: 2px solid #000;
      padding-bottom: 0.2cm;
    }
    .info-row {
      display: flex;
      gap: 0.3cm;
      margin-bottom: 0.2cm;
    }
    .info-label {
      font-weight: bold;
      min-width: 3cm;
    }
    h3.table-title {
      font-size: 14pt;
      font-weight: bold;
      margin-bottom: 0.5cm;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 1cm;
    }
    table th,
    table td {
      border: 1px solid #000;
      padding: 0.3cm;
      text-align: left;
    }
    table th {
      background: #e0e0e0;
      font-weight: bold;
    }
    .note-section {
      margin: 1cm 0;
      padding: 0.5cm;
      border: 1px solid #000;
    }
    .footer {
      margin-top: 1.5cm;
      padding-top: 0.5cm;
      border-top: 2px solid #000;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .footer-info {
      flex: 1;
    }
    .footer-seal {
      flex: 0 0 auto;
    }
    .footer-seal img {
      max-width: 4cm;
      max-height: 4cm;
    }
  </style>
</head>
<body>
  <!-- 標題 -->
  <div class="header">
    <h1>廠商需求單</h1>
    <div style="font-size: 14pt">
      致：<strong>${supplierName}</strong>
    </div>
  </div>

  <!-- 基本資訊 -->
  <div class="info-grid">
    <!-- 左欄 -->
    <div class="info-section">
      <h3>我方資訊</h3>
      <div class="info-row">
        <span class="info-label">公司：</span>
        <span>${COMPANY_NAME}</span>
      </div>
      <div class="info-row">
        <span class="info-label">團號：</span>
        <span>${tourCode}</span>
      </div>
      <div class="info-row">
        <span class="info-label">團體名稱：</span>
        <span>${tourName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">總人數：</span>
        <span>${totalPax} 人</span>
      </div>
      ${
        departureDate
          ? `<div class="info-row">
        <span class="info-label">出發日期：</span>
        <span>${departureDate}</span>
      </div>`
          : ''
      }
      ${
        returnDate
          ? `<div class="info-row">
        <span class="info-label">回程日期：</span>
        <span>${returnDate}</span>
      </div>`
          : ''
      }
    </div>

    <!-- 右欄 -->
    <div class="info-section">
      <h3>供應商資訊</h3>
      <div class="info-row">
        <span class="info-label">聯絡人：</span>
        <span>_____________</span>
      </div>
      <div class="info-row">
        <span class="info-label">電話：</span>
        <span>_____________</span>
      </div>
      <div class="info-row">
        <span class="info-label">傳真：</span>
        <span>_____________</span>
      </div>
      <div class="info-row">
        <span class="info-label">業務窗口：</span>
        <span>_____________</span>
      </div>
    </div>
  </div>

  <!-- 交通表 -->
  <h3 class="table-title">交通表</h3>
  <table>
    <thead>
      <tr>
        <th style="width: 3cm">天數</th>
        <th style="width: 3cm">日期</th>
        <th>行程內容</th>
        <th style="width: 3cm">車資報價</th>
        <th style="width: 3cm">備註</th>
      </tr>
    </thead>
    <tbody>
      ${transportRows}
      ${
        vehicleType
          ? `<tr>
        <td colspan="5"><strong>車型需求：</strong>${vehicleType}</td>
      </tr>`
          : ''
      }
    </tbody>
  </table>

  <!-- 備註 -->
  ${
    note
      ? `<div class="note-section">
    <strong>備註：</strong>
    <div style="margin-top: 0.3cm; white-space: pre-wrap">${note}</div>
  </div>`
      : ''
  }

  <!-- 頁尾 -->
  <div class="footer">
    <div class="footer-info">
      <div style="margin-bottom: 0.3cm">
        <strong>敬請確認回傳資訊</strong>
      </div>
      <div>${COMPANY_NAME}</div>
      <div>電話：02-2345-6789</div>
      <div>傳真：02-2345-6788</div>
      <div>Email：service@cornertravel.com.tw</div>
      <div>台北市信義區信義路五段7號</div>
    </div>
    ${
      invoiceSealUrl
        ? `<div class="footer-seal">
      <img src="${invoiceSealUrl}" alt="發票章" />
    </div>`
        : ''
    }
  </div>

  <!-- 列印時間 -->
  <div style="margin-top: 1cm; text-align: right; font-size: 10pt; color: #666">
    列印時間：${new Date().toLocaleString('zh-TW')}
  </div>
</body>
</html>
  `

  const printWindow = window.open('', '_blank', 'width=900,height=700')
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()
    setTimeout(() => {
      printWindow.print()
    }, 500)
  }
}
