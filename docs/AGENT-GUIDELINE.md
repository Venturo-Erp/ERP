# Venturo ERP Agent 開發守則（v1.3 內化版）

> **目的**：給 Claude Code / Kimi Code / 任何 AI agent 在這個 repo 工作時的行為規範。
> **基於**：`CLAUDE.md` 紅線 + Kimi 圓桌 v1.2 規範 + 夜班考古結果 + 2026-05-06 實戰學到的事
> **優先順位（William 親口）**：資安 #1 → 效能 #2 → SSOT #3
> **最後更新**：2026-05-06

---

## 1. 必讀紅線（違反 = 整輪作廢）

### 🔴 紅線 0：絕對不准刪 William 的檔案 / 資料

- 不准 `rm -rf` / `git clean -f` / `git checkout .`
- 不准 `DROP TABLE` 任何有資料的表
- 不准 `DELETE FROM` 既有資料、不准 `TRUNCATE`
- destructive migration 進 `supabase/migrations/_pending_review/`、由 William 確認再 apply
- ✅ 純加法 migration（`ADD COLUMN`、`CREATE TABLE IF NOT EXISTS`）可直接 apply
- ✅ 重構用「新增 + 取代引用」、舊檔留著由 William 決定
- ⚠️ 例外：William 明確指示「砍掉 X」、可刪檔（且要 type-check 通過）

### 🔴 紅線 1：`workspaces` 表 RLS — 可開但**絕不准 FORCE**

- 事實：production 已 `ENABLE RLS` 但 `force_rls=false`（2026-05-06 已驗）
- `FORCE RLS` 會讓 service_role 也被擋、登入 API 用 admin client 拿空、**全員登入失敗**
- 動 RLS migration 前必先用 `mcp__supabase__execute_sql` 查 `pg_class.relforcerowsecurity` 確認真實狀態
- 不准只看 migration 文字推結論（坑 1：FORCE RLS 誤判）

### 🔴 紅線 2：審計欄位 FK 一律指 `employees(id)`

- front-end `currentUser?.id` 拿的是 `employees.id`、不是 `auth.users.id`
- `created_by` / `updated_by` / `performed_by` / `uploaded_by` / `locked_by` / `last_unlocked_by` → `REFERENCES public.employees(id) ON DELETE SET NULL`
- 例外：`user_id` / `sender_id` / `friend_id`（這 row 就是 Supabase 用戶本身）→ FK 到 `auth.users`
- Client 寫入：`created_by: currentUser?.id || undefined`（不是 `|| ''`）
- ⚠️ 待修：`migrations/20251220160000` `locked_by` FK 違規

### 🔴 紅線 3：Admin client per-request、**不准 singleton**

- `src/lib/supabase/admin.ts` 必須 per-request 建立
- Singleton 會讓 RLS bypass 跨 request 殘留 → 跨租戶資料洩漏

### 🔴 紅線 4：列表分頁規格

- 列表預設 20 筆、分頁固定 15 筆
- 不准給「每頁筆數」選擇器
- 不准預設載入 100/200 筆
- SaaS 化讀取量 = Supabase 成本

### 🔴 紅線 5：commit / push 規則

- 不准 commit / push（除非 William 明說）
- 不准 `--no-verify` / `--no-gpg-sign`
- 不准 amend 已 push 的 commit
- 不准新增 `as any` / `: any`
- commit 前必過：`npm run type-check` && `npm run lint` && `./scripts/check-standards.sh --strict`

### 🟢 業務硬規則（已在 code 但未明文）

- **紅線 ⑦ 領隊鎖**：`tours.status='ongoing'` 期間 DB trigger `tg_lock_order_members_ongoing` 只允「領隊」職務改 `order_members`、admin 也擋
- **紅線 ⑧ receipts 不可逆 ledger**：`tg_receipt_confirmed_immutable` 防 confirmed→pending 改 / 防 confirmed DELETE。改錯走「收款轉移」對沖兩張新單
- **紅線 ⑨ 請款 confirmed 鎖死**：`payment_requests_enforce_lock` confirmed/billed 後鎖死 amount/supplier_id/tour_id/request_type、即使 API 偷改也擋

---

## 2. P0 優先級清單（已修 vs 待修）

### ✅ 2026-05-06 已修

