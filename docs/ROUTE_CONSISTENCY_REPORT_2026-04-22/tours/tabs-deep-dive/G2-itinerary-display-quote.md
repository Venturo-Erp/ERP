# /tours Tab 深挖：行程 × 展示行程 × 報價（Group 2 - SSOT 核心）

**日期**: 2026-04-22  
**研究層級**: Group 2（SSOT 驗證）  
**範圍**: 3 個 Tab + 核心 hooks / services

---

## 業務背景再梳理

**行程 / 報價 / 需求是一整套 SSOT**：
- 單一真相表：`tour_itinerary_items`（世界樹）
- 行程編輯 → 行程項目同步到核心表 → 報價讀核心表 → 需求單掛鉤
- 景點是獨立 SSOT，展示時外掛進來

**八條原則對照**：本深挖主要驗證原則 5（核心業務事件走一張真相表）、6（聚合 vs 明細分離）、7（資源類型獨立生命週期）

---

## Tab 1: 行程 (itinerary)

**檔案**: `src/features/tours/components/tour-itinerary-tab.tsx`

### 業務目的推斷
- **誰看**: 內部員工（團隊主任 / 企劃）
- **怎麼用**: 
  - 建立 / 編輯每日行程（日期、景點、餐食、住宿）
  - 搜尋並掛入航班資料
  - 儲存到 `tour_itinerary_items` 核心表（觸發需求單、報價同步）

### 完成度

| 層面 | 狀態 | 備註 |
|------|------|------|
| **UI** | ✅ 100% | 上下分欄：團層級（航班、天數）+ 日分頁（每日景點/餐食/住宿）|
| **讀** | ✅ 100% | `useItineraries()` 讀 itineraries 表；`useTourItineraryItemsByTour()` 讀核心表 |
| **寫** | ✅ 90% | `syncToCore()` 同步 daily_itinerary → 核心表；**缺失**：AI 排行程 |
| **AI 生成** | 🟡 30% | `AiGenerateDialog` 有 UI；**無 API 調用**，推測尚未實作 |
| **版本管理** | ❌ 0% | 行程標籤頁無版本控制（版本機制在展示行程）|

### DB 表依賴

| 表 | 操作 | 用途 |
|---|------|------|
| `itineraries` | 讀 | 取得該團的展示行程 metadata（通常 NULL，除非有獨立編輯） |
| `tour_itinerary_items` | 讀/寫 | **核心表**：存景點、餐食、住宿、報價欄位 |
| `tour_itinerary_days` | 讀 | Phase 5 新表：日層級（早/午/晚預設、註記） |
| `tours` | 讀 | 獲取 tour.name、departure_date、return_date、airport_code |
| `attractions` | 讀 | 批次查景點描述 / 圖片（`useTourItineraryItemsByTour` 自動 JOIN） |
| `countries` | 讀 | 解析 country_id → 國家名稱 |

### 核心 hooks / services

```typescript
// 1. 同步行程到核心表（delete-then-insert）
const { syncToCore } = useSyncItineraryToCore()

// 2. 讀取核心表項目（含景點描述）
const { items: coreItems } = useTourItineraryItemsByTour(tour.id)

// 3. 讀取新表（tour_itinerary_days）
const { items: allItineraryDays } = useTourItineraryDays()

// 4. 航班搜尋（支援轉機）
const flightSearch = useFlightSearch({...})
```

**syncToCore 觸發時機**：
```
按「保存」按鈕 
  → formatDailyItinerary() 組出完整 DailyItinerary[]
  → syncToCore({ itinerary_id, tour_id, daily_itinerary })
    → 1. 查舊項目 → 提取報價資料（unit_price, quantity, quote_status）
    → 2. 指紋比對（activities:id, accommodation:name, meal:title）
    → 3. 標記 outdated / cancelled 需求單
    → 4. DELETE 舊項目 ⚠️ delete-then-insert（AI 重排必爆）
    → 5. INSERT 新項目（保留舊報價欄位）
    → 6. invalidate SWR cache
```

### SSOT 有沒有斷

✅ **整體完整**，細節有瑕疵：

1. **核心表是唯一真相** ✅
   - 景點、餐食、住宿 → 都寫 `tour_itinerary_items`
   - 讀時回溯到核心表 + attractions JOIN

