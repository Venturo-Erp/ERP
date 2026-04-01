import { describe, it, expect } from 'vitest'
import {
  ROLES,
  getRoleConfig,
  hasPermission,
  canManageWorkspace,
  canCrossWorkspace,
  getAllRoles,
  type UserRole,
} from './rbac-config'

describe('ROLES', () => {
  it('has all expected roles', () => {
    const roles: UserRole[] = [
      'admin',
      'admin',
      'tour_leader',
      'sales',
      'accountant',
      'assistant',
      'controller',
      'staff',
    ]
    for (const r of roles) {
      expect(ROLES[r]).toBeDefined()
    }
  })
  it('admin has wildcard permission', () => {
    expect(ROLES.admin.permissions).toContain('*')
  })
  it('staff has minimal permissions', () => {
    expect(ROLES.staff.permissions).toContain('calendar')
    expect(ROLES.staff.permissions).not.toContain('finance')
  })
})

describe('getRoleConfig', () => {
  it('returns config for valid role', () => {
    expect(getRoleConfig('admin')?.label).toBe('管理員')
  })
  it('returns null for null', () => {
    expect(getRoleConfig(null)).toBeNull()
  })
  it('returns null for unknown role', () => {
    expect(getRoleConfig('fake' as UserRole)).toBeNull()
  })
})

describe('hasPermission', () => {
  it('admin has any permission', () => {
    expect(hasPermission('admin', [], 'anything')).toBe(true)
  })
  it('admin has tours permission', () => {
    expect(hasPermission('admin', [], 'tours')).toBe(true)
  })
  it('staff does not have finance', () => {
    expect(hasPermission('staff', [], 'finance')).toBe(false)
  })
  it('extra permissions override role', () => {
    expect(hasPermission('staff', ['finance'], 'finance')).toBe(true)
  })
  it('returns false for null role', () => {
    expect(hasPermission(null, [], 'tours')).toBe(false)
  })
  it('sales has quotes permission', () => {
    expect(hasPermission('sales', [], 'quotes')).toBe(true)
  })
  it('accountant has vouchers', () => {
    expect(hasPermission('accountant', [], 'vouchers')).toBe(true)
  })
})

describe('canManageWorkspace', () => {
  it('admin can manage', () => {
    expect(canManageWorkspace('admin')).toBe(true)
  })
  it('admin can manage', () => {
    expect(canManageWorkspace('admin')).toBe(true)
  })
  it('staff cannot manage', () => {
    expect(canManageWorkspace('staff')).toBe(false)
  })
  it('null returns false', () => {
    expect(canManageWorkspace(null)).toBe(false)
  })
})

describe('canCrossWorkspace', () => {
  it('admin cannot cross (per config)', () => {
    expect(canCrossWorkspace('admin')).toBe(false)
  })
  it('admin cannot cross', () => {
    expect(canCrossWorkspace('admin')).toBe(false)
  })
  it('null returns false', () => {
    expect(canCrossWorkspace(null)).toBe(false)
  })
})

describe('getAllRoles', () => {
  it('returns all roles', () => {
    const roles = getAllRoles()
    expect(roles.length).toBe(8)
  })
  it('each role has required fields', () => {
    for (const role of getAllRoles()) {
      expect(role.id).toBeDefined()
      expect(role.label).toBeDefined()
      expect(role.permissions).toBeDefined()
    }
  })
})
