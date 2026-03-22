import { ReactNode } from 'react'
import { COMPANY_NAME, COMPANY_NAME_EN } from '@/lib/tenant'

interface QuotePageLayoutProps {
  // 標題區
  tourName: string
  tourCode?: string
  destination?: string
  departureDate?: string
  returnDate?: string
  totalDays?: number
  currentParticipants?: number | null
  
  // 行程表
  itineraryTable: ReactNode
  
  // 備註
  note?: string
  noteTitle?: string  // 預設「我方備註」或「{公司名稱}備註」
  
  // 報價表單
  quoteForm: ReactNode
}

export function QuotePageLayout({
  tourName,
  tourCode,
  destination,
  departureDate,
  returnDate,
  totalDays,
  currentParticipants,
  itineraryTable,
  note,
  noteTitle,
  quoteForm,
}: QuotePageLayoutProps) {
  const finalNoteTitle = noteTitle || `${COMPANY_NAME}備註`
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#faf8f5] to-[#f5f1ea] py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-[#e8e0d4]">
          
          {/* 標頭區（統一格式） */}
          <div className="bg-gradient-to-r from-[#c9a96e] to-[#b89960] px-6 py-4 text-white">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold">{tourName}</h1>
                {tourCode && (
                  <div className="text-sm opacity-90 mt-1">團號：{tourCode}</div>
                )}
              </div>
              <div className="text-right">
                <div className="font-semibold text-lg">{COMPANY_NAME}</div>
                <div className="text-xs opacity-80 mt-1">{COMPANY_NAME_EN}</div>
              </div>
            </div>

            {/* 基本資訊列 */}
            <div className="mt-4 flex items-center gap-6 text-sm opacity-90">
              {destination && <span>目的地：{destination}</span>}
              {departureDate && <span>出發日期：{departureDate}</span>}
              {totalDays && <span>行程天數：{totalDays} 天</span>}
              {currentParticipants && <span>團隊人數：{currentParticipants} 人</span>}
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* 行程表（由 caller 傳入） */}
            {itineraryTable}

            {/* 備註區（統一樣式） */}
            {note && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h3 className="font-semibold text-amber-900 mb-2">{finalNoteTitle}</h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{note}</p>
              </div>
            )}

            {/* 報價表單（由 caller 傳入） */}
            {quoteForm}
          </div>
        </div>

        {/* 頁尾（統一） */}
        <div className="text-center text-xs text-gray-500 mt-4">
          本行程表由{COMPANY_NAME}提供
        </div>
      </div>
    </div>
  )
}
