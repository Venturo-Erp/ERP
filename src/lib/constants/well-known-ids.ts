/**
 * Well-known ID constants
 *
 * 目的：集中管理 well-known 的 UUID / ID，避免散落 hardcode。
 * 原則：
 * - 環境敏感值（Corner WS ID、LINE Bot ID）走 env var、env 沒設則 throw（不 silent fallback）
 * - 系統固定值（VENTURO 機器人）直接寫死（不會變）
 * - UUID 格式在 startup 驗證（避免 typo）
 *
 * Wave 3 進行中：現有 hardcode 逐步替換到這裡。
 * 參考：docs/PRE_LAUNCH_CLEANUP/discovery/A6_tenant_isolation.md
 */

// ============================================================
// 系統固定 employee ID（workspace-level fixed）
// ============================================================

/**
 * VENTURO 機器人（所有 workspace 共用的系統 bot）
 * DB: employees where employee_number='BOT001'
 */
export const VENTURO_BOT_ID = '00000000-0000-0000-0000-000000000001' as const

// ============================================================
// 租戶相關 ID（env-driven、fail-fast if missing）
// ============================================================

/**
 * Corner Travel workspace ID
 * 僅用於 Corner 相關 legacy code（LINE webhook、會計預設源、保險 workspace_id）
 *
 * Partner 部署時此 env 應為 Partner 自己的 workspace ID，否則資料會 leak 到 Corner
 */
export const CORNER_WORKSPACE_ID: string = (() => {
  const v = process.env.CORNER_WORKSPACE_ID
  if (!v) {
    // 開發/測試環境 fallback（寫死 Corner 實際 ID）
    // Production 環境應強制設定 env、否則 Partner 部署時此常數應為 Partner 自己的 workspace
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'CORNER_WORKSPACE_ID env var is required in production. ' +
          'Set to tenant workspace UUID (not hardcoded Corner ID).'
      )
    }
    return '8ef05a74-1f87-48ab-afd3-9bfeb423935d'
  }
  return v
})()

/**
 * Corner LINE Bot ID (@... 格式)
 * 給 `customers/page.tsx` 顯示客戶綁定 LINE 的 URL 用
 * Partner 應設 `NEXT_PUBLIC_LINE_BOT_ID` 為自己的 bot
 */
export const LINE_BOT_ID: string = (() => {
  const v = process.env.NEXT_PUBLIC_LINE_BOT_ID
  if (!v) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('NEXT_PUBLIC_LINE_BOT_ID env var is required in production.')
    }
    return '@745gftqd'
  }
  return v
})()

// ============================================================
// 助手：UUID 格式驗證
// ============================================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUUID(v: string): boolean {
  return UUID_REGEX.test(v)
}

export function assertUUID(v: string, name = 'value'): void {
  if (!isUUID(v)) {
    throw new Error(`${name} is not a valid UUID: ${v}`)
  }
}

// Startup validation
assertUUID(VENTURO_BOT_ID, 'VENTURO_BOT_ID')
assertUUID(CORNER_WORKSPACE_ID, 'CORNER_WORKSPACE_ID')
