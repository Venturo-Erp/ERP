import { describe, it, expect } from 'vitest'
import {
  TOUR_STATUS_LIST,
  TOUR_STATUS,
  isTourLocked,
  canConfirmTour,
  ORDER_STATUS_MAP,
  ORDER_STATUS_REVERSE_MAP,
  PAYMENT_STATUS_MAP,
  PAYMENT_STATUS_REVERSE_MAP,
  QUOTE_STATUS_MAP,
  FINANCE_TYPE_MAP,
  CONTRACT_STATUS_MAP,
  PAYMENT_METHOD_MAP,
  VISA_STATUS_MAP,
  getTourStatusLabel,
  getOrderStatusLabel,
  getPaymentStatusLabel,
  getQuoteStatusLabel,
  getFinanceTypeLabel,
  getContractStatusLabel,
  getPaymentMethodLabel,
  getVisaStatusLabel,
} from './status-maps'

describe('TOUR_STATUS constants', () => {
  it('has 6 statuses', () => {
    expect(TOUR_STATUS_LIST).toHaveLength(6)
  })
  it('contains expected values', () => {
    expect(TOUR_STATUS.TEMPLATE).toBe('template')
    expect(TOUR_STATUS.PROPOSAL).toBe('proposal')
    expect(TOUR_STATUS.UPCOMING).toBe('upcoming')
    expect(TOUR_STATUS.ONGOING).toBe('ongoing')
    expect(TOUR_STATUS.RETURNED).toBe('returned')
    expect(TOUR_STATUS.CLOSED).toBe('closed')
  })
})

describe('isTourLocked', () => {
  it('returns true for ongoing', () => {
    expect(isTourLocked('ongoing')).toBe(true)
  })
  it('returns true for returned', () => {
    expect(isTourLocked('returned')).toBe(true)
  })
  it('returns true for closed', () => {
    expect(isTourLocked('closed')).toBe(true)
  })
  it('returns false for upcoming', () => {
    expect(isTourLocked('upcoming')).toBe(false)
  })
  it('returns false for proposal', () => {
    expect(isTourLocked('proposal')).toBe(false)
  })
  it('returns false for null', () => {
    expect(isTourLocked(null)).toBe(false)
  })
})

describe('canConfirmTour', () => {
  it('returns true for proposal', () => {
    expect(canConfirmTour('proposal')).toBe(true)
  })
  it('returns false for upcoming', () => {
    expect(canConfirmTour('upcoming')).toBe(false)
  })
  it('returns false for null', () => {
    expect(canConfirmTour(null)).toBe(false)
  })
})

describe('getTourStatusLabel', () => {
  it('maps English status to Chinese label', () => {
    expect(getTourStatusLabel('proposal')).toBe('提案')
    expect(getTourStatusLabel('upcoming')).toBe('待出發')
    expect(getTourStatusLabel('ongoing')).toBe('進行中')
    expect(getTourStatusLabel('returned')).toBe('未結團')
    expect(getTourStatusLabel('closed')).toBe('已結團')
    expect(getTourStatusLabel('template')).toBe('模板')
  })
  it('fallbacks to raw value for unknown', () => {
    expect(getTourStatusLabel('待出發')).toBe('待出發')
    expect(getTourStatusLabel(null)).toBe('')
  })
})

describe('getOrderStatusLabel', () => {
  it('maps known statuses', () => {
    expect(getOrderStatusLabel('pending')).toBe('待確認')
    expect(getOrderStatusLabel('confirmed')).toBe('已確認')
    expect(getOrderStatusLabel('completed')).toBe('已完成')
    expect(getOrderStatusLabel('cancelled')).toBe('已取消')
  })
  it('returns raw for unknown', () => {
    expect(getOrderStatusLabel('unknown')).toBe('unknown')
  })
})

describe('getPaymentStatusLabel', () => {
  it('maps known statuses', () => {
    expect(getPaymentStatusLabel('unpaid')).toBe('未收款')
    expect(getPaymentStatusLabel('partial')).toBe('部分收款')
    expect(getPaymentStatusLabel('paid')).toBe('已收款')
    expect(getPaymentStatusLabel('refunded')).toBe('已退款')
  })
  it('returns raw for unknown', () => {
    expect(getPaymentStatusLabel('xyz')).toBe('xyz')
  })
})

