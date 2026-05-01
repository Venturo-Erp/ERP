// Excel-like formula calculator for custom fields

interface FormulaContext {
  [fieldName: string]: number | string
}

// 欄位名稱映射表 - 將中文欄位名映射到實際數據
const FIELD_MAP: Record<string, string> = {
  姓名: 'name',
  英文姓名: 'nameEn',
  年齡: 'age',
  基本費用: 'basePrice',
  加購費用: 'addOnTotal',
  總費用: 'totalPrice',
  訂位代號: 'reservationCode',
  // 可以繼續擴展
}

// 欄位座標映射 - Excel 式座標系統
const FIELD_COORDINATES: Record<string, string> = {
  C1: 'name', // 姓名
  D1: 'nameEn', // 英文姓名
  E1: 'birth_date', // 生日
  F1: 'age', // 年齡
  G1: 'gender', // 性別
  H1: 'idNumber', // 身分證字號
  I1: 'passportNumber', // 護照號碼
  J1: 'passportExpiry', // 護照效期
  K1: 'reservationCode', // 訂位代號
  L1: 'assignedRoom', // 分房
  // 動態欄位會從 M1 開始
}

// 獲取欄位的 Excel 座標（包含自定義欄位）
export function getFieldCoordinate(
  fieldName: string,
  customFields: Array<{ id: string; name: string }> = []
): string | null {
  // 檢查預定義欄位
  for (const [coord, field] of Object.entries(FIELD_COORDINATES)) {
    if (field === fieldName) {
      return coord
    }
  }

  // 檢查自定義欄位（從 M1 開始）
  const customFieldIndex = customFields.findIndex(field => field.id === fieldName)
  if (customFieldIndex !== -1) {
    const column = String.fromCharCode(77 + customFieldIndex) // M, N, O, P...
    return `${column}1`
  }

  return null
}

// 將 Excel 座標轉換為欄位名稱
export function getFieldFromCoordinate(coordinate: string): string | null {
  return FIELD_COORDINATES[coordinate.toUpperCase()] || null
}

// 解析公式並計算結果
export function calculateFormula(formula: string, context: FormulaContext): number | string | null {
  try {
    // 如果不是以 = 開頭，直接返回原值
    if (!formula.startsWith('=')) {
      return formula
    }

    // 移除 = 符號
    let expression = formula.substring(1).trim()

    // 替換 Excel 座標為實際值
    for (const [coordinate, fieldKey] of Object.entries(FIELD_COORDINATES)) {
      const regex = new RegExp(coordinate, 'gi')
      const value = context[fieldKey]

      if (value !== undefined) {
        // 如果是數字，直接替換；如果是字串，加上引號
        const replacementValue = typeof value === 'number' ? value.toString() : `"${value}"`
        expression = expression.replace(regex, replacementValue)
      }
    }

    // 替換中文欄位名稱為實際值
    for (const [display_name, fieldKey] of Object.entries(FIELD_MAP)) {
      const regex = new RegExp(display_name, 'g')
      const value = context[fieldKey]

      if (value !== undefined) {
        // 如果是數字，直接替換；如果是字串，加上引號
        const replacementValue = typeof value === 'number' ? value.toString() : `"${value}"`
        expression = expression.replace(regex, replacementValue)
      }
    }

    // 處理基本數學運算
    // 支援 +、-、*、/ 運算符
    const result = evaluateExpression(expression)

    return result
  } catch (_error) {
    return '#ERROR'
  }
}

/**
 * 安全的數學表達式解析器
 * 使用遞迴下降解析，不使用 eval 或 Function
 */
class SafeMathParser {
  private pos = 0
  private expr = ''

  parse(expression: string): number {
    // 只允許數字、運算符號、小數點、括號
    this.expr = expression.replace(/[^0-9+\-*/().]/g, '')
    this.pos = 0

    if (!this.expr) return 0

    const result = this.parseExpression()
    return isNaN(result) ? 0 : result
  }

  private parseExpression(): number {
    let left = this.parseTerm()

    while (this.pos < this.expr.length) {
      const op = this.expr[this.pos]
      if (op !== '+' && op !== '-') break
      this.pos++
      const right = this.parseTerm()
      left = op === '+' ? left + right : left - right
    }

    return left
  }

