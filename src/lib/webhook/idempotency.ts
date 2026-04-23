/**
 * Webhook Idempotency Helper
 *
 * 包裝 webhook handler、防重複處理。
 *
 * 使用：
 * ```ts
 * export async function POST(req: NextRequest) {
 *   const body = await req.json()
 *   return withWebhookIdempotency('linkpay', body.params.order_no, async () => {
 *     // 真實處理邏輯
 *     return { status: 200, body: { ok: true } }
 *   })
 * }
 * ```
 *
 * 機制：INSERT (source, key) 進 webhook_idempotency_keys。
 *   - 第一次：INSERT 成功、跑 handler、回真實結果
 *   - 重發：INSERT 衝突 (unique violation)、回 200 表示已處理
 *
 * 回 200 是讓外部 (LinkPay/LINE/META) 知道我們已經 ack、停止重發。
 */

import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

export type WebhookSource = 'linkpay' | 'line' | 'meta'

interface HandlerResult {
  status: number
  body: unknown
}

/**
 * 包裝 webhook handler、加冪等保護。
 *
 * @param source 來源標識 ('linkpay' / 'line' / 'meta')
 * @param key 來源 unique ID (e.g. LinkPay order_no、LINE event.id)
 * @param handler 真實處理邏輯、回 { status, body }
 * @returns Response (Next.js Response 物件)
 */
export async function withWebhookIdempotency(
  source: WebhookSource,
  key: string,
  handler: () => Promise<HandlerResult>
): Promise<Response> {
  if (!key) {
    logger.warn(`[Webhook ${source}] empty idempotency key, processing without dedup`)
    const result = await handler()
    return jsonResponse(result.status, result.body)
  }

  const supabase = getSupabaseAdminClient()

  // 嘗試 INSERT key、如果衝突表示已處理過
  const { error: insErr } = await supabase
    .from('webhook_idempotency_keys')
    .insert({ source, idempotency_key: key })

  if (insErr) {
    // unique violation = 已處理過 (PostgREST code 23505)
    if (insErr.code === '23505') {
      logger.log(`[Webhook ${source}] Idempotent replay ignored: ${key}`)
      return jsonResponse(200, { ok: true, replayed: true })
    }
    // 其他錯誤照常拋
    logger.error(`[Webhook ${source}] Failed to insert idempotency key:`, insErr)
    throw insErr
  }

  // 第一次處理、跑 handler
  try {
    const result = await handler()
    return jsonResponse(result.status, result.body)
  } catch (e) {
    // handler 失敗、刪掉 key、讓外部 retry 還能再進來重試
    await supabase
      .from('webhook_idempotency_keys')
      .delete()
      .eq('source', source)
      .eq('idempotency_key', key)
    throw e
  }
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
