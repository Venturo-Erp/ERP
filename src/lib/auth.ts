import bcrypt from 'bcryptjs'

// Token Blacklist key in localStorage
// TODO: Phase 2 — 改為 server-side blacklist（Supabase table 或 Redis）
const TOKEN_BLACKLIST_KEY = 'token-blacklist'

/**
 * Get token blacklist from localStorage
 */
function getTokenBlacklist(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const stored = localStorage.getItem(TOKEN_BLACKLIST_KEY)
    return stored ? new Set(JSON.parse(stored)) : new Set()
  } catch {
    return new Set()
  }
}

/**
 * Add token to blacklist in localStorage
 */
export function addTokenToBlacklist(token: string): void {
  if (typeof window === 'undefined') return
  try {
    const blacklist = getTokenBlacklist()
    blacklist.add(token)
    localStorage.setItem(TOKEN_BLACKLIST_KEY, JSON.stringify([...blacklist]))
  } catch (err) {
    console.warn('Failed to add token to blacklist:', err)
  }
}

/**
 * Check if token is in blacklist
 */
export function isTokenBlacklisted(token: string): boolean {
  return getTokenBlacklist().has(token)
}

/**
 * Clear all tokens from blacklist (for testing/cleanup)
 */
export function clearTokenBlacklist(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TOKEN_BLACKLIST_KEY)
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

// 檢查權限（支援 module:tab 前綴比對）
export function hasPermission(userPermissions: string[], requiredPermission: string): boolean {
  return userPermissions.some(
    p => p === requiredPermission || p.startsWith(`${requiredPermission}:`)
  )
}

// 檢查角色
export function hasRole(userPermissions: string[], requiredRoles: string[]): boolean {
  return requiredRoles.some(role => userPermissions.includes(role))
}
