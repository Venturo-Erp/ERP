import { describe, it, expect } from 'vitest'
import {
  STATUS_CONFIGS,
  getStatusConfig,
  getStatusColor,
  getStatusLabel,
  getStatusIcon,
  getStatusBgColor,
  getStatusBorderColor,
  getStatusOptions,
} from './status-config'

describe('STATUS_CONFIGS', () => {
  it('should have all expected status types', () => {
    const types = [
      'payment',
      'disbursement',
      'todo',
      'invoice',
      'tour',
      'order',
      'visa',
      'esim',
      'voucher',
      'receipt',
      'quote',
      'tour_request',
    ]
    for (const type of types) {
      expect(STATUS_CONFIGS[type as keyof typeof STATUS_CONFIGS]).toBeDefined()
    }
  })

  it('each type should have a default config', () => {
    for (const [, configs] of Object.entries(STATUS_CONFIGS)) {
      expect(configs.default).toBeDefined()
      expect(configs.default.label).toBeTruthy()
    }
  })
})

describe('getStatusConfig', () => {
  it('should return correct config for payment pending', () => {
    const config = getStatusConfig('payment', 'pending')
    expect(config.label).toBe('待確認')
    expect(config.color).toContain('gold')
  })

  it('should return default for unknown status', () => {
    const config = getStatusConfig('payment', 'nonexistent')
    expect(config.label).toBe('未知狀態')
  })

  it('should return payment default for unknown type', () => {
    const config = getStatusConfig('nonexistent' as never, 'pending')
    expect(config).toBeDefined()
  })

  it('should handle tour Chinese status keys', () => {
    const config = getStatusConfig('tour', '待出發')
    expect(config.label).toBe('待出發')
  })

  it('should handle receipt numeric string keys', () => {
    const config = getStatusConfig('receipt', '0')
    expect(config.label).toBe('待確認')
  })

  it('should handle voucher statuses', () => {
    expect(getStatusConfig('voucher', 'draft').label).toBe('草稿')
    expect(getStatusConfig('voucher', 'posted').label).toBe('已過帳')
    expect(getStatusConfig('voucher', 'reversed').label).toBe('已沖銷')
  })
})

describe('getStatusColor', () => {
  it('should return color string', () => {
    const color = getStatusColor('payment', 'confirmed')
    expect(color).toContain('green')
  })
})

describe('getStatusLabel', () => {
  it('should return label', () => {
    expect(getStatusLabel('order', 'completed')).toBe('已完成')
  })

  it('should return default label for unknown', () => {
    expect(getStatusLabel('order', 'xyz')).toBe('未知')
  })
})

describe('getStatusIcon', () => {
  it('should return an icon component', () => {
    const icon = getStatusIcon('payment', 'pending')
    expect(icon).toBeDefined()
  })
})

describe('getStatusBgColor', () => {
  it('should return bg color when defined', () => {
    const bg = getStatusBgColor('payment', 'pending')
    expect(bg).toContain('bg-')
  })
})

describe('getStatusBorderColor', () => {
  it('should return border color for payment statuses', () => {
    expect(getStatusBorderColor('payment', 'pending')).toContain('border-')
  })

  it('should return undefined when not defined', () => {
    expect(getStatusBorderColor('todo', 'pending')).toBeUndefined()
  })
})

describe('getStatusOptions', () => {
  it('should return options excluding default', () => {
    const options = getStatusOptions('payment')
    expect(options.length).toBeGreaterThan(0)
    expect(options.find(o => o.value === 'default')).toBeUndefined()
  })

  it('should have value and label for each option', () => {
    const options = getStatusOptions('order')
    for (const opt of options) {
      expect(opt.value).toBeTruthy()
      expect(opt.label).toBeTruthy()
    }
  })

  it('should return empty array for nonexistent type', () => {
    expect(getStatusOptions('nonexistent' as never)).toEqual([])
  })

  it('should return all invoice statuses', () => {
    const options = getStatusOptions('invoice')
    expect(options.length).toBeGreaterThan(5)
  })

  it('should return quote statuses', () => {
    const options = getStatusOptions('quote')
    expect(options.find(o => o.value === 'draft')).toBeDefined()
    expect(options.find(o => o.value === 'approved')).toBeDefined()
  })
})
