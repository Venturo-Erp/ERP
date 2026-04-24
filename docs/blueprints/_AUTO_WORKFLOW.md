# VENTURO 夜間自動化 · Cron SOP v2

> **角色**: 被 cron wake 的 Claude Code 實例（fresh session、無對話記憶）
> **頻率**: 30 分 / wake（`17,47 * * * *`）
> **目標**: 12 核心路由 end-to-end shippable + 119 路由標 BLOCKED_SHALLOW 留第二輪
> **版本**: v2.0（2026-04-18、整合 reality-checker + senior-dev audit 建議）

---

## 🛑 紅線（違反即終止該輪）

1. ❌ **不碰 Supabase 資料 / row / 欄位**
2. ❌ **不跑任何 migration**（只寫 SQL 到 `supabase/migrations/_pending_review/`）
3. ❌ **不 `git commit` / `git push` / deploy**
4. ❌ **不使用 `--no-verify`**
5. ❌ **不刪 code**（除非 knip + gitnexus + grep 三方確認）
6. ❌ **不自動採納 agent 重構建議**（只寫進 Blueprint ADR）
7. ❌ **不改既有 CLAUDE.md / docs 既定決策**
8. ❌ **不做並行路由**（單核心、一次一路由）
9. ❌ **不違反 `_INVARIANTS.md`**（新 ADR 違反必明講）

---

## 🚦 Step 0 · 存活檢查 + Bootstrap（< 2 分）

每次 wake **一定先做**：

```
1. cd /Users/williamchien/Projects/venturo-erp
2. 若 docs/blueprints/_STOP 存在 → 寫 _DAILY_REPORT.md 一行「STOPPED」→ 終止
3. 檢查 lock: 若 docs/blueprints/_LOCK 存在 AND mtime < 30 分 → 寫「SKIPPED: previous wake still running」→ 終止
4. 若 lock > 30 分 → 視為 stale、刪除、繼續
5. mkdir docs/blueprints/_LOCK（建立 lock）
6. 讀 docs/blueprints/_INVARIANTS.md → 吸收全域決策
7. 讀 docs/blueprints/_PROGRESS.json → 取得 state
8. 判斷今天是哪種輪（下方 §決策樹）
```

結束時（成功或失敗）**必**：`rmdir docs/blueprints/_LOCK`

---

## 🌳 輪型決策樹

```
今天星期幾？ ──→ 週三 ── Yes ──→ §Migration Digest 輪（不跑路由）
              ──→ 其他

已做完 wake 數 ÷ 6 = 整數？ ──→ Yes ──→ §Meta Patterns 輪
                           ──→ 其他

_BLOCKED.md 條數 ≥ 10？ ──→ Yes ──→ §PAUSED、寫 report、終止
                        ──→ 其他

_PROGRESS.json 所有 routes_core 全 verified？ ──→ Yes ──→ §Round Complete、通知
                                              ──→ 其他

↓ 進入常規 §路由輪
```

---

## 🔁 §路由輪（主流程）

### Step 1: 挑下一個 route

從 `_PROGRESS.json` `routes_core` 依序：

- 取第一個 `stages.verified.status != "done"` 的
- 判斷當前最低的 stage：audit → blueprint → fix_green → shippable_code_green → verified
- 該 stage 就是本次要做的

### Step 2: 跑對應 Stage

| 當前狀態                     | 下一 stage           | 時間預算 |
| ---------------------------- | -------------------- | -------- |
| audit=pending                | A: Shallow Audit     | 10-15 分 |
| blueprint=pending            | B: Blueprint 骨架    | 15-25 分 |
| fix_green=pending            | C: 🟢 技術債修復     | 15-25 分 |
| shippable_code_green=pending | E: Shippable Gate    | 5-10 分  |
| verified=pending             | F: Verify + d=1 分析 | 5-10 分  |

**時間上限 25 分**、超時必存檔結束、不強推。

### Step 3: 執行該 Stage（見下方每 Stage 細則）

### Step 4: 更新 state

1. 若有 code 改動：`npm run type-check`
2. 若有 shared symbol 改動：`gitnexus_impact(target, upstream)` + 記 d=1
3. 寫 \_DAILY_REPORT.md 一行
4. 更新 \_PROGRESS.json（用 jq 或 Node 一次性 update、**不做部分 patch**）
5. 從 JSON 渲染 \_PROGRESS_VIEW.md（人可讀）
6. 若有新卡點：寫 \_BLOCKED.md

### Step 5: 清 lock、結束

```
rmdir docs/blueprints/_LOCK
```

---

## 🔵 Stage A · Shallow Audit（10-15 分）

