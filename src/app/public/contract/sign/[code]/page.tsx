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
    console.error('查詢合約失敗:', error)
    notFound()
  }

  // 查詢團資料
  const { data: tour } = await supabase
    .from('tours')
    .select('id, code, name, location, departure_date, return_date')
    .eq('id', contract.tour_id)
    .single()

  // 查詢公司資料
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id, name, seal_image_url')
    .eq('id', contract.workspace_id)
    .single()

  // 組合資料
  const contractWithRelations = {
    ...contract,
    tours: tour,
    workspaces: workspace,
  }

  if (!tour) {
    console.error('找不到團資料:', contract.tour_id)
    notFound()
  }

  // 已簽署的合約顯示完成頁面
  if (contractWithRelations.status === 'signed') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">合約已簽署</h1>
          <p className="text-gray-600">
            此合約已於 {new Date(contractWithRelations.signed_at).toLocaleString('zh-TW')} 完成簽署。
          </p>
        </div>
      </div>
    )
  }

  return <ContractSignPage contract={contractWithRelations} />
}
