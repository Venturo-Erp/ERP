# VENTURO 全域不變式（Invariants）

> **用途**: 跨路由凝固的決策、cron 每輪 Step 0 必讀。新 ADR 必須**引用或挑戰**、不得靜默違反。
> **來源**: 從 15 份 Audit + Blueprint 範本 /quotes/quick/[id] 抽出的共識。
> **版本**: v1.0（2026-04-18 初建；隨第一輪演進）

---

## 🎯 Page 層 Invariants

### INV-P01 · page.tsx 薄殼
**規則**：`src/app/**/page.tsx` ≤ 50 行、只做 `useParams` + loading/notFound guard + 委派到 feature component。
**理由**：易測、支援 `embedded` prop 多場景、重構 page 不動 logic。
**範本**：`/quotes/quick/[id]/page.tsx`（46 行）
**反例**：`/quotes/[id]/page.tsx`（614 行）、`/customers/page.tsx`（562 行）
**例外**：
- `/login/page.tsx`（245 行、2026-04-18 Blueprint 01-login ADR-L4 記錄）
  - 理由：app 唯一前門、styled in JSX（70 行 custom CSS）、UI 簡單不適合 delegate
  - 第二輪 design system 整合時再拆成 `<LoginForm />` + `<LoginStyles />`

### INV-P02 · page 不直查 supabase
**規則**：page.tsx 不得出現 `supabase.from()`。必用 `useXxx` hook 或 service 層。
**理由**：SWR cache 共享、違反則跨頁資料不同步（CLAUDE.md 明文）。
**反例**：`/customers/page.tsx` 4 處、`/quotes/quick/[id]`（已修）。

### INV-P03 · 禁 cross-route import
**規則**：`/route-a/page.tsx` 不得從 `/route-b/constants` 取 label / type / helper。共用移到 `features/` 或 `lib/`。
**理由**：route 邊界清晰、避免雪崩。
**反例**：`/quotes/quick/[id]` 原本借用 `/quotes/[id]/constants/labels`（已修）。

---

## 🗄️ 資料層 Invariants

### INV-D01 · 禁 spread 寫 DB
**規則**：`supabase.from(...).update({ ...data })` / `.insert({ ...data })` **禁止**。必須明確列欄位。
**理由**：避免幽靈欄位—— type 多欄 / DB 少欄、spread 會讓 PostgREST 靜默丟掉寫入。
**範本**：`useQuickQuoteDetail.handleSave`（明列 12 個欄位）。
**反例**：`/quotes/[id]` 7 個幽靈欄位皆因 spread 寫入。

### INV-D02 · 核心表必用專用 hook
**規則**：
- `tour_itinerary_items` → `useTourItineraryItemsByTour` / `useTourItineraryItemsByItinerary`
- `receipts` → `useReceipts` (TBD)
- `payment_requests` → `usePaymentRequests` (TBD)
**理由**：CLAUDE.md 明文、SWR cache 共享、invalidate 一致。
**反例**：`QuickQuoteDetail.handleLoadFromTour` 原本直 query（已修）。

### INV-D03 · jsonb 必有 DB CHECK（未來）
**規則**：任何 jsonb 欄位必有 `CHECK (jsonb_typeof(column) = 'array' | 'object')` constraint。
**理由**：歷史資料可能壞、前端 `NaN` / crash。
**現狀**：紅線下 migration 寫進 `_pending_review/`、等 William 審。
**例外**：無。

### INV-D04 · Source of Truth 單一
**規則**：同一份資料只有一個 SoT；derived 欄位**每次寫入時重算存快照**、不依賴 trigger（trigger 尚未建立前）。
**反例**：`orders` 5 個人數欄位（adult/child/infant/member/total）各自寫、會漂。
**現狀**：📋 標到 Blueprint、等 William 決策合併策略。

### INV-D05 · 硬編碼 ID / Bot ID 集中
**規則**：任何 workspace UUID、LINE Bot ID、藍新 MerchantID 等「well-known」值必放 `src/lib/constants/well-known-ids.ts`、env 讀取有 fallback 時 fallback 到 **error**（不 fallback 到特定值）。
**理由**：多租戶隔離、避免 Partner 部署忘設 env 洩漏 Corner 資料。
**反例**：`/customers/page.tsx:523` LINE Bot 硬 fallback `@745gftqd`（🔴 critical、未修）。

---

## 🔐 Auth Invariants

### INV-A01 · Finance 路由必權限守衛
**規則**：`/finance/*` page.tsx 開頭必有 `isAdmin || isFinanceStaff` 判斷、否則 redirect `/unauthorized`。
**理由**：財務有法律效力（藍新開發票不可逆）+ 資安。
**現狀**：🔴 目前全未加、cron Stage C 自動補預設 guard。
**例外**：`/finance/reports/*` 暫允許業務讀（待 William 確認）。

### INV-A02 · Settings 路由必 admin
**規則**：`/settings/*`（除 `/settings/appearance`、`/settings/menu` 個人設定）必 `isAdmin`。
**理由**：改系統設定影響全域。
**現狀**：待驗證、cron 掃時標註。