**適用**: 119 個 BLOCKED_SHALLOW 路由（第二輪才跑、本輪不做）
**本輪**: 12 核心全已 audit ✅、跳過 Stage A

---

## 🟡 Stage B · Blueprint 骨架（15-25 分）

**輸入**: 對應 audit 報告、`_INVARIANTS.md`
**輸出**: `docs/blueprints/NN-route-slug.md`（8 節、遵循 `06-quotes-quick.md` 範本）

### 流程

1. 讀 audit 報告（`VENTURO_ROUTE_AUDIT/NN-xxx.md`）
2. 讀 `_INVARIANTS.md` + `_META_PATTERNS.md`（避免重犯）
3. `gitnexus_context` 該路由主 symbol
4. 讀 page.tsx + 主 hook/component（≤ 5 檔）
5. 讀 Supabase schema（read-only、透過 Management API token）**只讀**
6. 寫 8 節 Blueprint：
   - §1 存在理由
   - §2 業務流程（若無法推斷 → 📋）
   - §3 **資料契約** 🛑（讀寫表 / SoT / 幽靈欄位）
   - §4 權限矩陣（引用 `_INVARIANTS.md` INV-A01/A02）
   - §5 依賴圖
   - §6 ADR（**必引用或挑戰 INVARIANT**、違反必明講）
   - §7 反模式 / 紅線（引用 `_INVARIANTS.md`）
   - §8 擴展點
7. §9 技術債快照（從 audit 搬、分三層 🟢/🟡/🔴）
8. §10 修復計畫
9. 更新 \_PROGRESS.json：`stages.blueprint.status = "done"`

### 卡關升級

- 需業務決策（📋）→ 寫 \_BLOCKED.md、**同時**檢查是否重複 3+ 次（若是 → 記進 \_META_PATTERNS.md）
- 需動 DB → SQL 進 `_pending_review/`、Blueprint §6 標 🛑
- 需架構判斷 → Agent tool 召喚 **最多 2 位**（`general-purpose` 配 role prompt）

---

## 🟢 Stage C · 修 🟢 技術債（15-25 分）

**輸入**: Blueprint §9 的 🟢 條目
**輸出**: code diff（不 commit、stage only）

### 🟢 嚴格定義（reality-checker 強調）

符合**全部**以下才算 🟢：

1. 不動 DB schema
2. 不需業務決策
3. 不動 shared type（若動、gitnexus d=1 必 < 3 且全在本路由或已 verified 路由）
4. 不動 CLAUDE.md 既定 pattern

**不符合 → 升 🟡**。寧可少修、不可亂修。

### 流程

1. 讀 Blueprint §9
2. 對每條 🟢：
   - `gitnexus_impact` 要改的 symbol
   - 若 HIGH/CRITICAL → 跳、寫 \_BLOCKED.md
   - 改 code、遵守 `_INVARIANTS.md`
   - 修完後標 ✅、附 commit-ready diff（不 commit）
3. 若需架構判斷 → Agent tool 召喚 ≤ 2 位
4. `npm run type-check` — **失敗連 2 次 → git restore、寫 \_BLOCKED.md、跳**
5. 更新 \_PROGRESS.json

### Agent 召喚規則

- 最多 2 位 / 卡點、絕不 > 2 並行
- `general-purpose` 配 role prompt（扮演 code-reviewer / senior-dev / database-optimizer / reality-checker）
- Agent 建議**只寫 Blueprint ADR、不自動採納**
- 重大架構建議（跨路由影響）→ 進 \_BLOCKED.md 等 William

---

## 🟠 Stage E · Shippable Gate code_green（5-10 分）

**輸入**: 已完成 fix_green 的路由
**輸出**: `_SHIPPABLE.md` 該路由的 `code_green` 狀態

### 判定規則（靜態分析）

讀 `_SHIPPABLE.md` 該路由 checklist、逐條檢查：

1. 符合 `_INVARIANTS.md` 所有適用條
2. Blueprint §9 🟢 全 ✅
3. `npm run type-check` 0 error
4. `gitnexus_impact` d=1 所有 callers 都在 `_PROGRESS.json` 已 verified 或本路由

**全過** → `stages.shippable_code_green.status = "done"`
**任一不過** → 寫 \_BLOCKED.md、標該條哪裡失敗

### 不做

- ❌ 不跑瀏覽器測試（沒 Playwright / Puppeteer）
- ❌ 不改為 `human_verified`（那是 William 手動）

---

## ✅ Stage F · Verify（5-10 分）

**輸入**: 已過 code_green 的路由
**輸出**: `verified = true`

