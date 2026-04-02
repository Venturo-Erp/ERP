import { describe, it, expect } from 'vitest'
import {
  NEW_A5_WIDTH,
  NEW_A5_HEIGHT,
  needsScaling,
  calculateScaleFactor,
  scaleFabricData,
} from './scaling'

describe('needsScaling', () => {
  it('returns false for standard A5 dimensions', () => {
    expect(needsScaling(NEW_A5_WIDTH, NEW_A5_HEIGHT)).toBe(false)
  })

  it('returns false within 5% tolerance', () => {
    expect(needsScaling(NEW_A5_WIDTH * 0.96, NEW_A5_HEIGHT * 0.96)).toBe(false)
  })

  it('returns true for significantly different dimensions', () => {
    expect(needsScaling(1000, 1500)).toBe(true)
  })

  it('returns true when only width differs', () => {
    expect(needsScaling(500, NEW_A5_HEIGHT)).toBe(true)
  })
})

describe('calculateScaleFactor', () => {
  it('returns 1 for standard width', () => {
    expect(calculateScaleFactor(NEW_A5_WIDTH)).toBe(1)
  })

  it('returns 2 for half width', () => {
    expect(calculateScaleFactor(NEW_A5_WIDTH / 2)).toBe(2)
  })

  it('returns correct factor', () => {
    expect(calculateScaleFactor(1000)).toBeCloseTo(NEW_A5_WIDTH / 1000)
  })
})

describe('scaleFabricData', () => {
  it('scales object positions and sizes', () => {
    const data = {
      objects: [{ left: 100, top: 200, width: 50, height: 60, scaleX: 1, scaleY: 1 }],
    }
    const result = scaleFabricData(data, 2) as unknown as { objects: Record<string, unknown>[] }
    expect(result.objects[0].left).toBe(200)
    expect(result.objects[0].top).toBe(400)
    expect(result.objects[0].width).toBe(100)
    expect(result.objects[0].scaleX).toBe(2)
  })

  it('scales fontSize and strokeWidth', () => {
    const data = { objects: [{ fontSize: 12, strokeWidth: 2 }] }
    const result = scaleFabricData(data, 3) as unknown as { objects: Record<string, unknown>[] }
    expect(result.objects[0].fontSize).toBe(36)
    expect(result.objects[0].strokeWidth).toBe(6)
  })

  it('scales line endpoints', () => {
    const data = { objects: [{ x1: 10, y1: 20, x2: 30, y2: 40 }] }
    const result = scaleFabricData(data, 2) as unknown as { objects: Record<string, unknown>[] }
    expect(result.objects[0].x1).toBe(20)
    expect(result.objects[0].y2).toBe(80)
  })

  it('scales rounded corners', () => {
    const data = { objects: [{ rx: 5, ry: 10 }] }
    const result = scaleFabricData(data, 2) as unknown as { objects: Record<string, unknown>[] }
    expect(result.objects[0].rx).toBe(10)
    expect(result.objects[0].ry).toBe(20)
  })

  it('returns input for non-object data', () => {
    expect(scaleFabricData(null as never, 2)).toBeNull()
  })

  it('handles empty objects array', () => {
    const result = scaleFabricData({ objects: [] }, 2) as unknown as { objects: Record<string, unknown>[] }
    expect(result.objects).toEqual([])
  })

  it('handles data without objects', () => {
    const data = { version: '1.0' }
    const result = scaleFabricData(data, 2)
    expect(result).toEqual({ version: '1.0' })
  })
})
