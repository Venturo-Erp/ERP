import { describe, it, expect, vi } from 'vitest'

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(async (password: string) => `hashed_${password}`),
    compare: vi.fn(async (password: string, hash: string) => hash === `hashed_${password}`),
  },
}))

import { hasPermission, hasRole, hashPassword, verifyPassword } from './auth'

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
