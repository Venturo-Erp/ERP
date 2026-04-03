import { Textarea } from '@/components/ui/textarea'
import { COMPANY_NAME, COMPANY_NAME_EN } from '@/lib/tenant'
import { useWorkspaceSettings } from '@/hooks/useWorkspaceSettings'

interface UnifiedTraditionalViewProps {
  requestType: 'accommodation' | 'meal' | 'transport' | 'activity' | 'cancellation'
  tour: { code: string; name: string; departure_date?: string } | null
  totalPax: number | null
  supplierName: string
  contact?: string
  phone?: string
  fax?: string
  items: Array<Record<string, unknown>>
  note: string
  setNote: (note: string) => void
  onItemChange?: (idx: number, field: string, value: unknown) => void
  onInfoChange?: (field: 'contact' | 'phone' | 'fax', value: string) => void
}

export function UnifiedTraditionalView({
  requestType,
  tour,
  totalPax,
  supplierName,
  contact,
  phone,
  fax,
  items,
  note,
  setNote,
  onItemChange,
  onInfoChange,
}: UnifiedTraditionalViewProps) {
  const isCancellation = requestType === 'cancellation'
  const ws = useWorkspaceSettings()

  return (
    <div className="bg-white flex flex-col min-h-full">
      {/* 標題區 */}
      <div className="flex justify-between items-start mb-6">
        <h2
          className={`text-2xl font-bold ${isCancellation ? 'text-morandi-red' : 'text-morandi-primary'}`}
        >
          {isCancellation ? '⚠️ 取消通知單' : '廠商需求單'}
        </h2>
        <div className="text-right text-sm text-morandi-secondary">
          <div className="font-semibold">{COMPANY_NAME}</div>
          {COMPANY_NAME_EN && <div className="text-xs">{COMPANY_NAME_EN}</div>}
        </div>
      </div>

      {/* 固定資訊區 - Excel 風格 */}
      <table className="w-full border-collapse text-sm mb-6">
        <tbody>
          <tr>
            <td className="border border-[#999] px-3 py-2 bg-[#f2f2f2] font-semibold w-[90px]">致</td>
            <td className="border border-[#999] px-3 py-2">
              <input type="text" value={supplierName || ''} readOnly className="w-full bg-transparent outline-none" />
            </td>
            <td className="border border-[#999] px-3 py-2 bg-[#f2f2f2] font-semibold w-[90px]">聯絡人</td>
            <td className="border border-[#999] px-3 py-2">
              <input type="text" value={contact || ''} onChange={e => onInfoChange?.('contact', e.target.value)} placeholder="" className="w-full bg-transparent outline-none focus:ring-0" />
            </td>
          </tr>
          <tr>
            <td className="border border-[#999] px-3 py-2 bg-[#f2f2f2] font-semibold">電話</td>
            <td className="border border-[#999] px-3 py-2">
              <input type="text" value={phone || ''} onChange={e => onInfoChange?.('phone', e.target.value)} placeholder="" className="w-full bg-transparent outline-none focus:ring-0" />
            </td>
            <td className="border border-[#999] px-3 py-2 bg-[#f2f2f2] font-semibold">傳真</td>
            <td className="border border-[#999] px-3 py-2">
              <input type="text" value={fax || ''} onChange={e => onInfoChange?.('fax', e.target.value)} placeholder="" className="w-full bg-transparent outline-none focus:ring-0" />
            </td>
          </tr>
          <tr>
            <td className="border border-[#999] px-3 py-2 bg-[#f2f2f2] font-semibold">團名</td>
            <td className="border border-[#999] px-3 py-2">{tour?.name || ''}</td>
            <td className="border border-[#999] px-3 py-2 bg-[#f2f2f2] font-semibold">出發日</td>
            <td className="border border-[#999] px-3 py-2">{tour?.departure_date || ''}</td>
          </tr>
          <tr>
            <td className="border border-[#999] px-3 py-2 bg-[#f2f2f2] font-semibold">人數</td>
            <td className="border border-[#999] px-3 py-2">{totalPax ? `${totalPax} 人` : ''}</td>
            <td className="border border-[#999] px-3 py-2 bg-[#f2f2f2] font-semibold">團號</td>
            <td className="border border-[#999] px-3 py-2">{tour?.code || ''}</td>
          </tr>
        </tbody>
      </table>

      {/* 根據類型顯示對應表格 */}
      {requestType === 'accommodation' && <AccommodationTable items={items} />}
      {requestType === 'meal' && <MealTable items={items} onItemChange={onItemChange} />}
      {requestType === 'transport' && <TransportTable items={items} />}
      {requestType === 'activity' && <ActivityTable items={items} onItemChange={onItemChange} />}
      {requestType === 'cancellation' && <CancellationTable items={items} />}

      {/* 備註 */}
      <div className="mt-6">
        <label className="block text-sm font-semibold text-[#78716c] mb-2">備註</label>
        <Textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="其他說明或備註事項..."
          className="min-h-[80px] border-[#a8a29e] focus:border-[#8B6914] bg-white"
        />
      </div>

      {/* 撐開中間空間（列印時撐到頁尾） */}
      <div className="flex-1"></div>

      {/* 頁尾：公司資料 + 供應商簽回 */}
      <div className="footer-grid mt-6 grid grid-cols-2 gap-6 border-t border-[#a8a29e] pt-4">
        {/* 左邊：公司資料 */}
        <div className="text-sm space-y-1">
          <div><span className="font-medium text-[#78716c]">公司名稱：</span>{ws.name || COMPANY_NAME}</div>
          <div><span className="font-medium text-[#78716c]">公司電話：</span>{ws.phone || ''}</div>
          <div><span className="font-medium text-[#78716c]">業務：</span></div>
          <div><span className="font-medium text-[#78716c]">助理：</span></div>
        </div>
        {/* 右邊：供應商簽回 */}
        <div className="text-sm space-y-1">
          <div><span className="font-medium text-[#78716c]">供應商確認：</span></div>
          <div className="border-b border-[#a8a29e] h-8 mt-2"></div>
          <div className="text-xs text-[#a8a29e] mt-1">簽名 / 日期</div>
        </div>
      </div>
    </div>
  )
}

