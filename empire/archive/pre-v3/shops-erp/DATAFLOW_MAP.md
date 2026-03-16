# 資料流向完整地圖

**掃描時間**: 2026-03-14 10:41

## 核心表寫入點

### tour_itinerary_items INSERT

### tour_itinerary_items UPDATE
confirmations/services/requestCoreTableSync.ts:52:    const { error } = await supabase.from('tour_itinerary_items').update(fields).eq('id', item_id)

## 狀態更新函數

### quote_status
tours/hooks/useTourItineraryItems.ts:197:            item.quote_status !== 'none' ||
tours/hooks/useTourItineraryItems.ts:206:              item.quote_status === 'none' &&
quotes/utils/core-table-adapter.ts:176:            quote_status: 'drafted',
quotes/utils/core-table-adapter.ts:204:            quote_status: 'drafted',
quotes/utils/core-table-adapter.ts:225:      if (coreItem.quote_status !== 'none') {
quotes/utils/core-table-adapter.ts:237:            quote_status: 'none',
quotes/hooks/useQuoteState.ts:75:    return coreItems.some(item => item.quote_status === 'none')

### request_status
tours/components/CoreTableRequestDialog.tsx:320:          request_status: 'sent',
confirmations/services/requestCoreTableSync.ts:68: * 發送需求：更新 request_status = 'sent'，記錄時間
confirmations/services/requestCoreTableSync.ts:82:        request_status: 'sent',
confirmations/services/requestCoreTableSync.ts:103:    request_status: 'replied',
confirmations/services/requestCoreTableSync.ts:116:    request_status: 'confirmed',
confirmations/services/requestCoreTableSync.ts:127:    request_status: 'cancelled',

### confirmation_status
tours/hooks/useTourItineraryItems.ts:198:            item.confirmation_status !== 'none' ||
tours/hooks/useTourItineraryItems.ts:207:              item.confirmation_status === 'none' &&
tours/hooks/useTourHealth.ts:147:            hotel => !hotel.confirmation_status || hotel.confirmation_status !== 'confirmed'
quotes/components/QuoteDetailEmbed.tsx:252:        await updateQuote(quote.id, { confirmation_status: status })

### leader_status
tours/hooks/useTourItineraryItems.ts:199:            item.leader_status !== 'none' ||
tours/hooks/useTourItineraryItems.ts:208:              item.leader_status === 'none' &&

## JOIN 查詢

