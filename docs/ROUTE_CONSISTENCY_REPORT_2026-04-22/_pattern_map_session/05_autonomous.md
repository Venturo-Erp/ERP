# 05 · Autonomous Optimization Architect — Pattern Map 升級守門

## 身份宣告

我是 Venturo 的**自主最佳化架構師**。我不找 pattern、我守迴路。這個 skill 的價值不在第一次跑得多完整、而在第**十次**跑時能否比第九次更輕、每個 pattern 的狀態是否能被機器自動更新、新產生的知識是否能被擠壓進既有結構而不是增生新結構。

我的原則一句話：**每一次 skill 運行完、整個系統的「熵」應該比開跑前更低**。如果地圖越滾越厚、未修的 pattern 越累積越多、狀態欄長期停在「待修」不更新、那這個 skill 就是個昂貴的文件生成器、不是最佳化迴路。

本次會診我只提 1-2 個 pattern 當示範、重心在「下次怎麼跑得更好」。

---

## 發現的 pattern（示範用、不是重點）

### Pattern M1：跨層清單（DB ↔ Code）缺雙向一致性測試
**樣態**：`workspace_features`（DB 種子）和 `role_tab_permissions` / `MODULES` / `FEATURES`（代碼常數）實際上是**同一個語義實體的兩個投影**、但沒有任何自動化檢查這兩邊一致。人肉同步 = 必定漂移。

這是候選原則 5-8 外的**第九條候選原則前兆**：「**跨存儲的語義實體必須有雙向一致性測試**」。

**自動偵測設計**：寫一支 `scripts/check-feature-consistency.mjs`、同時讀 DB `workspace_features` distinct keys + 代碼 `MODULES` / `FEATURES` constants + `role_tab_permissions` enum、三邊做 set diff、CI 跑、不一致則 fail。**這支檢查一次寫完、終身守這個 pattern**。

### Pattern M2（meta pattern）：地圖本身沒有 health check
**樣態**：`_PATTERN_MAP.md` 產出後、狀態欄（🔴🟡🟢）依賴人工更新。下次 skill 運行時、主 Claude 讀到舊狀態、可能把早已修好的 pattern 再派一次幕僚、浪費整輪會診。

**這是本 skill 最大的熵增源**。見下方第 5 節自動偵測機制詳細設計。

---

## 幕僚演進建議（本文重點 1）

### 當前 6 幕僚職責邊界檢查

| # | 幕僚 | 核心 | 重疊風險 |
|---|---|---|---|
| 01 | 架構 | SSOT / 分層 / 跨模組關聯 | 跟後端 DB 在「schema 設計」高重疊 |
| 02 | 後端 / DB | schema / RLS / trigger / FK | 跟安全在「RLS / 租戶驗證」高重疊 |
| 03 | 安全 | 認證 / 授權 / 跨租戶 / webhook | 跟後端 DB 在 RLS 層疊、跟架構在「權限模型」疊 |
| 04 | 資深工程 | 代碼品質 / 可維護 / 技術債 | 跟架構在「重構方向」疊 |
| 05 | 自主最佳化（我） | 迴路 / 自我升級 / 熵 | 獨立、不疊 |
| 06 | 優先級 | 修復順序 / 業務影響 | 獨立、但依賴其他 5 位產出 |

**邊界問題**：架構 / 後端 / 安全三角在 RLS + 多租戶議題**必定三家都提一次**、同一件事會被說三次稍有角度差異。彙整階段要靠主 Claude 人肉去重。

### 建議新增的幕僚

**優先級排序**（下次 skill 必加、次次加、再次加）：

#### 🔴 第 7 位：業務翻譯幕僚 / Product Translator（下次必加）
**理由**：目前會議產出高度技術化、William 需要業務語言。`_PATTERN_MAP.md` 的「業務翻譯」欄位現在是主 Claude 事後補的、品質不穩。專門派一位負責**把 6 個技術會診結果翻成 William 聽得懂的話 + 用旅遊業比喻**、直接產業務語言版的 pattern 卡、彙整階段不用再加工。

#### 🟡 第 8 位：測試 / QA 幕僚（次次加）
**理由**：每個 pattern 修完後「怎麼驗」目前沒人負責。修完回歸風險、E2E 覆蓋缺口、修完自動化驗證、都需要一個專門角色。這位也負責定義「pattern 修完後的 CI check」、跟自動偵測機制直接掛勾。

#### 🟢 第 9 位：UX / 前端流程幕僚（再次加）
**理由**：目前 6 幕僚都偏後端 / 架構視角。「UI 寫了但後端沒接」「欄位三層不一致」「多 UI 主題並存」這些 pattern 明顯是前端側問題、但沒有專職幕僚。/tours 6 款 Hero 主題這種問題目前沒人深挖。

#### ⚪ 暫不加：DevOps / 合規
目前產品階段（未上線、客戶 0）不需要。上線後按訊號加。

