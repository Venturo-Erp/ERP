import { describe, it, expect, vi } from 'vitest'

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(async (password: string) => `hashed_${password}`),
    compare: vi.fn(async (password: string, hash: string) => hash === `hashed_${password}`),
  },
}))

import {
  generateToken,
  verifyToken,
  hasPermission,
  hasRole,
  hashPassword,
  verifyPassword,
  getUserFromToken,
} from './auth'
import type { AuthPayload } from './auth'

const samplePayload: AuthPayload = {
  id: 'user-123',
  employee_number: 'EMP001',
  permissions: ['read', 'write'],
  role: 'admin',
}

describe('generateToken', () => {
  it('generates a non-empty string', () => {
    const token = generateToken(samplePayload)
    expect(token).toBeTruthy()
    expect(typeof token).toBe('string')
  })

  it('generates valid base64', () => {
    const token = generateToken(samplePayload)
    const decoded = JSON.parse(atob(token))
    expect(decoded.id).toBe('user-123')
  })

  it('includes issuer', () => {
    const token = generateToken(samplePayload)
    const decoded = JSON.parse(atob(token))
    expect(decoded.iss).toBe('venturo-app')
  })

  it('sets 14d expiration by default', () => {
    const before = Date.now()
    const token = generateToken(samplePayload, false)
    const decoded = JSON.parse(atob(token))
    const fourteenDays = 14 * 24 * 60 * 60 * 1000
    expect(decoded.exp).toBeGreaterThanOrEqual(before + fourteenDays - 100)
    expect(decoded.exp).toBeLessThanOrEqual(before + fourteenDays + 1000)
  })

  it('sets 14d expiration with rememberMe', () => {
    const before = Date.now()
    const token = generateToken(samplePayload, true)
    const decoded = JSON.parse(atob(token))
    const fourteenDays = 14 * 24 * 60 * 60 * 1000
    expect(decoded.exp).toBeGreaterThanOrEqual(before + fourteenDays - 100)
  })

  it('preserves payload fields', () => {
    const token = generateToken(samplePayload)
    const decoded = JSON.parse(atob(token))
    expect(decoded.employee_number).toBe('EMP001')
    expect(decoded.permissions).toEqual(['read', 'write'])
    expect(decoded.role).toBe('admin')
  })
})

describe('verifyToken', () => {
  it('verifies a valid token', () => {
    const token = generateToken(samplePayload)
    const result = verifyToken(token)
    expect(result).not.toBeNull()
    expect(result!.id).toBe('user-123')
  })

  it('returns null for expired token', () => {
    const expiredToken = btoa(
      JSON.stringify({
        ...samplePayload,
        exp: Date.now() - 1000,
        iss: 'venturo-app',
      })
    )
    expect(verifyToken(expiredToken)).toBeNull()
  })

  it('returns null for wrong issuer', () => {
    const badToken = btoa(
      JSON.stringify({
        ...samplePayload,
        exp: Date.now() + 100000,
        iss: 'wrong-app',
      })
    )
    expect(verifyToken(badToken)).toBeNull()
  })

  it('returns null for invalid base64', () => {
    expect(verifyToken('not-valid-base64!!!')).toBeNull()
  })

  it('returns null for non-JSON content', () => {
    expect(verifyToken(btoa('not json'))).toBeNull()
  })
})

describe('getUserFromToken', () => {
  it('returns payload from valid token', () => {
    const token = generateToken(samplePayload)
    const user = getUserFromToken(token)
    expect(user).not.toBeNull()
    expect(user!.id).toBe('user-123')
  })

  it('returns null for invalid token', () => {
    expect(getUserFromToken('bad')).toBeNull()
  })
})

describe('hasPermission', () => {
  it('returns true when user has the permission', () => {
    expect(hasPermission(['read', 'write'], 'read')).toBe(true)
  })

  it('returns false when user lacks the permission', () => {
    expect(hasPermission(['read'], 'write')).toBe(false)
  })

  it('returns true for admin regardless', () => {
    expect(hasPermission(['admin'], 'anything')).toBe(true)
  })

  it('returns false for empty permissions', () => {
    expect(hasPermission([], 'read')).toBe(false)
  })
})

describe('hasRole', () => {
  it('returns true when user has required role', () => {
    expect(hasRole(['admin', 'editor'], ['admin'])).toBe(true)
  })

  it('returns false when user lacks required role', () => {
    expect(hasRole(['viewer'], ['admin', 'editor'])).toBe(false)
  })

  it('returns true when any required role matches', () => {
    expect(hasRole(['editor'], ['admin', 'editor'])).toBe(true)
  })

  it('returns false for empty user permissions', () => {
    expect(hasRole([], ['admin'])).toBe(false)
  })

  it('returns false for empty required roles', () => {
    expect(hasRole(['admin'], [])).toBe(false)
  })
})

describe('hashPassword', () => {
  it('returns hashed password', async () => {
    const hash = await hashPassword('password123')
    expect(hash).toBe('hashed_password123')
  })
})

describe('verifyPassword', () => {
  it('returns true for matching password', async () => {
    const result = await verifyPassword('password123', 'hashed_password123')
    expect(result).toBe(true)
  })

  it('returns false for wrong password', async () => {
    const result = await verifyPassword('wrong', 'hashed_password123')
    expect(result).toBe(false)
  })
})
