# 參考資料重構計畫：國家 / 機場 SSOT 化

**日期**：2026-04-15
**狀態**：待執行
**原則**：**業務感覺不出差別，底層變得很乾淨**

---

## 〇、這份文件解決什麼問題

目前 `countries` 和 `ref_airports` 把「世界事實」和「租戶偏好」混在同一張表，造成三個問題：

1. **RLS 漏洞**：任何租戶都能寫入 / 修改 `workspace_id IS NULL` 的全域資料，一家公司能污染所有人的資料
2. **概念不清**：新租戶上線要不要複製一份？租戶想改暱稱會不會影響別人？沒有明確答案
3. **擴充卡住**：想做「租戶啟用某些國家 = 給新員工看的範圍」這類需求，現在架構做不到

---

## 一、最終架構（定案）

### 資料層級

| 層級 | 表 | 擁有者 | 寫入權限 | 性質 |
|---|---|---|---|---|
| **L1 全球參考** | `ref_countries`, `ref_airports` | 平台（Venturo） | super admin only | 客觀世界事實 |
| **L2 租戶 overlay** | `workspace_countries` | 該租戶 | 該租戶 | 啟用開關、未來可擴充 |
| **L3 租戶業務** | `tours`、`itineraries` 等既有表 | 該租戶 | 該租戶 | 引用 L1 的自然鍵 |

### 三個關鍵設計

1. **L1 用自然鍵當 PK**：`ref_countries.code` (ISO 2碼)、`ref_airports.iata_code` (IATA 3碼)。不用 UUID。
2. **L2 第一版只有一個欄位**：`is_enabled`。其他（暱稱、照片、文案）等真的有需要再加。
3. **關閉 = 只影響可見性，不影響歷史**。既有行程、報表照常顯示，只有「新增 / 搜尋」選單會過濾。

---

## 二、盤點結果（影響範圍）

### 資料庫層
- **FK 指向 `countries`**：13 張表透過 `country_id`，其中 **3 個硬 FK 約束**（`luxury_hotels`、`restaurants`、`transportation_rates`）
- **FK 指向 `ref_airports`**：**0 個硬 FK**（全部用文字比對 iata_code）
- **連帶影響表**：`cities`、`regions`（FK 到 `countries`）

### 應用層
- 查詢 `countries` 的檔案：**24 個**
- 查詢 `ref_airports` 的檔案：**15 個**
- UI 選擇器：2 個主要（`CountryAirportSelector`、`destination-selector`）
- 租戶管理頁：`/settings/workspaces/page.tsx`（目前沒有國家啟用區塊）

### 資料量
- 現有 `countries`：硬編碼 4 國（日泰韓越）— 要擴充到 249 ISO 國
- 現有 `ref_airports`：約 7000+ 筆（OpenFlights）— 資料源已就位

---

## 三、執行計畫（分階段，每階段可獨立驗證）

### Stage 0：前置確認（動手前）
- [ ] 確認 `luxury_hotels`、`restaurants`、`transportation_rates` 三張表目前的資料量（是否為空）
- [ ] 確認沒有其他人正在改這幾張表（避免衝突）
- [ ] 在本地備份當前 `countries` / `ref_airports` 資料

---

### Stage 1：機場（最低風險，單獨可完成）
**目標**：`ref_airports` 變成純 L1 全球參考表

| 步驟 | 動作 | 驗證 |
|---|---|---|
| 1.1 | 寫 migration：把 `ref_airports` 裡所有 `workspace_id IS NOT NULL` 的 row 刪除或歸零（盤點結果顯示目前應該全部是 NULL） | SQL：`SELECT COUNT(*) FROM ref_airports WHERE workspace_id IS NOT NULL` 應為 0 |
| 1.2 | 寫 migration：DROP `workspace_id` 欄位 | schema check |
| 1.3 | 重寫 RLS：SELECT 任何 authenticated user；INSERT/UPDATE/DELETE 只限 `is_super_admin()` | 用一般租戶帳號試 INSERT 應失敗 |
| 1.4 | 廢棄 `/api/airports` 的 POST（或加 `is_super_admin()` 檢查） | 呼叫該 API 應回 403 |
| 1.5 | 確認 `useAirports()` hook、`CountryAirportSelector` 等 15 個讀取點仍正常 | 行程編輯器能正常選機場 |

**業務感受**：無差別。機場下拉選單照常運作。
**底層變化**：任何租戶無法亂改機場資料；全域資料只有 super admin 能動。

