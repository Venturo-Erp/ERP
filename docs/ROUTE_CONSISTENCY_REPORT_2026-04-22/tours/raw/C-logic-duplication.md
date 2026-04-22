# Agent C 邏輯重複 + 必抓 Pattern 檢測報告 (/tours)
**日期**: 2026-04-22 | **Route**: `/tours` | **Agent**: C (邏輯重複 + 必抓 pattern 組)

---

## 一、邏輯重複（Duplicate Logic）

### 1.1 報價計算邏輯 — 多處並存、規則不一

**問題**：住宿/餐飲/活動/交通/領隊的 quantity 計算意義分散在多個 hook，定義不一致。

| 位置 | 計算邏輯 | 意義解釋 | 狀態 |
|------|--------|--------|------|
| `useCategoryItems.ts:44-136` | `quantity ÷ unit_price = total` | **住宿**：幾人房（quantity=人數） / **餐飲**：幾人桌（quantity=人數） / **活動**：幾人分攤 / **領隊**：`is_group_cost=true` 時團體分攤 | 主流頁籤使用 |
| `useQuoteLoader.ts:168-242` | 簡單轉換（無複雜計算） | 從舊 `quote_items` 表直接讀、無 quantity 分攤邏輯 | 向後相容、廢棄表 |
| `tour-itinerary-tab.tsx:80-91` | 簡單檢查 `canEditDatabase = isAdmin \|\| permissions` | 權限檢查（非計算邏輯） | UI gate |

**紅旗**: 
- `useCategoryItems` 在 lines 80-136 有詳細分攤邏輯（成人/兒童/嬰兒、團體/個人、group-transport category）
- `useQuoteLoader` 在 lines 168-242 只做簡單映射，**沒有分攤計算**
- 若有新報價從 `quote_items` 載入，不會執行分攤邏輯 → **價格計算漂移風險**

**影響**：
- 快速報價載入的 quantity 意義與手工編輯不同 → 同一團行程、估算金額不一致
- 交通和領隊的分攤條件在 `useCategoryItems` 明確列出，但 `useQuoteLoader` 無法重現

**建議檢查**：
```typescript
// useCategoryItems.ts:94-107 領隊分攤邏輯
if (updatedItem.is_group_cost && groupSizeForGuide > 1) {
  const total_cost = effectiveQuantity * (updatedItem.unit_price || 0)
  updatedItem.total = Math.ceil(total_cost / groupSizeForGuide)
}

// useQuoteLoader.ts:244-320 「快速報價項目」（quick_quote_items）沒有這套邏輯
// 直接 item.amount（已計算好的值）
```

---

### 1.2 核心表寫入 — syncToCore 單一入口，但業務邏輯不清

**問題**：`useTourItineraryItems.ts` 的 `syncToCore()` 是唯一寫入核心表的入口，但它混合了多種責任。

**位置**:
- `useTourItineraryItems.ts:232-580` — 唯一的 syncToCore 實作
- `tour-itinerary-tab.tsx:82` — 呼叫者 #1
- `usePackageItinerary.ts:??` — 呼叫者 #2（快速詢價精靈）

**邏輯**:
1. **刪除判斷**（lines 304-343）— 用指紋（fingerprint）比對舊新項目
2. **價格保留**（lines 345-371）— 若項目存在於舊行程、保留舊價格
3. **需求單狀態轉換**（lines 403-422）— 修改項目 → `outdated`，刪除項目 → `cancelled`
4. **住宿續住解析**（lines 495-549）— 「續住」「同上」自動展開為飯店名
5. **category 轉換**（lines 161-230）— activity/meal/accommodation → 核心表行

**紅旗**:
- 行 315-322：住宿續住由 day_number 配對 → 同天有多間飯店時會覆蓋
- 行 366：老項目名稱改了、自動加備註「⚠️ 行程變更」 → 若需求單已產生、該備註對誰可見？
- 行 404-409：modifiedRequestIds 在此標記 `outdated`，但沒檢查「該需求單是否已成交」→ **覆蓋已接受訂單風險**

