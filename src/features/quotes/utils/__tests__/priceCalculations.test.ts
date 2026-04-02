import { describe, it, expect } from 'vitest'
import {
  normalizeNumber,
  calculateProfit,
  calculateIdentityProfits,
  calculateTierParticipantCounts,
  getRoomTypeCost,
  getRoomTypeProfit,
  generateUniqueId,
} from '../priceCalculations'

describe('priceCalculations', () => {
  describe('normalizeNumber', () => {
    it('converts fullwidth digits', () => {
      expect(normalizeNumber('０７：００')).toBe('07：00')
    })

    it('keeps halfwidth digits', () => {
      expect(normalizeNumber('12345')).toBe('12345')
    })

    it('handles empty string', () => {
      expect(normalizeNumber('')).toBe('')
    })

    it('handles mixed', () => {
      expect(normalizeNumber('１2３4')).toBe('1234')
    })
  })

  describe('calculateProfit', () => {
    it('calculates positive profit', () => {
      expect(calculateProfit(10000, 7000)).toBe(3000)
    })

    it('calculates negative profit (loss)', () => {
      expect(calculateProfit(5000, 8000)).toBe(-3000)
    })

    it('calculates zero profit', () => {
      expect(calculateProfit(5000, 5000)).toBe(0)
    })

    it('handles zero values', () => {
      expect(calculateProfit(0, 0)).toBe(0)
    })
  })

  describe('calculateIdentityProfits', () => {
    it('calculates profits for all identities', () => {
      const prices = {
        adult: 10000,
        child_with_bed: 8000,
        child_no_bed: 6000,
        single_room: 12000,
        infant: 1000,
      }
      const costs = {
        adult: 7000,
        child_with_bed: 6000,
        child_no_bed: 4000,
        single_room: 9000,
        infant: 500,
      }
      const result = calculateIdentityProfits(prices, costs)
      expect(result.adult).toBe(3000)
      expect(result.child_with_bed).toBe(2000)
      expect(result.child_no_bed).toBe(2000)
      expect(result.single_room).toBe(3000)
      expect(result.infant).toBe(500)
    })
  })

  describe('calculateTierParticipantCounts', () => {
    it('scales participant counts proportionally', () => {
      const original = { adult: 10, child_with_bed: 2, child_no_bed: 1, single_room: 2, infant: 1 }
      const result = calculateTierParticipantCounts(30, original)
      // total original = 10+2+1+2 = 15, ratio = 2
      expect(result.adult).toBe(20)
      expect(result.child_with_bed).toBe(4)
      expect(result.child_no_bed).toBe(2)
      expect(result.single_room).toBe(4)
      expect(result.infant).toBe(2)
    })

    it('handles zero total original', () => {
      const original = { adult: 0, child_with_bed: 0, child_no_bed: 0, single_room: 0, infant: 0 }
      const result = calculateTierParticipantCounts(10, original)
      expect(result.adult).toBe(0)
    })

    it('handles target count 0', () => {
      const original = { adult: 10, child_with_bed: 2, child_no_bed: 1, single_room: 2, infant: 1 }
      const result = calculateTierParticipantCounts(0, original)
      expect(result.adult).toBe(0)
      expect(result.child_with_bed).toBe(0)
    })
  })

  describe('getRoomTypeCost', () => {
    const accommodationSummary: import('../../types').AccommodationSummaryItem[] = [
      { name: 'standard', total_cost: 1000, averageCost: 500, days: 2, capacity: 2 },
      { name: 'deluxe', total_cost: 2000, averageCost: 1000, days: 2, capacity: 2 },
    ]
    const identityCosts = {
      adult: 5000,
      child_with_bed: 4000,
      child_no_bed: 2000,
      single_room: 6000,
      infant: 500,
    }

    it('returns 0 for non-existent room', () => {
      expect(getRoomTypeCost('nonexistent', 'adult', accommodationSummary, identityCosts)).toBe(0)
    })

    it('calculates adult cost for first room (no change)', () => {
      expect(getRoomTypeCost('standard', 'adult', accommodationSummary, identityCosts)).toBe(5000)
    })

    it('calculates adult cost for second room', () => {
      expect(getRoomTypeCost('deluxe', 'adult', accommodationSummary, identityCosts)).toBe(6000)
    })

    it('calculates child cost', () => {
      expect(getRoomTypeCost('deluxe', 'child', accommodationSummary, identityCosts)).toBe(5000)
    })

    it('handles empty accommodation summary', () => {
      expect(getRoomTypeCost('standard', 'adult', [], identityCosts)).toBe(0)
    })
  })

  describe('getRoomTypeProfit', () => {
    it('calculates profit for room type', () => {
      const accommodationSummary: import('../../types').AccommodationSummaryItem[] = [
        { name: 'standard', total_cost: 1000, averageCost: 500, days: 2, capacity: 2 },
        { name: 'deluxe', total_cost: 2000, averageCost: 1000, days: 2, capacity: 2 },
      ]
      const identityCosts = {
        adult: 5000,
        child_with_bed: 4000,
        child_no_bed: 2000,
        single_room: 6000,
        infant: 500,
      }
      const sellingPrices = {
        adult: 10000,
        child_with_bed: 8000,
        child_no_bed: 6000,
        single_room: 12000,
        infant: 1000,
        room_types: { deluxe: { adult: 12000, child: 10000 } },
      }
      // cost = 6000, price = 12000, profit = 6000
      expect(
        getRoomTypeProfit(
          'deluxe',
          'adult',
          sellingPrices as never,
          accommodationSummary,
          identityCosts
        )
      ).toBe(6000)
    })

    it('returns negative when no selling price set', () => {
      const accommodationSummary: import('../../types').AccommodationSummaryItem[] = [
        { name: 'standard', total_cost: 1000, averageCost: 500, days: 2, capacity: 2 },
      ]
      const identityCosts = {
        adult: 5000,
        child_with_bed: 4000,
        child_no_bed: 2000,
        single_room: 6000,
        infant: 500,
      }
      const sellingPrices = {
        adult: 10000,
        child_with_bed: 8000,
        child_no_bed: 6000,
        single_room: 12000,
        infant: 1000,
      }
      // price = 0 (no room_types), cost = 5000, profit = -5000
      expect(
        getRoomTypeProfit(
          'standard',
          'adult',
          sellingPrices as never,
          accommodationSummary,
          identityCosts
        )
      ).toBe(-5000)
    })
  })

  describe('generateUniqueId', () => {
    it('returns a string', () => {
      expect(typeof generateUniqueId()).toBe('string')
    })

    it('generates unique ids', () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateUniqueId()))
      expect(ids.size).toBe(100)
    })
  })
})
