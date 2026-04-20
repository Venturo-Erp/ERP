# VENTURO 卡點集中

> 所有 🔴 技術卡、📋 業務決策、🛑 DB 改動、🔥 高風險
> **超過 10 條 cron 會自動暫停**、William 醒來決策後清空

---

## 📋 業務決策

### [2026-04-18 03:30] /login · Stage B
- **類型**: 📋 業務決策
- **Blueprint**: `docs/blueprints/01-login.md` ADR-L2 / §4 / §6
- **問題**: `must_change_password` 流程未接（欄位在 DB、但登入後未強制跳轉改密碼頁）
- **需要**: 首次登入是否必須改密碼？若是、跳去哪？`/change-password` 頁目前不存在
- **影響**: 阻擋 P0 username 重構（B 方案配套需要 /change-password 新頁）

### ~~[2026-04-18 03:30] /login · is_bot~~ ✅ 已決策 07:00
- **決定**: 不擋（William：實務上沒人會用 bot 帳號登入、未來機器人該用 API key 不該有帳號）
- **延後**: 第二輪查 `SELECT * FROM employees WHERE is_bot=true` 看有無殘留帳號

### [2026-04-18 03:30] /login · Stage B
- **類型**: 📋 業務決策 + 🔴 UX Trust debt
- **Blueprint**: `docs/blueprints/01-login.md` ADR-L3
- **問題**: 「記住我」UI 寫「30 天」、實際 JWT 固定 14 天、勾不勾無差別 —— 欺騙用戶期待
- **需要**: 三選一：A刪 checkbox / B 勾=30 天不勾=1 天 / C 勾=14 天不勾=1 天
- **影響**: 用戶信任 + API JWT 邏輯改動

### [2026-04-18 03:30] /login · Stage B
- **類型**: 📋 業務決策（William 2026-04-17 已口頭授權 B 方案、code 未動）
- **Blueprint**: `docs/blueprints/01-login.md` ADR-L2
- **問題**: username 欄位重構（新增 DB 欄位 `username`、保留 `employee_number` 作 internal ID）
- **需要**: 確認是否立即啟動？配套需新開 `/change-password` 頁 + 改 4-5 頁
- **影響**: DB migration + 5 頁聯動、建議第二輪再做

### ~~[2026-04-18 05:50] /dashboard · Stage B~~ ✅ 已決策 06:50
- **決定**: Option B（`/` 為主、刪 `/dashboard`、William「不用 dashboard 看起來比較專業」）
- **執行**: 下輪 Stage C 實作、見 `docs/blueprints/02-dashboard.md` ADR-D1 詳細步驟

### [2026-04-18 05:50] /dashboard · Stage B
- **類型**: 📋 業務決策
- **Blueprint**: `docs/blueprints/02-dashboard.md` ADR-D2
- **問題**: widget 勾選 / 順序只存 localStorage、跨裝置不同步
- **需要**: 三選一：A 保留 localStorage / B 搬 DB 新建 `user_preferences` 表 / C 加 `employees.preferences` jsonb
- **建議**: 短期 A、長期 B（Partner 員工會切換裝置）
- **影響**: 若選 B/C、需新 migration + API + hook

### ~~[2026-04-18 06:10] /tools · ADR-T3~~ ✅ 已決策 06:50
- **決定**: flight/hotel 是半成品（William 確認）
- **執行**: 下輪 Stage C 把 SAMPLE_DATA 移 dev-only / 加占位訊息
- **延後**: PDF 解析 vs 手動表單 第二輪再討論

---

## 🛑 需動 DB（migration 已寫進 `supabase/migrations/_pending_review/`）

_（cron 寫入）_

---

## 🔥 高風險技術卡（gitnexus HIGH / CRITICAL）

_（cron 寫入）_

---

## 🔴 技術 bug（不需業務決策、下輪 Stage C 修）

### [2026-04-18 03:30] /login · 發現於 Stage B
- **類型**: 🔴 P0 bug
- **Blueprint**: `docs/blueprints/01-login.md` §9 #5
- **問題**: 登入流程只檢查 `status='terminated'`、**漏檢查 `is_active=false`** → 停用員工仍可登入
- **位置**: `src/app/api/auth/validate-login/route.ts`（需驗證）
- **修法**: API 加 `.eq('is_active', true)` 或 throw
- **狀態**: Stage C 可直接修（🟢、不動 DB、不需業務決策）

### [2026-04-18 06:10] /tools/reset-db · 發現於 Stage B
- **類型**: 🔴 P0 資安缺陷
- **Blueprint**: `docs/blueprints/03-tools.md` ADR-T1
- **問題**: `/tools/reset-db` 無 admin guard、任何登入者可清本機 IndexedDB
- **違反**: INV-A02 Settings/開發工具必 admin
- **位置**: `src/app/(main)/tools/reset-db/page.tsx`
- **修法**: page 開頭加 `if (!isAdmin) redirect('/unauthorized')` + 加二次確認
- **狀態**: Stage C 可直接修（🟢、不動 DB、不需業務決策）

---

---

## 🚨 /hr/roles 新卡點（2026-04-18 07:10）

### ~~[07:10] /hr/roles · ADR-R2~~ ✅ 已決策 07:20
- **決定**: Option A 單一主職務（William「設定職務然後建立人物的時候，就是選這個職務 不要做細節微調」）
- **執行**: migration draft `supabase/migrations/_pending_review/20260418_drop_employee_job_roles.sql`
- **建團解鎖**: 下一份 Blueprint 可用 `employees.role_id` 查業務

### [07:10] /hr/roles · 預設職務模板
- **類型**: 📋 業務決策
- **Blueprint**: `docs/blueprints/16-hr-roles.md` §2
- **問題**: 目前建新 workspace 時沒預設職務、admin 要手動建
- **需要**: 是否要預設 3-5 個（業務 / 會計 / 領隊 / 助理 / 行政）？

### [07:10] /hr/roles · HR 主管權限
- **類型**: 📋 業務決策
- **Blueprint**: `docs/blueprints/16-hr-roles.md` §4
- **問題**: 只有 admin 能管職務、還是 HR 主管也能？

### [07:10] /hr/roles · 無 admin guard
- **類型**: 🔴 P0 資安
- **Blueprint**: `docs/blueprints/16-hr-roles.md` ADR-R3
- **違反**: INV-A02
- **修法**: Stage C 補 isAdmin check

---

## 統計

- 總卡點: 10（7 📋 + 3 🔴）⚠️ 仍達 10 條上限
- 已決策清除: 4（ADR-D1 / ADR-T3 / is_bot / ADR-R2）
- 🛑 新增 migration draft: 1（drop employee_job_roles）
