# P001 主席收斂報告 — 4 幕僚會議結論

日期：2026-04-22
主席：主 Claude（venturo-pattern-heal skill）
幕僚：senior-developer / code-reviewer / minimal-change / security-engineer

---

## 4 份意見對照

| 維度 | senior-dev | code-reviewer | minimal-change | security |
|---|---|---|---|---|
| P001 scope | 2 人週、Phase A/B/C | 方向對、3 致命漏 | **< 2 人日、6 檔 / < 50 行** | 方向錯、schema 不支援 action-key |
| 後端 4 API 改 hasPermission | ✅ Phase B 做 | ❌ permission key 在 MODULES 不存在、會 403 鎖死 | ❌ 延到後續 issue | 🔴 CRITICAL schema 無法表達 `employees.create` |
| Backfill migration | ✅ Phase A | ✅ **F1 致命漏 — 必做** | ✅ PR-1a 核心 | ✅ 但建議 application-layer 不走 DB trigger |
| Loading state 處理 | 未提 | ✅ **F3 致命漏 — 必做** | 未提 | 未提 |
| 權限 key schema 統一（`.` vs `:`）| 新增 action-keys.ts | 應注意 | ❌ 丟 P007/P008 | 🔴 現行 schema 限 tab 級 |
| isAdmin 保留否 | 降為 audit_flag | 4+ layout.tsx 也用 | 只拔權限**決策點** | 🔴 JWT/Zustand/DB 三條管道仍在 |

---

## 主席判斷（衝突收斂）

### 1. Scope：採 minimal-change + security 聯合勝出
senior-dev 的 action-key（`employees.create` / `reset_password`）**現行 schema 裝不下**（role_tab_permissions 只有 module × tab × can_read/can_write）。強行塞會觸發 code-reviewer 的 F2 致命漏（所有人 403）。

**P001 真實範圍**：
- 拔 3 處前端 isAdmin 短路
- 2 個 UI 大鎖（finance/payments、tour-itinerary-tab）
- Backfill migration（admin role 預填 role_tab_permissions 全權）
- 新增 loading state 防閃 UnauthorizedPage

**延後（留給後續 issue）**：
- 後端 4 API 改 hasPermission（schema 擴張後、或 P008 統一 policy 時一併做）
- permission key schema 統一（P007 範圍）
- usePermissions 9 bool 收斂（P008 範圍）
- 4+ layout.tsx 的 isAdmin 檢查（是 UI 顯示差異、不是權限決策）

### 2. 順序：採 security 警告但尊重 William 指揮
security 建議「P002 → P015 → P011 → P001 先」、主席認為這是 pattern-map 層的 re-prioritize、該由 William 定、不由 heal 決定。**heal 的動作範圍照 William 的指示「修 P001」**、但把 security 警告帶給他、讓他知道：
- 修完 P001 攻擊面沒降低（只是 refactor）
- isAdmin 3 條管道（JWT / Zustand / DB）仍在
- 建議配合 P002（middleware 收緊）才是真防護

### 3. Backfill 實作：採 security 建議（application-layer）
senior-dev 方案偏 DB trigger / migration、security 建議「application-layer seeding」更安全（避免跨租戶污染、沿用現有 `seedWorkspaceDefaults` 類函式）。

### 4. Loading state：採 code-reviewer F3 必做
feature fetch 空窗期 canAccess 回 `undefined`（不是 `false`）、UI 顯示 loading skeleton、不閃 UnauthorizedPage。

---

## 最終修法（分 2 個 PR、估 1.5 人日）

### PR-1a：Backfill + 前端短路 + loading state（1 人日）
1. 寫 backfill script / migration：回填每個 workspace 的 admin role 在 `role_tab_permissions` 的所有 (module, tab) row、can_read=true / can_write=true
2. 驗證 backfill 完成（查 DB、確認 row 數對）
3. **才**拔 `src/stores/auth-store.ts:249` 的 `if (get().isAdmin) return true`
4. 拔 `src/lib/permissions/hooks.ts:284, 293`（canAccess / canEdit）
5. 改 `src/hooks/usePermissions.ts:34-48` 的 9 個 bool（保留結構不動、只拿掉 `isAdmin || ` 前綴；但 isAdmin 用戶已經從 backfill 有所有 permission、行為等效）
6. `hooks.ts` + `useTabPermissions` 增加 loading state、避免閃 UnauthorizedPage
7. e2e 測試 `tests/e2e/admin-login-permissions.spec.ts`：admin 登入後能進各個 Tab、sidebar 全顯示

### PR-1c：UI 大鎖拔（0.5 人日）
1. `src/app/(main)/finance/payments/page.tsx:211` 改查 `canAccess('finance:payments')` 或 workspace feature 級
2. `src/features/tours/components/tour-itinerary-tab.tsx:80` 改直接查 `hasModulePermission(permissions, 'database')`
3. e2e 確認非 admin 會計 role 能進 finance/payments（前提：role_tab_permissions 有設）

### 不做（明確丟下）
- PR-1b（後端 4 API 細分 permission）→ 延到 P008 或獨立 P001-B issue
- permission key schema 統一（P007）
- JWT permissions_version（P011）
- middleware 收緊（P002）
- unit test 補強（P015）
- 3 個 hook 收斂（P008）

---

## 風險總覽

| 風險 | 等級 | 對策 |
|---|---|---|
| F1 老 admin 白屏（backfill 沒做） | 🔴 CRITICAL | PR-1a 先部署 backfill、再拔短路；e2e 守門 |
| F3 canAccess loading 閃 UnauthorizedPage | 🔴 HIGH | loading state 處理、UI 顯 skeleton |
| admin role 預填後 premium feature 可進 | 🟡 MED | P009 trigger cascade 未修、預填會進 premium；但現狀「短路」也是一樣進、**沒變差** |
| isAdmin 3 條管道仍在、未來復辟 | 🟡 MED | 不屬 P001 範圍、pattern-map P011 已記 |
| 攻擊面未降低 | 🟡 MED | 需配合 P002（middleware）才是真防護、提醒 William |

---

## 上線前 William 手測清單
1. 三個 workspace（Corner / JINGYAO / YUFEN）admin 用戶登入後 sidebar 顯示全、點 5 個主要 Tab 不白屏
2. 建新 workspace → 新 admin role 有全權（確認 seed 路徑也走 backfill 邏輯）
3. 降一個員工為 non-admin 職務 → sidebar 減少、該擋的頁擋、該進的頁進得去
4. local 跑 `npm run type-check` + 2 支 e2e 測試

---

## 下一步
主席已寫「William 業務語言版拍板請求」、等 William 點頭才進入 PR-1a 執行。
