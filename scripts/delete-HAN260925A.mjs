import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://pfqvdacxowpgfamuvnsn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmcXZkYWN4b3dwZ2ZhbXV2bnNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTEwODMyMCwiZXhwIjoyMDc0Njg0MzIwfQ.kbJbdYHtOWudBGzV3Jv5OWzWQQZT4aBFFgfUczaVdIE'
)

const tourId = 'HAN260925A'

async function deleteTour() {
  console.log('🗑️  開始刪除', tourId)
  
  // 更新 quotes
  await supabase.from('quotes').update({ tour_id: null }).eq('tour_id', tourId)
  
  // 刪除子表
  const tables = [
    'accounting_events', 'brochure_documents', 'channels', 'designer_drafts',
    'emails', 'files', 'folders', 'itinerary_documents', 'itineraries',
    'leader_schedules', 'members', 'office_documents',
    'payment_request_items', 'payment_requests', 'pnrs',
    'receipt_items', 'receipts', 'refunds',
    'tour_addons', 'tour_bonus_settings', 'tour_confirmation_sheets',
    'tour_custom_cost_fields', 'tour_departure_data', 'tour_documents',
    'tour_files', 'tour_itinerary_items', 'tour_meal_settings',
    'tour_member_fields', 'tour_members',
    'tour_rooms', 'tour_rooms_status', 'tour_tables', 'tour_tables_status',
    'tour_vehicles', 'tour_vehicles_status',
    'travel_invoices', 'traveler_conversations', 'usa_esta', 'visas'
  ]
  
  for (const table of tables) {
    await supabase.from(table).delete().eq('tour_id', tourId)
  }
  
  // 刪除訂單
  const { data: orders } = await supabase.from('orders').select('id').eq('tour_id', tourId)
  if (orders?.length > 0) {
    await supabase.from('order_members').delete().in('order_id', orders.map(o => o.id))
  }
  await supabase.from('orders').delete().eq('tour_id', tourId)
  
  // 刪除需求單
  const { data: requests } = await supabase.from('tour_requests').select('id').eq('tour_id', tourId)
  if (requests?.length > 0) {
    const ids = requests.map(r => r.id)
    await supabase.from('tour_request_items').delete().in('request_id', ids)
    await supabase.from('tour_request_member_vouchers').delete().in('request_id', ids)
    await supabase.from('tour_request_messages').delete().in('request_id', ids)
  }
  await supabase.from('tour_requests').delete().eq('tour_id', tourId)
  
  // 刪除 tour
  const { data, error } = await supabase.from('tours').delete().eq('id', tourId).select()
  
  if (error) {
    console.error('❌', error.message)
  } else {
    console.log('✅ 刪除成功:', data)
  }
}

deleteTour()
