import { Textarea } from '@/components/ui/textarea'

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
}: UnifiedTraditionalViewProps) {
  const isCancellation = requestType === 'cancellation'

  return (
    <div className="bg-white p-6">
      {/* 標題區 */}
      <div className="flex justify-between items-start mb-6">
        <h2 className={`text-2xl font-bold ${isCancellation ? 'text-red-700' : 'text-gray-800'}`}>
          {isCancellation ? '⚠️ 取消通知單' : '廠商需求單'}
        </h2>
        <div className="text-right text-sm text-gray-600">
          <div className="font-semibold">角落旅行社</div>
          <div className="text-xs">Corner Travel</div>
        </div>
      </div>

      {/* 固定資訊區 */}
      <div className="grid grid-cols-2 gap-6 mb-6 p-4 border-2 border-[#a8a29e] rounded-lg bg-gradient-to-br from-[#faf8f5] to-[#f5f1ea]">
        {/* 左欄 */}
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-[5rem_1fr] gap-2">
            <span className="font-semibold text-[#78716c]">致：</span>
            <input
              type="text"
              value={supplierName || ''}
              readOnly
              className="px-2 py-1 bg-white border border-[#a8a29e] rounded text-gray-800"
            />
          </div>
          <div className="grid grid-cols-[5rem_1fr] gap-2">
            <span className="font-semibold text-[#78716c]">聯絡電話：</span>
            <input
              type="text"
              value={phone || ''}
              readOnly
              className="px-2 py-1 bg-white border border-[#a8a29e] rounded text-gray-600"
            />
          </div>
          <div className="grid grid-cols-[5rem_1fr] gap-2">
            <span className="font-semibold text-[#78716c]">團體名稱：</span>
            <input
              type="text"
              value={tour?.name || ''}
              readOnly
              className="px-2 py-1 bg-white border border-[#a8a29e] rounded text-gray-800"
            />
          </div>
        </div>

        {/* 右欄 */}
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-[5rem_1fr] gap-2">
            <span className="font-semibold text-[#78716c]">業務窗口：</span>
            <input
              type="text"
              value={contact || ''}
              placeholder="業務人員"
              className="px-2 py-1 bg-white border border-[#a8a29e] rounded text-gray-800"
            />
          </div>
          <div className="grid grid-cols-[5rem_1fr] gap-2">
            <span className="font-semibold text-[#78716c]">傳真號碼：</span>
            <input
              type="text"
              value={fax || ''}
              readOnly
              className="px-2 py-1 bg-white border border-[#a8a29e] rounded text-gray-600"
            />
          </div>
          <div className="grid grid-cols-[5rem_1fr] gap-2">
            <span className="font-semibold text-[#78716c]">人數預估：</span>
            <input
              type="text"
              value={totalPax ? `${totalPax} 人` : ''}
              readOnly
              className="px-2 py-1 bg-white border border-[#a8a29e] rounded text-gray-800"
            />
          </div>
        </div>
      </div>

      {/* 根據類型顯示對應表格 */}
      {requestType === 'accommodation' && (
        <AccommodationTable items={items} />
      )}
      {requestType === 'meal' && (
        <MealTable items={items} />
      )}
      {requestType === 'transport' && (
        <TransportTable items={items} />
      )}
      {requestType === 'activity' && (
        <ActivityTable items={items} />
      )}
      {requestType === 'cancellation' && (
        <CancellationTable items={items} />
      )}

      {/* 備註 */}
      <div className="mt-6">
        <label className="block text-sm font-semibold text-[#78716c] mb-2">備註</label>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="其他說明或備註事項..."
          className="min-h-[100px] border-[#a8a29e] focus:border-[#8B6914] bg-white"
        />
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
          <tr className="bg-gradient-to-r from-[#d4c5b9] to-[#c9b8a8] text-gray-800">
            <th className="border border-[#a8a29e] px-3 py-2 text-left">入住日期</th>
            <th className="border border-[#a8a29e] px-3 py-2 text-left">需求房型</th>
            <th className="border border-[#a8a29e] px-3 py-2 text-left">床型安排</th>
            <th className="border border-[#a8a29e] px-3 py-2 text-left">客報價</th>
            <th className="border border-[#a8a29e] px-3 py-2 text-left">NET價</th>
            <th className="border border-[#a8a29e] px-3 py-2 text-left">訂金</th>
            <th className="border border-[#a8a29e] px-3 py-2 text-left w-20">數量</th>
            <th className="border border-[#a8a29e] px-3 py-2 text-left">備註</th>
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

// 餐食表
function MealTable({ items }: { items: any[] }) {
  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-[#78716c] mb-3">餐食表 ▽</h3>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gradient-to-r from-[#d4c5b9] to-[#c9b8a8] text-gray-800">
            <th className="border border-[#a8a29e] px-3 py-2 text-left">用餐日期</th>
            <th className="border border-[#a8a29e] px-3 py-2 text-left">用餐時段</th>
            <th className="border border-[#a8a29e] px-3 py-2 text-left">餐標單價（桌／人）</th>
            <th className="border border-[#a8a29e] px-3 py-2 text-left">訂金</th>
            <th className="border border-[#a8a29e] px-3 py-2 text-left w-20">數量</th>
            <th className="border border-[#a8a29e] px-3 py-2 text-left">備註</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#fafaf8]'}>
              <td className="border border-[#a8a29e] px-3 py-2">{item.date || '—'}</td>
              <td className="border border-[#a8a29e] px-3 py-2">{item.time || '—'}</td>
              <td className="border border-[#a8a29e] px-3 py-2">{item.price || '—'}</td>
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

// 交通表
function TransportTable({ items }: { items: any[] }) {
  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-[#78716c] mb-3">交通表 ▽</h3>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gradient-to-r from-[#d4c5b9] to-[#c9b8a8] text-gray-800">
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

// 活動表
function ActivityTable({ items }: { items: any[] }) {
  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-[#78716c] mb-3">活動表 ▽</h3>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gradient-to-r from-[#d4c5b9] to-[#c9b8a8] text-gray-800">
            <th className="border border-[#a8a29e] px-3 py-2 text-left">活動時間</th>
            <th className="border border-[#a8a29e] px-3 py-2 text-left">場地名稱</th>
            <th className="border border-[#a8a29e] px-3 py-2 text-left">客報價</th>
            <th className="border border-[#a8a29e] px-3 py-2 text-left">NET價</th>
            <th className="border border-[#a8a29e] px-3 py-2 text-left">訂金</th>
            <th className="border border-[#a8a29e] px-3 py-2 text-left w-20">數量</th>
            <th className="border border-[#a8a29e] px-3 py-2 text-left">備註</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#fafaf8]'}>
              <td className="border border-[#a8a29e] px-3 py-2">{item.time || '—'}</td>
              <td className="border border-[#a8a29e] px-3 py-2">{item.venue || '—'}</td>
              <td className="border border-[#a8a29e] px-3 py-2"></td>
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
              <td className="border border-red-300 px-3 py-2 text-gray-600">{item.note || ''}</td>
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