2. **但行程 metadata 分裂** 🟡
   - 團層級（飛行時間、航班、天數）存 itineraries JSONB（旋轉軸故障點）
   - 日層級（早/午/晚預設、住宿續住標記）存新表 tour_itinerary_days
   - 日項目層級（景點、餐食、住宿）存核心表
   - → 3 層分別管理、依賴鏈複雜

3. **報價永遠跟著項目** ✅
   - `carryOverPricing()` 確保名稱變動時保留價格
   - 需求單狀態（outdated / cancelled）自動維護
   - 但 **缺景點外掛流程** 的 SSOT 驗證（見紅旗）

### 對照 8 條原則

1. ✅ 權限長在人身上：user.workspace_id 過濾
2. ✅ 職務是身份卡：`canEditDatabase` 權限判斷
3. ✅ 租戶一致性每層都守：workspace_id 寫入核心表
4. ✅ 狀態是 SSOT：quote_status（drafted / quoted / confirmed）
5. 🟡 核心業務事件走一張表：
   - ✅ 行程項目走核心表
   - ❌ 但景點選擇無 UI 流程（下見細節）
   - ❌ AI 生成無實裝
6. 🟡 聚合 vs 明細分離：
   - ✅ itineraries 聚合層；tour_itinerary_items 明細層
   - ❌ 但航班、餐食預設混在 itineraries JSONB（應移到新表）
7. 🟡 資源類型獨立生命週期：
   - ✅ attractions（景點）獨立建立、讀時 JOIN
   - ❌ 無景點「外掛」UI（DailyScheduleEditor 無「選景點」按鈕）
8. ✅ 快速入口 ≠ 獨立資料：行程 tab 直接編輯核心表

### 紅旗（業務語言）

1. **景點外掛 UI 流程完全缺失**  
   按「新增景點」→ 應彈出景點庫選擇器、篩選、新增  
   現況：DailyScheduleEditor 只有文字輸入 route 欄（無景點資料庫掛鉤）  
   影響：無法自動帶入景點描述、圖片、座標 → 報價計算無基準

2. **AI 排行程對話框有 UI，無邏輯**  
   AiGenerateDialog 接收 destination / numDays / theme  
   但無 API 呼叫、無狀態管理 → 整個功能癱瘓  
   預期：調用 Claude API 或自建 AI 排行程服務

3. **delete-then-insert 會爆 AI 重排**  
   若客戶用 AI 生成行程，隔天再編輯 → `syncToCore()` 刪舊項目、新項目重建  
   如果景點順序被 AI 重排過一次，續住飯店標記 sameAsPrevious 會失效  
   根本原因：行程項目無穩定 ID（應該在 activity 上掛 itinerary_item_id）

4. **報價計算依賴核心表欄位不完整**  
   核心表有 unit_price 但無 quantity_formula / adult_price_formula  
   → 當人數變化時，報價需重算但無基準公式  
   現況：useCategoryItems 定死了「住宿÷人房、餐飲÷桌數」的邏輯

5. **行程版本在展示頁，編輯頁無版本**  
   DailyScheduleEditor 無版本控制（旋轉軸機制不同步）  
   版本 only 存 itineraries.version_records（展示頁用）  
   → 若編輯多次再發布，版本鏈條斷裂

### 特別針對

**syncToCore 怎麼觸發**：按「保存」鈕 → formatDailyItinerary() → syncToCore()  
**景點外掛 UI 流程**：🚫 完全缺失，只有文字 route 欄  
**AI 生成完成度**：🟡 UI 對話框 30%，無後端服務實裝  

---

## Tab 2: 展示行程 (display-itinerary)

**檔案**: `src/features/tours/components/tour-display-itinerary-tab.tsx`

### 業務目的推斷
- **誰看**: 客戶 / 內部企劃（精美行程展示）
- **怎麼用**:
  - 編輯客戶看得到的精美行程頁面（文案、主題、FAQs、定價分層）
  - 支援網頁版 + 紙本版編輯
  - 發布後產生客戶可分享的展示連結
  - 讀新表（tour_itinerary_days / tour_itinerary_items）自動組 dailyItinerary

### 完成度

