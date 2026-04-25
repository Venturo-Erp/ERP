# 商業邏輯地圖

**維護者**：Caesar 🏛️  
**最後更新**：2026-04-03 15:24

**用途**：快速找到業務規則、流程定義、商業決策

---

## 🎯 Venturo ERP 核心概念

### 世界樹（唯一真相來源）

- **定義**：`tour_itinerary_items` = 所有業務的核心
- **五面觀點**：行程/報價/需求/確認/結帳
- **位置**：Supabase `tour_itinerary_items` 表
- **文件**：`~/Projects/venturo-erp/docs/CORE_CONCEPT.md`

### 成本法則

- **原則**：一個數字一路修正，不分估價/實際
- **邏輯**：報價 → 確認 → 實際成本（同一欄位）
- **文件**：`memory/2026-03-13-erp-core-concept.md`

---

## 💰 財務流程

### 請款流程

- **起點**：需求單確認
- **流程**：需求單 → 請款單 → 會計審核 → 付款
- **文件**：`memory/2026-03-16-requirements-flow.md`

### 收款流程

- **起點**：行程確認
- **流程**：行程確認 → 收款單 → 客戶付款
- **規則**：待補充

---

## 🏛️ 租戶架構

### 附屬國概念

- **主租戶**：角落旅行社（CORNER）
- **附屬租戶**：富順、勁揚
- **規則**：獨立 workspace_id，資料完全隔離
- **文件**：`empire/EMPIRE_BLUEPRINT.md`

---

## 🎯 產品定位

### 角落旅行社（品牌）

- **定位**：高端不是貴，是值得
- **客群**：追求品質的旅客
- **差異化**：深度體驗 > 走馬看花
- **文件**：待 Nova 補充 BRAND_MAP.md

### Venturo ERP（產品）

**核心賣點**（2026-04-03 確認）：

1. **可客製化** → 插件架構（不是大改特改）
2. **AI 客服整合** → 殺手級功能
3. **價格有競爭力** → 訂閱制 $299-1,499/月

**目標客群**：

- 小旅行社（沒官網，用社群媒體接單）
- 痛點：客服訊息散落在 LINE、FB、IG
- 需求：統一管理客戶對話 + AI 自動回覆

**差異化優勢**：

- 競品多是官網式 CRM（不適合社群接單）
- 我們整合社群客服（LINE、FB、IG）
- AI 處理重複性問題（歷史報價查詢、建立需求單）

---

## 🚀 開發優先級

**已完成**：

- ✅ LINE 客服整合

**高優先**（2026-04-03）：

- 🔥 Facebook Messenger 客服
- 🔥 Instagram DM 客服
- 📋 工具整合（歷史報價查詢、建立需求單）

**商業模式**：

- 基本版：$299/月
- 專業版：$699/月
- 社群版：$699/月（LINE + FB + IG）
- 企業版：$1,499/月

---

## 📋 需求分析流程

1. **客戶需求** → Caesar 分析
2. **轉化為功能規格** → Matthew 開發
3. **優先級排序** → 商業價值 vs 開發成本
4. **文件**：`PRODUCT_MAP.md`（待建立）

---

## 🔄 更新規則

- Caesar 遇到新業務邏輯 → 更新此地圖
- 其他人需要商業邏輯 → Read 此檔案
- 重大變更 → 通知相關 agent

---

## 🎯 旅遊資料庫平台戰略（2026-04-03 更新）

### 願景

從「客服自動化」到「旅遊資源平台」，釋放人力做高價值工作。

**核心概念：**

```
客戶自己選（景點/餐廳/酒店）
  ↓
省下客服時間
  ↓
釋放人力：
- 開發供應商
- 優化供應鏈
- 提升服務品質
  ↓
更多選擇、更好價格、更高利潤
```

**階段式建置：**

1. **Phase 1（現在）**：景點資料庫（清邁 50 個）
2. **Phase 2（1-2 月後）**：餐廳資料庫
3. **Phase 3（3-6 月後）**：酒店資料庫

**資料來源：**

- 現有行程提取
- 供應商推薦
- 市場調研（持續優化）

**競爭優勢：**

- 不是單純 AI 客服，是完整資料庫
- 資料越累積越有價值（護城河）
- 深度整合 ERP（供應商/成本/利潤管理）

---

## 🚀 ERP 差異化策略（2026-04-03 更新）

### 核心賣點

1. **可客製化（插件架構）** — 不是大改特改，符合邏輯的擴充
2. **AI 客服整合** — 殺手級功能，LINE + FB + IG 全通路
3. **價格有競爭力** — 不比競品貴

### 目標客群：小旅行社

- 沒有官網
- 主要用社群媒體接單（FB/IG/LINE）
- 需要 AI 客服省人力

### 商業模式：託管服務（非 SaaS）