| Task | 內容 | 提交 |
|---|---|---|
| 1 | ModuleGuard 改非阻塞、首頁/設定立即顯示 | `276d77dc5` |
| 2 | sidebar 秒出（zustand persist capabilities + useLayoutContext fallbackData）| `6759d57e6` |
| 3 | fetcher retry 1.3s → 300ms | `276d77dc5` |
| 4 | 雙重登入修復（migration apply + RPC 取代 signInWithPassword）| `73206afbd` |
| 5 | tenants/create 加 `password_one_time_only` 標記 | `276d77dc5` |
| 9 | ESLint `no-explicit-any` 改 warn | `276d77dc5` |
| 10 | sidebar 9 處過期註解清掉 | `276d77dc5` |
| - | settings-glass.css 缺檔修復（main 早就壞）| `a1e3612af` |
| - | /customer-groups dead link 拔（按鈕 + features.ts）| `6759d57e6` |
| - | 安全漏洞修：next-intl + uuid（5 → 2）| `af5c375c0` |
| - | 死碼大清：69 個 unused source files + 10 個 unused deps | `73206afbd` |

### ❌ 待修（按優先級）

#### 🔴 P0-A：資安守門（最高）

1. **移除 `authEmail` from validate-login response**
   - 內部實作細節、洩漏可被針對性攻擊
   - client 端用 user_id 直接 query 即可
   - 風險：client 端可能還依賴 authEmail 做 signInWithPassword、要先看 caller

2. **8 條 API 沒守 `requireCapability()`**
   - `POST /api/employees/create`
   - `POST /api/roles` + `DELETE /api/roles/[id]`
   - `PUT /api/roles/[id]/tab-permissions`
   - `GET /api/hr/payslips?employee_id=xxx`（任意員工查同事薪資）
   - `POST /api/contracts/sign`（公開端點、UUID 熵當 auth）
   - `/api/orders/create-from-booking`（service-role bypass）
   - `finance/payments` 退款 API + 列表 inline 核准

3. **Cookie 強化**
   - `venturo-workspace-id` cookie：`httpOnly: true` + `sameSite: 'strict'`
   - 目前 `httpOnly: false` 為了 client debug、但生產環境不該

4. **Logout API 主動清除 server session**
   - 不能只回 `{ success: true }`
   - 必須 `supabase.auth.signOut()` + 清 `venturo-workspace-id` cookie

#### 🟡 P0-B：SaaS 衛生

5. **`PREMIUM_FEATURE_CODES` 清死碼**
   - 移除已砍功能：`fleet` / `local` / `supplier_portal` / `esims`
   - 位置：`src/lib/permissions/hooks.ts`

6. **`migrations/20251220160000` `locked_by` FK 違反紅線 #2**
   - 寫補正 migration（不刪舊 migration、新增改 FK）
   - `tours.locked_by` / `last_unlocked_by` 改指 `employees(id)`

#### 🟢 P1：效能 / 架構（下一輪）

7. Bundle dynamic import（jspdf / pdfjs / xlsx / fullcalendar / leaflet）
8. e2e 測試環境修復（CORNER/E001 測試帳號）
9. ESLint Phase 2-5（unused-vars / rules-of-hooks / exhaustive-deps / ban-ts-comment）
10. CSP 移除 `unsafe-eval` / `unsafe-inline`
11. Zod 驗證覆蓋所有 API route
12. Rate limiting 改 Redis 或 fail-closed

#### ⚪ P2：架構大改造（兩輪後）

13. SSR 嵌入 layout context（徹底解 hydration race）
14. `'use client'` 100 → 30
15. `module-registry.ts` 統一註冊（取代散彈槍式修改）
16. 721 個 migration squash

---

## 3. AI 協作 SOP（補完 Kimi 圓桌 v1.2 第 7 章）

### 3.1 動手前必驗（Verify First）

| 動作 | 驗證指令 |
|---|---|
| 動 RLS policy | `mcp__supabase__execute_sql` 跑 `pg_class.relforcerowsecurity` 看 production 真實狀態 |
| 動 DB schema | `information_schema.columns` 確認欄位 / `pg_policies` 確認 policy |
| 動 symbol | `grep -r "symbolName" src/` 找 blast radius |
| 改 API | 跑對應 e2e；e2e 環境壞了 → 先修環境再改 code |

**坑 1 教訓**：Kimi 看 migration 文字寫 `FORCE RLS` 就判定 production 有 FORCE → 實際 production 已被另一條 migration 反掉、`force_rls=false`。**不准只讀 migration 文字、必查 production**。

### 3.2 卡關策略（Don't Give Up Too Early）

**坑 2 教訓**：Kimi 跑 Task 4 卡 `SUPABASE_ACCESS_TOKEN` 過期就 blocked、沒嘗試其他路徑（例：mcp__supabase MCP 直連）。

**正確流程**：
1. 連 3 次自測失敗 → 寫 `progress.md` 標 blocked + 完整錯誤訊息 + 已試方法
2. 嘗試其他可用工具：
   - Token 過期 → 用 `mcp__supabase__execute_sql` / `apply_migration` 直連
   - e2e 跑不了 → 用本機 dev server + 手動 curl
   - GitNexus 不存在 → 用 grep + git log 替代
