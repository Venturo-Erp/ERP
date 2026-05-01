/**
 * Amadeus PNR 增強型解析器
 *
 * 整合所有驗證和分析功能：
 * - 年齡驗證
 * - 艙等增強
 * - 轉機分析
 * - 票號驗證
 */

import { parseAmadeusPNR } from './amadeus'
import { validateAllPassengerAges, validateInfantAdultRatio } from '../validators/age-validator'
import { enhanceAllSegmentsCabinClass } from '../enhancers/cabin-class-enhancer'
import { analyzeAllConnections } from '../analyzers/connection-analyzer'
import { validateTicketNumbers } from '../validators/ticket-validator'
import type { ParsedPNR } from '../types'
import type { PassengerAgeValidation } from '../validators/age-validator'
import type { EnhancedFlightSegment } from '../enhancers/cabin-class-enhancer'
import type { ConnectionInfo } from '../analyzers/connection-analyzer'
import type { TicketNumberValidation } from '../validators/ticket-validator'

interface EnhancedParsedPNR extends ParsedPNR {
  // 年齡驗證
  ageValidations: PassengerAgeValidation[]
  infantRatioCheck: { isValid: boolean; error?: string }

  // 艙等增強
  enhancedSegments: EnhancedFlightSegment[]

  // 轉機分析
  connections: ConnectionInfo[]

  // 票號驗證
  ticketValidations: TicketNumberValidation[]

  // 整體統計
  warnings: {
    age: number
    connection: number
    ticket: number
    total: number
  }
}

/**
 * 增強型 Amadeus PNR 解析
 *
 * @param rawPNR - PNR 電報原始文字
 * @returns 包含基礎解析 + 所有驗證結果的增強型 PNR
 */
function parseAmadeusPNREnhanced(rawPNR: string): EnhancedParsedPNR {
  // 1. 基礎解析
  const basic = parseAmadeusPNR(rawPNR)

  // 2. 年齡驗證
  const ageValidations = validateAllPassengerAges(basic.passengers, basic.segments)
  const infantRatioCheck = validateInfantAdultRatio(basic.passengers)

  // 3. 艙等增強（同步版本，不需要 await）
  const enhancedSegments = enhanceAllSegmentsCabinClass(basic.segments)

  // 4. 轉機分析
  const connections = analyzeAllConnections(basic.segments)

  // 5. 票號驗證（ticketNumbers 已經是正確格式）
  const ticketValidations =
    basic.ticketNumbers && basic.ticketNumbers.length > 0
      ? validateTicketNumbers(basic.ticketNumbers, basic.segments[0]?.airline)
      : []

  // 6. 統計警告數量
  const ageWarnings =
    ageValidations.filter(v => !v.isValid).length + (infantRatioCheck.isValid ? 0 : 1)
  const connectionWarnings = connections.filter(c => !c.isSufficient).length
  const ticketWarnings = ticketValidations.filter(
    tv => !tv.isValid || tv.warnings.length > 0
  ).length

  return {
    ...basic,
    ageValidations,
    infantRatioCheck,
    enhancedSegments,
    connections,
    ticketValidations,
    warnings: {
      age: ageWarnings,
      connection: connectionWarnings,
      ticket: ticketWarnings,
      total: ageWarnings + connectionWarnings + ticketWarnings,
    },
  }
}
