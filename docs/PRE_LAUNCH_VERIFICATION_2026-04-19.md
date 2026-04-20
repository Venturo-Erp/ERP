# Venturo Pre-Launch 驗證報告

> **執行時間**：2026-04-19（深夜）
> **執行者**：Claude、走 `venturo-safe-tenant-test` SOP
> **用途**：**下週現地檢查用、逐項對照** → 如果每項能在 UI 親自驗證、就能正式上線
> **紅線**：真實 workspace（Corner / JINGYAO / YUFEN）零動

---

## 🎯 驗證總結：全過（8/8）

| # | 檢查項 | 預期 | 實際 | 狀態 |
|---|---|---|---|---|
| 1 | BEFORE snapshot | 數字對得上 | ✅ | 見下表 |
| 2 | 3 個 P0 修復依然有效 | FK / trigger 正確 | ✅ | — |
| 3 | type-check | 0 error | ✅ | — |
| 4 | 登入 API 四向驗證 | 員工編號 / email / 擋錯密碼 / 擋錯租戶 | ✅ | 4/4 過 |
| 5 | max_employees 上限 | 3 人時應擋第 4 個 | ✅ | `WILL_BLOCK_E004` |
| 6 | 開團完整 lifecycle | 團 + 行程 + folders + 訂單 | ✅ | 都建成 |
| 7 | 收款 / 請款 lifecycle | status transitions trigger 不爆 | ✅ | 全過 |
| 8 | AFTER snapshot vs BEFORE | protected 3 家零動 | ✅ | 見下表 |

---

## 📊 資料對帳

### Protected workspaces（**必須 BEFORE = AFTER**）

| Workspace | emp | tours | orders | receipts | PRs | items | folders | BEFORE=AFTER |
|---|---|---|---|---|---|---|---|---|
| CORNER | 5 | 29 | 19 | 17 | 7 | 337 | 372 | ✅ |
| JINGYAO | 1 | 1 | 0 | 0 | 0 | 0 | 12 | ✅ |
| YUFEN | 1 | 0 | 0 | 0 | 0 | 0 | 0 | ✅ |

### TESTUX（測試資料、允許新增）

| 欄位 | BEFORE | AFTER | 差異 | 說明 |
|---|---|---|---|---|
| emp | 3 | 3 | 0 | 沒動 |
| tours | 2 | 3 | +1 | 新開 TEST003 |
| orders | 2 | 3 | +1 | 新建 ORD-TEST-003 |
| receipts | 2 | 3 | +1 | 新建 R-TEST-003（已確認 status=1）|
| PRs | 2 | 3 | +1 | 新建 PR-TEST-003（已推到 paid）|
| items | 2 | 4 | +2 | 新建 2 個行程項目（住宿 + 餐飲）|
| folders | 24 | 36 | +12 | 新團自動建 12 個 folder |

**結論**：TESTUX 新增符合預期、Protected 零動。

---

## 📝 下週現地檢查清單（William 親自跑）

### 階段 A：登入 + 人資

- [ ] 瀏覽器進 `http://localhost:3000/login`（或 production URL）
- [ ] 代號 `TESTUX` / 帳號 `E001` / 密碼 `test1234` 能登入
- [ ] 或用 email `testux_e001@venturo.com` 也能登入
- [ ] 進 `/hr` → 看到 3 個員工（E001/E002/E003）
- [ ] 點「新增員工」→ 試新增 E004 → **應被擋**、顯示「已達員工數量上限（3 人）」錯誤
- [ ] 進 `/hr/roles` → 看到 4 個職務（管理員/業務/會計/助理）
- [ ] 點「業務」→ 勾幾個權限 → 儲存 → **應成功、重讀後權限還在**

### 階段 B：開團流程

- [ ] 進 `/tours` → 看到 TEST001 / TEST002 / TEST003 三個團
- [ ] 點 TEST003 → 能進詳情頁
- [ ] 看 12 個 tab（總覽 / 訂單 / 團員 / 行程 / 展示行程 / 報價 / 需求 / 團確單 / 報到 / 檔案 / 結案）
- [ ] 合約 tab **應不在**（workspace_features.accounting=false、且合約是 premium tab）
- [ ] 行程 tab → 看到希爾頓飯店 + 懷石晚宴 2 項
- [ ] 試手動拖拉景點加一個新項目 → 應能存

### 階段 C：訂單 + 收付款

