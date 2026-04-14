import { useState, useEffect, useMemo, useCallback } from 'react'
import { Tour, ContractTemplate } from '@/types/tour.types'
import { Order, Member } from '@/types/order.types'
import { useTours, updateTour, useOrdersSlim, useItineraries, useQuotes } from '@/data'
import { prepareContractData, ContractData } from '@/lib/contract-utils'
import { useTourDisplay } from '@/features/tours/utils/tour-display'
import { alert, alertSuccess, alertError } from '@/lib/ui/alert-dialog'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import type { OrderMember } from '@/features/orders/types/order-member.types'
import { COMP_CONTRACTS_LABELS } from '../constants/labels'

interface UseContractFormProps {
  tour: Tour
  mode: 'create' | 'edit'
  isOpen: boolean
}

// 合約專用的成員類型（擴展標準 OrderMember）
type ContractMember = Pick<
  OrderMember,
  'id' | 'order_id' | 'chinese_name' | 'id_number' | 'passport_name' | 'gender' | 'birth_date'
> & {
  contract_created_at?: string | null
  name?: string // 兼容舊資料
}

export function useContractForm({ tour, mode, isOpen }: UseContractFormProps) {
  const { items: orders, loading: ordersLoading } = useOrdersSlim()
  const { items: itineraries } = useItineraries()
  const { items: quotes } = useQuotes()
  // SSOT：從 country_id / airport_code 解析目的地顯示字串
  const { displayString: tourDestinationDisplay } = useTourDisplay(tour)

  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | ''>('')
  const [contractNotes, setContractNotes] = useState('')
  const [contractCompleted, setContractCompleted] = useState(false)
  const [archivedDate, setArchivedDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [contractData, setContractData] = useState<Partial<ContractData>>({})
  const [selectedOrderId, setSelectedOrderId] = useState<string>('')
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [isCorporateContract, setIsCorporateContract] = useState(false)

  // 直接從 order_members 表載入的成員資料
  const [orderMembers, setOrderMembers] = useState<ContractMember[]>([])
  const [membersLoading, setMembersLoading] = useState(false)

  // 取得這個團的資料
  const tourOrders = orders.filter(o => o.tour_id === tour.id)
  const firstOrder = tourOrders[0]
  const selectedOrder = tourOrders.find(o => o.id === selectedOrderId) || firstOrder
  const tourMembers = orderMembers // 使用從 order_members 載入的資料
  const selectedOrderMembers = selectedOrder
    ? orderMembers.filter(m => m.order_id === selectedOrder.id)
    : []
  const itinerary = itineraries.find(i => i.tour_id === tour.id)

  // 從 order_members 表載入成員資料
  const loadOrderMembers = useCallback(async () => {
    if (tourOrders.length === 0) return

    setMembersLoading(true)
    try {
      const orderIds = tourOrders.map(o => o.id)
      const { data, error } = await supabase
        .from('order_members')
        .select(
          'id, order_id, chinese_name, id_number, passport_name, gender, birth_date, contract_created_at'
        )
        .in('order_id', orderIds)
        .order('created_at', { ascending: true })

      if (error) throw error
      setOrderMembers(data || [])
    } catch (error) {
      logger.error(COMP_CONTRACTS_LABELS.載入訂單成員失敗, error)
    } finally {
      setMembersLoading(false)
    }
  }, [tourOrders.length > 0 ? tourOrders.map(o => o.id).join(',') : ''])

  // 計算尚未建立合約的成員（按訂單分組）
  const membersWithoutContract = useMemo(() => {
    return tourMembers.filter(m => !m.contract_created_at)
  }, [tourMembers])

  // 已建立合約的成員
  const membersWithContract = useMemo(() => {
    return tourMembers.filter(m => !!m.contract_created_at)
  }, [tourMembers])

  // 選中的成員
  const selectedMember = useMemo(() => {
    if (!selectedMemberId) return null
    return tourMembers.find(m => m.id === selectedMemberId) || null
  }, [tourMembers, selectedMemberId])

  // 取得關聯的報價單（用於帶入客戶聯絡資訊）
  const linkedQuote = quotes.find(q => q.tour_id === tour.id)

  // 當選擇成員時，更新合約資料（帶入選中成員的資訊）
  useEffect(() => {
    if (selectedMemberId && selectedMember) {
      setContractData(prev => ({
        ...prev,
        travelerName:
          selectedMember.chinese_name || selectedMember.passport_name || prev.travelerName || '',
        travelerIdNumber: selectedMember.id_number || prev.travelerIdNumber || '',
      }))
    }
  }, [selectedMemberId, selectedMember])

  // 當訂單載入完成後，載入成員資料
  useEffect(() => {
    if (isOpen && tourOrders.length > 0) {
      void loadOrderMembers()
    }
  }, [isOpen, tourOrders.length, loadOrderMembers])

  // 初始化選擇的訂單（預設第一個）
  useEffect(() => {
    if (isOpen && firstOrder) {
      // 對話框開啟時，如果還沒選擇訂單，預設第一個
      if (!selectedOrderId) {
        setSelectedOrderId(firstOrder.id)
      }
    } else if (!isOpen) {
      // 對話框關閉時，重置選擇的訂單
      setSelectedOrderId('')
    }
  }, [isOpen, firstOrder])

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && tour.contract_template) {
        setSelectedTemplate(tour.contract_template as ContractTemplate)
        setContractNotes(tour.contract_notes || '')
        setContractCompleted(tour.contract_completed || false)
        setArchivedDate(tour.contract_archived_date || '')

        // 載入已儲存的合約資料,或從系統自動帶入
        if (tour.contract_content) {
          try {
            const savedData = JSON.parse(tour.contract_content)
            // 如果已儲存的旅客資訊為空，嘗試從報價單補上（欄位名是 customer_name, contact_phone, contact_address）
            if (!savedData.travelerName && linkedQuote?.customer_name) {
              savedData.travelerName = linkedQuote.customer_name
            }
            if (!savedData.travelerAddress && linkedQuote?.contact_address) {
              savedData.travelerAddress = linkedQuote.contact_address
            }
            if (!savedData.travelerPhone && linkedQuote?.contact_phone) {
              savedData.travelerPhone = linkedQuote.contact_phone
            }
            setContractData(savedData)
          } catch {
            // 如果 contract_content 不是 JSON,就重新準備資料
            if (selectedOrder) {
              const firstMember = selectedOrderMembers[0]
              const autoData = prepareContractData(
                tour,
                selectedOrder as Order,
                firstMember as unknown as Member,
                itinerary,
                undefined,
                tourDestinationDisplay
              )
              setContractData(autoData)
            } else if (linkedQuote) {
              // 沒有訂單，從報價單帶入
              setContractData({
                reviewYear: new Date().getFullYear().toString(),
                reviewMonth: (new Date().getMonth() + 1).toString(),
                reviewDay: new Date().getDate().toString(),
                travelerName: linkedQuote.customer_name || '',
                travelerAddress: linkedQuote.contact_address || '',
                travelerIdNumber: '',
                travelerPhone: linkedQuote.contact_phone || '',
                tourName: tour.name || '',
                tourDestination: tourDestinationDisplay,
                tourCode: tour.code || '',
                gatherYear: '',
                gatherMonth: '',
                gatherDay: '',
                gatherHour: '',
                gatherMinute: '',
                gatherLocation: '',
                totalAmount: '',
                depositAmount: '',
                deathInsurance: '2,500,000',
                medicalInsurance: '100,000',
                companyExtension: '',
              })
            }
          }
        } else if (selectedOrder) {
          const firstMember = selectedOrderMembers[0]
          const autoData = prepareContractData(
            tour,
            selectedOrder as Order,
            firstMember as unknown as Member,
            itinerary,
            undefined,
            tourDestinationDisplay
          )
          setContractData(autoData)
        } else if (linkedQuote) {
          // 沒有訂單也沒有已存的合約資料，從報價單帶入
          setContractData({
            reviewYear: new Date().getFullYear().toString(),
            reviewMonth: (new Date().getMonth() + 1).toString(),
            reviewDay: new Date().getDate().toString(),
            travelerName: linkedQuote.customer_name || '',
            travelerAddress: linkedQuote.contact_address || '',
            travelerIdNumber: '',
            travelerPhone: linkedQuote.contact_phone || '',
            tourName: tour.name || '',
            tourDestination: tourDestinationDisplay,
            tourCode: tour.code || '',
            gatherYear: '',
            gatherMonth: '',
            gatherDay: '',
            gatherHour: '',
            gatherMinute: '',
            gatherLocation: '',
            totalAmount: '',
            depositAmount: '',
            deathInsurance: '2,500,000',
            medicalInsurance: '100,000',
            companyExtension: '',
          })
        }
      } else {
        // 建立模式:自動準備資料
        setSelectedTemplate('')
        setContractNotes('')
        setContractCompleted(false)
        setArchivedDate('')

        if (selectedOrder) {
          // 有訂單資料，自動帶入
          const firstMember = selectedOrderMembers[0]
          const autoData = prepareContractData(
            tour,
            selectedOrder as Order,
            firstMember as unknown as Member,
            itinerary,
            undefined,
            tourDestinationDisplay
          )
          setContractData(autoData)
        } else {
          // 沒有訂單資料，但可能有行程表的集合資訊
          // 從行程表計算集合時間
          let gatherYear = ''
          let gatherMonth = ''
          let gatherDay = ''
          let gatherHour = ''
          let gatherMinute = ''
          let gatherLocation = ''

          if (itinerary) {
            // 優先使用行程表的集合資訊
            if (itinerary.meeting_info?.location) {
              gatherLocation = itinerary.meeting_info.location
            }
            if (itinerary.meeting_info?.time) {
              const timeStr = itinerary.meeting_info.time
              if (timeStr.includes('T')) {
                const meetingDate = new Date(timeStr)
                gatherYear = meetingDate.getFullYear().toString()
                gatherMonth = (meetingDate.getMonth() + 1).toString()
                gatherDay = meetingDate.getDate().toString()
                gatherHour = meetingDate.getHours().toString().padStart(2, '0')
                gatherMinute = meetingDate.getMinutes().toString().padStart(2, '0')
              } else if (timeStr.includes(':')) {
                const [hour, minute] = timeStr.split(':')
                gatherHour = hour.padStart(2, '0')
                gatherMinute = minute.padStart(2, '0')
                if (tour.departure_date) {
                  const departureDate = new Date(tour.departure_date)
                  gatherYear = departureDate.getFullYear().toString()
                  gatherMonth = (departureDate.getMonth() + 1).toString()
                  gatherDay = departureDate.getDate().toString()
                }
              }
            } else {
              // 從航班計算集合時間（起飛前3小時）
              const outboundFlight = Array.isArray(itinerary.outbound_flight)
                ? itinerary.outbound_flight[0]
                : itinerary.outbound_flight
              if (outboundFlight?.departureTime) {
                const [hourStr, minuteStr] = outboundFlight.departureTime.split(':')
                let hour = parseInt(hourStr) - 3
                if (hour < 0) hour += 24
                gatherHour = hour.toString().padStart(2, '0')
                gatherMinute = minuteStr.padStart(2, '0')

                if (tour.departure_date) {
                  const departureDate = new Date(tour.departure_date)
                  gatherYear = departureDate.getFullYear().toString()
                  gatherMonth = (departureDate.getMonth() + 1).toString()
                  gatherDay = departureDate.getDate().toString()
                }
              }

              // 根據航空公司判斷航廈
              if (!gatherLocation && outboundFlight?.airline) {
                const airline = outboundFlight.airline.toUpperCase()
                const terminal2Airlines = [
                  COMP_CONTRACTS_LABELS.中華航空,
                  'CI',
                  'CHINA AIRLINES',
                  COMP_CONTRACTS_LABELS.華航,
                  COMP_CONTRACTS_LABELS.長榮航空,
                  'BR',
                  'EVA',
                  COMP_CONTRACTS_LABELS.星宇航空,
                  'JX',
                  'STARLUX',
                  COMP_CONTRACTS_LABELS.台灣虎航,
                  'IT',
                  'TIGERAIR',
                  COMP_CONTRACTS_LABELS.樂桃航空,
                  'MM',
                  'PEACH',
                  COMP_CONTRACTS_LABELS.捷星航空,
                  'GK',
                  'JETSTAR',
                  COMP_CONTRACTS_LABELS.酷航,
                  'TR',
                  'SCOOT',
                  COMP_CONTRACTS_LABELS.亞洲航空,
                  'AK',
                  'D7',
                  'AIRASIA',
                ]
                const isTerminal2 = terminal2Airlines.some(t => airline.includes(t.toUpperCase()))
                gatherLocation = isTerminal2 ? COMP_CONTRACTS_LABELS.桃園國際機場第二航廈 : ''
              }
            }
          } else if (tour.departure_date) {
            // 沒有行程表，只帶入出發日期
            const departureDate = new Date(tour.departure_date)
            gatherYear = departureDate.getFullYear().toString()
            gatherMonth = (departureDate.getMonth() + 1).toString()
            gatherDay = departureDate.getDate().toString()
          }

          setContractData({
            reviewYear: new Date().getFullYear().toString(),
            reviewMonth: (new Date().getMonth() + 1).toString(),
            reviewDay: new Date().getDate().toString(),
            // 優先使用報價單的聯絡資訊（欄位名是 customer_name, contact_phone, contact_address）
            travelerName: linkedQuote?.customer_name || '',
            travelerAddress: linkedQuote?.contact_address || '',
            travelerIdNumber: '',
            travelerPhone: linkedQuote?.contact_phone || '',
            tourName: tour.name || '',
            tourDestination: tourDestinationDisplay,
            tourCode: tour.code || '',
            gatherYear,
            gatherMonth,
            gatherDay,
            gatherHour,
            gatherMinute,
            gatherLocation,
            totalAmount: '',
            depositAmount: '',
            deathInsurance: '2,500,000',
            medicalInsurance: '100,000',
            companyExtension: '',
          })
        }
      }
    }
  }, [isOpen, mode, tour.id, itinerary?.id, linkedQuote?.id])

  const handleFieldChange = (field: keyof ContractData, value: string) => {
    // 數字欄位自動轉半形
    const numberFields = [
      'reviewYear',
      'reviewMonth',
      'reviewDay',
      'gatherYear',
      'gatherMonth',
      'gatherDay',
      'gatherHour',
      'gatherMinute',
      'totalAmount',
      'depositAmount',
    ]

    let processedValue = value
    if (numberFields.includes(field)) {
      // 全形數字轉半形
      processedValue = value.replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    }

    setContractData(prev => ({ ...prev, [field]: processedValue }))
  }

  const handleSave = async (memberIds?: string[]) => {
    // 判斷是否已有合約（用於決定是建立還是更新）
    const hasExistingContract = !!tour.contract_template

    if (!hasExistingContract && !selectedTemplate) {
      void alert(COMP_CONTRACTS_LABELS.請選擇合約範本, 'warning')
      return false
    }

    setSaving(true)
    try {
      // 將合約資料轉成 JSON 儲存
      const contractContentJson = JSON.stringify(contractData)

      if (!hasExistingContract) {
        // 建立新合約
        await updateTour(tour.id, {
          contract_template: selectedTemplate as ContractTemplate,
          contract_content: contractContentJson,
          contract_created_at: new Date().toISOString(),
          contract_notes: contractNotes,
          contract_completed: contractCompleted,
          contract_archived_date: archivedDate || undefined,
        })
      } else {
        // 更新現有合約
        await updateTour(tour.id, {
          contract_content: contractContentJson,
          contract_notes: contractNotes,
          contract_completed: contractCompleted,
          contract_archived_date: archivedDate || undefined,
        })
      }

      // 如果有選擇成員，批量標記成員已建立合約
      const idsToUpdate =
        memberIds && memberIds.length > 0 ? memberIds : selectedMemberId ? [selectedMemberId] : []
      if (idsToUpdate.length > 0 && !isCorporateContract) {
        const { error: memberError } = await supabase
          .from('order_members')
          .update({ contract_created_at: new Date().toISOString() })
          .in('id', idsToUpdate)

        if (memberError) {
          logger.error(COMP_CONTRACTS_LABELS.更新成員合約狀態失敗, memberError)
        }

        // 重新載入成員資料
        void loadOrderMembers()
      }

      void alertSuccess(
        hasExistingContract
          ? COMP_CONTRACTS_LABELS.合約更新成功
          : COMP_CONTRACTS_LABELS.合約建立成功
      )
      return true
    } catch (error) {
      void alertError(COMP_CONTRACTS_LABELS.儲存合約失敗_請稍後再試)
      return false
    } finally {
      setSaving(false)
    }
  }

  const handlePrint = async () => {
    if (!contractData || Object.keys(contractData).length === 0) {
      void alert(COMP_CONTRACTS_LABELS.請先填寫合約資料, 'warning')
      return
    }

    try {
      // 先儲存合約資料
      setSaving(true)
      const contractContentJson = JSON.stringify(contractData)
      await updateTour(tour.id, {
        contract_template: selectedTemplate,
        contract_content: contractContentJson,
        contract_created_at: new Date().toISOString(),
        contract_notes: contractNotes,
        contract_completed: contractCompleted,
        contract_archived_date: archivedDate || '',
      })

      // 讀取合約範本
      const templateMap: Record<string, string> = {
        domestic: 'domestic.html',
        international: 'international.html',
        individual_international: 'individual_international.html',
      }
      const templateFile = templateMap[selectedTemplate as string] || 'international.html'
      const response = await fetch(`/contract-templates/${templateFile}`)
      if (!response.ok) {
        throw new Error(COMP_CONTRACTS_LABELS.無法載入合約範本)
      }

      let template = await response.text()

      // 替換所有變數（加入 XSS 防護）
      Object.entries(contractData).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g')
        // HTML 轉義防止 XSS 攻擊
        const safeValue = String(value || '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;')
        template = template.replace(regex, safeValue)
      })

      // 開啟新視窗並列印
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        void alert(COMP_CONTRACTS_LABELS.請允許彈出視窗以進行列印, 'warning')
        return
      }

      printWindow.document.write(template)
      printWindow.document.close()

      // 等待內容載入後列印
      printWindow.onload = () => {
        printWindow.print()
        // 列印後關閉視窗
        printWindow.onafterprint = () => {
          printWindow.close()
        }
      }
    } catch (error) {
      void alertError(COMP_CONTRACTS_LABELS.列印合約時發生錯誤_請稍後再試)
    } finally {
      setSaving(false)
    }
  }

  return {
    selectedTemplate,
    setSelectedTemplate,
    contractNotes,
    setContractNotes,
    contractCompleted,
    setContractCompleted,
    archivedDate,
    setArchivedDate,
    saving,
    contractData,
    handleFieldChange,
    handleSave,
    handlePrint,
    firstOrder,
    tourMembers,
    tourOrders,
    selectedOrderId,
    setSelectedOrderId,
    selectedOrder,
    ordersLoading: ordersLoading || membersLoading, // 合併載入狀態
    // 成員選擇相關
    selectedMemberId,
    setSelectedMemberId,
    selectedMember,
    membersWithoutContract,
    membersWithContract,
    isCorporateContract,
    setIsCorporateContract,
  }
}