**回滾方式**：恢復 migration 前的 schema。資料沒動過。

---

### Stage 2：國家參考表建立（不影響既有表）
**目標**：建立 `ref_countries` 和 `workspace_countries`，灌完整 ISO 資料。**舊的 `countries` 表先不動。**

| 步驟 | 動作 | 驗證 |
|---|---|---|
| 2.1 | 建立 `ref_countries` 新表（PK = `code` ISO 2碼，欄位：`code`, `name_zh`, `name_en`, `emoji`, `continent`, `is_active`） | schema check |
| 2.2 | 灌 249 ISO 國家資料（寫 seed script，資料源用 ISO 3166-1 標準） | `SELECT COUNT(*) FROM ref_countries` = 249 |
| 2.3 | 建立 `workspace_countries` overlay 表（欄位：`id`, `workspace_id`, `country_code`, `is_enabled`, `created_at`, `updated_at`。`UNIQUE(workspace_id, country_code)`） | schema check |
| 2.4 | RLS：`ref_countries` 讀寫規則同 `ref_airports`；`workspace_countries` 只能動自己 workspace 的 row | 測試帳號寫入驗證 |
| 2.5 | 寫一個 helper function `is_country_enabled(workspace_id, country_code)`，預設回傳 true（沒設定 = 啟用） | SQL 單元測試 |

**業務感受**：無差別。新表還沒人用。
**底層變化**：L1 + L2 架構已就位，但還沒接上業務。

**回滾方式**：DROP 新表即可，舊 `countries` 沒動。

---

### Stage 3：業務表 FK 遷移（最小心的一刀）
**目標**：把 13 張依賴 `countries` 的表改成指向 `ref_countries.code`。

#### 3A：處理 3 張硬 FK 表
- `luxury_hotels.country_id` → 改為 `country_code text REFERENCES ref_countries(code)`
- `restaurants.country_id` → 同上
- `transportation_rates.country_id` → 同上

#### 3B：處理 10 張軟參考表（`attractions`, `quotes`, `cities`, `regions`, ...）
- 逐表檢查用途
- 若是透過 `country_id` lookup 名稱 → 改讀 `ref_countries`
- 若有 JOIN 查詢 → 改 JOIN 對象

#### 3C：`cities` / `regions` 的處理
- **不重構表結構**（避免雪球），但把 FK 指向從 `countries.id` 改為 `ref_countries.code`
- 需要新增 `country_code` 欄位，從 `countries.code` 反查後填入
- 原 `country_id` 欄位保留一段時間當 compatibility shim

| 步驟 | 動作 | 驗證 |
|---|---|---|
| 3.1 | 對每張硬 FK 表寫 migration：新增 `country_code`，從舊 `country_id` 反查填入 | 資料完整性檢查 |
| 3.2 | 刪除舊 FK 約束，建立新 FK 到 `ref_countries(code)` | `\d+ luxury_hotels` 檢查 |
| 3.3 | 更新 24 個查詢檔案：從 `countries` 改讀 `ref_countries`，JOIN 條件改用 `code` | TypeScript 編譯通過 |
| 3.4 | 更新 `src/types/database.types.ts`（重跑 Supabase gen types） | types 檢查 |
| 3.5 | 全站煙霧測試：行程建立、飯店選擇、報價、景點列表、運輸成本 | 手動測試所有用到國家的功能 |

**業務感受**：無差別。所有下拉選單、搜尋、報表一樣運作。
**底層變化**：業務表脫離舊 `countries`，指向乾淨的 `ref_countries`。

**回滾方式**：保留舊 `countries` 欄位不刪除，FK 可以 revert。

⚠️ **這是最高風險的 Stage，完成後務必全站煙霧測試。**

---

### Stage 4：UI — 租戶國家啟用
**目標**：租戶管理頁加「國家啟用」區塊，所有選單加過濾。

| 步驟 | 動作 | 驗證 |
|---|---|---|
| 4.1 | 在 `/settings/workspaces/[id]/page.tsx` 新增「國家範圍」區塊 | UI 可見 |
| 4.2 | 元件：國家列表（按洲分組），每個國家一個 toggle，預設全開 | 啟用/停用可持久化 |
| 4.3 | 改寫 `CountryAirportSelector` 和 `destination-selector`：在讀取國家時 LEFT JOIN `workspace_countries`，`is_enabled = false` 過濾掉 | 關閉非洲後，選單看不到非洲國家 |
| 4.4 | 重要：**歷史資料不過濾**。既有行程的國家欄位照常顯示 | 開啟一張非洲的舊行程應該正常 |
| 4.5 | 加一個「重設為全部啟用」按鈕 | UI 功能 |