### 流程

1. `npm run type-check` 最終確認
2. `gitnexus_detect_changes({scope: "unstaged"})` 記錄所有動過的 symbol
3. 寫 `_DAILY_REPORT.md`：
   ```
   - [HH:MM] Stage-F /route ✅ — verified. d=1 影響: X, Y, Z
   ```
4. 更新 \_PROGRESS.json：`stages.verified.status = "done"`

---

## 🔄 §Meta Patterns 輪（每 6 wake 強制）

**觸發**: `completed_wakes_since_last_meta % 6 == 0`
**輸出**: `_META_PATTERNS.md` 新條目

### 流程

1. 讀過去 6 輪的 \_BLOCKED.md 新增 📋 項目
2. 找**重複 3+ 次**的問題核心（不是字面重複、是語意）
3. 抽成 Pattern：
   ```
   ### Pattern: <名字>
   - 出現路由: /a, /b, /c
   - 問題核心: <抽象化>
   - 決策選項: A/B/C
   ```
4. 寫入 `_META_PATTERNS.md`
5. 寫 \_DAILY_REPORT.md：「Meta 輪：找到 N 個新 pattern」
6. **不做路由**、直接結束

---

## 📊 §Migration Digest 輪（每週三）

**觸發**: 週三 09:17 或 09:47 那輪
**輸出**: `_MIGRATION_DIGEST.md` 新條目

### 流程

1. 列 `supabase/migrations/_pending_review/*.sql`
2. 對每條：
   - 讀檔、解析 purpose
   - 若可能：SELECT COUNT 估 affected rows
   - 找 `_applied/` 裡類似 migration 當範例
   - 分類 🟢/🟡/🔴
   - 給 RUN/DEFER/REJECT 建議
3. 寫進 `_MIGRATION_DIGEST.md` Week of YYYY-MM-DD 段落
4. 寫 \_DAILY_REPORT.md：「Digest 輪：N 條待審、M 條 🟢 建議 RUN」
5. **不做路由**、直接結束

---

## 🚨 卡關升級總表

| 情境                        | 動作                                                                   |
| --------------------------- | ---------------------------------------------------------------------- |
| 能自己解                    | 解                                                                     |
| 純技術需第二意見            | Agent tool 召喚 1-2 位、絕不 > 2                                       |
| 需業務決策（📋）            | 寫 `_BLOCKED.md` + 檢查是否該進 `_META_PATTERNS.md`                    |
| 需動 DB（🛑）               | 寫 SQL 到 `supabase/migrations/_pending_review/NNN_<route>_<desc>.sql` |
| Type-check 連 2 敗          | `git restore` 所有 unstaged、寫 `_BLOCKED.md`                          |
| Agent 回報 HIGH/CRITICAL    | 不修、寫 `_BLOCKED.md`                                                 |
| d=1 牽涉未 verified 路由    | 標 🟡、不給 shippable、寫 `_BLOCKED.md`                                |
| 違反 INVARIANT 又無合理 ADR | 回滾、寫 `_BLOCKED.md`                                                 |
| 超時 (>25 分)               | 存當下進度、`rmdir _LOCK`、結束                                        |
| 發現計劃漏洞                | 寫 `_BLOCKED.md`、不自行改 SOP                                         |

---

## 🔚 終止條件

1. `_STOP` 檔存在
2. `_BLOCKED.md` ≥ 10 條（strict）
3. `_PROGRESS.json` 所有 routes_core `verified = done`（第一輪完成）
4. 連續 3 輪無進展（全 skip / 全失敗）→ 自動暫停、寫 report

---

## 📋 \_DAILY_REPORT.md 格式

```
## YYYY-MM-DD

### Wake HH:MM · Stage-X /route · ✅/⚠️/❌
- 概要: <一句話>
- d=1 影響: <若有>
- 卡點新增: <若有>

### Summary
- 總 wake: N
- ✅ 完成 stage: M
- ⚠️ 警告: K
- ❌ 失敗: J
- 📋 新卡點: P
- 🛑 新 migration: Q
```

每 24h 滾動、舊日期放 `_HISTORY/YYYY-MM-DD.md`。

---

## 🧭 第二輪預告（第一輪完才啟動）

第一輪 = 12 核心 end-to-end shippable（code_green）。
第二輪 = 處理：

- 119 routes BLOCKED_SHALLOW 的 shallow audit
- 🟡 級修復（需業務決策 but William 已決）
- `_META_PATTERNS.md` 套用（批次決策後批次改）

第二輪啟動由 William 手動 + 更新 `_PROGRESS.json` `round = 2`。