describe('getQuoteStatusLabel', () => {
  it('maps known statuses', () => {
    expect(getQuoteStatusLabel('draft')).toBe('草稿')
    expect(getQuoteStatusLabel('proposed')).toBe('開團')
    expect(getQuoteStatusLabel('approved')).toBe('已核准')
  })
  it('returns raw for unknown', () => {
    expect(getQuoteStatusLabel('nope')).toBe('nope')
  })
})

describe('getFinanceTypeLabel', () => {
  it('maps types', () => {
    expect(getFinanceTypeLabel('receipt')).toBe('收款')
    expect(getFinanceTypeLabel('request')).toBe('請款')
    expect(getFinanceTypeLabel('disbursement')).toBe('出納')
  })
  it('returns raw for unknown', () => {
    expect(getFinanceTypeLabel('other')).toBe('other')
  })
})

describe('getContractStatusLabel', () => {
  it('maps statuses', () => {
    expect(getContractStatusLabel('unsigned')).toBe('未簽署')
    expect(getContractStatusLabel('signed')).toBe('已簽署')
  })
  it('returns raw for unknown', () => {
    expect(getContractStatusLabel('x')).toBe('x')
  })
})

describe('getPaymentMethodLabel', () => {
  it('maps methods', () => {
    expect(getPaymentMethodLabel('cash')).toBe('現金')
    expect(getPaymentMethodLabel('transfer')).toBe('匯款')
    expect(getPaymentMethodLabel('card')).toBe('刷卡')
    expect(getPaymentMethodLabel('check')).toBe('支票')
  })
  it('returns raw for unknown', () => {
    expect(getPaymentMethodLabel('crypto')).toBe('crypto')
  })
})

describe('getVisaStatusLabel', () => {
  it('maps statuses', () => {
    expect(getVisaStatusLabel('pending')).toBe('待送件')
    expect(getVisaStatusLabel('submitted')).toBe('已送件')
    expect(getVisaStatusLabel('collected')).toBe('已取件')
    expect(getVisaStatusLabel('rejected')).toBe('退件')
    expect(getVisaStatusLabel('returned')).toBe('已歸還')
  })
  it('returns raw for unknown', () => {
    expect(getVisaStatusLabel('lost')).toBe('lost')
  })
})

describe('reverse maps', () => {
  it('ORDER_STATUS_REVERSE_MAP is inverse', () => {
    expect(ORDER_STATUS_REVERSE_MAP['待確認']).toBe('pending')
    expect(ORDER_STATUS_REVERSE_MAP['已確認']).toBe('confirmed')
  })
  it('PAYMENT_STATUS_REVERSE_MAP is inverse', () => {
    expect(PAYMENT_STATUS_REVERSE_MAP['未收款']).toBe('unpaid')
    expect(PAYMENT_STATUS_REVERSE_MAP['已收款']).toBe('paid')
  })
})

describe('status map completeness', () => {
  it('ORDER_STATUS_MAP has 4 entries', () => {
    expect(Object.keys(ORDER_STATUS_MAP)).toHaveLength(4)
  })
  it('PAYMENT_STATUS_MAP has 4 entries', () => {
    expect(Object.keys(PAYMENT_STATUS_MAP)).toHaveLength(4)
  })
  it('VISA_STATUS_MAP has 5 entries', () => {
    expect(Object.keys(VISA_STATUS_MAP)).toHaveLength(5)
  })
  it('PAYMENT_METHOD_MAP has 4 entries', () => {
    expect(Object.keys(PAYMENT_METHOD_MAP)).toHaveLength(4)
  })
  it('CONTRACT_STATUS_MAP has 2 entries', () => {
    expect(Object.keys(CONTRACT_STATUS_MAP)).toHaveLength(2)
  })
  it('FINANCE_TYPE_MAP has 3 entries', () => {
    expect(Object.keys(FINANCE_TYPE_MAP)).toHaveLength(3)
  })
  it('QUOTE_STATUS_MAP has 7 entries', () => {
    expect(Object.keys(QUOTE_STATUS_MAP)).toHaveLength(7)
  })
})