### 結論
**從 6 → 7（加 Product Translator）立即有感**。後續按需加到 9、超過 9 就進入邊際效益遞減、context 成本爆炸。

---

## 地圖結構演進建議（本文重點 2）

當前 `_PATTERN_MAP.md` 欄位（推測）：ID / 業務翻譯 / 命中 / 修法 / 估時 / 優先級 / 狀態 / 修復紀錄。

### 強烈建議新增欄位

| 欄位 | 用途 | 為什麼必要 |
|---|---|---|
| **依賴 pattern**（`depends_on`）| 列出修這個 pattern 前必須先修的其他 pattern | 避免修 P003 前沒修 P001、導致 P003 白修 |
| **關聯 SITEMAP 路由**（`routes`）| pattern 命中的路由清單 | 下次 skill 只重掃未修的路由、跳過已修的 |
| **關聯原則**（`principle`）| 對應原則 1-4 / 候選 5-8 / 新原則 | 原則升格時、所有連到它的 pattern 一起升狀態 |
| **自動偵測腳本**（`detector`）| 寫完後這個 pattern 由哪支 script 監控 | 修完自動變 🟢、下次 skill 跳過 |
| **測試覆蓋**（`tests`）| 相關 E2E / 單元測試清單 | QA 幕僚負責、修完掛測試守門 |
| **回歸風險**（`regression_risk`）| low / medium / high + 理由 | 跨模組 pattern 修完可能打壞 N 個頁面 |
| **最後更新**（`last_touched`）| 日期 + 誰動過 | 老舊未動的 pattern 自動標「需重驗」 |

### 不建議新增
- ❌「修復歷史時間軸」— 已有 `修復紀錄`、不重複
- ❌「William 拍板」— 候選原則有這欄、pattern 不需要（pattern 是客觀事實、不是原則）

### schema 版本化
`_PATTERN_MAP.md` 開頭必須有 `## Schema Version: 2.0 (2026-04-22)`、schema 變動 bump 版本、下次 skill 讀到版本不對時自動觸發「地圖 migration」流程。**這是迴路存活的關鍵**。

---

## 候選原則升格推薦

### 本次會議證據足以升格的：無
候選 5-8 來自單一路由（/tours）單次驗證、需要 **至少第 2 個路由命中** 才能升正式（/orders 或 /customized-tours 驗完後重審）。

### 本次病症可以提煉的新候選原則

#### 🟡 候選原則 9：跨存儲語義實體必須有雙向一致性測試
**來自**：本次會診 MODULES / FEATURES / workspace_features 分裂。
**候選定義**：同一個語義實體（模組、權限、狀態列舉）在 DB 種子 + 代碼常數 + UI 展示多處投影時、必須有自動化 script 驗證三邊一致、不允許人肉同步。
**違反樣態**：feature 新增時漏改其中一處、payment_method 列舉 4 處定義其中 3 處漏加 linkpay（/finance/payments 已中）、MODULES 和 workspace_features 無同步。
**可能適用**：/finance/payments（候補命中）、本次病症（主命中）、未來任何多處列舉。

#### 🟡 候選原則 10：權限檢查只需要一層業務邏輯、展示層只照映射
**來自**：本次病症「UI 層需要雙層檢查隱藏業務邏輯」。
**候選定義**：`hasPermission(user, action)` 是**唯一**決策點、UI / API / RLS 三層都從這裡問、不各自做業務判斷。UI 只問「能不能看」、不做「為什麼不能看」的翻譯。
**違反樣態**：UI 有 `if (workspace.feature_enabled && hasPermission(...))` 雙判斷、RLS policy 裡重算 feature_enabled、API 又查一次。
**跟原則 1 的關係**：原則 1 講「權限長在人身上」、這個講「權限只有一個決策點」、是原則 1 的延伸。

### 本次「衍生狀態寫 DB」母 pattern 的子項確認
**結論是**：feature_enabled 本質是「這租戶有買嗎」的衍生、應該從 `workspace_subscriptions` / `tenant_plans` 即時算、不存 `workspace_features.enabled` boolean。這**確實**是原則 4 的子項、應標記 `principle: 4` 並在原則 4 下方加實例。

---

## 自動偵測機制設計（本文重點 3）

### 設計哲學
**「修好的東西不會自己走回頭路」是幻覺**。所有修復都會在後續 commit 被意外打回。因此每個 pattern 修完、必須配一支**守門腳本**、CI 跑、壞掉立刻紅。

### 分類 pattern 的可自動化程度

| 等級 | 描述 | pattern 範例 | 自動化方式 |
|---|---|---|---|
| **A 級：結構可驗** | 可用 grep / AST / SQL 驗 | 雙層檢查 pattern、常數多處定義、FORCE RLS + service_role | CI script |
| **B 級：一致性可驗** | 跨 DB / 代碼比對 | MODULES vs workspace_features、payment_method 4 處 | 跨源 set diff script |
| **C 級：行為可驗** | 需 E2E 模擬 | 跨租戶 UPDATE 無 workspace 檢查、cookie TTL 三層 | Playwright E2E |
| **D 級：語義難驗** | 需人腦判斷 | 欄位命名漂移（是不是真的漂移？）、多主題是否該淘汰 | 只能定期人工審 |

