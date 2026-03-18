/**
 * 統一需求單列印組件（參考 Excel 廠商需求單）
 * 用於列印和傳真
 */

interface UnifiedRequirementPrintProps {
  // 基本資訊
  supplierName: string
  supplierContact?: string
  supplierPhone?: string
  supplierFax?: string
  
  // 我方資訊
  companyName: string
  tourCode: string
  tourName: string
  totalPax: number
  departureDate?: string
  returnDate?: string
  
  // 表格內容（根據類型顯示）
  transportTable?: React.ReactNode
  accommodationTable?: React.ReactNode
  mealTable?: React.ReactNode
  activityTable?: React.ReactNode
  
  // 備註
  note?: string
  
  // 發票章
  invoiceSealUrl?: string
  
  // 我方聯絡資訊
  ourPhone?: string
  ourFax?: string
  ourEmail?: string
  ourAddress?: string
}

export function UnifiedRequirementPrint({
  supplierName,
  supplierContact,
  supplierPhone,
  supplierFax,
  companyName,
  tourCode,
  tourName,
  totalPax,
  departureDate,
  returnDate,
  transportTable,
  accommodationTable,
  mealTable,
  activityTable,
  note,
  invoiceSealUrl,
  ourPhone = '02-2345-6789',
  ourFax = '02-2345-6788',
  ourEmail = 'service@cornertravel.com.tw',
  ourAddress = '台北市信義區信義路五段7號',
}: UnifiedRequirementPrintProps) {
  return (
    <div className="print-page">
      <style jsx>{`
        @media print {
          @page {
            size: A4;
            margin: 1.5cm;
          }
          body {
            margin: 0;
          }
          .print-page {
            max-width: none;
            padding: 0;
          }
        }
        .print-page {
          max-width: 21cm;
          margin: 0 auto;
          padding: 2cm;
          background: white;
          font-family: 'Microsoft JhengHei', 'PingFang TC', sans-serif;
          font-size: 12pt;
          line-height: 1.6;
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
      `}</style>

      {/* 標題 */}
      <div className="header">
        <h1>廠商需求單</h1>
        <div style={{ fontSize: '14pt' }}>
          致：<strong>{supplierName}</strong>
        </div>
      </div>

      {/* 基本資訊（雙欄） */}
      <div className="info-grid">
        {/* 左欄：我方資訊 */}
        <div className="info-section">
          <h3>我方資訊</h3>
          <div className="info-row">
            <span className="info-label">公司：</span>
            <span>{companyName}</span>
          </div>
          <div className="info-row">
            <span className="info-label">團號：</span>
            <span>{tourCode}</span>
          </div>
          <div className="info-row">
            <span className="info-label">團體名稱：</span>
            <span>{tourName}</span>
          </div>
          <div className="info-row">
            <span className="info-label">總人數：</span>
            <span>{totalPax} 人</span>
          </div>
          {departureDate && (
            <div className="info-row">
              <span className="info-label">出發日期：</span>
              <span>{departureDate}</span>
            </div>
          )}
          {returnDate && (
            <div className="info-row">
              <span className="info-label">回程日期：</span>
              <span>{returnDate}</span>
            </div>
          )}
        </div>

        {/* 右欄：供應商資訊 */}
        <div className="info-section">
          <h3>供應商資訊</h3>
          {supplierContact && (
            <div className="info-row">
              <span className="info-label">聯絡人：</span>
              <span>{supplierContact}</span>
            </div>
          )}
          {supplierPhone && (
            <div className="info-row">
              <span className="info-label">電話：</span>
              <span>{supplierPhone}</span>
            </div>
          )}
          {supplierFax && (
            <div className="info-row">
              <span className="info-label">傳真：</span>
              <span>{supplierFax}</span>
            </div>
          )}
          <div className="info-row">
            <span className="info-label">業務窗口：</span>
            <span>_____________</span>
          </div>
        </div>
      </div>

      {/* 表格區（根據類型顯示） */}
      {transportTable}
      {accommodationTable}
      {mealTable}
      {activityTable}

      {/* 備註 */}
      {note && (
        <div className="note-section">
          <strong>備註：</strong>
          <div style={{ marginTop: '0.3cm', whiteSpace: 'pre-wrap' }}>{note}</div>
        </div>
      )}

      {/* 頁尾 */}
      <div className="footer">
        <div className="footer-info">
          <div style={{ marginBottom: '0.3cm' }}>
            <strong>敬請確認回傳資訊</strong>
          </div>
          <div>{companyName}</div>
          <div>電話：{ourPhone}</div>
          <div>傳真：{ourFax}</div>
          <div>Email：{ourEmail}</div>
          <div>{ourAddress}</div>
        </div>
        {invoiceSealUrl && (
          <div className="footer-seal">
            <img src={invoiceSealUrl} alt="發票章" />
          </div>
        )}
      </div>

      {/* 列印時間 */}
      <div style={{ marginTop: '1cm', textAlign: 'right', fontSize: '10pt', color: '#666' }}>
        列印時間：{new Date().toLocaleString('zh-TW')}
      </div>
    </div>
  )
}
