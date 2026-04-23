# CLAUDE.md - Venturo ERP 開發規範

## 🛑 DB 紅線（違反會打斷登入、反覆修好幾次）

### 絕對不准對 `workspaces` 表下 `FORCE ROW LEVEL SECURITY`
**原因**：FORCE RLS 讓 service_role 也被 policy 擋。登入 API 用 admin client 查 workspace code → 空結果 → 回「找不到此代號」。
**症狀**：所有人登入都失敗、但 workspace 在 DB 明明存在。
**歷史**：2026-04-20 遇過、`20260419050000_fix_rls_medium_risk_tables.sql` 是 FORCE RLS 的元兇、`20260420d_fix_workspaces_force_rls.sql` 關掉它、`tests/e2e/login-api.spec.ts` 守門。
**規則**：
- `workspaces` RLS **可以開**、但 **FORCE RLS 必須關**（`NO FORCE`）。
- 任何動 RLS policy 的 migration、**必須** 先跑 `tests/e2e/login-api.spec.ts`。
- Admin client 必須 per-request、**不准** singleton（避免 stale state）。詳見 `src/lib/supabase/admin.ts`。

### 審計欄位 FK 一律指 `employees(id)`，不是 `auth.users(id)`
**原因**：front-end `currentUser?.id` 從 `useAuthStore` 拿的是 `employees.id`，不是 `auth.users.id`。如果 FK 指 `auth.users`，insert 必炸（FK violation）。
**症狀**：建立行程表 / 信件 / 供應商 / 確認單等 INSERT 失敗、console 顯示 `violates foreign key constraint "<tbl>_created_by_fkey"`。
**歷史**：2026-04-20 全面清查、17 表 30 FK 全部切到 employees（見 `docs/REFACTOR_PLAN_AUDIT_TRAIL_FK.md`）。
**規則**：
- `created_by`、`updated_by`、`performed_by`、`uploaded_by`、`locked_by`、`last_unlocked_by` 等 → `REFERENCES public.employees(id) ON DELETE SET NULL`
- 僅「這個 row 就是一個 Supabase 用戶本身」的欄位（`user_id`、`sender_id`、`friend_id` 等）才保留 FK 到 `auth.users`
- Client 端寫入：`created_by: currentUser?.id || undefined`（**不是** `|| ''`、**不是** 寫死字串）
- 詳細見 `docs/DATABASE_DESIGN_STANDARDS.md` §8

---

## 🚨 策略題前必做（避免誤判商業方向）

**當使用者問以下類型問題、回答前先讀 `docs/BUSINESS_MAP.md`**：

- 「**該怎麼賣 / 賣給誰 / 收多少**」
- 「**目標客戶**是誰 / 多大規模」
- 「**商業模式** / 定價 / 方案」
- 「**UX 方向** / 角色化介面 / 使用者類型」
- 「**競爭對手 / 差異化**」
- 「**Phase 1 / 優先順序 / 路線圖**」

**必讀的段落**：
- `## 🚀 ERP 差異化策略` — 核心賣點是 AI 客服不是純 ERP
- `## 💰 階段式商業模式` — 託管服務、不是 SaaS 自助
- `## 🎯 產品定位` — 目標客戶：無官網、社群接單的小旅行社（1-10 人）
- `## 🌍 國際化與多語言策略` — Google Maps 是基礎

**不讀就答的風險**：我會用「一般 SaaS」的泛化假設、誤導你往錯誤方向做。今早（2026-04-19）就發生過。

---

## 🧠 四大行為原則（Karpathy Skills）

這些原則**凌駕所有其他規則**。任何任務開始前先審視。

### 1. Think Before Coding — 想清楚再寫
- 先說出假設、不確定就問
- 看到多種解釋不要默默選一個、都列出來讓使用者選
- 看到更簡單的做法、有底氣就說出來推回去
- 不清楚就停、指出哪裡不清楚

### 2. Simplicity First — 最少代碼解決問題
- 沒有要求的功能不要寫
- 單次使用的代碼不要抽象化
- 沒有要求的「彈性」「可設定」不要加
- 不可能發生的錯誤情境不要寫 try/catch
- 200 行能縮成 50 行、就重寫
- 自問：「資深工程師會覺得這太繞嗎？」會、就簡化

### 3. Surgical Changes — 只動要動的
- 不要順便「改進」周邊代碼、注釋、格式
- 不要重構沒壞的東西
- Style 照既有風格、即使你不喜歡
- 看到無關的 dead code、提一下、別刪
- 你的改動造成的孤兒（unused imports / vars）才由你清
- 測試法：每行改動、都能追溯到使用者要求

### 4. Goal-Driven Execution — 目標驗證法
- 「加驗證」→ 寫測試覆蓋 invalid input、再實作讓測試通過
- 「修 bug」→ 先寫重現 bug 的測試、再修
- 「重構 X」→ 確認重構前後測試都通過
- 多步任務先列計劃：
  ```
  1. [步驟] → 驗證：[檢查]
  2. [步驟] → 驗證：[檢查]
  ```

**成功判定**：diff 變精簡、因為過度複雜而重寫的次數變少、澄清問題發生在實作**之前**而非之後。

---

## 🧭 第一步：查地圖，不要盲掃

開始任何任務前，**先讀對應的 map 檔案**，不要用 grep/find 盤查整個專案。