**重要：AI 客服是「我們的服務」，不是 ERP 功能**

| 方案   | 月費      | 包含              | 適合             |
| ------ | --------- | ----------------- | ---------------- |
| 基礎版 | $299/月   | LINE 客服         | 測試用戶         |
| 社群版 | $699/月   | LINE + FB + IG    | 小旅行社（主推） |
| 進階版 | $1,499/月 | 全通路 + 工具整合 | 中型旅行社       |

**服務流程：**

1. 租戶申請 + 付費
2. 租戶授權（LINE 系統主管 / FB Business Manager）
3. **我們後台手動設定**（無前台 UI）
4. 上線運作
5. 每月收款

**技術架構：**

- ❌ 不做：ERP 前台 UI、OAuth 流程、API key 管理
- ✅ 只做：Webhook API、內部管理 API、核心邏輯

### 開發優先級（2026 Q2）

1. ✅ LINE 客服（已完成）
2. 🔥 Facebook Messenger 客服（高優先）
3. 🔥 Instagram DM 客服（高優先）
4. 📋 工具整合：
   - 歷史行程報價查詢
   - 建立需求單
   - 航班查詢（未來）

---

## 💰 階段式商業模式（2026-04-03 更新）

### Phase 1（現在 - 12 個月）：建立客戶基礎

**產品**：Venturo ERP 核心功能

- AI 客服（LINE + FB + IG）
- 行程管理、報價系統、客戶管理

**定價**：$699-1,499/月
**目標**：50-100 家旅行社

**同時進行**：

- 角落內部使用景點系統
- 累積資料（景點/餐廳/酒店）
- 優化功能、建立標準流程

---

### Phase 2（12-24 個月）：推增值服務

**前提**：已有 50+ 家 ERP 客戶

**服務 1：景點資料庫**

- 定價：$500/城市（一次性建置）
- 維護：$50/月（更新 + 新增）
- 內容：景點 + 餐廳 + 酒店 + 供應商

**服務 2：供應商媒合**

- 定價：佣金制（3-5%）或月費 $299
- 價值：談判更好價格、品質把關

**收入預估（50 家 x 50% 購買率）：**

- 第一年：$27,500（資料庫建置）
- 之後：$15,000/年（維護訂閱）

---

### 為什麼不急著賣？

1. **市場未成熟** — 旅行社還在建自己的景點庫
2. **需要規模** — 50+ 客戶才有推廣效率
3. **產品優化** — 內部使用期間持續改進
4. **資料累積** — 越多城市、資料越有價值

**策略**：先專注賣 ERP，12 個月後再推增值服務。

---

## 🎯 階段性產品策略（2026-04-03 更新）

### 核心理念

**不強迫客戶一次跳到最先進，提供進階路徑。**

---

### 階段 1：紙娃娃系統（基礎版）

**功能：**

- 客人從 50 個景點選擇
- 業務收到清單，人工排程
- 剔除不合理、排序、建議替代

**適合：**

- 傳統旅行社
- 不想 AI 介入
- 預算有限

**定價：** 包含在基礎 ERP（$699/月）

---

### 階段 2：AI 輔助系統（進階版）

**功能：**

- 客人選景點
- AI 自動分析屬性（親子/浪漫/冒險）
- AI 推薦路線（避免來回）
- AI 計算用車時間
- 業務審核 + 微調

**適合：**

- 願意嘗試 AI
- 想提升效率
- 但還不完全信任 AI

**定價：** +$200/月

---

### 階段 3：全自動系統（旗艦版）

**功能：**

- AI 主動引導客人說出偏好
- 根據關鍵字智能推薦（含標籤匹配）
- AI 自動規劃完整行程
- 業務快速確認（幾乎不用調整）

**景點標籤系統：**

```json
{
  "atmosphere": ["relaxed", "adventurous", "romantic", "family"],
  "interests": ["cultural", "nature", "food", "shopping"],
  "activity_level": ["low", "medium", "high"],
  "age_suitable": ["kids", "teens", "adults", "seniors"]
}
```

**適合：**

- 完全擁抱 AI
- 追求極致效率
- 信任系統

**定價：** +$400/月

---

### 升級路徑

```
傳統旅行社
  ↓
使用基礎版（紙娃娃）
  ↓
感受到效率提升
  ↓
升級到進階版（AI 輔助）
  ↓
信任 AI 判斷
  ↓
升級到旗艦版（全自動）
```

**關鍵：讓客戶自己決定進化速度。**

---

## 🌍 國際化與多語言策略（2026-04-03 新增）

### 核心需求

**場景：跨國業務**

```
角落旅行社（台灣）
→ 安排清邁行程
→ 發行程給泰國司機
→ 司機看到泰文景點名稱
→ 直接 Google Maps 導航
```

---

### 資料結構設計