  private parseTerm(): number {
    let left = this.parseFactor()

    while (this.pos < this.expr.length) {
      const op = this.expr[this.pos]
      if (op !== '*' && op !== '/') break
      this.pos++
      const right = this.parseFactor()
      left = op === '*' ? left * right : left / right
    }

    return left
  }

  private parseFactor(): number {
    // 處理負號
    if (this.expr[this.pos] === '-') {
      this.pos++
      return -this.parseFactor()
    }

    // 處理括號
    if (this.expr[this.pos] === '(') {
      this.pos++
      const result = this.parseExpression()
      if (this.expr[this.pos] === ')') this.pos++
      return result
    }

    // 解析數字
    let numStr = ''
    while (
      this.pos < this.expr.length &&
      ((this.expr[this.pos] >= '0' && this.expr[this.pos] <= '9') || this.expr[this.pos] === '.')
    ) {
      numStr += this.expr[this.pos]
      this.pos++
    }

    return parseFloat(numStr) || 0
  }
}

const safeMathParser = new SafeMathParser()

// 安全的表達式計算器（不使用 eval 或 Function）
function evaluateExpression(expression: string): number | string {
  // 移除所有空格
  expression = expression.replace(/\s/g, '')

  // 檢查是否包含不安全的字符（只允許數字、運算符、小數點、括號）
  if (!/^[0-9+\-*/().]+$/.test(expression)) {
    throw new Error('Invalid expression')
  }

  try {
    const result = safeMathParser.parse(expression)

    // 檢查結果是否為有效數字
    if (typeof result === 'number' && !isNaN(result)) {
      return Math.round(result * 100) / 100 // 四捨五入到小數點後兩位
    }

    return result
  } catch (_error) {
    throw new Error('Expression evaluation failed')
  }
}

// 團員介面
interface Member {
  name?: string
  nameEn?: string
  birth_date?: string
  age?: number
  gender?: string
  idNumber?: string
  passport_number?: string
  passportExpiry?: string
  reservationCode?: string
  assignedRoom?: string
  basePrice?: number
  addOns?: string[]
  customFields?: Record<string, string | number>
}

// 加購項目介面
interface TourAddOn {
  id: string
  price: number
}

// 獲取團員的計算上下文
export function getMemberContext(
  member: Member,
  tour_add_ons: TourAddOn[] = [],
  tourPrice = 0
): FormulaContext {
  // 計算加購總金額
  const addOnTotal = (member.addOns || []).reduce((sum: number, addOnId: string) => {
    const addOn = tour_add_ons.find((a: TourAddOn) => a.id === addOnId)
    return sum + (addOn?.price || 0)
  }, 0)

  // 基本費用（使用旅遊團價格或自定義基本費用）
  const basePrice = member.basePrice || tourPrice

  return {
    name: member.name || '',
    nameEn: member.nameEn || '',
    birth_date: member.birth_date || '',
    age: member.age || 0,
    gender: member.gender || '',
    idNumber: member.idNumber || '',
    passport_number: member.passport_number || '',
    passportExpiry: member.passportExpiry || '',
    reservationCode: member.reservationCode || '',
    assignedRoom: member.assignedRoom || '',
    basePrice: basePrice,
    addOnTotal: addOnTotal,
    totalPrice: basePrice + addOnTotal,
    // 加入自定義欄位數據，讓其他欄位可以引用
    ...Object.entries(member.customFields || {}).reduce(
      (acc, [fieldId, value]) => {
        // 如果值是數字，轉換為數字類型
        const numValue = Number(value)
        acc[fieldId] = isNaN(numValue) ? value : numValue
        return acc
      },
      {} as Record<string, number | string>
    ),
  }
}

// 預設的公式範例
const FORMULA_EXAMPLES = [
  { name: '總費用', formula: '=基本費用+加購費用', description: '計算基本費用加上加購費用' },
  { name: '折扣後費用', formula: '=總費用*0.9', description: '總費用打9折' },
  {
    name: '成人費用',
    formula: '=年齡>=18?基本費用:基本費用*0.8',
    description: '成人全價，兒童8折',
  },
]
