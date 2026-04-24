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
    .select(
      'id, code, template, signer_type, signer_name, company_name, member_ids, contract_data, status, signer_phone, signer_address, signer_id_number, signature_image, signed_at, include_member_list, include_itinerary, tour_id, workspace_id'
    )
    .eq('code', code)
    .single()

  if (error || !contract) {
    notFound()
  }

  // 查詢團資料 + 公司資料（並行）
  const [{ data: tour }, { data: workspace }] = await Promise.all([
    supabase
      .from('tours')
      .select('id, code, name, location, departure_date, return_date')
      .eq('id', contract.tour_id)
      .single(),
    supabase.from('workspaces').select('id, name').eq('id', contract.workspace_id).single(),
  ])

  // fallback: 舊合約的 include_itinerary 可能存在 contract_data 裡
  const shouldIncludeItinerary =
    contract.include_itinerary || contract.contract_data?.includeItinerary
  const shouldIncludeMemberList =
    contract.include_member_list || contract.contract_data?.includeMemberList

  // 查詢團員 + 行程資料（並行）
  const [membersResult, itineraryResult] = await Promise.all([
    contract.member_ids?.length > 0
      ? supabase
          .from('order_members')
          .select('id, chinese_name, id_number, birth_date')
          .in('id', contract.member_ids)
      : Promise.resolve({ data: null }),
    shouldIncludeItinerary && contract.tour_id
      ? supabase
          .from('itineraries')
          .select('daily_itinerary, departure_date, outbound_flight, return_flight')
          .eq('tour_id', contract.tour_id)
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const members = membersResult.data || []
  let itineraryData: {
    daily_itinerary: unknown
    departure_date: string | null
    outbound_flight: unknown
    return_flight: unknown
  } | null = null
  let itineraryDepartureDate: string | null = null
  if (itineraryResult.data) {
    itineraryData = itineraryResult.data
    itineraryDepartureDate = itineraryResult.data.departure_date
  }

  // 組合資料（用 fallback 覆蓋舊合約的附件設定）
  const contractWithRelations = {
    ...contract,
    include_itinerary: !!shouldIncludeItinerary,
    include_member_list: !!shouldIncludeMemberList,
    tours: tour || {
      id: '',
      code: '',
      name: '未知',
      location: '',
      departure_date: '',
      return_date: '',
    },
    workspaces: workspace || { id: '', name: '未知' },
    members,
    itineraryData,
    itineraryDepartureDate,
  }

  return <ContractSignPage contract={contractWithRelations} />
}
