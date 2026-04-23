# VENTURO 自動化夜間報告

> **William 起床只讀這份 + `_BLOCKED.md` + `_META_PATTERNS.md`**
> 每 24h 滾動、舊日期放 `_HISTORY/YYYY-MM-DD.md`

---

## 2026-04-18（啟動日 · 加強版 v2）

### 🎯 計劃大調整（整合 reality-checker + senior-dev audit）

**核心改動**：
- ❌ 原版 scope：134 路由全跑 → 實際產「結構化問題清單 + 🟢 級口紅」、不是「可販賣」
- ✅ 新版 scope：**12 核心 end-to-end shippable**、119 標 `BLOCKED_SHALLOW` 第二輪

### 🆕 7 個新機制（全建成）

| 檔案 | 用途 |
|--|--|
| `_INVARIANTS.md` | 全域決策凝固（17 條現行 + 5 條暫緩）、cron 每輪 Step 0 必讀 |
| `_PROGRESS.json` | State store（JSON、機讀）| 
| `_PROGRESS_VIEW.md` | 從 JSON 渲染的 view（人讀） |
| `_SHIPPABLE.md` | 12 核心 happy-path checklist、code_green + human_verified 雙閘門 |
| `_META_PATTERNS.md` | 每 6 wake 強制 meta 輪、抽「重複 3+ 次」📋 變 pattern |
| `_MIGRATION_DIGEST.md` | 每週三 cron 只做 SQL digest、不跑路由 |
| `_LOCK` 機制 | mkdir/rmdir 防 race、30 分 stale 自動清 |

### 🆕 SOP 新增檢查點

- Step 0 必讀 `_INVARIANTS.md`
- ADR 違反 INVARIANT 必明講（否則自動打回）
- Stage C 後必跑 `gitnexus_impact` d=1、記到 `_DAILY_REPORT`
- d=1 牽涉未 verified 路由 → 自動標 🟡、不給 ✅
- 🟢 定義嚴格化：不動 shared type / d=1 < 3

### 📋 已完成（2026-04-18 凌晨）

- ✅ 範本 Blueprint `/quotes/quick/[id]`（`docs/blueprints/06-quotes-quick.md`）
- ✅ 8 條 🟢 技術債修復（type-check pass）
- ✅ 134 路由盤點完、12 核心入 `_PROGRESS.json`
- ✅ 5 個新機制檔建成
- ✅ `_AUTO_WORKFLOW.md` v2.0 改寫
- ✅ Cron `d869ef3f` 已設（30 分、durable 但 session-only 限制）
- 🛑 目前 `_STOP` 檔存在、cron 暫停、待 William `rm _STOP`

### 待 William 決策（📋）

暫無新增 —— 等 cron 跑出第一輪條目。

### DB migration 待審（🛑）

1 條 draft：
- `quick_items_array_check.sql`（`/quotes/quick/[id]` Blueprint §6）
- 狀態：草稿、未進 `_pending_review/` 正式目錄
- 動作：第一個週三 cron 自動整理進 `_MIGRATION_DIGEST.md`

---

## Cron Wake 記錄

### Wake 2026-04-18 03:30 · Stage-B /login ✅
- **產出**: `docs/blueprints/01-login.md`（v1.0、8 節、約 300 行）
- **新卡點**: 4 條 📋 業務決策 + 1 條 🔴 P0 bug（`is_active` 未擋）→ 全進 `_BLOCKED.md`
- **INVARIANT 例外**: `/login/page.tsx` 加入 INV-P01 例外清單（245 行、有理由、ADR-L4 記錄）
- **d=1 影響**: 無（只寫 Blueprint、沒改 code）
- **時間**: < 20 分

### Summary（截至此 wake）
- 完成 Blueprint: 2 / 12 核心（/quotes/quick/[id] + /login）
- 完成 🟢 修復: 1 / 12 核心（/quotes/quick/[id] 8 條）
- 待 William 決策 📋: 4 條新增
- 🔴 P0 bug 待修: 1 條（下輪 Stage C）
- 🛑 migration 待審: 1 條 draft

### Wake 2026-04-18 05:50 · Stage-B /dashboard ✅
- **產出**: `docs/blueprints/02-dashboard.md`（v1.0、11 節）
- **新卡點**: 2 條 📋 業務決策（路由重複 + widget 存 localStorage vs DB）
- **發現可 Stage C 修的**: 雙胞胎 weather widget 驗證、selectedStats 是否 dead
- **d=1 影響**: 無（只寫 Blueprint）
- **時間**: ~10 分

### Summary（截至 05:50）
- 完成 Blueprint: 3 / 12 核心（quotes/quick + login + dashboard）
- 完成 🟢 修復: 1 / 12
- 待 William 決策 📋: 6 條（login 4 + dashboard 2）
- 🔴 P0 bug 待修: 1 條（login `is_active=false` 未擋）
- 🛑 migration 待審: 1 條 draft

### ⚠️ Cron 架構限制發現
- 你離開後 cron fire 了 5 次、但 prompt 只入 queue、**沒有真執行 Claude**（REPL 不 idle）
- 實際只跑了 03:30（你在場）+ 05:50（你打「？」觸發）兩輪
- 下一步需要決定：🅰 繼續前台推、🅱 改 macOS launchd 真 24h、🅲 放棄自動化只在你在場時跑

### Wake 2026-04-18 06:10 · Stage-B /tools ✅
- **產出**: `docs/blueprints/03-tools.md`（v1.0、11 節、含 3 子路由 flight/hotel/reset-db）
- **新卡點**: 2 📋（flight/hotel 使用模式、權限矩陣）+ 1 🔴 P0（reset-db 無 系統主管 guard、違反 INV-A02）
- **可 Stage C 修**: reset-db guard（🟢、3 行 code 可解）
- **d=1 影響**: 無
- **時間**: ~15 分

