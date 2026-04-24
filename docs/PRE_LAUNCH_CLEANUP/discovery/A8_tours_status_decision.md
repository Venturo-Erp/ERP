# A8 · Tours Status Decision（William 訪談定案 2026-04-23）

**上游文件**: `A8_status_normalization.md`（全 DB status normalization 總表）
**此文件**: 只鎖定 `tours.status` 這一條、補細節、覆蓋 A8 原本 4 狀態提案。

---

## 為什麼需要這份補充文件

A8 原提案 tours.status 只有 4 個值（proposal / pending_departure / completed / cancelled）、
2026-04-23 逐題訪談 William 後發現：

- 業務實際有 **6 個狀態** + 封存獨立維度、不是 4 個
- 「取消」不是狀態、是**封存的原因之一**
- 「待出發 vs 進行中」是**日期自動算**、不是手動切
- 現有 `tour_type` 欄位（official/proposal/template）要併進 `status`

**本文件取代 A8 裡 tours.status 的那一段、其他 9 個 status 欄位仍照 A8 走。**

---

## 最終狀態機

### 狀態（6 個值、存 `tours.status`）

| 英文值     | 中文顯示 | 定義                                     |
| ---------- | -------- | ---------------------------------------- |
| `template` | 模板     | 公司預設範本、可被複製、無團號、不會出發 |
| `proposal` | 提案     | 報價詢價階段、無確定日期、無團號         |
| `upcoming` | 待出發   | 已開團、有團號、出發日未到               |
| `ongoing`  | 進行中   | 出發日到了、回程日未過（自動轉換）       |
| `returned` | 未結團   | 回程日過了、還沒按結案（自動轉換）       |
| `closed`   | 已結團   | 按了結案按鈕、錢都結完、準備發獎金       |

### 封存（獨立維度、不算狀態）

| 欄位                   | 值                                     |
| ---------------------- | -------------------------------------- |
| `tours.archived`       | boolean                                |
| `tours.archive_reason` | `no_deal` / `cancelled` / `test_error` |

**任何狀態都可以被封存**，解除封存後回到原本狀態。

### 動作（5 個）

| 動作 | 從 → 到                  | 觸發方式                     |
| ---- | ------------------------ | ---------------------------- |
| 複製 | template → proposal      | 按鈕（模板專屬）             |
| 開團 | proposal → upcoming      | 按鈕（提案專屬）、需填出發日 |
| 結案 | returned → closed        | 按鈕（詳細頁、未結團專屬）   |
| 封存 | 任何狀態 → archived=true | 按鈕 + 選原因                |
| 刪除 | 整筆消失                 | 按鈕（最後手段）             |

### 自動轉換（2 個、日期觸發）

| 觸發               | 條件                   |
| ------------------ | ---------------------- |
| upcoming → ongoing | 今天 >= departure_date |
| ongoing → returned | 今天 > return_date     |

---

## DB 現況（2026-04-23 全表 query）

**總筆數**: 46 筆

### `tours.status` 值分佈（中英混存）

| 值         | 筆數 | 類型                 |
| ---------- | ---- | -------------------- |
| `待出發`   | 27   | 中文                 |
| `planning` | 10   | 英文（疑）           |
| `提案`     | 4    | 中文                 |
| `已完成`   | 3    | 中文（A8 未列）      |
| `進行中`   | 1    | 中文                 |
| `特殊團`   | 1    | 中文（根本不是狀態） |

### `tours.tour_type` 值分佈

| 值         | 筆數 | 代碼定義的合法值？ |
| ---------- | ---- | ------------------ |
| `official` | 23   | ✓                  |
| `proposal` | 11   | ✓                  |
| `outbound` | 10   | ✗ 代碼沒定義此值   |
| `template` | 2    | ✓                  |

### `tours.closing_status` 值分佈

| 值     | 筆數       |
| ------ | ---------- |
| `open` | 46（全部） |

**結論**：closing_status 欄位從沒被真正用過（沒有任何 `closed` 值）、可直接砍掉、只留 `status`。

### `tours.archived` 值分佈

| 值           | 筆數                  |
| ------------ | --------------------- |
| `true`       | 1（原因 = `no_deal`） |
| `false/null` | 45                    |

---

## 對照字典（遷移用）

### status 欄位

| 現有值     | 筆數 | → 目標值           | 備註                                                           |
| ---------- | ---- | ------------------ | -------------------------------------------------------------- |
| `提案`     | 4    | `proposal`         | 直接翻譯                                                       |
| `待出發`   | 27   | `upcoming`         | 直接翻譯（如 dep 日已過、改 `ongoing`）                        |
| `進行中`   | 1    | `ongoing`          | 直接翻譯                                                       |
| `已完成`   | 3    | `closed`           | 翻譯（但這 3 筆的 closing_status 仍 `open`、代表沒按結案按鈕） |
| `planning` | 10   | **刪除整筆**       | 全是 TEST 測試資料（見下）                                     |
| `特殊團`   | 1    | ⚠️ 需 William 決策 | 唯一一筆、是「2026年度簽證專用團」                             |

### tour_type 欄位（將砍掉、併進 status）

