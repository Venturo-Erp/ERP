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
    .select(`
      *,
      tours (
        id,
        code,
        name,
        location,
        departure_date,
        return_date
      ),
      workspaces (
        id,
        name,
        seal_image_url
      )
    `)
    .eq('code', code)
    .single()

  if (error || !contract) {
    notFound()
  }

  // 已簽署的合約顯示完成頁面
  if (contract.status === 'signed') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">合約已簽署</h1>
          <p className="text-gray-600">
            此合約已於 {new Date(contract.signed_at).toLocaleString('zh-TW')} 完成簽署。
          </p>
        </div>
      </div>
    )
  }

  return <ContractSignPage contract={contract} />
}