// 住宿表 - Excel 風格
// 欄位：入住日期 | 需求房型 | 床型安排 | 數量 | 報價（廠商回填）
function AccommodationTable({ items }: { items: Array<Record<string, unknown>> }) {
  return (
    <div className="mb-6">
      <table className="w-full border-collapse text-sm table-fixed">
        <thead>
          <tr className="bg-[#f2f2f2]">
            <th className="border border-[#999] px-3 py-2 text-left font-semibold" style={{width: '110px'}}>入住日期</th>
            <th className="border border-[#999] px-3 py-2 text-left font-semibold">需求房型</th>
            <th className="border border-[#999] px-3 py-2 text-left font-semibold" style={{width: '110px'}}>床型安排</th>
            <th className="border border-[#999] px-3 py-2 text-center font-semibold" style={{width: '70px'}}>數量</th>
            <th className="border border-[#999] px-3 py-2 text-right font-semibold" style={{width: '120px'}}>報價</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx}>
              <td className="border border-[#999] px-3 py-2">{String(item.checkIn || '')}</td>
              <td className="border border-[#999] px-3 py-2">{String(item.roomType || '')}</td>
              <td className="border border-[#999] px-3 py-2">{String(item.bedType || '')}</td>
              <td className="border border-[#999] px-3 py-2 text-center">{String(item.quantity || '')}</td>
              <td className="border border-[#999] px-3 py-2 text-right"></td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr><td colSpan={5} className="border border-[#999] px-3 py-4 text-center text-morandi-muted">無資料</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

// 餐食表 - Excel 風格
// 欄位：用餐日期 | 餐別 | 數量 | 報價（廠商回填）
function MealTable({ items, onItemChange }: { items: Array<Record<string, unknown>>; onItemChange?: (idx: number, field: string, value: unknown) => void }) {
  return (
    <div className="mb-6">
      <table className="w-full border-collapse text-sm table-fixed">
        <thead>
          <tr className="bg-[#f2f2f2]">
            <th className="border border-[#999] px-3 py-2 text-left font-semibold" style={{width: '110px'}}>用餐日期</th>
            <th className="border border-[#999] px-3 py-2 text-left font-semibold" style={{width: '120px'}}>餐別</th>
            <th className="border border-[#999] px-3 py-2 text-left font-semibold">餐廳 / 說明</th>
            <th className="border border-[#999] px-3 py-2 text-center font-semibold" style={{width: '70px'}}>數量</th>
            <th className="border border-[#999] px-3 py-2 text-right font-semibold" style={{width: '120px'}}>報價</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx}>
              <td className="border border-[#999] px-3 py-2">{String(item.date || '')}</td>
              <td className="border border-[#999] px-1 py-1">
                <input type="text" value={String(item.time || '')} onChange={e => onItemChange?.(idx, 'time', e.target.value)} placeholder="" className="w-full px-2 py-1 bg-transparent outline-none focus:ring-1 focus:ring-morandi-gold rounded" />
              </td>
              <td className="border border-[#999] px-3 py-2">{String(item.venue || item.title || '')}</td>
              <td className="border border-[#999] px-1 py-1">
                <input type="number" value={String(item.quantity || '')} onChange={e => onItemChange?.(idx, 'quantity', parseInt(e.target.value) || 0)} className="w-full px-2 py-1 bg-transparent outline-none focus:ring-1 focus:ring-morandi-gold rounded text-center" />
              </td>
              <td className="border border-[#999] px-3 py-2 text-right"></td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr><td colSpan={5} className="border border-[#999] px-3 py-4 text-center text-morandi-muted">無資料</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

// 交通表 - Excel 風格
// 欄位：日期 | 路線 | 數量 | 報價（廠商回填）| 備註
function TransportTable({ items }: { items: Array<Record<string, unknown>> }) {
  return (
    <div className="mb-6">
      <table className="w-full border-collapse text-sm table-fixed">
        <thead>
          <tr className="bg-[#f2f2f2]">
            <th className="border border-[#999] px-3 py-2 text-left font-semibold" style={{width: '110px'}}>日期</th>
            <th className="border border-[#999] px-3 py-2 text-left font-semibold">接駁路線</th>
            <th className="border border-[#999] px-3 py-2 text-center font-semibold" style={{width: '70px'}}>數量</th>
            <th className="border border-[#999] px-3 py-2 text-right font-semibold" style={{width: '120px'}}>報價</th>
            <th className="border border-[#999] px-3 py-2 text-left font-semibold" style={{width: '150px'}}>備註</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx}>
              <td className="border border-[#999] px-3 py-2">{String(item.date || '')}</td>
              <td className="border border-[#999] px-3 py-2">{String(item.route || '')}</td>
              <td className="border border-[#999] px-3 py-2 text-center">{String(item.quantity || '')}</td>
              <td className="border border-[#999] px-3 py-2 text-right"></td>
              <td className="border border-[#999] px-3 py-2">{String(item.note || '')}</td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr><td colSpan={5} className="border border-[#999] px-3 py-4 text-center text-morandi-muted">無資料</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

// 活動表 - Excel 風格
// 欄位：日期 | 場地名稱 | 數量 | 報價（廠商回填）
function ActivityTable({ items, onItemChange }: { items: Array<Record<string, unknown>>; onItemChange?: (idx: number, field: string, value: unknown) => void }) {
  return (
    <div className="mb-6">
      <table className="w-full border-collapse text-sm table-fixed">
        <thead>
          <tr className="bg-[#f2f2f2]">
            <th className="border border-[#999] px-3 py-2 text-left font-semibold" style={{width: '110px'}}>日期</th>
            <th className="border border-[#999] px-3 py-2 text-left font-semibold">場地名稱</th>
            <th className="border border-[#999] px-3 py-2 text-center font-semibold" style={{width: '70px'}}>數量</th>
            <th className="border border-[#999] px-3 py-2 text-right font-semibold" style={{width: '120px'}}>報價</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx}>
              <td className="border border-[#999] px-3 py-2">{String(item.time || item.date || '')}</td>
              <td className="border border-[#999] px-3 py-2">{String(item.venue || '')}</td>
              <td className="border border-[#999] px-1 py-1">
                <input type="number" value={String(item.quantity || '')} onChange={e => onItemChange?.(idx, 'quantity', parseInt(e.target.value) || 0)} className="w-full px-2 py-1 bg-transparent outline-none focus:ring-1 focus:ring-morandi-gold rounded text-center" />
              </td>
              <td className="border border-[#999] px-3 py-2 text-right"></td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr><td colSpan={4} className="border border-[#999] px-3 py-4 text-center text-morandi-muted">無資料</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

// 取消單表
function CancellationTable({ items }: { items: Array<Record<string, unknown>> }) {
  return (
    <div className="mb-6">
      <div className="bg-morandi-red/10 border-2 border-morandi-red/30 rounded-lg p-4 mb-4">
        <h3 className="text-lg font-semibold text-morandi-red mb-2">⚠️ 取消項目</h3>
        <p className="text-sm text-morandi-red">因行程異動，需取消以下預訂項目：</p>
      </div>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gradient-to-r from-red-200 to-red-300 text-morandi-primary">
            <th className="border border-morandi-red px-3 py-2 text-left">項目名稱</th>
            <th className="border border-morandi-red px-3 py-2 text-left">日期</th>
            <th className="border border-morandi-red px-3 py-2 text-left w-20">數量</th>
            <th className="border border-morandi-red px-3 py-2 text-left">原備註</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-morandi-red/10'}>
              <td className="border border-morandi-red/30 px-3 py-2 font-medium">{String(item.name || '—')}</td>
              <td className="border border-morandi-red/30 px-3 py-2">{String(item.date || '—')}</td>
              <td className="border border-morandi-red/30 px-3 py-2">{String(item.quantity || '—')}</td>
              <td className="border border-morandi-red/30 px-3 py-2 text-morandi-secondary">
                {String(item.note || '')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">
          🙏 造成不便，敬請見諒。如有任何問題，請隨時與我們聯繫。
        </p>
      </div>
    </div>
  )
}
