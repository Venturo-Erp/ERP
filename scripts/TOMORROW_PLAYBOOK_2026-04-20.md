# 📋 明天上線 Playbook（立鎧 / 4/20）

> **原則**：跟著做、每步勾完再下一步、有疑問先停
> **紅線**：Corner / JINGYAO / YUFEN 資料絕對不動

---

## ⏰ 上線前 30 分鐘（起床做完）

### 🔴 Step 1：本地 code 驗證（5 分鐘）

```bash
cd /Users/williamchien/Projects/venturo-erp
npm run type-check  # 預期 0 error
git status --short  # 看今晚 30+ 檔案改動
```

- [ ] type-check 0 error
- [ ] 檔案改動都是你認得的

### 🔴 Step 2：Git commit + push（5 分鐘）

```bash
git add -A
git commit -m "feat: multi-tenant P0 fixes + email login + tenant UI

- Fix folders.created_by FK to employees
- Fix auto_post_customer_receipt UUID cast bug
- Fix auto_post_supplier_payment UUID cast bug
- Add email login support (employee_number still works)
- Simplify auth: remove custom JWT, use Supabase Auth only
- Tenant admin UI: restructure to '核心方案' + '付費加購'
- HR: add terminated_at/by, remove hard delete
- Loading: unified 小鳥 for page-level, Loader2 for buttons
- Karpathy 4 principles + venturo-safe-tenant-test skill

Applied migrations (already on production DB):
- 20260419a_fix_folders_fk_and_auto_post_triggers.sql"
git push origin main
```

- [ ] Vercel 看到新 deploy
- [ ] 等 2-3 分鐘 build 完

### 🔴 Step 3：驗證 Production 沒爆（2 分鐘）

打開 production URL、登 Corner、看：

- [ ] 登入成功（不要忘記：你的老 JWT cookie 可能會先讓 middleware redirect 一次、重登即可）
- [ ] Dashboard 能開
- [ ] 團列表能開
- [ ] 隨便點 1 個老團、詳情頁能開
- [ ] 發現任何錯 → 先 rollback（見本文最後）、再找原因

### 🟡 Step 4：建「立鎧」workspace（3 分鐘）

**選項 A：走 `/tenants/create` UI**（推薦）

- 用 Corner super admin 進 `/tenants`
- 「新增租戶」→ 填：代號 `LIKAI` / 名稱「立鎧旅行社」/ max_employees 設 **10**（或簽約人數）/ 管理員名字 / email / 臨時密碼
- 送出

**選項 B：直接 SQL**（後援）

```sql
-- 在 Supabase SQL editor 跑
INSERT INTO workspaces (name, code, type, max_employees, is_active)
VALUES ('立鎧旅行社', 'LIKAI', 'travel_agency', 10, true) RETURNING id;
-- ... 其他 employee / role / permissions 走 tenant create API 內部邏輯
```

- [ ] 新 workspace id 記下來（等下用）

### 🔴 Step 5：Seed 景點 + 供應商（2 分鐘）

打開 `/Users/williamchien/Projects/venturo-erp/scripts/seed_new_partner.sql`
替換 `YOUR_WORKSPACE_ID` 為立鎧的 id
在 Supabase SQL editor 執行

- [ ] 應看到「✅ 已 seed 20 景點 + 10 供應商給 workspace ...」

### 🔴 Step 6：開啟合約 feature（1 分鐘）

```sql
INSERT INTO workspace_features (workspace_id, feature_code, enabled)
VALUES ('立鎧_WORKSPACE_ID', 'tours.contract', true);
```

- [ ] 合約 tab 在立鎧登入時會看到

### 🟡 Step 7：自己登入立鎧驗一遍（10 分鐘）

- [ ] 登入管理員、建 E002 / E003 / E004 員工
- [ ] 進 `/hr/roles` → 設業務職務權限勾幾個、存、重新整理看還在
- [ ] `/tours/new` 開一個團、填完整（國家 / 機場 / 日期 / 人數）
- [ ] 團詳情 → 行程 tab → 拖 2-3 個景點（應能看到 20 個景點）
- [ ] 報價 tab → 加項目、算小計
- [ ] 建訂單（從 `/orders/new` 或團內）
- [ ] 建收款（選 cash / 匯款）→ 確認 status=1
- [ ] 建請款（選供應商、應能看到 10 個供應商）→ 推到 paid
- [ ] **合約 tab 能開、能操作**
- [ ] 展示行程 tab **不出現**（預期關）
- [ ] 結案 tab **暫不測**（你說暫不做）

### 🟡 Step 8：通知立鎧管理員（3 分鐘）

LINE / email 給他：

- URL：`https://your-domain.com/login`
- 代號：`LIKAI`
- 帳號：`E001`
- 密碼：`XXXXXX`（你設的臨時密碼）
- **請進系統後立刻改密碼**
- 有任何問題直接 LINE 你

---

## 🚨 Rollback 腳本（如果 Step 3 或 7 爆）

### A. Code rollback（production）

```bash
cd /Users/williamchien/Projects/venturo-erp
git revert HEAD --no-edit
git push origin main
# Vercel 會自動重新 deploy 上一版
```

### B. DB rollback（如果 migration 惹事、極少）

這 3 個 migration 不需要 rollback（零資料風險）、但若真要：

```sql
-- P0 #1 rollback（不建議、會讓其他租戶又爆）
ALTER TABLE folders DROP CONSTRAINT folders_created_by_fkey;
ALTER TABLE folders ADD CONSTRAINT folders_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id);

-- P0 #2 #3 rollback（不建議、會讓收付款 lifecycle 又爆）
-- 重寫回 ::text 版本、不推薦
```

### C. 測試 workspace 清理（不急）

TESTUX 有測試資料、明天上線不影響立鎧、可以慢慢清。

---

## 📞 我會 standby 的地方

- 立鎧登入進不來 → 我 5 分鐘內看 logs
- 建團時欄位報錯 → 我看 schema 找原因
- 請款選不到供應商 → 看 seed 是否跑完
- 報價計算錯 → 看 useCategoryItems.ts
- 任何 UI 崩 → 截圖 + URL 給我

---

## ⚠️ 明天「不要」做的

- ❌ 刪 TESTUX（等你確認上線穩、一週後再刪）
- ❌ 動 Corner / JINGYAO / YUFEN 資料
- ❌ 同時上線立鎧 + 其他新客戶（一個一個來）
- ❌ 在還沒 seed 景點 / 供應商前、就讓他開始用（會卡）

---

## 📊 今晚最終狀態

| 類別                                | 狀態               |
| ----------------------------------- | ------------------ |
| DB 3 P0 修復                        | ✅ 在 production   |
| ref_airports 6075 筆                | ✅ 在 production   |
| Code 改動（30+ 檔案）               | ⚠️ 在本地、待 push |
| TESTUX 測試（10 團 + 生命週期全過） | ✅ 已驗            |
| 景點 / 供應商 seed SQL              | ✅ 寫好、待執行    |
| 本 playbook                         | ✅ 寫好、跟著跑    |

---

_Ver 1.0 | 2026-04-19 深夜 | 用完即棄（4/21 之後可封存）_