**業務感受**：多了一個設定頁。新員工看到的選單更乾淨。
**底層變化**：L2 overlay 開始真正發揮作用。

---

### Stage 5：清理舊 `countries` 表
**目標**：確認沒有任何程式碼還在讀寫 `countries`，把它 DROP 掉。

| 步驟 | 動作 | 驗證 |
|---|---|---|
| 5.1 | 全站 grep 一次 `from('countries')` / `REFERENCES countries` | 應該 0 個結果 |
| 5.2 | 建立一個 view `countries` 指向 `ref_countries`（compatibility shim，保留 1-2 週以防漏改） | `SELECT * FROM countries` 仍可用 |
| 5.3 | 觀察期 1-2 週確認無異常 | log 無相關錯誤 |
| 5.4 | DROP view | 清理完成 |

**業務感受**：無差別。
**底層變化**：沒有遺跡。

---

## 四、風險總表

| Stage | 風險等級 | 主要風險 | 緩解方式 |
|---|---|---|---|
| 1（機場） | 🟢 低 | 幾乎無 | 無 FK 依賴，失敗就 revert migration |
| 2（國家 ref 建立） | 🟢 低 | 新增表，獨立 | 失敗就 DROP 新表 |
| 3（業務 FK 遷移） | 🔴 高 | 24 個檔案改動，可能漏改造成查詢失敗 | 分三批改、煙霧測試全站、保留舊欄位當後路 |
| 4（UI） | 🟡 中 | 過濾邏輯可能誤擋歷史資料 | 在歷史查詢路徑上明確不套用過濾 |
| 5（清理） | 🟢 低 | 漏改的程式碼會失敗 | 保留 compatibility view 1-2 週 |

---

## 五、檢查清單（回頭對帳用）

### 概念檢查
- [ ] `ref_countries` 沒有 `workspace_id` 欄位
- [ ] `ref_airports` 沒有 `workspace_id` 欄位
- [ ] `workspace_countries` 第一版只有 `is_enabled` 欄位（加上 PK 和時間戳）
- [ ] 業務表的國家引用都用 `country_code`（text, ISO），不再用 UUID `country_id`

### RLS 檢查
- [ ] `ref_*` 表：一般租戶 INSERT / UPDATE / DELETE 應該全部失敗
- [ ] `ref_*` 表：super admin 可以正常 CRUD
- [ ] `workspace_countries`：A 租戶看不到 B 租戶的啟用設定
- [ ] 沒有任何 RLS policy 包含 `workspace_id IS NULL OR workspace_id = ...` 這種漏洞寫法

### 業務功能檢查
- [ ] 建立新行程 → 國家下拉選單正常
- [ ] 建立新行程 → 機場下拉選單正常
- [ ] 飯店搜尋（依國家篩選）正常
- [ ] 餐廳搜尋正常
- [ ] 運輸成本查詢正常
- [ ] 景點列表依國家篩選正常
- [ ] 報價單國家選擇正常
- [ ] 歷史行程開啟時國家照常顯示（即使該國被停用）

### 租戶管理
- [ ] 進入租戶設定頁可看到「國家啟用」區塊
- [ ] toggle 停用某國後，新行程的選單中該國消失
- [ ] 重新啟用後立即可用
- [ ] 預設值為「全部啟用」

---

## 六、核心原則（貼在螢幕上）

> **業務感覺不出差別，底層變得很乾淨。**

每一步完成後問自己：
1. 員工今天用系統會不會卡住？（應該不會）
2. 資料長期會不會更好管？（應該會）

兩個答案都 yes 才算過關。

---

## 七、尚未定案的問題

1. `cities` / `regions` 是否在這次重構中一併拆成 `ref_cities` / `ref_regions`？
   → 目前建議**不要**，避免雪球。它們繼續掛在新的 `ref_countries.code` 下即可。

2. 景點（attractions）要不要在這次也改？
   → **不要**。景點走 L2 商品模式（CORNER 擁有 + 授權），跟這次重構是不同軌道，維持現狀。

3. 是否要保留租戶自訂機場的能力？
   → **不保留**。第一版只有 super admin 能維護 `ref_airports`。如果未來某租戶真的要非 IATA 機場再說。