**建議檢查**：
```typescript
// 行 404-409：標記需求單為 outdated 時，是否檢查了狀態？
if (modifiedRequestIds.size > 0) {
  await supabase
    .from('tour_requests')
    .update({ status: 'outdated' })  // ❌ 直接覆蓋，無條件檢查
    .in('id', Array.from(modifiedRequestIds))
}
```

---

### 1.3 狀態機 — tour.status vs order.status 無統一定義

**問題**：tour 和 order 的狀態轉換規則分散在多個元件、沒有集中定義。

**位置**:
- `accept/route.ts:26-30` — tour_requests 轉為 `'已確認'`
- `reject/route.ts:22-27` — tour_requests 轉為 `'取消'`
- `useSyncItineraryToCore.ts:407` — 行程修改時轉為 `'outdated'`
- `useSyncItineraryToCore.ts:418` — 行程刪除時轉為 `'cancelled'`

**紅旗**:
- 狀態定義散落、無enum集中管理
- 「outdated」「cancelled」與「取消」的區別不明確
- 沒有狀態機圖（state diagram）驗證轉換合法性

---

### 1.4 住宿連續合併 — 需求單 + 分房重複邏輯

**問題**：住宿合併邏輯在兩處各自實作。

| 位置 | 用途 | 實作 |
|------|------|------|
| `useAccommodationSegments.ts:52-105` | 讀取行程的住宿項、合併連續同飯店 | 按 day_number 排序、連續相同飯店合併 |
| `useTourItineraryItems.ts:495-549` | 行程編輯時，解析「續住」「同上」為真飯店名 | 正則提取飯店名 / 往前查最近一天 |

**紅旗**:
- `useAccommodationSegments` 正規化飯店名（lines 42-47），但只移除空白、**不處理「續住」解析**
  - 若 itinerary.accommodation = "續住 (X 飯店)"，useAccommodationSegments 會把它當成獨立飯店
  - 導致「續住」與真飯店名視為不同 → 合併邏輯失效
- `useSyncItineraryToCore` 有完整「續住」解析（lines 495-549）
- 但在需求單頁面，若未經 syncToCore 再讀、會看到未解析的「續住」字樣

**影響**：
- 分房時看到「續住」未展開的飯店名
- 合併邏輯以字面名稱比對、「續住 (A飯店)」和「A飯店」視為不同

---

### 1.5 權限檢查 — useVisibleModuleTabs vs 頁面內部過濾

**問題**：tab 可見性檢查在 hook 層和頁面層各自做了一遍。

| 位置 | 邏輯 | 覆蓋範圍 |
|------|------|--------|
| `hooks.ts:218-235` useVisibleModuleTabs | 根據 workspace 設定（premium / basic） + category（`isEligibility`）過濾 | 給 TourTabs 用、篩 TOUR_TABS 列表 |
| `tour-itinerary-tab.tsx:80-91` canEditDatabase | 檢查 isAdmin \|\| permissions.includes('database') | 單個元件內部gate |

**紅旗**:
- 這兩個檢查層次不同，不算「重複」，但暗示：
  - Module 層（tab 可見性）用 workspace features
  - 功能層（編輯權限）用 role permissions
  - 兩套系統無交集 → **可能漏掉某個維度的檢查**
- 例：tab 被隱藏、但元件內的 canEditDatabase 仍可能過 → 若 API 有漏洞，可繞過 tab 限制

---

## 二、既知必抓 Pattern 驗證結果

### 2.1 🔴 Role-gate 偽裝成 Permission-gate

**搜尋結果**：
```
✓ src/stores/auth-store.ts:249
  if (get().isAdmin) return true  // ← 短路
```