| 層面 | 狀態 | 備註 |
|------|------|------|
| **UI** | ✅ 100% | 雙欄編輯器（左表單 + 右預覽）；模式切換（網頁/紙本）；響應式（桌機/手機） |
| **讀** | ✅ 100% | `useItineraries()` + 新表組 composedDailyItinerary |
| **寫** | ✅ 100% | `PublishButton` + `updateTour(itinerary_id)` 回寫 tours.itinerary_id |
| **主題** | ✅ 6 套 | Art / Luxury / Dreamscape / Collage / Gemini / 預設 |
| **客戶端** | ✅ 檢測到 | `/tours/[code]` 路由讀 itineraries.id 展示 |

### DB 表依賴

| 表 | 操作 | 用途 |
|---|------|------|
| `itineraries` | 讀/寫 | **主要表**：存 title / description / features / price_tiers / FAQs / cancellation_policy |
| `tour_itinerary_days` | 讀 | 日層級資料（day_number、title、note、breakfast/lunch/dinner_preset）|
| `tour_itinerary_items` | 讀 | 日項目（activities、meals、accommodation，組成 DailyItinerary） |
| `tours` | 讀/寫 | 讀 departure_date / airport_code；寫 itinerary_id（發布時） |
| `countries` | 讀 | 解析 tour.country_id → 國家名稱（SSOT）|
| `attractions` | 讀 | 批次查景點描述（來自核心表的 resource_id） |

### 核心 hooks / services

```typescript
// 組 composedDailyItinerary 從新表
const dayRows = allItineraryDays.filter(d => d.tour_id === tour.id)
const itemRows = allItineraryItems.filter(i => i.tour_id === tour.id)
// → 組出 DailyItinerary[]（相容 JSONB 格式）
```

**Primary / Fallback 策略**：
```
若 tour_itinerary_days 有資料 → composedDailyItinerary（新表優先）
否則 → itineraries.daily_itinerary JSONB（舊格式降級）
```

### SSOT 有沒有斷

✅ **Country / City 端嚴格**，DailyItinerary 有冗餘：

1. **Country / City 永遠讀 tours** ✅
   - 代碼註記：「SSOT：country/city 的真相是 tours.country_id / airport_code，永遠以 tour 為準」
   - render 時每次都蓋掉 tourData 內的 country/city（防污染）

2. **DailyItinerary 新舊並存** 🟡
   - Primary：從新表組出（tour_itinerary_days + tour_itinerary_items）
   - Fallback：itineraries.daily_itinerary JSONB
   - 當新表有資料時，舊 JSONB 被忽略（但不刪除）
   - 風險：編輯表單時若沒注意，可能寫入 JSONB 而不是新表

3. **Accommodation 資源鏈** 🟡
   - 核心表存 accommodation 為文字 title（沒有 resource_id）
   - 組成 DailyItinerary 時帶 accommodation_id（下游 syncToCore 用）
   - 但展示時只用文字，無法追溯飯店詳情

### 對照 8 條原則

1. ✅ 權限長在人身上：`isAdmin` / `permissions` 判斷編輯權
2. ✅ 職務是身份卡：權限過濾
3. ✅ 租戶一致性：workspace_id 過濾
4. ✅ 狀態是 SSOT：itineraries.status（草稿 / 待出發 / 已出發）
5. ✅ 核心業務事件走一張表：
   - ✅ dailyItinerary 從行程核心表組出
   - ✅ 發布時寫 tours.itinerary_id（回溯）
6. ✅ 聚合 vs 明細分離：
   - ✅ itineraries 聚合（客戶看的全貌）
   - ✅ 細節從新表 + 核心表組出
7. 🟡 資源獨立生命週期：
   - attractions 有，但飯店 / 餐廳無獨立 SSOT
8. ✅ 快速入口 ≠ 獨立資料：展示頁讀核心表，非獨立儲存

### 紅旗（業務語言）

1. **6 套主題切換邏輯不清**  
   coverStyle / flightStyle / itineraryStyle 三個獨立欄位  
   實際頁面組件呼用邏輯：TourHeroArt / TourHeroLuxury ... 對應不明確  
   誰決定預設？誰能改？無 UI 見到的主題選擇器