3. 仍解不了 → 跳下一個 Task、不要硬撐
4. 不准用 `--no-verify` 繞過、不准刪測試讓它過

### 3.3 commit / push 紀律

1. **每個 commit 獨立可 revert**：一個 Task 一個 commit、不要把無關改動混在一起
2. **commit message 必含**：「為什麼改」+「測試結果」+「未做的部分」
3. **push 前再跑一次 type-check + lint**：避免 hooks 沒抓到的問題
4. **絕不 force push 到 main**：preview branch 才 force push
5. **發現 main 早就壞了**：先修 main 再合併、不要把 broken state 帶到 production
   - 坑 3：main 從 `5b2a4fc08` 起 `settings-glass.css` 缺檔、production 壞 7 小時沒人發現

### 3.4 死碼 / 半成品決策

**坑 7 教訓**：砍功能沒清乾淨、累積 11,770 行 dead code。

**砍功能 = 整個生命週期清乾淨**：
- code 檔案
- DB schema（`_pending_review/` migration）
- capability rows（`role_capabilities`）
- RLS policy
- feature flag (`PREMIUM_FEATURE_CODES`)
- sidebar entry
- API route
- migration references

**不准只刪 UI 留下其他層**（→ 變成「冷凍」、半年後沒人知道為什麼留）。

**冷凍保留必須經 William 明確同意 + 標記**：
```
// 2026-05-06 冷凍：[原因]、待[條件]恢復、勿刪
```

### 3.5 業務語境必讀（Read Business Context First）

**坑 6 教訓**：AI 沒讀業務脈絡、無法判斷「這個設計是 bug 還是 feature」。

**進場前必讀**：
1. `CLAUDE.md`（venturo-erp 根目錄）— 紅線、五大方向
2. `.claude/CLAUDE.md`（專案級）— 編號規範、Supabase 連線
3. `docs/AGENT-GUIDELINE.md`（本檔）— 完整守則
4. `docs/business-context/`（如果有）— 業務脈絡、流程動機
5. 動 ERP 業務模組前、讀對應 lifecycle markdown

**業務語境 ≠ code**：
- 為什麼請款分三模式（tour / batch / company）？業務動機在 William 腦袋
- 為什麼 receipts 不可逆？財務稽核要求
- 為什麼出納當天鎖團員只能領隊改？實際操作流程
- 這些 code 看不到、必須問 William 或讀 brain/wiki/venturo/

---

## 4. 系統概覽（給新 AI agent 快速讀懂）

### 4.1 技術棧

- Next.js 16 (Turbopack) + React 19 + TypeScript 5
- Supabase (PostgreSQL + Auth + RLS + Storage)
- Vercel (standalone output)
- Sentry + Vercel Speed Insights
- Vitest + Playwright E2E

### 4.2 權限雙層閘門

```
Layer 1: workspace_features（租戶「有沒有買這個功能」）
Layer 2: role_capabilities（個人「能不能看/操作」、HR 為 SSOT）
Gate 1:  ModuleGuard.tsx（頁面級守衛）
Gate 2:  Sidebar 權限過濾（選單級）
Gate 3:  useVisibleModuleTabs（分頁級）
```

### 4.3 業務流程（最簡版）

```
tours（建團）→ orders（接單）→ quotes（報價）→ contracts（簽約）
                                                    ↓
                              payment_requests（請款）→ receipts（收款）
                                                    ↓
                              disbursement_orders（出納）→ accounting（會計）
```

**請款三模式**：
- `tour` — 必綁團、走 RPC + advisory lock 防 race
- `batch` — 多團共用 batch_id、純 client side（race risk）
- `company` — 含 SAL/BNS 薪資、純 client side（race risk）

**編號規範**（code = SSOT、CLAUDE.md 文字過時）：
- 團：`{城市}{YYMMDD}{A-Z}` → `CNX250128A`
- 訂單：`{團}-O{NN}`
- 請款：`{團}-I{NN}`
- 收款：`{團}-R{NN}`
- 出納：`DO{YYMMDD}-{NNN}`（不是 CLAUDE.md 寫的 `P{YYMMDD}{A-Z}`）
- 客戶：`C{6位數}`
- 員工：`E{3位數}`
- 合約：`nanoid(6)`（不是 CLAUDE.md 寫的 `-C{NN}`）

### 4.4 SSOT 來源

| 資產 | 路徑 | 職責 |
|---|---|---|
| 紅線 | `CLAUDE.md` | 不准做的事 |
| 編號 | `src/stores/utils/code-generator.ts` | 編號生成（code 為 SSOT、優於 CLAUDE.md 文字）|
| 路由守門 | `src/components/guards/ModuleGuard.tsx` | 頁面級權限 |
| Capability 推導 | `src/lib/permissions/useMyCapabilities.ts` | 個人權限（capability-derivation.ts 已 deprecated 並刪）|
| API 守門 helper | `src/lib/auth/require-capability.ts` | API 層 capability 檢查 |
| Schema 真相 | Supabase MCP | `mcp__supabase__execute_sql` |