### 本次病症的自動偵測腳本設計

```bash
# scripts/pattern-detectors/check-feature-consistency.mjs
# 跑在 CI、pre-commit optional
node scripts/pattern-detectors/check-feature-consistency.mjs

# 內部邏輯：
# 1. 連 Supabase 讀 workspace_features 的 distinct feature_key
# 2. 讀 src/lib/constants/modules.ts 的 MODULES enum
# 3. 讀 src/lib/constants/features.ts 的 FEATURES enum
# 4. 讀 role_tab_permissions migration 的 tab enum
# 5. 做 4 方 set diff、任何不一致 exit 1
```

**這支 script 寫完 = Pattern M1 永久守門**。下次 skill 運行時、只要 CI 綠、這個 pattern 自動標 🟢、跳過會診。

### 每個 pattern 的 detector 欄位規範

```markdown
## P009 · 跨存儲清單不一致
- 狀態：🔴 待修
- detector: `scripts/pattern-detectors/check-feature-consistency.mjs`
- detector 狀態：❌ 未寫（修完必須寫這支、不寫不算修完）
```

修完的定義 = **代碼修好 + detector 寫好 + CI 跑過**。三項缺一不算修完、不標 🟢。

### 不適合自動化的 pattern 處理

**D 級 pattern**（語義難驗）要在地圖標 `detector: manual_review`、並列下次人工重審日期（例 3 個月後）。由 skill 的「定期審查 tick」觸發、不依賴人記得。

---

## Skill meta 觀察

### 主 Claude 備料時間評估
（我無法直接看主 Claude 的 context、只能從現有素材推論）
**假設備料讀了**：`_INDEX.md`（~400 行）+ 4 份已驗 SITEMAP + `CLAUDE.md`。
**總 token 估算**：~30k~50k。
**建議**：備料階段**不讀**單頁 SITEMAP 的細節、只讀 `_INDEX.md` 的「跨路由共通問題」+「已驗路由表」+「候選原則」。單頁細節由幕僚各自讀自己關心的片段。**省 60% 備料 token**。

### 幕僚 prompt 大小
本 prompt（給我的）~2500 字、其他 5 位估類似。6 位總 prompt ~15000 字 = ~20k tokens 只是 prompt 本身、還沒算 context。
**建議**：
1. 抽出「共通段落」（病症描述、/hr /login /features 三系統背景）到 shared context、各幕僚 prompt 只保留差異化任務。省 30-40% prompt size。
2. prompt 結構化成 JSON / frontmatter、讓幕僚解析更快、也讓主 Claude 彙整時好 diff。

### 下次運行的 SOP 改進

#### SOP 改進 1：地圖讀取階段做 health check
skill 開頭先跑：
```
1. 讀 _PATTERN_MAP.md
2. 對每個 🟢 狀態 pattern、跑它的 detector script
3. 如果 detector fail、pattern 狀態自動打回 🟡、附註「回歸了」
4. 對每個 🔴 狀態 pattern、檢查 last_touched > 14 天、自動列進本輪優先會診
5. 產出「本輪議程」、避免重複會診已修好的
```

#### SOP 改進 2：彙整階段必須減熵
彙整時強制執行：
- 新 pattern 先查是否為舊 pattern 變體（用 name + 關聯路由 fuzzy match）、是則合併不新增
- 候選原則升格時、所有連它的 pattern 一起更新 `principle` 欄位
- 每輪會診後、地圖總條目數增幅 ≤ 20%（超過代表這 skill 在增熵、需檢討）

#### SOP 改進 3：下次 skill 跑之前、先跑 detector 清單
跑 pattern-map skill 之前先跑 `scripts/pattern-detectors/*.mjs`、把所有 detector fail 的 pattern 列成本輪議程、**detector 綠的 pattern 連看都不看**。這就是迴路變輕的關鍵。

---

## 回傳摘要（< 200 字）

我不找 pattern、我守迴路。6 幕僚結構目前有效、但**下次必加 Product Translator**（業務翻譯獨立成角色、主 Claude 不再事後補）、次次加 QA、再次加 UX = 終態 9 位。地圖欄位必加 `detector` / `depends_on` / `routes` / `principle`、schema 版本化。自動偵測把 pattern 分 ABCD 級、A/B 級寫 script 守門（本次病症的 `check-feature-consistency.mjs` 是第一支）、修完定義 = 代碼 + detector + CI。下次 skill 開跑前先跑 detector 清單、綠的 pattern 連看都不看、這是迴路變輕的關鍵。並推薦候選原則 9「跨存儲語義實體需雙向一致性測試」、候選原則 10「權限只需一層業務邏輯」。熵減路徑清晰、執行看 William 拍板加幕僚 + 授權寫第一支 detector。
