/**
 * 票號驗證器
 */

export interface TicketNumberValidation {
  ticketNumber: string
  passengerName: string | null
  isValid: boolean
  errors: string[]
  warnings: string[]
}

// 航空公司票號前綴對照表
const AIRLINE_TICKET_PREFIX: Record<string, string> = {
  BR: '695',
  CI: '297',
  JX: '241',
  JL: '131',
  NH: '205',
  KE: '180',
  OZ: '988',
  TG: '217',
  SQ: '618',
  CX: '160',
  CA: '999',
  MU: '781',
  CZ: '784',
}

/**
 * 驗證單一票號
 */
function validateTicketNumber(
  ticketNumber: string,
  passengerName: string | null,
  expectedAirlineCode?: string
): TicketNumberValidation {
  const errors: string[] = []
  const warnings: string[] = []

  // 驗證格式
  const cleaned = ticketNumber.replace(/-/g, '')
  if (!/^\d{13}$/.test(cleaned)) {
    errors.push('票號格式錯誤（應為 13 位數字）')
  }

  // 驗證航空公司代碼
  if (expectedAirlineCode) {
    const airlineCode = cleaned.substring(0, 3)
    const expectedPrefix = AIRLINE_TICKET_PREFIX[expectedAirlineCode]

    if (expectedPrefix && airlineCode !== expectedPrefix) {
      warnings.push(
        `票號前綴 ${airlineCode} 與航空公司 ${expectedAirlineCode} 不符（應為 ${expectedPrefix}）`
      )
    }
  }

  return {
    ticketNumber,
    passengerName,
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * 驗證多個票號
 */
export function validateTicketNumbers(
  tickets: Array<{ number: string; passenger: string }>,
  expectedAirlineCode?: string
): TicketNumberValidation[] {
  return tickets.map(ticket =>
    validateTicketNumber(ticket.number, ticket.passenger, expectedAirlineCode)
  )
}
