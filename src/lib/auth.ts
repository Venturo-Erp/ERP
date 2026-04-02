import bcrypt from 'bcryptjs'

export interface AuthPayload {
  id: string
  employee_number: string
  permissions: string[]
  role: string
}

// 生成 token（瀏覽器相容版本，使用 base64 編碼）
// 注意：瀏覽器環境不支援 Node.js crypto，這裡改用簡單的 base64 編碼（jose 用於 middleware）
export function generateToken(payload: AuthPayload, _rememberMe: boolean = false): string {
  // 統一 30 天 — 登入後不應該頻繁要求重新登入
  const expirationMs = 30 * 24 * 60 * 60 * 1000 // 30 天

  // 在瀏覽器環境使用 base64 編碼
  return btoa(
    JSON.stringify({
      ...payload,
      exp: Date.now() + expirationMs,
      iss: 'venturo-app',
    })
  )
}

// 驗證 token（瀏覽器相容版本）
export function verifyToken(token: string): AuthPayload | null {
  try {
    // 使用 base64 解碼
    const decoded = JSON.parse(atob(token))

    // 檢查是否過期
    if (decoded.exp && Date.now() > decoded.exp) {
      return null
    }

    // 檢查 issuer
    if (decoded.iss !== 'venturo-app') {
      return null
    }

    return decoded as AuthPayload
  } catch {
    return null
  }
}

// 加密密碼
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12
  return bcrypt.hash(password, saltRounds)
}

// 驗證密碼
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

// 從 token 取得用戶資訊
export function getUserFromToken(token: string): AuthPayload | null {
  return verifyToken(token)
}

// 檢查權限（支援 module:tab 前綴比對）
export function hasPermission(userPermissions: string[], requiredPermission: string): boolean {
  return userPermissions.some(p => p === requiredPermission || p.startsWith(`${requiredPermission}:`))
}

// 檢查角色
export function hasRole(userPermissions: string[], requiredRoles: string[]): boolean {
  return requiredRoles.some(role => userPermissions.includes(role))
}
