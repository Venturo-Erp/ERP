import { NextResponse } from 'next/server'

/**
 * POST /api/orders/create-from-booking
 *
 * 2026-05-06 已停用（William 拍板）：
 * - 原設計：從公開行程報名建立訂單
 * - 實際：前端從未實作 `/p/tour/[code]/register` 報名頁、無 caller
 * - 安全洞：之前是公開端點、用 service-role bypass workspace 隔離
 * - 額外問題：INSERT 物件缺 orders.code（required）、永遠跑不起來、是 dead code
 *
 * 未來真要做公開報名、應該重新設計：
 *   - 用公開連結 token（類似 contracts/sign 的 UUID + 過期）
 *   - 或 OTP 驗證
 *   - 表單欄位對齊 orders 表 schema（code / contact_person / total_amount 等）
 *
 * 保留檔案 / 410 Gone response、避免：
 *   - 任何老 client 還在打這個 URL（記得明確錯誤）
 *   - 紅線 #0「不准刪 src/ 既有檔案」
 */
export async function POST() {
  return NextResponse.json(
    {
      error: '此 endpoint 已停用、未來公開報名要重新設計',
      code: 'ENDPOINT_DEPRECATED',
    },
    { status: 410 }
  )
}
