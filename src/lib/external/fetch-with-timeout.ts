/**
 * fetchWithTimeout — drop-in fetch 替代品、加 timeout + abort 控制
 *
 * 用途：呼叫外部 API (LinkPay / LINE / Gemini / Meta 等) 時、避免外部慢/掛時拖死前端。
 * 預設 8 秒 timeout (馬拉松紅線③ 推薦值)。
 *
 * 使用：
 * ```ts
 * import { fetchWithTimeout } from '@/lib/external/fetch-with-timeout'
 *
 * const res = await fetchWithTimeout('https://api.line.me/...', {
 *   method: 'POST',
 *   headers: { ... },
 *   body: JSON.stringify(...),
 * })
 * // 預設 8s timeout、超過 throw AbortError
 *
 * // 自訂 timeout (慢的 endpoint 例如 AI 圖片生成)
 * await fetchWithTimeout(url, opts, 30000)
 * ```
 *
 * 錯誤處理：
 * - 超時 throw `AbortError` (DOMException)
 * - 網路錯誤跟原生 fetch 一樣 throw
 * - HTTP 4xx/5xx 不會 throw、要 caller 自己看 res.status
 */

const DEFAULT_TIMEOUT_MS = 8000

export async function fetchWithTimeout(
  url: string | URL,
  init: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  // 如果 caller 自己給 signal、honor 之 (combine)
  const callerSignal = init.signal
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  // 把 caller signal 接過來、任一 abort 都會 abort
  if (callerSignal) {
    if (callerSignal.aborted) {
      controller.abort()
    } else {
      callerSignal.addEventListener('abort', () => controller.abort(), { once: true })
    }
  }

  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
}