| 現有值     | 筆數 | → 動作                                                          | 備註                                                       |
| ---------- | ---- | --------------------------------------------------------------- | ---------------------------------------------------------- |
| `official` | 23   | 不存進 status（`official` 只是「正式團」的集合、真相在 status） | —                                                          |
| `proposal` | 11   | 確認 status 也是 `proposal`/`待出發` 之一                       | 有 7 筆 type=proposal × status=待出發 的「提案轉正式」遺留 |
| `template` | 2    | `status=template`（這 2 筆目前 status=待出發、要更正）          | —                                                          |
| `outbound` | 10   | 隨 TEST 資料一起砍                                              | —                                                          |

### closing_status 欄位

**直接砍整欄**（46 筆全 `open`、沒實際使用）。
結案資訊靠 `status='closed'` 就夠。

---

## ⚠️ 3 個異常需要 William 拍板

### ① 10 筆 TEST 測試團（planning + outbound）

名稱都是 `TEST001` - `TEST010` / 測試團 / 驗證團。
**建議**：直接整筆刪除（不是軟刪、是 DELETE）。

### ② 3 筆「已完成」團是否補按結案？

- 上海私人包團（2026-03-18）
- Liz高爾夫球團（2026-03-21）
- 唐家姐妹西安六日遊（2026-03-12）

都是 3 月出發、實際已回團、但 status 被手動改成「已完成」、**沒走結案按鈕流程**（closing_status 仍 `open`、獎金結算未跑）。

**建議**：

- 選 A：就遷移成 `status='closed'`、補跑一次結案流程讓獎金算完
- 選 B：遷移成 `status='returned'`（未結團）、William 去按結案

### ③ 1 筆「特殊團」如何歸類？

「2026年度簽證專用團」VISA2026001、出發日 2026-03-29。
這是 `createAdHocTour(serviceType='visa')` 創的**簽證專用團**（ad-hoc、滾動型）。

**建議**：

- 此類「滾動型 ad-hoc 團」其實跟一般旅遊團的生命週期不一樣（永遠開著、客人隨到隨處理）
- 可能需要第 7 個狀態 `rolling` 或 `ad_hoc`、或獨立欄位 `is_ad_hoc`
- **需 William 確認**：簽證團會「結案」嗎？或永遠開著？

---

## 實施順序

### Phase 0（2026-04-23 完成）✅

- 訪談定案 6 狀態 + 封存獨立
- DB 現況查出
- 對照字典寫出
- **trigger bug 修復**（drop 掉 `trigger_tour_update_cache` + function、寫入已 drop 表的 dead code）
- **資料清理**：DELETE 11 筆（10 TEST + 1 特殊團）、UPDATE 3 筆「已完成」→ `returned`
- **Code 統一**：
  - `status-maps.ts` TOUR_STATUS 改 6 英文值 + TOUR_STATUS_LABELS 中文 map
  - `tour.service.ts` 7 狀態機改 6 狀態、砍中文相容層
  - `useToursPaginated.ts` filter 改用 status 欄位（不再依賴 tour_type）
  - `tour-status-updater.ts` 3 處中文值改常數
  - `analytics-service.ts` 3 處中文值改常數、cancelledTours 改讀 archive_reason
  - `TourTableColumns.tsx` 日期衍生狀態用常數
  - `TourActionButtons.tsx` **狀態感知按鈕**（template=複製、proposal=開團、active=報名+分享+編輯+封存+刪除）
- **DB migration**：tours.status 中文翻英、加 CHECK constraint、預設值 `proposal`
- **type-check 全綠**

### Phase 1（未來、Wave 8）—— 砍欄位

**未做**：砍 tour_type / closing_status 欄位。

- tour_type 有 12 個業務邏輯依賴點（ConvertToTourDialog、useTourOperations 等、開團流程要重寫）
- closing_status 有 10 個依賴點（TourClosingDialog、tour-closing-tab、useUnclosedTours 等）
- 兩者都是業務邏輯 refactor、不在「統一英文」scope

### Phase 1（William 確認 3 異常後）

- 清 10 筆 TEST 資料（DELETE）
- 3 筆「已完成」按 William 決策遷移
- 1 筆「特殊團」按 William 決策歸類

### Phase 2（code 層、不動 DB）

- 建立新常數：`TOUR_STATUS = { TEMPLATE, PROPOSAL, UPCOMING, ONGOING, RETURNED, CLOSED }`
- 廢掉：`status-maps.ts` 的 `TOUR_STATUS` 中文版、`tour.service.ts` 的 7 狀態轉換表、`useToursPaginated.ts` 的 5 值篩選
- 廢掉：`TOUR_SERVICE_LABELS.STATUS_*`（中文值）
- 222 處中文狀態字串改為讀 `TOUR_STATUS` 常數

### Phase 3（DB migration、最危險）

- 備份
- `UPDATE tours SET status = CASE WHEN status='提案' THEN 'proposal' ... END`
- 新增 CHECK constraint 擋未來亂塞
- DROP COLUMN `closing_status`
- DROP COLUMN `tour_type`（併進 status 後不需要）

### Phase 4（UI 補按鈕）

- 列表頁按狀態顯示按鈕（模板只有複製、提案只有開團、正式團才有封存）
- 測試每個狀態的 UI 行為

---

## 關聯文件

- `A8_status_normalization.md`（全 DB status 總表、此文件覆蓋其 tours 段）
- `BACKLOG.md` Wave 8 · 狀態值與 jsonb 結構
- `STATE.md`