**景點多語言欄位：**

```sql
CREATE TABLE destinations (
  id UUID PRIMARY KEY,

  -- 多語言名稱
  name_zh_tw TEXT,      -- 繁體中文（台灣客戶）
  name_zh_cn TEXT,      -- 簡體中文（中國客戶）
  name_en TEXT,         -- 英文（國際通用）
  name_th TEXT,         -- 泰文（當地司機）
  name_ja TEXT,         -- 日文（日本客戶）
  name_ko TEXT,         -- 韓文（韓國客戶）

  -- Google Maps 整合（最重要）
  google_maps_url TEXT NOT NULL,  -- 官方連結
  google_place_id TEXT,            -- Place ID（永久不變）

  -- 座標（從 URL 提取）
  latitude DECIMAL,
  longitude DECIMAL,

  -- 其他資訊
  ...
);
```

---

### Google Maps 的優勢

**為什麼 Google Maps URL 很重要？**

1. **自動多語言**
   - Google Maps 會根據使用者語言自動顯示
   - 泰國司機開連結 → 顯示泰文
   - 台灣客服開連結 → 顯示繁中

2. **自動導航**
   - 點連結 → 直接開 Google Maps
   - 不用手動輸入地址或座標

3. **Place ID 永久不變**
   - 景點改名 → Place ID 不變
   - 座標更新 → Place ID 不變

---

### 使用場景

#### 場景 1：發行程給泰國司機

**舊方式（只有中文）：**

```
Day 1:
- 素帖寺
- 大象保育營
- 寧曼路
```

**司機困擾：**

- 不認識中文
- 要手動翻譯
- 可能找錯地方

---

**新方式（多語言 + Google Maps）：**

**行程表自動轉換語言：**

```
Day 1:
- วัดพระธาตุดอยสุเทพ（素帖寺）
  📍 Google Maps: [點擊導航]

- Elephant Nature Park（大象保育營）
  📍 Google Maps: [點擊導航]

- ถนนนิมมาน（寧曼路）
  📍 Google Maps: [點擊導航]
```

**司機操作：**

- 看到泰文名稱（熟悉）
- 點 Google Maps（自動導航）
- 完成！

---

#### 場景 2：多國客戶

**台灣客戶：**

- 看行程表 → 顯示繁體中文
- 「素帖寺」

**日本客戶：**

- 看行程表 → 顯示日文
- 「ドイステープ寺院」

**韓國客戶：**

- 看行程表 → 顯示韓文
- 「도이수텝 사원」

**系統自動切換語言**（根據客戶語言設定）

---

### 技術實作

#### 1. Google Maps API 取得多語言名稱

```typescript
async function getPlaceDetails(placeId: string, language: string) {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&language=${language}&key=${API_KEY}`

  const response = await fetch(url)
  const data = await response.json()

  return {
    name: data.result.name, // 根據 language 自動返回對應語言
    address: data.result.formatted_address,
  }
}

// 範例
await getPlaceDetails('ChIJ...', 'th') // 回傳泰文
await getPlaceDetails('ChIJ...', 'zh-TW') // 回傳繁中
await getPlaceDetails('ChIJ...', 'ja') // 回傳日文
```

**成本：** $17 / 1,000 次（可接受）

---

#### 2. 行程表語言切換

```typescript
// 根據司機/客戶語言設定顯示
function renderItinerary(itinerary, userLanguage) {
  return itinerary.items.map(item => {
    const destination = item.destination

    // 根據語言選擇對應名稱
    const displayName =
      {
        'zh-TW': destination.name_zh_tw,
        'zh-CN': destination.name_zh_cn,
        en: destination.name_en,
        th: destination.name_th,
        ja: destination.name_ja,
        ko: destination.name_ko,
      }[userLanguage] || destination.name_en

    return {
      name: displayName,
      googleMapsUrl: destination.google_maps_url,
      // 司機點擊自動導航
      navigationLink: destination.google_maps_url,
    }
  })
}
```

---

#### 3. 小車系統整合

**未來功能：**

```
客服建立行程
  ↓
系統生成 GPS 路線
  ↓
發送給司機（含 Google Maps 連結）
  ↓
司機點擊 → 自動導航
  ↓
完成接送
```

**資料來源：**

- 景點座標（從 Google Maps URL 提取）
- 飯店座標（同上）
- 自動規劃路線（Google Directions API）

---

### 資料建立流程

#### Phase 1：基礎多語言（立即做）

**人工建立：**

- 繁中名稱（台灣客戶）
- 英文名稱（國際通用）
- Google Maps URL（必填）

**其他語言：**

- 之後需要時再補

---

#### Phase 2：API 自動取得（未來）

**當需要泰文、日文、韓文時：**

```typescript
// 從 Place ID 自動取得多語言
const thaiName = await getPlaceDetails(placeId, 'th')
const japaneseName = await getPlaceDetails(placeId, 'ja')

