/**
 * Quick Login Token 工具
 * 使用 HMAC-SHA256 簽名防止偽造
 */

// Quick Login Secret - server-only（不使用 NEXT_PUBLIC_ 前綴，防止前端洩漏）
const QUICK_LOGIN_SECRET = process.env.QUICK_LOGIN_SECRET
if (!QUICK_LOGIN_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('QUICK_LOGIN_SECRET environment variable is required in production')
}
const QUICK_LOGIN_SECRET_VALUE = QUICK_LOGIN_SECRET || 'venturo_dev_quick_login_local_only'
const TOKEN_EXPIRY_MS = 8 * 60 * 60 * 1000 // 8 小時

/**
 * 產生 HMAC 簽名（瀏覽器端）
 */
async function generateHmacBrowser(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const messageData = encoder.encode(message)

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', key, messageData)
  const hashArray = Array.from(new Uint8Array(signature))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * 產生 Quick Login Token（用於客戶端）
 * 格式：quick-login-v2-{profileId}-{timestamp}-{signature}
 */
export async function generateQuickLoginToken(profileId: string): Promise<string> {
  const timestamp = Date.now()
  const payload = `${profileId}-${timestamp}`
  const signature = await generateHmacBrowser(payload, QUICK_LOGIN_SECRET_VALUE)

  return `quick-login-v2-${profileId}-${timestamp}-${signature}`
}

/**
 * 驗證 Quick Login Token（用於 middleware - Edge Runtime）
 */
export async function verifyQuickLoginToken(token: string): Promise<boolean> {
  // 支援舊版格式（只在過渡期）
  if (token.startsWith('quick-login-') && !token.startsWith('quick-login-v2-')) {
    // 舊版格式不再接受，強制重新登入
    return false
  }

  // 新版格式：quick-login-v2-{profileId}-{timestamp}-{signature}
  // profileId 是 UUID 格式（包含 4 個 -），所以需要特殊處理
  if (!token.startsWith('quick-login-v2-')) {
    return false
  }

  // 移除前綴 "quick-login-v2-"
  const payload = token.substring('quick-login-v2-'.length)

  // 從後面找 signature（64 字元的 hex）和 timestamp（13 位數字）
  // 格式：{uuid}-{timestamp}-{signature}
  // 範例：35880209-77eb-4827-84e3-c4e2bc013825-1732952000000-abc123...
  const lastDashIndex = payload.lastIndexOf('-')
  if (lastDashIndex === -1) return false

  const providedSignature = payload.substring(lastDashIndex + 1)
  const remainingPayload = payload.substring(0, lastDashIndex)

  const secondLastDashIndex = remainingPayload.lastIndexOf('-')
  if (secondLastDashIndex === -1) return false

  const timestamp = parseInt(remainingPayload.substring(secondLastDashIndex + 1))
  const profileId = remainingPayload.substring(0, secondLastDashIndex)

  // 檢查時間戳有效性
  if (isNaN(timestamp)) {
    return false
  }

  // 檢查是否過期
  if (Date.now() - timestamp > TOKEN_EXPIRY_MS) {
    return false
  }

  // 驗證簽名
  try {
    const payload = `${profileId}-${timestamp}`
    const encoder = new TextEncoder()
    const keyData = encoder.encode(QUICK_LOGIN_SECRET_VALUE)
    const messageData = encoder.encode(payload)

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const signature = await crypto.subtle.sign('HMAC', key, messageData)
    const expectedSignature = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    return expectedSignature === providedSignature
  } catch {
    return false
  }
}
