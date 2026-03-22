/**
 * 交通需求單列印組件
 */

import { UnifiedRequirementPrint } from './UnifiedRequirementPrint'
import { COMPANY_NAME, COMPANY_NAME_EN } from '@/lib/tenant'

interface TransportDay {
  dayNumber: number
  date: string
  route: string
}

interface TransportRequirementPrintProps {
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

export function TransportRequirementPrint({
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
}: TransportRequirementPrintProps) {
  const transportTable = (
    <div>
      <h3 style={{ fontSize: '14pt', fontWeight: 'bold', marginBottom: '0.5cm' }}>
        交通表
      </h3>
      <table>
        <thead>
          <tr>
            <th style={{ width: '3cm' }}>天數</th>
            <th style={{ width: '3cm' }}>日期</th>
            <th>行程內容</th>
            <th style={{ width: '3cm' }}>車資報價</th>
            <th style={{ width: '3cm' }}>備註</th>
          </tr>
        </thead>
        <tbody>
          {transportDays.map((day, idx) => (
            <tr key={idx}>
              <td>Day {day.dayNumber}</td>
              <td>{day.date}</td>
              <td>{day.route}</td>
              <td></td>
              <td></td>
            </tr>
          ))}
          {vehicleType && (
            <tr>
              <td colSpan={5}>
                <strong>車型需求：</strong>{vehicleType}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )

  return (
    <UnifiedRequirementPrint
      supplierName={supplierName}
      companyName={COMPANY_NAME}
      tourCode={tourCode}
      tourName={tourName}
      totalPax={totalPax}
      departureDate={departureDate}
      returnDate={returnDate}
      transportTable={transportTable}
      note={note}
      invoiceSealUrl={invoiceSealUrl}
    />
  )
}

// 輔助函數：從對話框產生列印 HTML
export function generateTransportPrintHTML(props: TransportRequirementPrintProps): string {
  // TODO: 使用 ReactDOMServer.renderToString
  // 或直接在 handlePrint 裡用 window.open + document.write
  return ''
}
