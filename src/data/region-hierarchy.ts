/**
 * 地區階層資料結構
 *
 * 三層架構：國家 > 地區 > 城市
 * - 用於報價單多地區選擇
 * - 用於成本模板分類
 * - 用於景點資料庫分類
 */

// ============ 型別定義 ============

interface City {
  id: string
  name: string
  nameEn?: string
  country: string
  region?: string
}

interface Region {
  id: string
  name: string
  nameEn?: string
  cities: City[]
}

interface Country {
  id: string
  name: string
  nameEn: string
  regions?: Region[]
  cities?: City[] // 沒有地區分類的國家直接用城市
}

interface SelectedRegion {
  country: string
  countryName: string
  region?: string
  regionName?: string
  city: string
  cityName: string
  order: number
}

// ============ 資料定義 ============

export const COUNTRIES: Record<string, Country> = {
  // 日本 - 有地區分類
  japan: {
    id: 'japan',
    name: '日本',
    nameEn: 'Japan',
    regions: [
      {
        id: 'hokkaido',
        name: '北海道',
        nameEn: 'Hokkaido',
        cities: [
          { id: 'sapporo', name: '札幌', nameEn: 'Sapporo', country: 'japan', region: 'hokkaido' },
          {
            id: 'hakodate',
            name: '函館',
            nameEn: 'Hakodate',
            country: 'japan',
            region: 'hokkaido',
          },
          { id: 'otaru', name: '小樽', nameEn: 'Otaru', country: 'japan', region: 'hokkaido' },
        ],
      },
      {
        id: 'tohoku',
        name: '東北',
        nameEn: 'Tohoku',
        cities: [
          { id: 'sendai', name: '仙台', nameEn: 'Sendai', country: 'japan', region: 'tohoku' },
          { id: 'aomori', name: '青森', nameEn: 'Aomori', country: 'japan', region: 'tohoku' },
        ],
      },
      {
        id: 'kanto',
        name: '關東',
        nameEn: 'Kanto',
        cities: [
          { id: 'tokyo', name: '東京', nameEn: 'Tokyo', country: 'japan', region: 'kanto' },
          { id: 'yokohama', name: '橫濱', nameEn: 'Yokohama', country: 'japan', region: 'kanto' },
          { id: 'kawasaki', name: '川崎', nameEn: 'Kawasaki', country: 'japan', region: 'kanto' },
          { id: 'nikko', name: '日光', nameEn: 'Nikko', country: 'japan', region: 'kanto' },
        ],
      },
      {
        id: 'chubu',
        name: '中部',
        nameEn: 'Chubu',
        cities: [
          { id: 'nagoya', name: '名古屋', nameEn: 'Nagoya', country: 'japan', region: 'chubu' },
          { id: 'takayama', name: '高山', nameEn: 'Takayama', country: 'japan', region: 'chubu' },
          { id: 'kanazawa', name: '金澤', nameEn: 'Kanazawa', country: 'japan', region: 'chubu' },
        ],
      },
      {
        id: 'kansai',
        name: '關西',
        nameEn: 'Kansai',
        cities: [
          { id: 'osaka', name: '大阪', nameEn: 'Osaka', country: 'japan', region: 'kansai' },
          { id: 'kyoto', name: '京都', nameEn: 'Kyoto', country: 'japan', region: 'kansai' },
          { id: 'kobe', name: '神戶', nameEn: 'Kobe', country: 'japan', region: 'kansai' },
          { id: 'nara', name: '奈良', nameEn: 'Nara', country: 'japan', region: 'kansai' },
        ],
      },
      {
        id: 'chugoku',
        name: '中國',
        nameEn: 'Chugoku',
        cities: [
          {
            id: 'hiroshima',
            name: '廣島',
            nameEn: 'Hiroshima',
            country: 'japan',
            region: 'chugoku',
          },
          { id: 'okayama', name: '岡山', nameEn: 'Okayama', country: 'japan', region: 'chugoku' },
        ],
      },
      {
        id: 'shikoku',
        name: '四國',
        nameEn: 'Shikoku',
        cities: [
          {
            id: 'takamatsu',
            name: '高松',
            nameEn: 'Takamatsu',
            country: 'japan',
            region: 'shikoku',
          },
          {
            id: 'matsuyama',
            name: '松山',
            nameEn: 'Matsuyama',
            country: 'japan',
            region: 'shikoku',
          },
        ],
      },
      {
        id: 'kyushu',
        name: '九州',
        nameEn: 'Kyushu',
        cities: [
          { id: 'fukuoka', name: '福岡', nameEn: 'Fukuoka', country: 'japan', region: 'kyushu' },
          { id: 'kumamoto', name: '熊本', nameEn: 'Kumamoto', country: 'japan', region: 'kyushu' },
          { id: 'nagasaki', name: '長崎', nameEn: 'Nagasaki', country: 'japan', region: 'kyushu' },
          {
            id: 'kagoshima',
            name: '鹿兒島',
            nameEn: 'Kagoshima',
            country: 'japan',
            region: 'kyushu',
          },
          { id: 'beppu', name: '別府', nameEn: 'Beppu', country: 'japan', region: 'kyushu' },
        ],
      },
      {
        id: 'okinawa',
        name: '沖繩',
        nameEn: 'Okinawa',
        cities: [
          { id: 'naha', name: '那霸', nameEn: 'Naha', country: 'japan', region: 'okinawa' },
          {
            id: 'ishigaki',
            name: '石垣島',
            nameEn: 'Ishigaki',
            country: 'japan',
            region: 'okinawa',
          },
          {
            id: 'miyakojima',
            name: '宮古島',
            nameEn: 'Miyakojima',
            country: 'japan',
            region: 'okinawa',
          },
        ],
      },
    ],
  },

  // 泰國 - 無地區分類，直接城市
  thailand: {
    id: 'thailand',
    name: '泰國',
    nameEn: 'Thailand',
    cities: [
      { id: 'bangkok', name: '曼谷', nameEn: 'Bangkok', country: 'thailand' },
      { id: 'chiang-mai', name: '清邁', nameEn: 'Chiang Mai', country: 'thailand' },
      { id: 'phuket', name: '普吉島', nameEn: 'Phuket', country: 'thailand' },
      { id: 'pattaya', name: '芭達雅', nameEn: 'Pattaya', country: 'thailand' },
      { id: 'krabi', name: '喀比', nameEn: 'Krabi', country: 'thailand' },
      { id: 'chiang-rai', name: '清萊', nameEn: 'Chiang Rai', country: 'thailand' },
    ],
  },

  // 韓國
  korea: {
    id: 'korea',
    name: '韓國',
    nameEn: 'South Korea',
    cities: [
      { id: 'seoul', name: '首爾', nameEn: 'Seoul', country: 'korea' },
      { id: 'busan', name: '釜山', nameEn: 'Busan', country: 'korea' },
      { id: 'jeju', name: '濟州島', nameEn: 'Jeju', country: 'korea' },
      { id: 'incheon', name: '仁川', nameEn: 'Incheon', country: 'korea' },
    ],
  },

  // 中國
  china: {
    id: 'china',
    name: '中國',
    nameEn: 'China',
    regions: [
      {
        id: 'east',
        name: '華東',
        nameEn: 'East China',
        cities: [
          { id: 'shanghai', name: '上海', nameEn: 'Shanghai', country: 'china', region: 'east' },
          { id: 'hangzhou', name: '杭州', nameEn: 'Hangzhou', country: 'china', region: 'east' },
          { id: 'suzhou', name: '蘇州', nameEn: 'Suzhou', country: 'china', region: 'east' },
        ],
      },
      {
        id: 'north',
        name: '華北',
        nameEn: 'North China',
        cities: [
          { id: 'beijing', name: '北京', nameEn: 'Beijing', country: 'china', region: 'north' },
        ],
      },
      {
        id: 'south',
        name: '華南',
        nameEn: 'South China',
        cities: [
          { id: 'guangzhou', name: '廣州', nameEn: 'Guangzhou', country: 'china', region: 'south' },
          { id: 'shenzhen', name: '深圳', nameEn: 'Shenzhen', country: 'china', region: 'south' },
        ],
      },
    ],
  },
}