2. **客戶端展示「曾看到過」不確定**  
   `/tours/[code]` 路由讀 itineraries，但無存取日誌  
   無法驗證「這個客戶有沒有真的開過這個頁面」  
   → 行銷分析無法量化展示行程的曝光度

3. **紙本版編輯與網頁版資料不同步**  
   PrintItineraryForm 用 printData（獨立 state）  
   TourForm 用 tourData（展示行程 itineraries 資料）  
   編輯時若只改一邊，另一邊不變 → 發布時可能遺漏更新

4. **主題未外部設定化**  
   6 套主題硬編在組件（TourHeroArt.tsx / TourHeroLuxury.tsx）  
   無 CMS 機制、無客戶自訂主題 → 新主題 = 新程式碼

5. **Daily Itinerary 新舊並存風險**  
   若編輯表單不知道自己在改新表還是舊 JSONB  
   可能同時存在兩份行程資料，展示時優先級不明

### 特別針對

**6 套主題切換**：coverStyle / flightStyle / itineraryStyle 欄位儲存；預設不明；無 UI 見到的選擇器  
**客戶端能否看**：✅ 可，`/tours/[code]` 路由  
**是否真有客戶曾看**：❌ 無存取日誌驗證  

---

## Tab 3: 報價 (quote)

**檔案**: v2 用 `src/features/tours/components/tour-quote-tab-v2.tsx`（掛上）；v1 為 `tour-quote-tab.tsx`（舊）

### 業務目的推斷
- **誰看**: 內部員工、客戶（報價單）
- **怎麼用**:
  - 主報價單（標準報價）：從行程核心表自動組出成本 → 設定售價
  - 快速報價單列表（v2 新功能）：臨時報價、多個版本可比較
  - 計算利潤、生成可列印報價單

### 完成度

| 層面 | 狀態 | 備註 |
|------|------|------|
| **UI** | ✅ 100% | v2：左側版本選單 + 右側內容區；主報價 + 快速報價列表 |
| **讀** | ✅ 100% | 主報價讀 tour.quote_id；快速報價讀 quotes.quote_type='quick' |
| **寫** | ✅ 100% | `QuoteDetailEmbed` 嵌入編輯；快速報價 inline 重命名 + 刪除 |
| **計算** | 🟡 70% | useCategoryItems 定死分攤邏輯；無公式化計算 |
| **版本** | 🟡 50% | v1 vs v2 並存；快速報價單多版本；主報價無版本 |

### DB 表依賴

| 表 | 操作 | 用途 |
|---|------|------|
| `quotes` | 讀/寫 | 主表：id / code / name / quote_type / status / total_amount |
| `tour_itinerary_items` | 讀 | **核心表**：coreItemsToCostCategories() 轉換為報價分類 |
| `tours` | 讀/寫 | 讀 quote_id；寫 quote_id（建立主報價時回寫） |
| `quick_quote_items` | 讀/寫 | 快速報價單項目（JSONB 欄位儲存在 quotes.quick_quote_items） |

### 核心 hooks / services

```typescript
// v2：主報價讀取 & 快速報價列表
const [mainQuoteId, setMainQuoteId] = useState<string | null>(null)
const [quickQuotes, setQuickQuotes] = useState<Quote[]>([])

// 若無主報價 → 自動建立
useEffect(() => {
  if (!loadingMain && !mainQuoteId && !creatingMain) {
    handleCreateMainQuote()
  }
}, [loadingMain, mainQuoteId, creatingMain])

// 快速報價操作
const handleAddQuickQuote = async () => { ... }
const startRenameQuickQuote = (quote) => { ... }
const handleDeleteQuickQuote = (quote) => { ... }
```

**計算邏輯分裂**：
```
1. useCategoryItems (住宿 & 餐飲 & 活動)：
   - 小計 = 單價 ÷ 數量（住宿÷人房、餐飲÷桌數、活動÷人數）
   - 若無數量 → 預設 1

2. useQuoteLoader (從核心表載報價)：
   - 讀 quotes / quote_items（舊表，已廢棄）
   - 或讀 quick_quote_items JSON
   - 無公式化計算 → 都用硬編邏輯

3. writePricingToCore (寫回核心表)：
   - 只寫 unit_price / quantity / total_cost / pricing_type
   - 無 quantity_formula / adult_price_formula 欄位 ⚠️
   - 當人數變化時 → 報價無法重算（誰維持公式？）
```