| 要做什麼        | 先讀                                              |
| --------------- | ------------------------------------------------- |
| 改程式碼        | `docs/CODE_MAP.md` — 檔案位置、架構、模組對照     |
| 改產品/功能邏輯 | `docs/BUSINESS_MAP.md` — 商業規則、資料流、定價   |
| 改 UI/文案/品牌 | `docs/BRAND_MAP.md` — 品牌定位、色系、客群        |
| 找頁面路由      | `docs/SITEMAP.md` 或 `.claude/CLAUDE.md` 的路由表 |
| 新增 Dashboard Widget | `docs/WIDGET_DEVELOPMENT_GUIDE.md` — 付費 widget **必同步**租戶管理頁開通 UI |

**禁止**：不讀 map 就開始 `grep -rn` 或 `find` 全掃。Map 已經索引好了，比搜尋快 10 倍。

## 🔧 Build 規則

**Commit 與 Push 前必須通過 type-check**

```bash
npm run type-check
```

- **NEVER use `--no-verify` or `-n` with git commit** — pre-commit hook 必須跑完
- **NEVER skip hooks** — 如果 hook 失敗，先修好再 commit，不能繞過
- 不要 push 有 type error 的程式碼
- CI 會擋，但本地先確認更省時間

## ✅ 修復後三步驟

每次修復 bug 或完成功能後：

1. **確認生效** — 實際測試修復有作用
2. **檢查遺漏** — 看有沒有漏改的地方
3. **因果關係檢查** — 這個改動會不會影響其他功能？

## 📊 核心表：tour_itinerary_items

**改團務功能時，資料要寫核心表**

核心表 `tour_itinerary_items` 是行程資料的單一真相來源。

### 使用方式

```typescript
// ✅ 正確：用專用 hook
const { items, updateItem } = useTourItineraryItemsByTour(tourId)

// ❌ 錯誤：直接 query 或用其他方式
```

### 相關文件

- `docs/CROSS_SYSTEM_MAP.md` — ERP ↔ Online 欄位對應

## 🗺️ 開工前必讀

每次開始開發前，先讀：

- `docs/CROSS_SYSTEM_MAP.md` — 系統間欄位對應
- `docs/VENTURO_BLUEPRINT.md` — 架構藍圖

## 🃏 CARD 檢查法

提交前用 CARD 檢查：

- **C**lean — 程式碼乾淨嗎？
- **A**uth — 權限檢查完整嗎？
- **R**edundant — 有重複程式碼嗎？
- **D**ependencies — 依賴關係正確嗎？

---

_統一規範，不管誰開發都走同一套。_

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **venturo-erp** (31044 symbols, 46336 relationships, 300 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## When Debugging

1. `gitnexus_query({query: "<error or symptom>"})` — find execution flows related to the issue
2. `gitnexus_context({name: "<suspect function>"})` — see all callers, callees, and process participation
3. `READ gitnexus://repo/venturo-erp/process/{processName}` — trace the full execution flow step by step
4. For regressions: `gitnexus_detect_changes({scope: "compare", base_ref: "main"})` — see what your branch changed

## When Refactoring

- **Renaming**: MUST use `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` first. Review the preview — graph edits are safe, text_search edits need manual review. Then run with `dry_run: false`.
- **Extracting/Splitting**: MUST run `gitnexus_context({name: "target"})` to see all incoming/outgoing refs, then `gitnexus_impact({target: "target", direction: "upstream"})` to find all external callers before moving code.
- After any refactor: run `gitnexus_detect_changes({scope: "all"})` to verify only expected files changed.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Tools Quick Reference

| Tool | When to use | Command |
|------|-------------|---------|
| `query` | Find code by concept | `gitnexus_query({query: "auth validation"})` |
| `context` | 360-degree view of one symbol | `gitnexus_context({name: "validateUser"})` |
| `impact` | Blast radius before editing | `gitnexus_impact({target: "X", direction: "upstream"})` |
| `detect_changes` | Pre-commit scope check | `gitnexus_detect_changes({scope: "staged"})` |
| `rename` | Safe multi-file rename | `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` |
| `cypher` | Custom graph queries | `gitnexus_cypher({query: "MATCH ..."})` |

## Impact Risk Levels

| Depth | Meaning | Action |
|-------|---------|--------|
| d=1 | WILL BREAK — direct callers/importers | MUST update these |
| d=2 | LIKELY AFFECTED — indirect deps | Should test |
| d=3 | MAY NEED TESTING — transitive | Test if critical path |

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/venturo-erp/context` | Codebase overview, check index freshness |
| `gitnexus://repo/venturo-erp/clusters` | All functional areas |
| `gitnexus://repo/venturo-erp/processes` | All execution flows |
| `gitnexus://repo/venturo-erp/process/{name}` | Step-by-step execution trace |

## Self-Check Before Finishing

Before completing any code modification task, verify:
1. `gitnexus_impact` was run for all modified symbols
2. No HIGH/CRITICAL risk warnings were ignored
3. `gitnexus_detect_changes()` confirms changes match expected scope
4. All d=1 (WILL BREAK) dependents were updated

## Keeping the Index Fresh

After committing code changes, the GitNexus index becomes stale. Re-run analyze to update it:

```bash
npx gitnexus analyze
```

If the index previously included embeddings, preserve them by adding `--embeddings`:

```bash
npx gitnexus analyze --embeddings
```

To check whether embeddings exist, inspect `.gitnexus/meta.json` — the `stats.embeddings` field shows the count (0 means no embeddings). **Running analyze without `--embeddings` will delete any previously generated embeddings.**

> Claude Code users: A PostToolUse hook handles this automatically after `git commit` and `git merge`.

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
