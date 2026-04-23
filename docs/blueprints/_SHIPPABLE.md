# VENTURO 可販賣閘門（Shippable Gate）

> **用途**: 每個路由的 happy-path smoke checklist。**沒過不進 ✅**、避免「Stage ✅ ≠ 客戶能用」的虛胖進度。
> **兩道 gate**:
> - `code_green` — cron 讀 code 判定（符合所有 INVARIANT + 🟢 修完 + type-check pass + gitnexus d=1 乾淨）
> - `human_verified` — William 手動測瀏覽器、勾 checklist

---

## 📐 Code-Green 判定規則（cron 自動）

cron Stage D 之後執行：

1. ✅ 符合 `_INVARIANTS.md` 所有適用 INV-P*/D*/A*/U*/X*
2. ✅ `npm run type-check` 0 error
3. ✅ `gitnexus_impact` d=1 所有 callers 都在 `_PROGRESS.json` 的 routes_core 裡已 ✅ 或本路由自己
4. ✅ Blueprint §9 🟢 全 ✅、🟡 若不阻擋 happy path 可略
5. ✅ 本檔該路由 happy-path checklist **靜態分析能 cover 的項目全過**

任一不過 → `shippable_code_green: false` → 寫進 `_BLOCKED.md`、不進 verified ✅。

---

## 🧪 Human-Verified（William 手動）

- 打開 `localhost:3000`、用 audit 報告的「🎭 Demo 風險」作為反向測試
- 每條勾 ✅/❌、❌ 的寫進 `_BLOCKED.md`
- 全 ✅ → 路由標 `shippable_human_verified: true`

---

## 📋 12 核心路由 Checklist

> 每條 `[ ]` 是 happy path；`[!]` 是 edge case；打 ✅/❌ 在 `human_verified` 欄。

---

### 01 · `/login`
- [ ] 輸入員工編號 + 密碼 → 進 `/dashboard`
- [ ] 錯密碼 → 顯示錯誤、`login_failed_count` +1
- [ ] 5 次錯 → `login_locked_until` 設、擋 15 分
- [ ] 登出 → 回 `/login`
- [!] 大量空白密碼 → 不 crash
- [!] Partner 員工登入 → 進自己 workspace、看不到 Corner 資料
- **Audit 風險**：見 `VENTURO_ROUTE_AUDIT/01-login.md`

### 02 · `/dashboard`
- [ ] 首頁可打開、載入時間 < 3s
- [ ] KPI 卡片數字正確（比 Supabase 實際值）
- [ ] 點卡片可跳對應列表頁
- [!] 新建 workspace 空資料 → 顯示 empty state（不 crash）

### 03 · `/tools/*`
- [ ] `/tools/flight-itinerary` 可產班機行程 PDF
- [ ] `/tools/hotel-voucher` 可產飯店 voucher PDF
- [!] `/tools/reset-db` 必 系統主管、業務誤點擋下
- [!] 無資料時按「產生」→ 提示、不 crash

### 04 · `/quotes` 列表
- [ ] 列表顯示所有 quotes、按 updated_at DESC
- [ ] 「新增報價」按鈕可見可點
- [ ] Search 能找到 code / customer_name
- [ ] Pagination 正常
- [!] 無 quote → 顯示 empty state + 新增按鈕
- [!] `quote_type` filter 分 standard / quick 正確

### 05 · `/quotes/[id]` 標準報價
- [ ] 進頁面 loading → 顯示正確資料
- [ ] 編輯 categories、儲存、重新整理仍在
- [ ] 新增版本、比較版本
- [ ] 列印 PDF
- [!] 空 workspace / 已刪 quote → 不永卡 spinner（🔴 P0、audit 有標）
- [!] tier pricing 算對

### 06 · `/quotes/quick/[id]` ⭐ 範本 🟢 8 條已修
- [x] 2026-04-18: cost fallback / unsaved confirm / hook 改用 / dead code 清 / type hack 移 / cross-import 解 / Daynull 修 / nanoid id
- [ ] **Human**: 按「載入行程項目」、cost 不再全 0
- [ ] **Human**: 編輯中按返回、跳 confirm
- [ ] **Human**: 儲存成功 toast、重新整理資料在
- [ ] **Human**: 列印 PDF 無空白

