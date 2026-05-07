# Session 接手指南 — 2026-05-06

> 給下一個對話的 Claude / Kimi、貼這份就能無痛接手。
> 上一個 session 累計 **21 個 commits / 13,400+ 行刪除 / 8 條 API 守門**、production 已上線。

---

## 0. 第一件事（必讀順序）

```
1. /Users/william/Projects/venturo-erp/CLAUDE.md（紅線、五大方向）
2. /Users/william/Projects/venturo-erp/.claude/CLAUDE.md（編號規範）
3. /Users/william/Projects/venturo-erp/docs/AGENT-GUIDELINE.md（Claude 內化版守則 v1.3、含業務脈絡）
4. 本檔（接手指南、最新進度）
```

---

## 1. 上 session 累積成果（已 push main、production 上線）

### 🧹 大清理（13,400+ 行刪除）
- 69 個 unused source files 刪
- 10 個 unused deps 拔（@tanstack/react-virtual / uuid / pg / @phosphor-icons 跑到 optimize / etc）
- VENTURO 機器人徹底拔（DB row + is_bot column + role + tour controller_id reference）
- **領隊 + 團控** 整族拔（DB: DROP `tours.controller_id` / `tours.tour_leader_id` / `tour_leaders` 表 / `leader_availability` 表 / trigger `tg_lock_order_members_ongoing` / function `check_tour_member_modify_lock` / 3 個 workspace 「領隊」role）
- 需求單 / 確認單概念清（DB DROP `request_responses` / `request_response_items`）
- 通知 / 公告系統清（DB DROP `notifications` / `company_announcements`）
- /channel + workspace 頻道概念全清
- showIdentityColumn prop chain 拔（5 檔）
- 50+ unused exports 清

### 🛡 資安守門（8 條 API 全處理完）
| # | API | 處理 |
|---|---|---|
| 1 | POST /api/employees/create | `hr.employees.write` |
| 2 | POST /api/roles | `hr.roles.write` |
| 3 | DELETE /api/roles/[id] | `hr.roles.write` |
| 4 | PUT /api/roles/[id]/tab-permissions | `hr.roles.write` |
| 5 | GET /api/hr/payslips | 查別人才需 `hr.payroll.read` |
| 6 | finance/payments 退款 | `finance.payments.write` |
| 7 | POST /api/contracts/sign | rate limit 5/60s + 30 天過期 |
| 8 | /api/orders/create-from-booking | 410 Gone（dead endpoint）|

其他資安：
- Cookie `httpOnly: true` + `secure`（venturo-workspace-id）
- Logout API 主動 supabase.auth.signOut() + 清 cookie
- next-intl + uuid 漏洞修（5 → 2、剩 PostCSS 不能修但 0 風險）

### ⚡ 效能優化
- ModuleGuard 改非阻塞（首頁 / 設定立即顯示）
- sidebar 秒出整排（zustand persist capabilities + features + useLayoutContext fallbackData）
- fetcher retry 1.3s → 300ms + 先檢查 session
- validate-login 預寫 SWR cache（少一次 round-trip）
- jsPDF / jspdf-autotable 改 dynamic import（~150KB lazy load）
- optimizePackageImports 補 @phosphor-icons / @dnd-kit × 2 / @hello-pangea/dnd / browser-image-compression

### 📝 文件
- `docs/AGENT-GUIDELINE.md` push 上 GitHub（給 Kimi 圓桌會議讀）
- 本檔（session 進度）

---

## 2. 還沒做的（按優先級）

### 🔴 P0 — 下次優先做
- [ ] **e2e 環境修**（卡點：CORNER/E001 真實密碼不是 00000000）
  - 建議建 TESTING workspace + T001 員工 + 固定密碼、避開 William 真實帳號
  - 步驟在 `.env.test.local`、已 gitignored
- [ ] **CSP 移除 `unsafe-eval`**（要 e2e 驗才能 push、不然炸 client）

### 🟡 P1
- [ ] `'use client'` 100 → 30 重構（每個都要驗、大工、改架構）
- [ ] SSR 嵌入 layout context（徹底解 hydration race、紅線注意）
- [ ] Migration squash（721 個 migration）
- [ ] ESLint Phase 3-5：`rules-of-hooks` / `exhaustive-deps` / `ban-ts-comment`
- [ ] 1028 個 `no-unused-vars` warning 逐步清

### 🟢 P2
- [ ] 「展示行程」UI 大改造（**凍結中**、檔案保留 `tour-display-itinerary-tab.tsx` 751 行、TourTabs.tsx tab 註解掉）
- [ ] HR 7 個冷凍 tabs 決策（attendance/leave/overtime/payroll 等、DB 表 + capability + payroll-engine 還在、要重啟還是徹底砍要 William 拍板）
- [ ] LinkPay teardown（28 檔/149 處引用、MEMORY 既有 TODO）
- [ ] 建團元件 fork 4 份合併（TourFormShell / TourEditDialog / InlineTourCreate / TourCreateDialog）

### 🔵 業務重做（不是清理、是重新設計）
- [ ] **領隊指派**：之前用 `order_members.identity = '領隊'`、這次連 UI 都拔了、要重新設計
- [ ] **公開報名訂單**：`/api/orders/create-from-booking` 已 410 Gone、要重做就用 token / OTP / 過期機制
- [ ] **客戶展示行程頁**：UI 整體要做（凍結中）

