# 景點座標自動取得系統

## 功能概述

當同事新增景點時，系統會自動搜尋並建議座標，不需要手動查詢 Google Maps。

## 使用方式

### 1. 自動搜尋（推薦）

1. 在景點表單中輸入「景點名稱」
2. 選擇「國家」和「城市」
3. 等待 1 秒後，系統會自動搜尋座標
4. 如果找到結果，會顯示「找到座標」的提示框
5. 點擊「使用此座標」按鈕即可自動填入

**範例：**
- 景點名稱：`素帖寺`
- 城市：`清邁`
- 國家：`Thailand`
- → 自動搜尋 → 顯示：`Wat Phra That Doi Suthep (18.804572, 98.921779)`

### 2. 手動搜尋

如果自動搜尋沒有觸發，可以點擊「🔍 搜尋座標」按鈕。

### 3. 貼上 Google Maps 連結（備用方案）

如果搜尋不到正確的座標，可以：

1. 在 Google Maps 找到景點
2. 複製網址列的 URL
3. 貼到「或貼上 Google Maps 連結」欄位
4. 系統會自動解析座標並填入

**支援格式：**
- `https://maps.google.com/?q=18.788015,98.985934`
- `https://www.google.com/maps/@18.788015,98.985934,15z`
- `https://www.google.com/maps/place/Doi+Suthep/@18.804572,98.921779,17z`

### 4. 手動輸入

也可以直接在「緯度」和「經度」欄位手動輸入座標。

## 技術架構

### 核心檔案

```
src/
├── lib/
│   ├── google-places.ts              # Google Places API 整合
│   └── __tests__/
│       └── google-places.test.ts     # 單元測試
└── features/attractions/
    └── components/attraction-dialog/
        ├── CoordinateSearch.tsx      # 座標搜尋 UI 元件
        └── AttractionForm.tsx        # 整合到景點表單
```

### API 使用

使用 Google Places API (Text Search)：

```typescript
GET https://maps.googleapis.com/maps/api/place/textsearch/json
  ?query=素帖寺,清邁,Thailand
  &key=YOUR_API_KEY
```

**注意事項：**
- 需要設定 `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` 環境變數
- API 有使用配額限制，請參考 [Google Maps Platform 定價](https://developers.google.com/maps/billing-and-pricing/pricing)

## 環境變數設定

```bash
# .env.local
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
```

**取得 API Key：**
1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立新專案或選擇現有專案
3. 啟用「Places API」
4. 建立 API 憑證（API Key）
5. 複製 Key 到 `.env.local`

## URL 解析功能

如果使用者貼上 Google Maps URL，系統會自動解析座標：

```typescript
import { extractCoordsFromUrl } from '@/lib/google-places'

const url = 'https://maps.google.com/?q=18.788015,98.985934'
const coords = extractCoordsFromUrl(url)
// { lat: 18.788015, lng: 98.985934 }
```

## 座標驗證

系統會驗證座標是否有效：

```typescript
import { isValidCoordinates } from '@/lib/google-places'

isValidCoordinates(18.788015, 98.985934)  // true
isValidCoordinates(100, 200)              // false（超出範圍）
```

**有效範圍：**
- 緯度：-90 ~ 90
- 經度：-180 ~ 180

## 使用限制

- **優先級**：低（等核心功能完成後再優化）
- **開發時間**：2-3 小時 ✅ 已完成
- **API 配額**：需注意 Google Places API 的使用限制
- **網路依賴**：需要連接外部 API

## 未來優化方向

1. **快取機制**：相同景點名稱的搜尋結果可以快取
2. **批次匯入**：支援 CSV/Excel 批次匯入景點時自動取得座標
3. **地圖預覽**：在表單中直接顯示地圖預覽
4. **多語言支援**：支援泰文、英文、中文搜尋

## 相關文件

- [景點管理功能](../attractions/README.md)
- [Google Places API 文件](https://developers.google.com/maps/documentation/places/web-service/search-text)
- [地理計算工具 (geo-utils.ts)](../../src/lib/itinerary-generator/geo-utils.ts)