### SSOT 有沒有斷

🟡 **核心表是讀源，但寫入邏輯有缺口**：

1. **讀端強制拉核心表** ✅
   - `QuoteDetailEmbed` → `useQuoteLoader` → 讀 tour_itinerary_items
   - `coreItemsToCostCategories()` 轉換為報價分類
   - 確保報價和行程同步

2. **寫端部分保護** 🟡
   - `writePricingToCore()` UPDATE 報價欄位到核心表
   - 但缺 workspace_id 過濾（UPDATE 時沒加 workspace_id WHERE 條件）⚠️
   - 若多租戶情況，可能改到別人的資料

3. **計算邏輯無唯一真相** ❌
   - useCategoryItems 定死分攤算法
   - 若需要自訂（如「導遊費另計」），無公式配置機制
   - 人數變化時，舊報價無法「重算」（需手動改單價）

4. **v1 vs v2 並存** 🟡
   - `tour-quote-tab.tsx` (v1)：簡單、一報價單
   - `tour-quote-tab-v2.tsx` (v2)：複雜、多報價版本
   - 主報價邏輯重複 → 兩份代碼維護

### 對照 8 條原則

1. ✅ 權限長在人身上：讀 currentUser.workspace_id
2. ✅ 職務是身份卡：無特殊權限，所有員工可建報價
3. ❌ 租戶一致性：writePricingToCore 缺 workspace_id 過濾（BUG）
4. ✅ 狀態是 SSOT：quote_status（drafted / quoted / confirmed）
5. ✅ 核心業務事件走一張表：讀核心表組報價
6. ✅ 聚合 vs 明細分離：quotes 聚合、tour_itinerary_items 明細
7. 🟡 資源獨立生命週期：
   - 住宿、餐飲、活動 → 都在核心表
   - 無獨立「供應商 / 餐廳 / 景點」定價表
8. 🟡 快速入口 ≠ 獨立資料：
   - ✅ 主報價讀核心表
   - ❌ 快速報價是獨立 JSON（quick_quote_items），無回溯核心表

### 紅旗（業務語言）

1. **writePricingToCore 缺 workspace 過濾**（CRITICAL）  
   ```typescript
   // 當前（危險）
   .update({...})
   .eq('id', item.itinerary_item_id)
   
   // 應該
   .update({...})
   .eq('id', item.itinerary_item_id)
   .eq('workspace_id', workspace_id)
   ```
   若租戶 A 編報價，可能改到租戶 B 的核心表資料 → 合規風險

2. **計算邏輯無配置化**  
   住宿按人房分攤 → 寫死在 useCategoryItems  
   若想改為「按房間類型計價」→ 需改程式碼  
   無公式欄位（quantity_formula / adult_price_formula）供客戶自訂

3. **人數變化報價無自動重算**  
   修改 tour.max_participants → 報價不變  
   需手動 re-edit 報價單每一欄  
   根本原因：unit_price 存的是數字，無公式

4. **v1 vs v2 共存維護負擔**  
   兩份 Tab 代碼幾乎重複  
   主報價建立邏輯：v1 和 v2 都有一套  
   無遷移計畫 → v1 會一直留著

5. **快速報價無版本控制**  
   可建無限快速報價單，但無「源自哪次行程編輯」的追蹤  
   若行程改過，快速報價對應的成本基準過時了  
   無「重新同步行程」按鈕

### 特別針對

**v1 vs v2 實際差異**：
- v1：單主報價單，簡潔
- v2：主報價 + 快速報價列表，支援多版本比較
- 差異：v2 的快速報價是新功能，但無回溯到核心表

**計算邏輯分裂**：
- useCategoryItems（前端計算）vs useQuoteLoader（後端公式）
- useCategoryItems 負責：住宿÷人房、餐飲÷桌數、活動÷人數
- useQuoteLoader 負責：讀 quotes / quick_quote_items

**快速報價新功能用在哪**：
- v2 tab 內建立（新增快速報價按鈕）
- 支援 inline 重命名、刪除
- 無對應到「出單」或「客戶分享」流程

---

## 跨 Tab 設計問題

### 1. 行程編輯無景點外掛 UI