### 07 · `/tours` 列表
- [ ] 列表顯示、按 departure_date DESC
- [!] **Pagination UI 缺失**（🔴 P0、audit 有標）→ 超過 20 團看不到
- [!] `location` 永遠顯 `-`（🔴、3 處廢棄欄位 pattern）
- [ ] Filter by status / year 正常

### 08 · `/tours/[code]`
- [ ] 用 tour_code 進詳情頁
- [ ] Tab 切換：資訊 / 行程 / 成員 / 報價 / 財務
- [ ] 編輯 tour 基本資料存得回去
- [!] `tour_leader_id` FK 指向（🔴、audit 有標）
- [!] 多 race 並發時不炸（audit 有標）

### 09 · `/finance/requests` 🔥 最痛
- [ ] 列表顯示請款單
- [ ] 新建請款（單筆 + 批次月結）
- [ ] 會計審核 → 轉 disbursement_orders
- [ ] 列印
- [!] **無權限守衛**（🔴 P0、Blueprint 加）
- [!] AddRequestDialog 1512 行行為可預測
- [!] 雙軌 items jsonb ↔ payment_request_items 一致

### 10 · `/finance/payments`
- [ ] 列表顯示收款單
- [ ] 新建收款 / 批次收款
- [ ] 會計確認 / 標異常
- [ ] LinkPay 連結產生
- [!] **無權限守衛**（🔴 P0）
- [!] 「異常」按鈕不再送 $0（🔴 P0）
- [!] Dead dialog（Batch*）要嘛接上要嘛刪

### 11 · `/finance/travel-invoice` 🔥 法律風險
- [ ] 列表顯示發票
- [ ] 批次開立（藍新 API）成功
- [ ] 作廢 / 折讓
- [!] **無權限守衛**（🔴🔴 CRITICAL、業務誤按真發票飛）
- [!] Error 不再阻斷整頁（🔴 P0）
- [!] Batch 結果有摘要

### 12 · `/orders`
- [ ] 列表按 tour 分組、按 departure_date DESC
- [ ] 新建訂單成功
- [ ] Receipt / Invoice / Visa dialog 正常
- [!] **order_number 不撞**（🔴 P0、race）
- [!] 新訂單 initial amount 不再 × 2 人預設
- [!] Dead dialog（QuickReceipt）接上或刪

### 13 · `/customers` 🔥 multi-tenant 風險
- [ ] 列表顯示 / 排序（未驗證優先）
- [ ] 新增 / 編輯 / 刪除
- [ ] LINE 綁定 QR
- [ ] 護照圖片三層 fallback
- [!] **LINE Bot ID env 未設 → error、不 fallback 到 Corner**（🔴🔴 CRITICAL）
- [!] 身分證搜尋有 audit log（🔴、法遵）
- [!] deleteCustomer 有 try-catch + toast
- [!] Dead dialog（ResetPassword）

### 14 · `/calendar`
- [ ] 月 / 週 / 日 view 切換
- [ ] 點事件可跳 tour / customer
- [ ] 新增事件、拖放
- [!] 系統主管 切 workspace filter → leave_requests 跟著切
- [!] 大量事件時月 view 不卡

### 15 · `/channel`
- [ ] 頻道列表顯示
- [ ] 訊息發送 / 接收即時
- [ ] 切 workspace 訊息更新（🔴 P0、audit 有標）
- [!] CASCADE 不毀訊息
- [!] 跳頻道不斷鏈

---

## 🚦 閘門統計（cron 每輪更新）

| 路由 | code_green | human_verified |
|--|--|--|
| 01-login | ⬜ | ⬜ |
| 02-dashboard | ⬜ | ⬜ |
| 03-tools | ⬜ | ⬜ |
| 04-quotes | ⬜ | ⬜ |
| 05-quotes-id | ⬜ | ⬜ |
| 06-quotes-quick | ⬜ | ⬜ |
| 07-tours | ⬜ | ⬜ |
| 08-tours-code | ⬜ | ⬜ |
| 09-finance-requests | ⬜ | ⬜ |
| 10-finance-payments | ⬜ | ⬜ |
| 11-finance-travel-invoice | ⬜ | ⬜ |
| 12-orders | ⬜ | ⬜ |
| 13-customers | ⬜ | ⬜ |
| 14-calendar | ⬜ | ⬜ |
| 15-channel | ⬜ | ⬜ |

**目標**：第一輪 `code_green = 15/15`、`human_verified` 由 William 補。