**詳細**:
```typescript
// auth-store.ts:240-251
export function useRolePermissions() {
  const { user } = useAuthStore()
  
  const canWrite = useCallback(
    (route: string): boolean => {
      const perm = permissions.find(p => route.startsWith(p.route))
      return perm?.can_write ?? true  // 預設允許
    },
    [permissions]
  )
  
  // ...
}

// auth-store.ts:275-300
export function usePermissions() {
  const isAdmin = useAuthStore(state => state.isAdmin)
  
  const canEdit = useCallback(
    (route: string): boolean => {
      if (isAdmin) return true  // ← 短路（行 294）
      if (!workspaceFeatures.isRouteAvailable(route)) return false
      if (!rolePermissions.canWrite(route)) return false
      return true
    },
    [isAdmin, workspaceFeatures, rolePermissions]
  )
}
```

**違反設計**：✅ 命中
- `isAdmin` 直接短路返回 true（line 284, 294）
- 未檢查 workspace features 或 role permissions
- **但**：這在 hooks 層是預期行為（admin 不受限）；問題在 API 層是否也這樣做

**檢查 API 層**:
- `accept/route.ts` — 無 isAdmin 檢查、只用 RLS（`eq('id', requestId)` 由 RLS 過濾）✓
- `reject/route.ts` — 同上 ✓
- `by-code/route.ts` — 無 auth，公開端點 ✓

**結論**：🟢 No violation at API layer（API 層無偽裝）。Hook 層的短路符合預期。

---

### 2.2 🟡 UI 假功能

**檢查清單**：
1. AddPaymentDialog — 快速收款
2. TourClosingDialog — 結團
3. TourUnlockDialog — 解鎖
4. BonusSettingDialog — 獎金設定
5. TourConfirmationWizard — 確認書精靈

**找到的組件**：
- ✓ `AddPaymentDialog.tsx` — 存在
- ✓ `TourClosingDialog.tsx` — 存在
- ✓ `TourUnlockDialog.tsx` — 存在
- ✓ `BonusSettingDialog.tsx` — 存在
- ✓ `TourConfirmationDialog.tsx` — 存在（不是 Wizard）

**檢查 UI → 送出 → 後端 流程**（抽樣）:

因為沒有完整讀取所有 dialog 實作，暫無法逐個檢查「checkbox/toggle 有沒有帶到 API」。需要在下一輪深入閱讀。

**初步結論**：🟡 需完整檢查（本輪無法詳細驗證）

---

### 2.3 🟡 歷史殘留

**TODO / FIXME / deprecated / v1v2**:

| 檔案 | 行 | 內容 |
|------|----|----|
| `tour-itinerary-tab.tsx:52` | - | `// syncItineraryToQuote 已移除 — 報價單直接讀核心表，不需要同步` |
| `useQuoteLoader.ts:146` | - | `// 註：quote_items 表已廢棄，此查詢為向後兼容保留` |
| `TourTabs.tsx:67-70` | - | `const TourQuoteTabV2` — **v2 存在，暗示 v1 也還在** |

**多主題存在確認**：
```
src/features/tours/components/sections/
  - TourHeroLuxury.tsx ✓
  - TourHeroCollage.tsx ✓
  - TourHeroGemini.tsx ✓
  - TourItinerarySectionLuxury.tsx ✓
  - TourFeaturesSectionLuxury.tsx ✓
  - TourFeaturesSectionCollage.tsx ✓
  - TourPricingSectionLuxury.tsx ✓
  - TourPricingSectionCollage.tsx ✓
  - TourLeaderSectionLuxury.tsx ✓
  - TourLeaderSectionCollage.tsx ✓
  - TourHotelsSectionLuxury.tsx ✓
  - TourHotelsSectionCollage.tsx ✓
  - TourPriceTiersSectionLuxury.tsx ✓
  - flight/LuxuryFlightSection.tsx ✓
  - flight/CollageFlightSection.tsx ✓
```

**紅旗**：
- Luxury / Collage 主題完全並存（~16 個組件）
- Gemini 主題只有 Hero（不完整）
- 無文檔說明「為什麼有多主題」「哪個是當前選用」「什麼時候淘汰其他」

**結論**：🔴 確認存在（多主題、v1v2 並存、表廢棄但向後相容）

---

### 2.4 🔴 Middleware 公開路由清單過寬

