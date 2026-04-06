#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://pfqvdacxowpgfamuvnsn.supabase.co'
const SUPABASE_SERVICE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmcXZkYWN4b3dwZ2ZhbXV2bnNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTEwODMyMCwiZXhwIjoyMDc0Njg0MzIwfQ.kbJbdYHtOWudBGzV3Jv5OWzWQQZT4aBFFgfUczaVdIE'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const sampleIds = [
  'bf9b3e8b-ce68-46c6-a65e-8b43799a7e6b', // 新倉山淺間公園
  '964621c4-6b96-44c7-a065-5ff0964d7c1b', // teamLab Borderless
  '67dc83c3-6485-4f86-972c-bdad3a9b999d', // 淺草寺
  'ca39cd3f-b391-4a47-bf27-4f3cc8c241b4', // teamLab Planets
]

async function verifySamples() {
  console.log('📋 驗證更新結果（抽樣檢查）\n')

  for (const id of sampleIds) {
    const { data, error } = await supabase
      .from('attractions')
      .select('name, description, ticket_price, opening_hours')
      .eq('id', id)
      .single()

    if (error) {
      console.error(`❌ 查詢失敗：${id}`)
      continue
    }

    console.log(`\n✨ ${data.name}`)
    console.log(`描述：${data.description.slice(0, 80)}...`)
    console.log(`價格：${data.ticket_price}`)
    console.log(`營業時間：${JSON.stringify(data.opening_hours)}`)
  }
}

verifySamples().catch(console.error)