// 更新資料庫
await updateDestination({
  name_th: thaiName,
  name_ja: japaneseName,
})
```

---

### 商業價值

**內部效益：**

- ✅ 泰國司機更容易理解行程
- ✅ 減少溝通錯誤
- ✅ 提升作業效率

**對外賣點：**

- ✅ 支援多國客戶（日韓市場）
- ✅ 自動語言切換（高級感）
- ✅ 與當地司機無縫整合

**差異化：**

- 競品只有繁中介面
- 我們支援多語言行程表
- 直接整合 Google Maps 導航

---

### 優先級

**現在：**

- ✅ 加入 `google_maps_url` 欄位（已做）
- ✅ 加入 `google_place_id` 欄位（已做）
- ✅ 加入多語言名稱欄位（待做，低優先）

**未來（有跨國業務時）：**

- 補充泰文、日文、韓文名稱ㄔㄛ
- 小車系統 GPS 整合
- 自動語言切換

**成本：**

- 欄位擴充：免費（只是加欄位）
- API 取得多語言：$17 / 1,000 次（需要時才用）

---

**關鍵洞察：**

Google Maps URL + Place ID 是多語言的基礎，有這兩個就能自動取得任何語言的名稱。

---

## 🧱 頁面必含元素（防 cleanup 砍錯）

> 2026-04-25 新增。為什麼存在：2026-04-22 的大規模 cleanup（commit 258d6220c）把 `tour-payments.tsx`（299 行）當孤兒砍了、連同 `<TourPayments />` 引用一起拔、結果總覽 / 結案分頁收款表消失。type-check 不會抓、肉眼又顧不過來。下次 cleanup AI / 工程師動到這些 component 前、先讀這份。

**規則**：
1. 拔下方任一 component 前、必須在 BUSINESS_MAP 標註替代方案（不能純拔）
2. 拔的當下、跑 `npm run dev` 點一次該 page tab 確認還能渲染
3. PR description 列「受影響 page」+ smoke test 結果

### `/tours/[code]?tab=overview`（旅遊團 · 總覽）

| 必含 component | 為什麼不能砍 |
|---|---|
| `TourOverview` | 4 格統計卡（收入/支出/利潤/訂單數）— 業務一眼看財務 |
| `TourReceipts` | **收款明細表（綠色）— 2026-04-25 補回**。業務要看實收紀錄 |
| `TourCosts` | 請款明細表（紅色、`showSummary={false}`）— 業務要看付出去的錢 |

掛載點：`src/features/tours/components/TourTabs.tsx` `case 'overview'`

### `/tours/[code]?tab=closing`（旅遊團 · 結案）

| 必含 component | 為什麼不能砍 |
|---|---|
| `TourOverview` | 同上 |
| `TourReceipts` | 同上 — 結案要對帳收款 |
| `TourCosts` | 同上 — 結案要對帳請款 |
| `ProfitTab` | 利潤計算（金色卡片 + 兩欄）— 結案核心數字 |
| `BonusSettingTab` | 獎金設定 — 結案後分配獎金依據 |
| 結案狀態列 + PDF 按鈕 | 「標記結團」+「生成結案報告」業務動作 |

掛載點：`src/features/tours/components/tour-closing-tab.tsx`

### `/tours/[code]?tab=quote`（旅遊團 · 報價）

| 必含 component | 為什麼不能砍 |
|---|---|
| `TourQuoteTabV2`（左：⭐主報價 + 多張快速報價列表 / 右：選中內容） | 葡萄串模型核心 UI（docs/QUOTES_SSOT.md） |

關鍵業務規則（不能改設計）：
- 主報價（standard）= 完整方案，0 或 1 張/團
- 快速報價（quick）= 收訂金/尾款/雜項，0~N 張/團
- 找主報價：`quotes.tour_id + quote_type='standard'` 反查（不要再加 `tours.quote_id` 捷徑、會破壞 SSOT）

### `/tours/[code]?tab=itinerary`（旅遊團 · 行程）

| 必含 component | 為什麼不能砍 |
|---|---|
| `TourItineraryTab` | 行程編輯主畫面（含天數、景點、餐食、住宿） |

寫入目標：`tour_itinerary_items` 表（核心表 SSOT、見本檔開頭「世界樹」）

### `/quotes`（報價列表）

| 必含 component | 為什麼不能砍 |
|---|---|
| 報價列表 table | 搜尋、新增快速報價（X 系列）入口 |

⚠️ `data/entities/quotes.ts` 的 select 字串若拔欄位、要同步驗證列表頁不爆。

---

**新增頁面到本清單的時機**：
- 業務說「這頁畫面消失了」
- cleanup PR 拔 component
- 加新分頁 / 路由