**middleware.ts:57-101 公開清單**:
```typescript
const publicPaths = [
  '/api/itineraries',  // ← 公開 itinerary API
  '/api/contracts/sign',
  '/api/quotes/confirmation/customer',
  '/api/d',
  ...
]
```

**檢查 `/api/tours/*` 狀態**：
- ✅ `/api/tours/[tourId]/requests/[requestId]/accept` — **不在公開清單**（需認證）
- ✅ `/api/tours/[tourId]/requests/[requestId]/reject` — **不在公開清單**（需認證）
- ✅ `/api/tours/by-code/[code]` — **不在公開清單**，但無 auth 檢查、用 service_role key

**紅旗**：
- `by-code/route.ts:15-17` 用 `SUPABASE_SERVICE_ROLE_KEY`（admin 權限）且無認證
  - 雖然只回傳公開欄位，但任何人都能查詢任何 tour
  - 若隱私要求「尚未發佈的團不該被公開查」，這是洞

**結論**：🟡 中危（by-code 無認證、雖回傳公開欄位、但未驗證發佈狀態）

---

### 2.5 🔴 跨租戶操作缺 workspace 驗證

**檢查 accept/reject/by-code**:

| 路由 | workspace 檢查 | RLS 保護 | 結論 |
|------|---------|---------|------|
| `/api/tours/[tourId]/requests/[requestId]/accept` | ❌ 無顯式檢查 | ✓ RLS 自動過濾（eq('id', requestId)） | 依賴 RLS |
| `/api/tours/[tourId]/requests/[requestId]/reject` | ❌ 無顯式檢查 | ✓ RLS 自動過濾 | 依賴 RLS |
| `/api/tours/by-code/[code]` | ❌ 無檢查 | ❌ 用 service_role、無 RLS | 🔴 有洞 |

**深入檢查 accept 邏輯**（lines 22-60）:
```typescript
// 1. 更新 tour_requests（RLS 過濾）
.eq('id', requestId)
  // ↑ RLS 會根據 session.user 過濾、但沒檢查此 request 屬於哪個 workspace

// 2. 取得 workspace_id（從 request）
const { data: request } = await supabase
  .from('tour_requests')
  .select('workspace_id')
  .eq('id', requestId)
  .single()

// ❌ 取出 workspace_id 後、沒比對 session.workspace_id
// 應該：if (request.workspace_id !== session.workspace_id) return 403
```

**結論**：🔴 Critical（無顯式跨租戶檢查，完全依賴 RLS；若 RLS 有漏洞 → 租戶越界）

---

## 三、小結

### 邏輯重複（按風險排序）
1. **高** — 報價計算 quantity 意義不一（useCategoryItems vs useQuoteLoader）
2. **中** — syncToCore 混合多責任、修改需求單無條件檢查
3. **中** — 住宿合併邏輯不會解析「續住」
4. **低** — 狀態機無集中定義
5. **低** — useVisibleModuleTabs + canEditDatabase 兩層檢查

### 必抓 Pattern
| Pattern | 狀態 | 嚴重度 |
|---------|------|--------|
| Role-gate 短路 | ✅ 無違反（API 層依賴 RLS） | 低 |
| UI 假功能 | 🟡 需完整檢查 | 中 |
| 歷史殘留 | ✅ 存在（v1v2、多主題、表廢棄） | 低 |
| 公開清單過寬 | 🟡 by-code 無認證 | 中 |
| 跨租戶檢查 | 🔴 缺顯式檢查 | **高** |

---

## 四、建議行動

1. **即刻** — 檢查 accept/reject 的 RLS 是否確實過濾 workspace（可能需補 policy）
2. **本周** — 萃取報價計算邏輯為共享函數、useQuoteLoader 改用它
3. **本周** — syncToCore 拆分責任（sync / pricing-carryover / request-status-update 各自）
4. **下周** — 確認「多主題」是否實驗殘留、決定淘汰時間
5. **下周** — 為 by-code 加 published_status 檢查
