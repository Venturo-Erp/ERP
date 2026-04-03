import { describe, it, expect } from 'vitest'
import { extractCoordsFromUrl, isValidCoordinates } from '../google-places'

describe('google-places', () => {
  describe('extractCoordsFromUrl', () => {
    it('應該解析 ?q= 格式的 URL', () => {
      const url = 'https://maps.google.com/?q=18.788015,98.985934'
      const result = extractCoordsFromUrl(url)
      
      expect(result).toEqual({
        lat: 18.788015,
        lng: 98.985934,
      })
    })

    it('應該解析 /@ 格式的 URL', () => {
      const url = 'https://www.google.com/maps/@18.788015,98.985934,15z'
      const result = extractCoordsFromUrl(url)
      
      expect(result).toEqual({
        lat: 18.788015,
        lng: 98.985934,
      })
    })

    it('應該解析 /place/.../@lat,lng 格式的 URL', () => {
      const url = 'https://www.google.com/maps/place/Doi+Suthep/@18.804572,98.921779,17z'
      const result = extractCoordsFromUrl(url)
      
      expect(result).toEqual({
        lat: 18.804572,
        lng: 98.921779,
      })
    })

    it('無效 URL 應該回傳 null', () => {
      const url = 'https://www.google.com/invalid-url'
      const result = extractCoordsFromUrl(url)
      
      expect(result).toBeNull()
    })
  })

  describe('isValidCoordinates', () => {
    it('有效座標應該回傳 true', () => {
      expect(isValidCoordinates(18.788015, 98.985934)).toBe(true)
      expect(isValidCoordinates(0, 0)).toBe(true)
      expect(isValidCoordinates(-90, -180)).toBe(true)
      expect(isValidCoordinates(90, 180)).toBe(true)
    })

    it('無效座標應該回傳 false', () => {
      expect(isValidCoordinates(91, 0)).toBe(false)
      expect(isValidCoordinates(-91, 0)).toBe(false)
      expect(isValidCoordinates(0, 181)).toBe(false)
      expect(isValidCoordinates(0, -181)).toBe(false)
      expect(isValidCoordinates(undefined, 0)).toBe(false)
      expect(isValidCoordinates(0, undefined)).toBe(false)
    })
  })
})
