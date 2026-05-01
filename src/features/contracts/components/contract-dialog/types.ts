import { Tour, ContractTemplate } from '@/types/tour.types'

export interface ContractDialogProps {
  isOpen: boolean
  onClose: () => void
  tour: Tour
  mode: 'create' | 'edit'
}

export interface ContractData {
  // 審閱日期
  reviewYear: string
  reviewMonth: string
  reviewDay: string

  // 旅客資訊
  travelerName: string
  travelerAddress: string
  travelerIdNumber: string
  travelerPhone: string

  // 緊急聯絡人資訊
  emergencyContactName: string
  emergencyContactRelation: string
  emergencyContactPhone: string

  // 旅遊團資訊
  tourName: string
  tourDestination: string
  tourCode: string

  // 集合資訊
  gatherYear: string
  gatherMonth: string
  gatherDay: string
  gatherHour: string
  gatherMinute: string
  gatherLocation: string

  // 費用資訊
  totalAmount: string
  depositAmount: string
  paymentMethod: string
  finalPaymentMethod: string

  // 保險金額
  deathInsurance: string
  medicalInsurance: string

  // 旅遊團資訊
  minParticipants: string

  // 乙方資訊
  companyExtension: string
}

interface ContractTemplateOption {
  value: ContractTemplate
  label: string
}