- [ ] 進 `/orders` → 看到 3 筆 TESTUX 訂單
- [ ] ORD-TEST-003 狀態 = confirmed / unpaid
- [ ] 進 `/finance/payments`（收款）→ 看到 R-TEST-003（已確認）
- [ ] 進 `/finance/requests`（請款）→ 看到 PR-TEST-003（已 paid）
- [ ] 嘗試新增一筆新收款 / 請款 → 應成功

### 階段 D：測試租戶建立（若明天要上線新租戶）

- [ ] 用 Corner / 富順 等 Super Admin 帳號進 `/tenants` → 「新增租戶」
- [ ] 填 code（如 TEST2）/ 名稱 / max_employees / 管理員帳密
- [ ] 送出 → 應成功建出 workspace + 4 職務 + 預設權限
- [ ] 登入新租戶的 E001 → 流程 A → B → C 應都能跑

### 階段 E：Edge cases

- [ ] 錯誤密碼 5 次 → 帳號鎖 15 分鐘（驗 `login_failed_count` 機制）
- [ ] 登出後還能重登入
- [ ] 關閉瀏覽器再開、session 是否保留（Supabase session cookie 預期保留）

---

## 🛑 如果現地檢查有任何一項失敗

**不要直接改 DB / code、走 venturo-safe-tenant-test SOP**：

1. 記下「哪一步失敗、預期 vs 實際」
2. 不動真資料
3. 找 Claude（或重開 session、呼叫 skill `venturo-safe-tenant-test`）
4. 一起 debug

---

## 🧹 TESTUX 清理

測試資料在 TESTUX workspace：
- 3 tours / 3 orders / 3 receipts / 3 PRs / 4 items / 36 folders

**建議**：下週驗證完、確認上線沒問題後、你親自授權：
```sql
-- WARNING: 只能在你確認後執行
DELETE FROM workspaces WHERE code = 'TESTUX' CASCADE;
```
（FK cascade 會連帶清 employees / tours / orders / receipts / prs / folders）

**目前處理**：**留著**、不動。

---

## 📋 今晚做的所有事（讓你 review）

### DB 變更（都在 `_applied/2026-04-19/20260419a_*.sql`）
1. `folders.created_by` FK 從 `auth.users` 改指 `employees`
2. `auto_post_customer_receipt` 移除 `NEW.id::text` 轉型
3. `auto_post_supplier_payment` 移除 `NEW.id::text` 轉型

### Code 變更
1. `src/app/api/auth/validate-login/route.ts` — 支援 email 登入
2. `src/app/api/auth/logout/route.ts` — 簡化為 no-op
3. `src/middleware.ts` — 改用 Supabase session 驗證
4. `src/lib/auth-guard.tsx` — `hasAuthCookie()` 改抓 `sb-*`
5. `src/app/(main)/tenants/[id]/page.tsx` — 付費加購 UI 重構
6. `src/lib/permissions/module-tabs.ts` — 合約標 premium
7. `src/features/tours/components/TourTabs.tsx` — premium tab filter
8. `src/lib/permissions/hooks.ts` — `isTabEnabled()` + `invalidateFeatureCache()`
9. `src/app/(main)/hr/page.tsx` — 離職紀錄、移除硬刪除
10. `src/app/(main)/hr/roles/page.tsx` — 儲存 + 錯誤顯示
11. `src/types/user.types.ts` — User 加 terminated_at/by

### 文件新增
1. `VENTURO_PRICING_V1_2026-04-19.md`
2. `VENTURO_BRAND_WORKSHOP_V2_2026-04-19.md`
3. `~/.claude/skills/venturo-safe-tenant-test/SKILL.md`（6 大地雷 → 8 大地雷）
4. `docs/WIDGET_DEVELOPMENT_GUIDE.md`
5. `docs/PRE_LAUNCH_VERIFICATION_2026-04-19.md`（本檔）

### CLAUDE.md 更新
- 加 Karpathy 四原則
- 加策略題觸發器（避免商業方向誤判）

---

## ⚠️ 明確沒動的事（下週再談）

- 184 空表搬 `_archive`（SQL 已產、等你點頭）
- Blueprint 路由 5-12（只完成 1/2/3/6/16）
- UI 測試（3 核心頁的 Playwright golden path）
- Amadeus / AI / V-Cert 實作
- 景點資料庫 Phase 2
- 使用手冊（你選 Partner 管理員版）
- 無用欄位 + SSOT 缺漏 audit

---

_Ver 1.0 | 2026-04-19 深夜 | 下週 review 後可封存_