**問題**：DailyScheduleEditor 只有文字 route 欄  
**預期流程**：
```
點「新增景點」→ 開景點庫篩選器 → 選景點 → 帶入描述/座標
```
**現況**：無此 UI → 只能手打「阿里山森林遊樂區」文字  
**影響**：
- 無法自動帶景點圖片、評分、營業時間
- 報價計算無基準（活動費用怎麼估？）
- 需求單無法掛鉤景點供應商

**修法**：
- DailyScheduleEditor 需加「景點選擇器」元件
- 每個 activity 需記 attraction_id → 查景點詳情
- syncToCore 時確保 resource_type='attraction'

### 2. AI 排行程：UI 有，邏輯無

**現況**：
- AiGenerateDialog 接收 destination / theme / arrival_time / departure_time
- 無 API 呼叫、無狀態管理

**預期**：
```
按「AI 排行程」→ 輸入目的地 + 風格 → 調用 Claude API 
  → 產生「Day 1: 抵達→飯店check-in→當地美食」結構化內容
  → 填入 dailyItinerary
  → syncToCore
```

**修法**：
- 需建立 `/api/tours/generate-itinerary` 端點
- 接收 { destination, days, theme, arrival_time, departure_time }
- 呼叫 Claude API → 回傳結構化 daily_itinerary
- 整合到 usePackageItinerary

### 3. 報價人數變化無自動重算

**問題**：修改 tour.max_participants → 報價不變  
**根本原因**：
- unit_price 存的是「人房30,000」的數字
- 無 quantity_formula（「人房÷2=每人15,000」的公式）

**修法**：
- 在 tour_itinerary_items 加欄位：
  - quantity_formula: "max_participants / 2" （人房）
  - adult_price_formula: "unit_price / quantity_formula"
- 報價計算時：evaluate 公式而不是用硬編邏輯
- 人數變化 → 自動重算

### 4. 核心表報價欄位不完整

**缺失**：
- quantity_formula / adult_price_formula 無欄位
- 無 formula_variables（人數、房型等變數）
- 無 pricing_source（從景點引入 vs 手輸）

**影響**：
- writePricingToCore 無法存公式
- 人數變化時報價無法回算

### 5. syncToCore delete-then-insert 爆點

**問題**：每次保存 → DELETE 舊項目、INSERT 新項目  
**爆點**：若 AI 重排過一次，續住飯店標記 sameAsPrevious 會重置

**根本原因**：行程項目無穩定 ID  
**修法**：
- activity 加 itinerary_item_id FK
- 改用 upsert 而不是 delete-then-insert
- 價格、需求單狀態可完整保留

---

## 對 8 條原則的驗證結果

| 原則 | 行程 | 展示行程 | 報價 | 整體 |
|------|------|---------|------|------|
| 1. 權限長身上 | ✅ | ✅ | ✅ | ✅ |
| 2. 職務是身份卡 | ✅ | ✅ | ✅ | ✅ |
| 3. 租戶一致性 | ✅ | ✅ | ❌ 缺filter | 🟡 |
| 4. 狀態是SSOT | ✅ | ✅ | ✅ | ✅ |
| 5. 業務事件走一表 | 🟡 景點缺 | ✅ | ✅ 讀端 | 🟡 |
| 6. 聚合vs明細 | 🟡 3層分裂 | ✅ | ✅ | 🟡 |
| 7. 資源獨立週期 | 🟡 景點缺UI | ✅ 讀景點 | 🟡 快速報無回溯 | 🟡 |
| 8. 快速入口≠獨立資 | ✅ | ✅ | 🟡 快速報 | 🟡 |

**最關鍵**：原則 3（租戶）和原則 5（SSOT）有明確缺口，需優先修

---

## 建議優先修復順序

1. **CRITICAL - writePricingToCore workspace 過濾** （安全合規）
2. **HIGH - 景點外掛 UI** （無此 UI 無法設定景點活動）
3. **HIGH - AI 排行程後端實裝** （功能癱瘓）
4. **MEDIUM - 報價人數重算公式化** （客戶體驗）
5. **MEDIUM - syncToCore 改 upsert** （AI 重排不爆）
6. **LOW - v1 vs v2 報價合併** （維護負擔）

