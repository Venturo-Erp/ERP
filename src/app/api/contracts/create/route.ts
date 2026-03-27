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
      // 附件選項
      includeMemberList = false,
      includeItinerary = false,
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
      .select('id, code, name, location, departure_date, return_date')
      .eq('id', tourId)
      .single()

    if (tourError || !tour) {
      return NextResponse.json(
        { error: '找不到旅遊團' },
        { status: 404 }
      )
    }

    // 取得第一個團員的資訊（作為簽約人）
    const { data: members } = await supabase
      .from('order_members')
      .select('id, chinese_name, id_number')
      .in('id', memberIds)
      .limit(1)

    const firstMember = members?.[0]

    // 產生合約編號和類型
    const contractCode = generateContractCode(tour.code)
    const template = getContractTemplate(tour.location)

    // 組合 contract_data（合約變數）
    const today = new Date()
    const departureDate = tour.departure_date ? new Date(tour.departure_date) : today
    
    // 計算旅客名稱（多人時加「等 N 人」）
    const baseTravelerName = signerName || firstMember?.chinese_name || ''
    const travelerNameWithCount = memberIds.length > 1
      ? `${baseTravelerName} 等 ${memberIds.length} 人`
      : baseTravelerName

    const generatedContractData = {
      // 審閱日期（今天）
      reviewYear: (today.getFullYear() - 1911).toString(),
      reviewMonth: (today.getMonth() + 1).toString(),
      reviewDay: today.getDate().toString(),
      
      // 旅客資訊
      travelerName: travelerNameWithCount,
      travelerIdNumber: signerIdNumber || firstMember?.id_number || '',
      travelerPhone: signerPhone || '',
      travelerAddress: signerAddress || '',
      
      // 緊急聯絡人
      emergencyContactName: emergencyContactName || '',
      emergencyContactRelation: emergencyContactRelation || '',
      emergencyContactPhone: emergencyContactPhone || '',
      
      // 旅遊團資訊
      tourName: tour.name || '',
      tourDestination: tour.location || '',
      tourCode: tour.code || '',
      
      // 集合資訊（出發日期）
      gatherYear: (departureDate.getFullYear() - 1911).toString(),
      gatherMonth: (departureDate.getMonth() + 1).toString(),
      gatherDay: departureDate.getDate().toString(),
      gatherHour: '06',
      gatherMinute: '00',
      gatherLocation: '桃園國際機場第一航廈',
      
      // 費用資訊（需從訂單取得）
      totalAmount: '0',
      depositAmount: '0',
      paymentMethod: '匯款',
      finalPaymentMethod: '匯款',
      
      // 保險
      deathInsurance: '500萬',
      medicalInsurance: '20萬',
      
      // 其他
      minParticipants: '16',
      companyExtension: '',
      
      // 合併傳入的 contractData
      ...contractData,
    }

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
        contract_data: generatedContractData,
        status: 'draft',
        created_by: createdBy,
        // 附件選項
        include_member_list: includeMemberList,
        include_itinerary: includeItinerary,
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
