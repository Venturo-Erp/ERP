import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 自動判斷合約類型
function getContractTemplate(location?: string): string {
  const loc = location?.toLowerCase() || ''

  // 國內旅遊
  if (
    loc.includes('台灣') ||
    loc.includes('taiwan') ||
    loc.includes('澎湖') ||
    loc.includes('金門') ||
    loc.includes('馬祖') ||
    loc.includes('綠島') ||
    loc.includes('蘭嶼')
  ) {
    return 'domestic'
  }

  // 國外旅遊 - 預設團體
  return 'international'
}

// 產生合約編號
function generateContractCode(tourCode: string): string {
  const suffix = nanoid(6).toUpperCase()
  return `${tourCode}-C${suffix}`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      tourId,
      workspaceId,
      memberIds,
      signerType = 'individual',
      signerName,
      signerIdNumber,
      signerPhone,
      signerAddress,
      companyName,
      companyTaxId,
      companyRepresentative,
      companyAddress,
      emergencyContactName,
      emergencyContactRelation,
      emergencyContactPhone,
      contractData,
      createdBy,
    } = body

    if (!tourId || !workspaceId || !memberIds?.length) {
      return NextResponse.json(
        { error: '缺少必要參數：tourId, workspaceId, memberIds' },
        { status: 400 }
      )
    }

    // 取得團資訊
    const { data: tour, error: tourError } = await supabase
      .from('tours')
      .select('code, location')
      .eq('id', tourId)
      .single()

    if (tourError || !tour) {
      return NextResponse.json(
        { error: '找不到旅遊團' },
        { status: 404 }
      )
    }

    // 產生合約
    const contractCode = generateContractCode(tour.code)
    const template = getContractTemplate(tour.location)

    const { data: contract, error: createError } = await supabase
      .from('contracts')
      .insert({
        workspace_id: workspaceId,
        tour_id: tourId,
        code: contractCode,
        template,
        signer_type: signerType,
        signer_name: signerName,
        signer_id_number: signerIdNumber,
        signer_phone: signerPhone,
        signer_address: signerAddress,
        company_name: companyName,
        company_tax_id: companyTaxId,
        company_representative: companyRepresentative,
        company_address: companyAddress,
        emergency_contact_name: emergencyContactName,
        emergency_contact_relation: emergencyContactRelation,
        emergency_contact_phone: emergencyContactPhone,
        member_ids: memberIds,
        contract_data: contractData || {},
        status: 'draft',
        created_by: createdBy,
      })
      .select()
      .single()

    if (createError) {
      console.error('建立合約失敗:', createError)
      return NextResponse.json(
        { error: '建立合約失敗' },
        { status: 500 }
      )
    }

    // 更新團員的 contract_id
    const { error: updateMembersError } = await supabase
      .from('order_members')
      .update({ contract_id: contract.id })
      .in('id', memberIds)

    if (updateMembersError) {
      console.error('更新團員合約關聯失敗:', updateMembersError)
    }

    // 產生簽約連結
    const signUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.cornertravel.com.tw'}/public/contract/sign/${contractCode}`

    return NextResponse.json({
      success: true,
      contract: {
        ...contract,
        signUrl,
      },
    })
  } catch (error) {
    console.error('產生合約 API 錯誤:', error)
    return NextResponse.json(
      { error: '系統錯誤' },
      { status: 500 }
    )
  }
}