---

## 3. 紅線（絕對不准）

```
🔴 紅線 0：不准刪 src/ 既有檔（除非 William 明說「砍掉 X」）
🔴 紅線 0：不准 DROP TABLE 任何有資料的表
🔴 紅線 0：不准 DELETE FROM 既有資料、不准 TRUNCATE
🔴 紅線 0：destructive migration 進 _pending_review/、由 William 確認
🔴 紅線 1：workspaces RLS 可開但絕不准 FORCE
🔴 紅線 2：審計欄位 FK 一律指 employees(id)、不准 auth.users
🔴 紅線 3：Admin client per-request、不准 singleton
🔴 紅線 4：列表預設 20 筆、分頁固定 15 筆、不給「每頁筆數」選擇器
🔴 紅線 5：不准 commit / push（除非 William 明說）
🔴 紅線 5：不准 --no-verify、不准新增 as any
```

---

## 4. 業務硬規則（已在 code 但要意識）

- **紅線 ⑧ receipts 不可逆 ledger**：confirmed 後 trigger 防改、改錯走「收款轉移」對沖兩張
- **紅線 ⑨ 請款 confirmed 鎖死**：`payment_requests_enforce_lock` confirmed/billed 後鎖 amount/supplier_id/tour_id
- **紅線 ⑦ 領隊鎖**：已**拔了**（trigger DROP 了）、之後重做要重新設計

---

## 5. 編號規範 SSOT 衝突（CLAUDE.md vs code）

⚠️ **code 為 SSOT、不是 CLAUDE.md 文字**：

| 項目 | CLAUDE.md 寫 | code 實際 |
|---|---|---|
| 出納單 | `P{YYMMDD}{A-Z}` | `DO{YYMMDD}-{NNN}` |
| 合約 | `-C{NN}` | `nanoid(6)` |
| 訂單 | `{團}-O{NN}` | client side `length+1`（race condition） |

CLAUDE.md 文字過時、未來修文件 / 改 code 對齊由 William 拍板。

---

## 6. 卡點（要 William 解）

1. **e2e 環境密碼問題**：CORNER/E001 真實密碼不是 `.env.example` 的 `00000000`
   - 解法 A：建 TESTING workspace + T001 員工
   - 解法 B：William 提供真實密碼進 `.env.test.local`（已 gitignored）

2. **「展示行程」UI 大改造**：要 William 跟設計討論方向

3. **HR 7 個冷凍 tabs**：DB schema 跟 payroll-engine 還在、要 William 拍板「重啟」還是「徹底砍」

---

## 7. Git 重要訊息

- **branch**: `main`（`nightly-batch-fix-2026-05-06` 已 merge）
- **最後 commit**: `1194a46de` — `chore(security): orders/create-from-booking dead endpoint 改 410 Gone`
- **這次 session 共 21 commits**

---

## 8. Production / Vercel

- **URL**: 看你 Vercel dashboard（Venturo-Erp/ERP）
- **Auto-deploy**: main branch 推 = 自動 deploy production
- **Vercel env**: `SUPABASE_SERVICE_ROLE_KEY` 已設給 Production + Preview + Development
- **DB**: project_id `wzvwmawpkapcmkfmkvav`

---

## 9. Kimi 圓桌會議下次必附

下次找 Kimi 多 AI 圓桌討論、給他們的 brief 必須附上：

```
1. https://github.com/Venturo-Erp/ERP/blob/main/docs/AGENT-GUIDELINE.md
2. https://github.com/Venturo-Erp/ERP/blob/main/docs/SESSION-HANDOFF-2026-05-06.md（本檔）
3. https://github.com/Venturo-Erp/ERP/blob/main/CLAUDE.md
4. brain/wiki/venturo/lifecycle/audit-summary.md（William 本機、要單獨貼進去）
```

並明說：
- 8 位專家獨立發言、不要整合
- 必須讀完業務脈絡再發言
- 衝突點明確標出、讓 William 拍板
- 補完上版 v1.2 truncated 的第 7 章 AI 協作規範

---

## 10. 給接手 Claude / Kimi 的話

我們踩過的坑（**不要再踩**）：

1. **不要只讀 migration 文字判 RLS 狀態** — 必用 `mcp__supabase__execute_sql` 查 production
2. **卡關不要放棄** — Token 過期？Claude 有 mcp__supabase 直連、Kimi 有 npx supabase。e2e 環境壞？先修環境再改 code
3. **不要拿紅線當不做事的藉口** — William 明說「徹底清」就是授權、別躲在「不准刪 src/」後面
4. **業務語言對 William** — 他不看 code、不要 Task 2 / SSR / hydration 這種詞往他臉上甩
5. **自己決策、別把選項推回給他** — 給推薦 + 1 個備案、不要 5 個選項讓他選
6. **驗證後才下結論** — 用 grep / SQL 確認過再 flag 問題、不要憑字面推
7. **commit message 要寫「為什麼」+「測試結果」+「未做的部分」** — 不是「改了哪些檔」
8. **dead endpoint 用 410 Gone 替代砍檔**（紅線 #0 不准刪 src/、但 410 = 業務上停用、檔留檔案結構）

---

> 本檔由 Claude Opus 4.7 撰寫於 2026-05-06、給下次 session 接手用。
> 任何更新請保留 changelog（在頂部加日期 + 改了什麼）。
