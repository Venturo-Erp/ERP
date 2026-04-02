import { describe, it, expect } from 'vitest'
import {
  calculateDistance,
  estimateTravelTime,
  filterNearbyAttractions,
  optimizeAttractionOrder,
  calculateTotalDistance,
} from '../geo-utils'

describe('geo-utils', () => {
  describe('calculateDistance', () => {
    it('returns 0 for same point', () => {
      expect(calculateDistance(25.0, 121.5, 25.0, 121.5)).toBe(0)
    })

    it('calculates distance between Taipei and Kaohsiung (~350km)', () => {
      const dist = calculateDistance(25.033, 121.565, 22.627, 120.301)
      expect(dist).toBeGreaterThan(280)
      expect(dist).toBeLessThan(420)
    })

    it('calculates distance between Tokyo and Osaka (~400km)', () => {
      const dist = calculateDistance(35.6762, 139.6503, 34.6937, 135.5023)
      expect(dist).toBeGreaterThan(350)
      expect(dist).toBeLessThan(500)
    })

    it('is symmetric', () => {
      const d1 = calculateDistance(25.0, 121.5, 35.0, 139.0)
      const d2 = calculateDistance(35.0, 139.0, 25.0, 121.5)
      expect(Math.abs(d1 - d2)).toBeLessThan(0.001)
    })

    it('returns positive value', () => {
      expect(calculateDistance(0, 0, 1, 1)).toBeGreaterThan(0)
    })
  })

  describe('estimateTravelTime', () => {
    it('returns minimum travel time for short distances', () => {
      const time = estimateTravelTime(0.1)
      expect(time).toBeGreaterThan(0)
    })

    it('scales with distance', () => {
      const short = estimateTravelTime(10)
      const long = estimateTravelTime(100)
      expect(long).toBeGreaterThan(short)
    })

    it('returns a reasonable time for 60km', () => {
      const time = estimateTravelTime(60)
      // At ~40-60 km/h avg, should be 60-90 min
      expect(time).toBeGreaterThan(30)
      expect(time).toBeLessThanOrEqual(180)
    })
  })

  describe('filterNearbyAttractions', () => {
    const attractions = [
      { id: '1', name: 'Near', latitude: 25.01, longitude: 121.51 } as never,
      { id: '2', name: 'Far', latitude: 26.0, longitude: 122.0 } as never,
      { id: '3', name: 'NoCoords', latitude: null, longitude: null } as never,
    ]

    it('filters attractions within radius', () => {
      const result = filterNearbyAttractions(25.0, 121.5, attractions, 5)
      expect(result.length).toBe(1)
      expect(result[0].name).toBe('Near')
    })

    it('returns empty for no nearby attractions', () => {
      const result = filterNearbyAttractions(0, 0, attractions, 1)
      expect(result).toHaveLength(0)
    })

    it('sorts by distance', () => {
      const moreAttractions = [
        { id: '1', name: 'Medium', latitude: 25.05, longitude: 121.55 } as never,
        { id: '2', name: 'Close', latitude: 25.01, longitude: 121.51 } as never,
      ]
      const result = filterNearbyAttractions(25.0, 121.5, moreAttractions, 20)
      expect(result[0].name).toBe('Close')
    })

    it('skips attractions without coordinates', () => {
      const result = filterNearbyAttractions(25.0, 121.5, attractions, 1000)
      const names = result.map(a => a.name)
      expect(names).not.toContain('NoCoords')
    })
  })

  describe('optimizeAttractionOrder', () => {
    it('returns empty for empty input', () => {
      expect(optimizeAttractionOrder([])).toEqual([])
    })

    it('returns single item unchanged', () => {
      const input = [{ id: '1', name: 'A', latitude: 25, longitude: 121 } as never]
      expect(optimizeAttractionOrder(input)).toHaveLength(1)
    })

    it('reorders attractions by nearest neighbor', () => {
      const input = [
        { id: '1', name: 'Far', latitude: 26, longitude: 122 } as never,
        { id: '2', name: 'Near', latitude: 25.01, longitude: 121.01 } as never,
        { id: '3', name: 'Mid', latitude: 25.5, longitude: 121.5 } as never,
      ]
      const result = optimizeAttractionOrder(input, 25, 121)
      expect(result[0].name).toBe('Near')
    })
  })

  describe('calculateTotalDistance', () => {
    it('returns 0 for empty array', () => {
      expect(calculateTotalDistance([])).toBe(0)
    })

    it('returns 0 for single attraction', () => {
      const input = [{ id: '1', latitude: 25, longitude: 121 } as never]
      expect(calculateTotalDistance(input)).toBe(0)
    })

    it('calculates total distance for ordered attractions', () => {
      const input = [
        { id: '1', latitude: 25.0, longitude: 121.0 } as never,
        { id: '2', latitude: 25.1, longitude: 121.1 } as never,
        { id: '3', latitude: 25.2, longitude: 121.2 } as never,
      ]
      const dist = calculateTotalDistance(input)
      expect(dist).toBeGreaterThan(0)
    })
  })
})
