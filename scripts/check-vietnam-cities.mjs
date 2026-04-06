import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://pfqvdacxowpgfamuvnsn.supabase.co',
  process.env.SUPABASE_SERVICE_KEY
)

const { data } = await supabase
  .from('cities')
  .select('id, name')
  .eq('country_id', 'vietnam')
  .ilike('name', '%龍%')

console.log(data)