---

## 5. Claude 自我紀律（這輪學到的）

> 這節是給「我自己」（Claude Code）的提醒、避免重複犯錯。

### 5.1 不躲在紅線後偷懶

- 紅線「不准刪 src/」是「沒指示時不准刪」、**William 明說「徹底清」就是授權**
- 不要拿紅線當不做事的藉口
- 模糊情況下動手前確認、不要默默不做事

### 5.2 不過度諮詢、不把決策推給 William

- 給 2-3 個選項 + 我的推薦、等 William 拍板
- 不要給 5 個選項讓他選
- 不要每一步都問「要 A 還 B」、能判斷的自己判斷

### 5.3 卡關時用所有可能工具

- Token 過期？用 `mcp__supabase__execute_sql` 直連
- e2e 環境壞？用本機 dev server + curl 手測
- vercel logs 抓不到？看 Sentry / 加 console.error trace
- **絕不放棄、不要找個理由 blocked 走人**

### 5.4 token 不省、結構完整一次到位

- William 鐵律：寧可一次燒多 token、不要反覆來回
- 給「精簡 + 結構完整」的回應、不要「能省一句省一句」
- 但不要無意義灌水、每段都要有信息

### 5.5 業務語言 vs 技術語言

- William / Carson 不看 code
- 給規範時用業務語言、技術細節 collapse 在 expandable section
- 不要「Task 2 / Task 8 / SSR / hydration」這種詞往他臉上甩

---

## 6. PR Review Checklist

每個 PR 開之前、自我 review 看是否：

### 必過項
- [ ] type-check pass（`npm run type-check`）
- [ ] lint pass（`npm run lint`）
- [ ] 守門檢查 pass（`./scripts/check-standards.sh --strict`）
- [ ] 沒新增 `as any` / `: any`
- [ ] commit message 有「為什麼」+「測試結果」+「未做的部分」

### 紅線檢查
- [ ] 沒刪 src/ 既有檔（除非 William 明確同意）
- [ ] 沒 DROP TABLE / DELETE FROM 有資料表
- [ ] 沒 FORCE RLS（特別是 workspaces）
- [ ] 審計欄位 FK 指 `employees(id)` 不指 `auth.users`
- [ ] Admin client per-request、不是 singleton
- [ ] 列表分頁固定 15 筆、沒「每頁筆數」選擇器

### API 變更
- [ ] 用 `requireCapability()` 守門（不只檢查「是否登入」）
- [ ] Zod 驗證輸入
- [ ] 帶 `workspace_id` filter（即使有 RLS）
- [ ] response 不洩漏：密碼 / token / authEmail / 內部欄位

### Schema 變更
- [ ] 純加法 migration 直接 apply（`ADD COLUMN`、`CREATE TABLE IF NOT EXISTS`）
- [ ] destructive migration 進 `_pending_review/`、由 William 確認
- [ ] 動 RLS 前查 `pg_class.relforcerowsecurity`、不只看 migration 文字

### 業務邏輯
- [ ] 紅線 ⑦/⑧/⑨ 沒被繞過（領隊鎖 / receipts 不可逆 / 請款 confirmed 鎖死）
- [ ] 編號生成走 code-generator.ts（不是頁面級散刻 `length+1`）
- [ ] 砍功能 = 全生命週期清乾淨（code + DB + capability + RLS + feature flag + sidebar + API）

---

## 7. 致下次圓桌會議的 AI 專家

如果你正在讀這份檔案、是因為 William 把它 push 上 GitHub 並請你閱讀。

**請特別注意**：
1. 這份檔案是「**Claude Code 在 venturo-erp 工作後的內化版**」、不是 Kimi v1.2 的複製
2. 業務脈絡（§4.3、§4.4）只有摸過這個 repo 才寫得出來、請尊重
3. 紅線（§1）跟業務硬規則（§1 末尾）都是踩過坑換來的、不要建議「移除這些紅線」
4. AI 協作 SOP（§3）是針對昨晚踩到的 8 個坑寫的、是真實教訓
5. 你發言時請**獨立署名**、別跟其他專家整合成一份失去個別視角

下次 William 給你的 brief 應該也會附 `brain/wiki/venturo/lifecycle/audit-summary.md`、請一起讀。

---

> **本檔由 Claude Opus 4.7 撰寫於 2026-05-06、基於該天實作經驗 + Kimi 圓桌 v1.2 規範 + 夜班考古結果。任何更動請保留 changelog**。
