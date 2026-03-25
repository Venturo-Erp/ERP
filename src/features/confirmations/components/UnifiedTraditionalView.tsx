import { Textarea } from '@/components/ui/textarea'
import { COMPANY_NAME, COMPANY_NAME_EN } from '@/lib/tenant'

interface UnifiedTraditionalViewProps {
  requestType: 'accommodation' | 'meal' | 'transport' | 'activity' | 'cancellation'
  tour: { code: string; name: string; departure_date?: string } | null
  totalPax: number | null
  supplierName: string
  contact?: string
  phone?: string
  fax?: string
  items: any[]
  note: string
  setNote: (note: string) => void
  onItemChange?: (idx: number, field: string, value: any) => void
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

  return (
    <div className="bg-white p-6">
      {/* 標題區 */}
      <div className="flex justify-between items-start mb-6">
        <h2
          className={`text-2xl font-bold ${isCancellation ? 'text-red-700' : 'text-morandi-primary'}`}
        >
          {isCancellation ? '⚠️ 取消通知單' : '廠商需求單'}
        </h2>
        <div className="text-right text-sm text-morandi-secondary">
          <div className="font-semibold">{COMPANY_NAME}</div>
          {COMPANY_NAME_EN && <div className="text-xs">{COMPANY_NAME_EN}</div>}
        </div>
      </div>

      {/* 固定資訊區 */}
      <div className="mb-6 p-4 border-2 border-[#a8a29e] rounded-lg bg-gradient-to-br from-[#faf8f5] to-[#f5f1ea]">
        <div className="grid grid-cols-[80px_1fr_80px_1fr] gap-x-4 gap-y-3 text-sm items-center">
          {/* 第一行 */}
          <span className="font-semibold text-[#78716c]">致：</span>
          <input type="text" value={supplierName || ''} readOnly className="px-2 py-1 bg-gray-100 border border-[#a8a29e] rounded text-morandi-primary" />
          <span className="font-semibold text-[#78716c]">聯絡人：</span>
          <input type="text" value={contact || ''} onChange={e => onInfoChange?.('contact', e.target.value)} placeholder="聯絡人" className="px-2 py-1 bg-white border border-[#a8a29e] rounded text-morandi-primary focus:ring-1 focus:ring-morandi-gold focus:outline-none" />
          
          {/* 第二行 */}
          <span className="font-semibold text-[#78716c]">聯絡電話：</span>
          <input type="text" value={phone || ''} onChange={e => onInfoChange?.('phone', e.target.value)} placeholder="電話" className="px-2 py-1 bg-white border border-[#a8a29e] rounded text-morandi-primary focus:ring-1 focus:ring-morandi-gold focus:outline-none" />
          <span className="font-semibold text-[#78716c]">傳真號碼：</span>
          <input type="text" value={fax || ''} onChange={e => onInfoChange?.('fax', e.target.value)} placeholder="傳真" className="px-2 py-1 bg-white border border-[#a8a29e] rounded text-morandi-primary focus:ring-1 focus:ring-morandi-gold focus:outline-none" />
          
          {/* 第三行 */}
          <span className="font-semibold text-[#78716c]">團體名稱：</span>
          <input type="text" value={tour?.name || ''} readOnly className="px-2 py-1 bg-gray-100 border border-[#a8a29e] rounded text-morandi-primary" />
          <span className="font-semibold text-[#78716c]">人數預估：</span>
          <input type="text" value={totalPax ? `${totalPax} 人` : ''} readOnly className="px-2 py-1 bg-gray-100 border border-[#a8a29e] rounded text-morandi-primary" />
        </div>
      </div>

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

      {/* 下方兩欄：公司資料 + 供應商簽回 */}
      <div className="mt-6 grid grid-cols-2 gap-6 border-t border-[#a8a29e] pt-4">
        {/* 左邊：公司資料 */}
        <div className="text-sm space-y-1">
          <div><span className="font-medium text-[#78716c]">公司名稱：</span>角落旅行社</div>
          <div><span className="font-medium text-[#78716c]">公司電話：</span>02-2345-6789</div>
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

// 住宿表
function AccommodationTable({ items }: { items: any[] }) {
  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-[#78716c] mb-3">住宿表 ▽</h3>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gradient-to-r from-[#d4c5b9] to-[#c9b8a8] text-morandi-primary">
            <th className="border border-[#a8a29e] px-3 py-2 text-left">入住日期</th>
            <th className="border border-[#a8a29e] px-3 py-2 text-left">需求房型</th>
            <th className="border border-[#a8a29e] px-3 py-2 text-left">床型安排</th>
            <th className="border border-[#a8a29e] px-3 py-2 text-left">客報價</th>
            <th className="border border-[#a8a29e] px-3 py-2 text-left">NET價</th>
            <th className="border border-[#a8a29e] px-3 py-2 text-left w-20">數量</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#fafaf8]'}>
              <td className="border border-[#a8a29e] px-3 py-2">{item.checkIn || '—'}</td>
              <td className="border border-[#a8a29e] px-3 py-2">{item.roomType || '—'}</td>
              <td className="border border-[#a8a29e] px-3 py-2">{item.bedType || '—'}</td>
              <td className="border border-[#a8a29e] px-3 py-2"></td>
              <td className="border border-[#a8a29e] px-3 py-2"></td>
              <td className="border border-[#a8a29e] px-3 py-2">{item.quantity || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// 餐食表（可編輯）
function MealTable({ items, onItemChange }: { items: any[]; onItemChange?: (idx: number, field: string, value: any) => void }) {
  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-[#78716c] mb-3">餐食表 ▽</h3>
      <table className="w-full border-collapse text-sm table-fixed">
        <thead>
          <tr className="bg-gradient-to-r from-[#d4c5b9] to-[#c9b8a8] text-morandi-primary">
            <th className="border border-[#a8a29e] px-3 py-2 text-left" style={{width: '100px'}}>用餐日期</th>
            <th className="border border-[#a8a29e] px-3 py-2 text-left" style={{width: '120px'}}>用餐時段</th>
            <th className="border border-[#a8a29e] px-3 py-2 text-left" style={{width: '140px'}}>餐標單價（桌／人）</th>
            <th className="border border-[#a8a29e] px-3 py-2 text-left" style={{width: '80px'}}>訂金</th>
            <th className="border border-[#a8a29e] px-3 py-2 text-left" style={{width: '70px'}}>數量</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#fafaf8]'}>
              <td className="border border-[#a8a29e] px-3 py-2">{item.date || '—'}</td>
              <td className="border border-[#a8a29e] px-1 py-1">
                <input
                  type="text"
                  value={item.time || ''}
                  onChange={e => onItemChange?.(idx, 'time', e.target.value)}
                  placeholder="午餐 12:00"
                  className="w-full px-2 py-1 border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-morandi-gold rounded"
                />
              </td>
              <td className="border border-[#a8a29e] px-1 py-1">
                <input
                  type="text"
                  value={item.price || ''}
                  onChange={e => onItemChange?.(idx, 'price', e.target.value)}
                  placeholder=""
                  className="w-full px-2 py-1 border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-morandi-gold rounded"
                />
              </td>
              <td className="border border-[#a8a29e] px-3 py-2"></td>
              <td className="border border-[#a8a29e] px-1 py-1">
                <input
                  type="number"
                  value={item.quantity || ''}
                  onChange={e => onItemChange?.(idx, 'quantity', parseInt(e.target.value) || 0)}
                  placeholder=""
                  className="w-full px-2 py-1 border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-morandi-gold rounded text-center"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// 交通表
function TransportTable({ items }: { items: any[] }) {
  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-[#78716c] mb-3">交通表 ▽</h3>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gradient-to-r from-[#d4c5b9] to-[#c9b8a8] text-morandi-primary">
            <th className="border border-[#a8a29e] px-3 py-2 text-left w-24">訂車日期</th>
            <th className="border border-[#a8a29e] px-3 py-2 text-left">接駁地點</th>
            <th className="border border-[#a8a29e] px-3 py-2 text-left">車資（未稅）</th>
            <th className="border border-[#a8a29e] px-3 py-2 text-left">訂金</th>
            <th className="border border-[#a8a29e] px-3 py-2 text-left w-20">數量</th>
            <th className="border border-[#a8a29e] px-3 py-2 text-left">備註</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#fafaf8]'}>
              <td className="border border-[#a8a29e] px-3 py-2">{item.date || '—'}</td>
              <td className="border border-[#a8a29e] px-3 py-2">{item.route || '—'}</td>
              <td className="border border-[#a8a29e] px-3 py-2"></td>
              <td className="border border-[#a8a29e] px-3 py-2"></td>
              <td className="border border-[#a8a29e] px-3 py-2">{item.quantity || ''}</td>
              <td className="border border-[#a8a29e] px-3 py-2">{item.note || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// 活動表（可編輯）
function ActivityTable({ items, onItemChange }: { items: any[]; onItemChange?: (idx: number, field: string, value: any) => void }) {
  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-[#78716c] mb-3">活動表 ▽</h3>
      <table className="w-full border-collapse text-sm table-fixed">
        <thead>
          <tr className="bg-gradient-to-r from-[#d4c5b9] to-[#c9b8a8] text-morandi-primary">
            <th className="border border-[#a8a29e] px-3 py-2 text-left" style={{width: '100px'}}>活動時間</th>
            <th className="border border-[#a8a29e] px-3 py-2 text-left">場地名稱</th>
            <th className="border border-[#a8a29e] px-3 py-2 text-left" style={{width: '80px'}}>客報價</th>
            <th className="border border-[#a8a29e] px-3 py-2 text-left" style={{width: '80px'}}>NET價</th>
            <th className="border border-[#a8a29e] px-3 py-2 text-left" style={{width: '80px'}}>訂金</th>
            <th className="border border-[#a8a29e] px-3 py-2 text-left" style={{width: '70px'}}>數量</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#fafaf8]'}>
              <td className="border border-[#a8a29e] px-1 py-1">
                <input
                  type="text"
                  value={item.time || ''}
                  onChange={e => onItemChange?.(idx, 'time', e.target.value)}
                  placeholder="—"
                  className="w-full px-2 py-1 border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-morandi-gold rounded"
                />
              </td>
              <td className="border border-[#a8a29e] px-3 py-2">{item.venue || '—'}</td>
              <td className="border border-[#a8a29e] px-3 py-2"></td>
              <td className="border border-[#a8a29e] px-3 py-2"></td>
              <td className="border border-[#a8a29e] px-3 py-2"></td>
              <td className="border border-[#a8a29e] px-1 py-1">
                <input
                  type="number"
                  value={item.quantity || ''}
                  onChange={e => onItemChange?.(idx, 'quantity', parseInt(e.target.value) || 0)}
                  placeholder=""
                  className="w-full px-2 py-1 border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-morandi-gold rounded text-center"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// 取消單表
function CancellationTable({ items }: { items: any[] }) {
  return (
    <div className="mb-6">
      <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-4">
        <h3 className="text-lg font-semibold text-red-700 mb-2">⚠️ 取消項目</h3>
        <p className="text-sm text-red-600">因行程異動，需取消以下預訂項目：</p>
      </div>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gradient-to-r from-red-200 to-red-300 text-red-900">
            <th className="border border-red-400 px-3 py-2 text-left">項目名稱</th>
            <th className="border border-red-400 px-3 py-2 text-left">日期</th>
            <th className="border border-red-400 px-3 py-2 text-left w-20">數量</th>
            <th className="border border-red-400 px-3 py-2 text-left">原備註</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-red-50'}>
              <td className="border border-red-300 px-3 py-2 font-medium">{item.name || '—'}</td>
              <td className="border border-red-300 px-3 py-2">{item.date || '—'}</td>
              <td className="border border-red-300 px-3 py-2">{item.quantity || '—'}</td>
              <td className="border border-red-300 px-3 py-2 text-morandi-secondary">
                {item.note || ''}
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