### INV-A03 · RLS 不當唯一防線
**規則**：敏感頁（財務 / 人資 / 客戶個資）路由層必有 guard、**不得純靠 RLS**。
**理由**：RLS 若 policy 寫錯、全庫外洩；route guard 是第二道。

---

## 🎨 UI Invariants

### INV-U01 · Dialog 超 500 行必拆
**規則**：`components/**/**Dialog.tsx` 若超 500 行、必拆子 component + 分 step/tab。
**反例**：`AddRequestDialog.tsx` 1512 行。
**動作**：cron Stage C 碰到時標 🟡（不自動拆、列待辦、需業務 context）。

### INV-U02 · Icon-only button 必 aria-label
**規則**：任何 `<button><Icon /></button>` 無 visible text 的、必有 `aria-label`（不只 `title`）。
**理由**：視障 / 鍵盤使用者。
**現狀**：全站通病、cron Stage C 可自動補。

### INV-U03 · 編輯中返回必 unsaved confirm
**規則**：任何 detail 頁的「返回」按鈕、若 `isEditing && isDirty`、必 `confirm('尚未儲存，確定離開？')`。
**範本**：`QuickQuoteDetail.handleBack`。
**現狀**：大部分頁無此檢查、cron Stage C 自動補。

### INV-U04 · 硬編中文逐步消除
**規則**：新寫 code 不得硬編中文字串、必走 `labels.ts` 系統。
**現狀**：存量多、cron Stage C 只修該輪動到的、不主動全掃。

---

## 🗂️ 狀態 / 命名 Invariants

### INV-S01 · 狀態值用英文
**規則**：新路由的 enum / status 欄位用英文（`draft` / `approved` / `rejected`）。
**現狀**：`tours.status` 全中文、`quotes.status` 中英混、`orders.status` 各自一套——需 DB migration 統一、紅線下不動。
**動作**：cron 標到 `_pending_review/` 的 migration 清單、第二輪處理。

### INV-S02 · 禁 magic string filter
**規則**：`tour_name.includes('簽證專用團')` 這類字串匹配做業務 branch、**禁止**。必用明確欄位或 enum（如 `order.order_type`）。
**反例**：`/orders/page.tsx:63-66`。
**動作**：標 🟡 待業務決策（加欄位 or 用現有 category）。

### INV-S03 · 欄位命名統一
**規則**：DB snake_case、前端 TypeScript interface 保持 snake_case 對齊 DB（不自動 camelCase 轉換、避免同步成本）。
**反例**：`TravelInvoice` type 4 種命名混用（`transactionNo` / `invoice_date` / `buyerInfo` / `total_amount`）。

---

## ⚙️ 架構 Invariants

### INV-X01 · Data fetching 偏好 SWR
**規則**：新 feature 用 SWR hook（`useXxx` with cache key）。Zustand store 只用於 UI state（dialog open、current tab）、不用於 server state。
**現狀**：`travel-invoice-store.ts` / `payment-store` 是 server state 放 Zustand 的反例。
**動作**：新 feature 遵守、舊的第二輪再搬。

### INV-X02 · Stage C 修復後必跑 gitnexus_impact d=1
**規則**：任何改到非 page.tsx 的 shared file（`lib/` / `features/*/hooks` / `stores/types`）、必跑 `gitnexus_impact(target, upstream)`、記錄 d=1 dependents 到 Blueprint §9 和 `_DAILY_REPORT`。
**理由**：防跨路由靜默污染（senior-dev audit 強烈建議）。
**若 d=1 牽涉尚未 audit 的路由**：自動標 🟡、不給 ✅、寫進 `_BLOCKED.md` 待 William 確認。

### INV-X03 · 刪 code 三方驗證
**規則**：任何 `rm` 必須：
1. `knip` report 為 unused
2. `gitnexus_context` 確認 refs = 0
3. `grep` 全 codebase + `git log --follow` 看歷史
三方都指 dead 才刪。
**現狀**：已執行過大規模 cleanup（`Cleanup A1-A6` 任務）、cron 不自動刪。

### INV-X04 · ADR 寫新的必引用或挑戰 INVARIANT
**規則**：Blueprint §6 新 ADR 若違反既有 INVARIANT、必須：
- 明確註明違反哪一條
- 理由 + 範圍限制
- 加入 `_INVARIANTS.md` 的「例外清單」
否則自動打回（cron 標 🔴、不給 Stage B ✅）。
**理由**：防止第 87 號路由「重新發明輪子」（senior-dev audit）。

---

## 🚧 已知但暫緩的 Invariants（第二輪處理）

- **INV-TBD-01**：`hotel_1` / `hotel_2` 硬編 → 子表（order_members 107 列資料、大遷移）
- **INV-TBD-02**：`gender` vs `sex` 雙欄位統一（customers 385 列）
- **INV-TBD-03**：CASCADE 策略統一（quotes / payment_requests / channels / orders 各不同）
- **INV-TBD-04**：中英狀態值統一 migration
- **INV-TBD-05**：Accessibility 全站掃（eslint-plugin-jsx-a11y 引入）

---

## 變更歷史

- 2026-04-18 v1.0：初建、17 條現行 + 5 條暫緩、基於 15 份 audit 整合
