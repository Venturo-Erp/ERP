import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { ContractSignPage } from './ContractSignPage'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface PageProps {
  params: Promise<{ code: string }>
}

export default async function Page({ params }: PageProps) {
  const { code } = await params

  // 查詢合約
  const { data: contract, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('code', code)
    .single()

  if (error || !contract) {
    notFound()
  }

  // 查詢團資料
  const { data: tour, error: tourError } = await supabase
    .from('tours')
    .select('id, code, name, location, departure_date, return_date')
    .eq('id', contract.tour_id)
    .single()

  // 查詢公司資料
  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .select('id, name, seal_image_url')
    .eq('id', contract.workspace_id)
    .single()

  // 查詢簽約團員詳細資料
  let members: { id: string; chinese_name: string | null; id_number: string | null; birth_date: string | null }[] = []
  if (contract.member_ids?.length > 0) {
    const { data: memberData } = await supabase
      .from('order_members')
      .select('id, chinese_name, id_number, birth_date')
      .in('id', contract.member_ids)
    members = memberData || []
  }

  // 查詢行程資料（用於嵌入顯示）
  // fallback: 舊合約的 include_itinerary 可能存在 contract_data 裡
  const shouldIncludeItinerary = contract.include_itinerary || contract.contract_data?.includeItinerary
  const shouldIncludeMemberList = contract.include_member_list || contract.contract_data?.includeMemberList

  // 查詢行程資料（跟報價單用同一份 itineraries.daily_itinerary）
  let itineraryData: unknown = null
  let itineraryDepartureDate: string | null = null
  if (shouldIncludeItinerary && contract.tour_id) {
    const { data: itinerary } = await supabase
      .from('itineraries')
      .select('daily_itinerary, departure_date, outbound_flight, return_flight')
      .eq('tour_id', contract.tour_id)
      .limit(1)
      .maybeSingle()
    if (itinerary) {
      itineraryData = itinerary
      itineraryDepartureDate = itinerary.departure_date
    }
  }

  // 組合資料（用 fallback 覆蓋舊合約的附件設定）
  const contractWithRelations = {
    ...contract,
    include_itinerary: !!shouldIncludeItinerary,
    include_member_list: !!shouldIncludeMemberList,
    tours: tour || { id: '', code: '', name: '未知', location: '', departure_date: '', return_date: '' },
    workspaces: workspace || { id: '', name: '未知', seal_image_url: '' },
    members,
    itineraryData,
    itineraryDepartureDate,
  }

  return <ContractSignPage contract={contractWithRelations} />
}
