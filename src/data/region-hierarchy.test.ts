import { describe, it, expect } from 'vitest'
import {
  COUNTRIES,
  getAllCountries,
  getCountry,
  getCitiesByCountry,
  getRegionsByCountry,
  getCitiesByRegion,
  getCityInfo,
  formatRegionDisplay,
  getRegionDisplayName,
} from './region-hierarchy'

describe('COUNTRIES data', () => {
  it('should have japan, thailand, korea, china', () => {
    expect(COUNTRIES.japan).toBeDefined()
    expect(COUNTRIES.thailand).toBeDefined()
    expect(COUNTRIES.korea).toBeDefined()
    expect(COUNTRIES.china).toBeDefined()
  })

  it('japan should have regions', () => {
    expect(COUNTRIES.japan.regions).toBeDefined()
    expect(COUNTRIES.japan.regions!.length).toBeGreaterThan(0)
  })

  it('thailand should have cities directly (no regions)', () => {
    expect(COUNTRIES.thailand.regions).toBeUndefined()
    expect(COUNTRIES.thailand.cities).toBeDefined()
    expect(COUNTRIES.thailand.cities!.length).toBeGreaterThan(0)
  })
})

describe('getAllCountries', () => {
  it('should return all countries', () => {
    const countries = getAllCountries()
    expect(countries.length).toBe(Object.keys(COUNTRIES).length)
  })

  it('each country should have id, name, nameEn', () => {
    for (const country of getAllCountries()) {
      expect(country.id).toBeTruthy()
      expect(country.name).toBeTruthy()
      expect(country.nameEn).toBeTruthy()
    }
  })
})

describe('getCountry', () => {
  it('should return japan', () => {
    expect(getCountry('japan')?.name).toBe('日本')
  })

  it('should return undefined for nonexistent', () => {
    expect(getCountry('atlantis')).toBeUndefined()
  })
})

describe('getCitiesByCountry', () => {
  it('should return all cities for japan (from regions)', () => {
    const cities = getCitiesByCountry('japan')
    expect(cities.length).toBeGreaterThan(10)
    expect(cities.find(c => c.id === 'tokyo')).toBeDefined()
  })

  it('should return cities for thailand (direct cities)', () => {
    const cities = getCitiesByCountry('thailand')
    expect(cities.find(c => c.id === 'bangkok')).toBeDefined()
  })

  it('should return empty for nonexistent country', () => {
    expect(getCitiesByCountry('xyz')).toEqual([])
  })
})

describe('getRegionsByCountry', () => {
  it('should return regions for japan', () => {
    const regions = getRegionsByCountry('japan')
    expect(regions.length).toBeGreaterThan(5)
    expect(regions.find(r => r.id === 'kansai')).toBeDefined()
  })

  it('should return empty for country without regions', () => {
    expect(getRegionsByCountry('thailand')).toEqual([])
  })

  it('should return empty for nonexistent country', () => {
    expect(getRegionsByCountry('xyz')).toEqual([])
  })
})

describe('getCitiesByRegion', () => {
  it('should return cities for kansai', () => {
    const cities = getCitiesByRegion('japan', 'kansai')
    expect(cities.find(c => c.id === 'osaka')).toBeDefined()
    expect(cities.find(c => c.id === 'kyoto')).toBeDefined()
  })

  it('should return empty for nonexistent region', () => {
    expect(getCitiesByRegion('japan', 'xyz')).toEqual([])
  })

  it('should return empty for country without regions', () => {
    expect(getCitiesByRegion('thailand', 'any')).toEqual([])
  })
})

describe('getCityInfo', () => {
  it('should find tokyo in japan regions', () => {
    const city = getCityInfo('tokyo')
    expect(city).toBeDefined()
    expect(city!.name).toBe('東京')
    expect(city!.country).toBe('japan')
  })

  it('should find bangkok in thailand direct cities', () => {
    const city = getCityInfo('bangkok')
    expect(city).toBeDefined()
    expect(city!.name).toBe('曼谷')
  })

  it('should return undefined for nonexistent city', () => {
    expect(getCityInfo('atlantis')).toBeUndefined()
  })
})

describe('formatRegionDisplay', () => {
  it('should return 未選擇 for empty array', () => {
    expect(formatRegionDisplay([])).toBe('未選擇')
  })

  it('should join city names with arrow by order', () => {
    const result = formatRegionDisplay([
      { country: 'japan', countryName: '日本', city: 'osaka', cityName: '大阪', order: 2 },
      { country: 'japan', countryName: '日本', city: 'tokyo', cityName: '東京', order: 1 },
    ])
    expect(result).toBe('東京 → 大阪')
  })

  it('should handle single region', () => {
    const result = formatRegionDisplay([
      { country: 'japan', countryName: '日本', city: 'tokyo', cityName: '東京', order: 1 },
    ])
    expect(result).toBe('東京')
  })
})

describe('getRegionDisplayName', () => {
  it('should include country and city', () => {
    const result = getRegionDisplayName({
      country: 'japan',
      countryName: '日本',
      city: 'tokyo',
      cityName: '東京',
      order: 1,
    })
    expect(result).toBe('日本 / 東京')
  })

  it('should include region when present', () => {
    const result = getRegionDisplayName({
      country: 'japan',
      countryName: '日本',
      region: 'kanto',
      regionName: '關東',
      city: 'tokyo',
      cityName: '東京',
      order: 1,
    })
    expect(result).toBe('日本 / 關東 / 東京')
  })
})