### Summary（截至 06:10）
- 完成 Blueprint: 4 / 12 核心（quotes/quick + login + dashboard + tools）
- 完成 🟢 修復: 1 / 12
- 待 William 決策 📋: 8 條
- 🔴 P0 bug 待修: 2 條（login is_active + tools/reset-db guard）
- 🛑 migration 待審: 1 條 draft
- ⚠️ **_BLOCKED 已達 10 條上限**（cron SOP 規定下輪自動暫停、William 醒來須清）

### Wake 2026-04-18 06:47 · ⏸ PAUSED
- **原因**: `_BLOCKED.md` ≥ 10 條（SOP 存活檢查觸發）
- **動作**: 不做路由、不產新 Blueprint、寫本行後結束
- **恢復條件**: William 清至 < 10 條後下輪 wake 自動恢復（或手動觸發）

### Wake 2026-04-18 07:30 · ⏸ PAUSED (again)
- **原因**: `_BLOCKED.md` 仍 10 條（前台處理期間 William 又加了 3 條 hr/roles 📋、清了 4 條、淨值仍 10）
- **新增環境風險**: GitNexus MCP server 斷線（system reminder）→ 下輪若做 Stage C 無法跑 `gitnexus_impact`，必須暫緩 🟢 修復直到 MCP 重連或改用本地 `npx gitnexus` CLI

### Wake 2026-04-18 ≥ 08:17 · ⏸ PAUSED (_STOP file present)
- **原因**: `_STOP` 檔存在（William 當機時放、還沒 rm）
- **前台進度**: 架構設計對話中（3 層 Role/Capabilities/Scope）、遊戲比喻確認、migration draft 寫好待審
- **恢復條件**: William `rm _STOP` 後下輪自動恢復

### Wake 2026-04-18 ≥ 08:47 · ⏸ PAUSED (same reason)
- **原因**: `_STOP` 仍在
- **前台進度**: rate_limit migration apply ✅、capabilities migration apply ✅（但 William 改變方向要 rollback）、EmployeeForm capability UI 改完（待 rollback）、正在決定最終架構（permission-based 細粒度、業務主管 vs 小業務用權限分流）
- **下一決策**: A 全做 / B 單條示範 / C 明天做

### Wake 2026-04-18 ≥ 09:17 · ⏸ PAUSED (same)
- **前台已完成**: capability flags rollback ✅、MODULES 擴展 4 個資格 tab ✅、seed 3 workspace 預設權限 ✅、系統主管下拉資格可解鎖 ✅、useEligibleEmployees hook 建立 ✅、add-order-form 改用 hook ✅、/hr/roles 左右獨立滾動 ✅
- **剩餘**: 建團團控下拉、代墊款下拉、order-edit-dialog 可能也要改
- **架構定論**: 權限矩陣 + 下拉資格 tab（Permission-Based RBAC、符合 Odoo/NetSuite）

### Wake 2026-04-18 ≥ 09:47 · ⏸ PAUSED (same)
- **前台已完成（這輪清理）**:
  - order-edit-dialog 改用 useEligibleEmployees ✅
  - 診斷「Carson 看不見」→ 發現 DB 雙軌 role_id（頂層 vs job_info.role_id）
  - Backfill 頂層 role_id ✅（Carson/Jess 補上）
  - 8 個檔讀寫統一「優先頂層、fallback nested」✅
  - DROP employee_job_roles 表（0 rows backup）✅
  - 移除 job_info.role_id nested key ✅
  - Migration 歸檔（4 applied / 3 rejected / 4 pending）✅
  - type-check 0 error ✅
- **架構狀態**: 職務單一 SoT (employees.role_id 頂層)、下拉依 role_tab_permissions 的 4 個資格 tab、無雙軌

### Wake 2026-04-18 ≥ 10:17 · ⏸ PAUSED (same)
- **前台 UI 優化**: TourFormShell 建團表單佈局改 grid-cols-2（團名/類型 並排、備註/團控 並排）
- **HMR 通過、無 error**

### Wake 2026-04-18 ≥ 10:47 · ⏸ PAUSED (_STOP still)

### Wake 2026-04-18 ≥ 11:17 · ⏸ PAUSED (same)
- **前台**: 討論國家表架構（countries 舊 / ref_countries 新、William 選 🅱 架構重寫）、用秘魯例子解釋 Phase 1 / Phase 2

### 預期 next（William `rm _STOP` 後）

1. **第 1 次 wake**: `/login` Stage B（Blueprint 骨架）
2. **第 2-14 次 wake**: 剩 11 核心 Blueprint
3. **第 6 次 wake**: 強制 Meta Patterns 輪（抽重複 📋）
4. **第 15-30 次 wake**: 各路由 Stage C（🟢 修復）
5. **第 30-40 次 wake**: Stage E/F（shippable code_green + verified）
6. **第一個週三 wake**: Migration Digest 輪
7. **預估 5-8 天完成第一輪**（節奏 + cron 實際吞吐評估）

---

## 重要提醒給 William

**11 天後你拿到的**（誠實）：
- ✅ 12 核心 end-to-end happy path 走得通（可 demo）
- ✅ 知道 134 路由哪裡壞（完整診斷）
- ✅ 40-80 條 migration SQL 排隊（你週三半小時審）
- ✅ 全域決策凝固（`_INVARIANTS.md`）

**你拿不到的**：
- ❌ 零錯誤
- ❌ 多租戶 100% 隔離（需動 DB）
- ❌ 所有 UI 邊界 case 無誤

**這是「DB 不動」紅線下的現實上限。**