// ============ Helper Functions ============

/**
 * 取得所有國家列表
 */
export const getAllCountries = (): Country[] => {
  return Object.values(COUNTRIES)
}

/**
 * 取得國家資料
 */
export const getCountry = (countryId: string): Country | undefined => {
  return COUNTRIES[countryId]
}

/**
 * 取得國家的所有城市（扁平化）
 */
export const getCitiesByCountry = (countryId: string): City[] => {
  const country = COUNTRIES[countryId]
  if (!country) return []

  if (country.regions) {
    return country.regions.flatMap(region => region.cities)
  }

  return country.cities || []
}

/**
 * 取得國家的所有地區
 */
export const getRegionsByCountry = (countryId: string): Region[] => {
  const country = COUNTRIES[countryId]
  return country?.regions || []
}

/**
 * 取得特定地區的城市
 */
export const getCitiesByRegion = (countryId: string, regionId: string): City[] => {
  const country = COUNTRIES[countryId]
  if (!country?.regions) return []

  const region = country.regions.find(r => r.id === regionId)
  return region?.cities || []
}

/**
 * 根據城市 ID 查找完整資訊
 */
export const getCityInfo = (cityId: string): City | undefined => {
  for (const country of Object.values(COUNTRIES)) {
    if (country.regions) {
      for (const region of country.regions) {
        const city = region.cities.find(c => c.id === cityId)
        if (city) return city
      }
    } else if (country.cities) {
      const city = country.cities.find(c => c.id === cityId)
      if (city) return city
    }
  }
  return undefined
}

/**
 * 格式化顯示文字
 */
export const formatRegionDisplay = (regions: SelectedRegion[]): string => {
  if (regions.length === 0) return '未選擇'

  // 按順序顯示城市名稱
  const cityNames = regions.sort((a, b) => a.order - b.order).map(r => r.cityName)

  return cityNames.join(' → ')
}

/**
 * 取得地區的顯示名稱（包含國家資訊）
 */
export const getRegionDisplayName = (region: SelectedRegion): string => {
  const parts = [region.countryName]

  if (region.regionName) {
    parts.push(region.regionName)
  }

  parts.push(region.cityName)

  return parts.join(' / ')
}
