# 5 · Autonomous Optimization Architect — v2.0 盲點覆盤 & 滾雪球守門升級

> 我是 Venturo 的**自主最佳化架構師**。我不找 pattern、我守迴路。
> 這次 /login v3.0 覆盤挖到 4 條 v2.0 漏抓的 DB 層問題。
> 我的工作不是修這 4 條、是確保**第 11 路由第 1 次驗就挖得到第 10 路由第 2 次才挖到的東西**。
> 每一次 skill 運行完、整個系統的「熵」應該比開跑前更低。如果第 N 次還在抓跟第 N-1 次同類的漏、我就是失職。

---

## 1. 為什麼 v2.0 漏抓 — 根因分析（不是細節）

4 條 v2.0 漏抓 pattern：

- **workspaces_delete USING: true**（任何登入用戶可 DELETE 任一 workspace）
- **\_migrations / rate_limits / ref_cities 無 RLS**（整張表無防火牆）
- **employee_permission_overrides 4 條 policy 全 USING: true**（有點名、沒升格 pattern）

4 條共同根因 = 3 個系統性盲點：

### 盲點 A：**Agent F 驗 policy 是抽樣式、不是窮舉式**

v2.0 Agent F 對一張 table 的 RLS 檢查、往往只看到 SELECT + UPDATE 兩條最顯眼的、沒把 4 條（或 5 條含 service_role）**全部逐條列出**。
結果：`workspaces` 的 SELECT/UPDATE 對了、DELETE 沒看 = 放行；`employee_permission_overrides` 看了 2 條 USING:true 就跳下一張、沒把「**4 條全 USING:true**」的嚴重度升格成 pattern。
**根因**：prompt 沒強制「每張 table 4 條 policy 原文貼出」、agent 自由發揮、自由發揮 = 抽樣。

### 盲點 B：**沒有對「RLS disabled」做全站掃描**

`_migrations` / `rate_limits` / `ref_cities` 沒開 RLS、不是「policy 寫錯」而是「沒有 policy」。Agent F 的視角是「這個路由用到哪些 table → 看這些 table 的 policy」、**不會主動枚舉「全站哪些 table 沒 RLS」**。這類問題要靠 cross-route 的 meta 掃描、route-verify 層級打不到。

### 盲點 C：**「有點名」不等於「進 pattern map」**

v2.0 Agent F 的 `employee_permission_overrides` 已經寫在 login.md、但 pattern-map skill 沒自動讀取 per-route 的「🔴 條目」把它升成全站 pattern。結果：下次任何路由碰到同一張表、agent 都從零開始推論。知識沒被結構化成滾雪球的雪。

**三個盲點共通點**：都是「**沒有機制強制 agent 做窮舉 / 升格 / 登記**」。這不是 agent 不夠聰明、是 skill 沒裝護欄。

---

## 2. venturo-route-context-verify skill 該升級什麼規則

### 規則 F1：**Agent F 必須報 4 條 policy 原文、每張命中 table 無條件**

prompt 加死：

```
對該路由命中的每張 table、你必須以下表格式列出**所有**RLS policy：
| Table | Policy Name | cmd | USING | WITH CHECK | 是否擋住 |
| ... | SELECT | ... | ... | — | ✓/✗ |
| ... | INSERT | ... | — | ... | ✓/✗ |
| ... | UPDATE | ... | ... | ... | ✓/✗ |
| ... | DELETE | ... | ... | — | ✓/✗ |

如果某個 cmd 沒 policy、也必須在表格中列出「MISSING」。
如果有多條 SELECT policy、全部列、不得合併。
任何 policy qual/with_check 為 `true` 必須標紅 🔴 並解釋後果。
```

違反此格式 = agent output reject、重跑。

### 規則 F2：**Agent F 多加一塊「meta RLS 掃描」**

每次跑任何路由、Agent F 除了看命中 table、還要跑：

```sql
-- A. 哪些 public table 沒開 RLS
SELECT tablename FROM pg_tables WHERE schemaname='public'
AND tablename NOT IN (SELECT tablename FROM pg_policies WHERE schemaname='public');

-- B. 哪些 policy 的 qual/with_check = 'true'
SELECT tablename, policyname, cmd FROM pg_policies
WHERE schemaname='public' AND (qual='true' OR with_check='true');
```

結果貼在 Agent F 輸出最上方、不是「該路由有沒有中」而是「全站統計」。一旦出現新項目、自動是 pattern 候補。
**這是 v2.0 的最大漏口、每個路由都補看同樣統計表、雪球才能滾**。

### 規則 F3：**Agent F 要輸出「v2.0 點名但未升格」清單**

每次 run、Agent F 讀前面已驗 SITEMAP 檔、把 🔴/🟠 條目但**沒出現在 `_PATTERN_MAP.md`** 的項目列出、彙整階段強制決策：「升格為 Pxxx / 合併到已有 Pxxx / 廢棄」。不允許「沒決策就過」。

### 規則 F4：**skill 完成後的「DB truth diff」回饋迴路**

每次 route-verify 跑完、比對本次 DB_TRUTH.md vs 上次的 commit、**diff 新增的 table / policy / trigger 自動進「新表待關注清單」**。本次 amadeus_totp_secret 欄位就屬此類、不靠人記得。

---

## 3. venturo-pattern-map skill 該新增什麼欄位 / 機制

### 每個 pattern 新增欄位（schema v2.0）

| 欄位                | 型別                                                                    | 用途                                                                          |
| ------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `detector`          | script path 或 `manual_review`                                          | 自動驗的腳本路徑、pattern-map 下次運行時先跑                                  |
| `detector_sql`      | SQL 字串（可多條）                                                      | 純 DB 層 pattern 直接存 SQL、不用寫 script                                    |
| `detector_grep`     | regex + glob                                                            | 代碼 pattern 存 grep 指令（例：`grep -rn "USING: true" supabase/migrations`） |
| `check_frequency`   | `every_route_verify` / `pattern_map_session` / `weekly_cron` / `manual` | 決定多久回驗一次                                                              |
| `routes_verified`   | `[route, status]` list                                                  | 每個已驗路由對照本 pattern 的結果（✓ 不中 / ✗ 命中 / ? 未對照）               |
| `depends_on`        | pattern id list                                                         | 依賴順序                                                                      |
| `principle`         | 原則編號                                                                | 升格時連動                                                                    |
| `last_detector_run` | 日期 + result                                                           | health check 用                                                               |
| `regression_risk`   | low/med/high                                                            | 修完回歸風險                                                                  |

### 機制 1：**pattern-map skill 開頭的 health check 階段**（最重要）

skill 一啟動、不是讀地圖、而是先跑：

```
for pattern in _PATTERN_MAP.md:
  if pattern.status == '🟢' and pattern.detector:
    result = run(pattern.detector)
    if result == FAIL:
      pattern.status = '🟡 regression'
      log.append(f"{pattern.id} 回歸了、detector 失敗")
  if pattern.status == '🔴' and pattern.last_detector_run > 14 days:
    pattern.flag = 'stale'
```

每輪會診議程 = 只議 status ∈ {🔴, 🟡, 🟡 regression, 未命中但 detector 紅} 的 pattern。**綠的 pattern 連看都不看 = 迴路變輕的核心**。

### 機制 2：**每個 🟢 pattern 必須有 detector 才能標綠**

「修完」的定義升級為：代碼修好 + detector 寫好 + detector 跑過 + CI 掛上。**三缺一只能標 🟠 已修但無守門**。避免 P004（28 張 FORCE RLS）今天的困境——pattern-map 記 🔴、實際 4/21 修完了、要人工去 pg_class 查才知道。

### 機制 3：**已驗路由相容性矩陣**（routes_verified 欄位）

每次新路由驗完、pattern-map 自動新增一欄、把該路由對照每個 pattern 的結果填上：

```
| Pattern | /login | /tours | /finance | /hr | ... |
| P003 跨租戶 API | ✓ | ✗ | ✗ | ? | ... |
| P010 USING:true | ✓ | ? | ? | ? | ... |
```

這張表 = **真正的滾雪球**。第 N 個路由驗完、一眼看到「哪幾個 pattern 還沒在這路由測過」、下次重驗知道從哪補。

### 機制 4：**新 pattern 必先查「是否為既有 pattern 變體」**

彙整階段強制 fuzzy match、避免 P007a / P007b / P007c 長出來。規則：新 pattern name + routes 任一與既有 pattern 交集 > 50%、彙整主 Claude 必須解釋「為什麼不合併」。

---

## 4. generate-db-truth.mjs 該加什麼欄位

目前腳本已經有 `Q_RLS_STATUS` + `pg_policies` 查詢、但產出的 DB_TRUTH.md 只是「貼 policy 原文」、沒主動提前 flag 可疑項。建議加**主動告警區**：

### 新增段落：`## 🚨 DB 真相自動告警（generator 提前 flag）`

```markdown
### A. RLS disabled 的 public table（整張表無防火牆）

- `_migrations`
- `rate_limits`
- `ref_cities`
- ...

### B. Policy qual 或 with_check = 'true' 的 policy

| Table | Policy | cmd | qual | with_check |
| workspaces | workspaces_delete | DELETE | true | — |
| employee_permission_overrides | \* | ALL | true | true |
...

### C. 4 條 policy 不齊全的 RLS-enabled table

（開了 RLS 但 SELECT/INSERT/UPDATE/DELETE 其中一個 cmd 沒任何 policy）
| Table | 缺 cmd |

### D. 本次 DB_TRUTH 相對上次的 diff

- 新增 table: amadeus_totp_secrets
- 新增欄位: employees.amadeus_totp_secret (text, nullable) 🟡 未加密、policy 未檢查
- 移除 table: （無）
- policy 變更: role_tab_permissions 4 條 USING:true → 5 條 tenant scoped ✅
```

### 實作代價評估

- A/B/C：SQL 已存在、只要加聚合邏輯 + markdown section、< 50 行程式碼、**半天可做**
- D：需要 git log 取上版本 DB_TRUTH.md、diff 解析、約 1 人日

**A/B/C 立刻做**。D 等 DB_TRUTH 跑三輪後、歷史比對才有意義。

---

## 5. Pattern-map 會議本身的演進

### 幕僚組成（6 → 7 → 9）

延續 v2.0 建議、但修正優先順序：

#### 🔴 下次必加：**Product Translator**（產品翻譯員）

- 目前業務翻譯欄位靠主席事後補、品質不穩
- 獨立一位、專心把技術結論翻成 William 聽得懂的旅遊業比喻
- 彙整階段直接收業務版、不再加工

#### 🟡 次次加：**QA / 測試工程師**

- 負責每個 pattern 的「修完怎麼驗」、定義 detector 腳本 + CI check
- 跟機制 2（detector 強制）直接配對
- 沒有 QA 幕僚、機制 2 只是口號

#### 🟢 再次加：**UX / 前端流程幕僚**

- 目前 6 幕僚都偏後端 / 架構、UI 層欄位三層不一致這類 pattern 沒人深挖
- `_PATTERN_MAP.md` 的 P013（UI/API/DB 欄位三層不一致）就是 UX 幕僚該抓的

#### ⚪ 不加：DevOps / 合規、Domain Modeler

- 未上線階段不需要
- Domain Modeler 等有新模組引入（AI 客服、OTA、會議助理）再加

### 我（幕僚 5、自主最佳化）下次要看什麼新東西

v2.0 我看 pattern map 結構、下次我要看**兩個新東西**：

#### 新看項 1：**health check 階段的自省紀錄**

skill 跑完自動產出 `_PATTERN_MAP_HEALTH_YYYY-MM-DD.md`、記：

- 本輪跑了哪些 detector、幾個綠、幾個回歸
- 本輪新增的 pattern、是否為既有 pattern 變體（fuzzy match 報告）
- 本輪地圖條目增幅（目標 ≤ 20%、超過 = 增熵警告）
- 備料階段讀了多少 token、哪些文件讀了但沒被引用（砍掉省 context）

**我下次的工作 = 讀這份健康檢查報告、提建議 skill 自己怎麼變輕**。

#### 新看項 2：**meta-pattern 浮現統計**

從 4 次以上路由驗證中、哪些問題**重複出現但還沒被升格為 pattern**？
例：如果 `/login` / `/tours` / `/hr` 三路都出現「agent F 漏看 DELETE policy」、這就該升為 **meta-pattern：skill 自己的盲點**、進一個新檔案 `_SKILL_META_PATTERNS.md`、不跟業務 pattern 混。

這檔才是**真正的自我升級知識**。skill 知道自己會漏什麼 = skill 會自己補護欄。

---

## 回傳摘要（< 200 字）

4 條 v2.0 漏抓根因 = 3 個 skill 盲點：Agent F 抽樣式驗 policy（不窮舉 4 條）、沒做「RLS disabled」全站掃、per-route 點名沒升格 pattern。修法三層：(1) route-verify 加 4 條規則（F1 強制 4 cmd 全列、F2 meta RLS 掃描、F3 未升格清單決策、F4 DB diff 回饋）；(2) pattern-map 地圖加 `detector` / `routes_verified` / `check_frequency` 欄位、開頭先跑 health check、綠 pattern 跳過會診、修完定義升級為「代碼+detector+CI」三缺一不綠；(3) generate-db-truth.mjs 加「RLS disabled 清單 / USING:true policy 清單 / policy cmd 不齊全表」主動告警區、半天可做。幕僚 6→7（Product Translator 下次必加）→9（QA、UX）。我下次要看 health check 自省紀錄 + `_SKILL_META_PATTERNS.md`（skill 自己的盲點集）。

---

### 給 pattern-map skill 的演進建議（ul）

- **開頭先跑 health check 階段**、綠 pattern 跑 detector 驗、fail 自動打回 🟡 regression、綠的 pattern 本輪不進會議議程
- **每個 🟢 必須綁 detector**（script / SQL / grep 三擇一）、沒 detector 只能標 🟠「已修但無守門」
- **地圖 schema 升 v2.0**、新增欄位：`detector` / `detector_sql` / `detector_grep` / `check_frequency` / `routes_verified` / `depends_on` / `principle` / `last_detector_run` / `regression_risk`
- **`routes_verified` 矩陣欄位**是滾雪球核心、每次新路由驗完自動填列、一眼看出哪 pattern 還沒在哪路由測過
- **新 pattern 必做 fuzzy match**、跟既有 pattern 重疊 > 50% 強制解釋為何不合併、避免 P007a/b/c 增生
- **每輪地圖條目增幅 ≤ 20%**、超過 = 增熵警告、skill 自檢
- **每輪產健康檢查報告**（`_PATTERN_MAP_HEALTH_<date>.md`）、記 detector 狀態、token 用量、新 pattern 是否變體、自我診斷
- **開一份 `_SKILL_META_PATTERNS.md`**、專記 skill 自己的盲點（例：v2.0 Agent F 不窮舉 policy）、跟業務 pattern 分開、這是真正的自我升級燃料
- **幕僚 6→7 下次必加 Product Translator**（業務翻譯獨立）、次次加 QA（綁 detector 機制）、再次加 UX（抓前端側 pattern）、終態 9 位
- **generate-db-truth.mjs 加主動告警區**（RLS disabled table、USING:true policy、policy cmd 不齊全、DB_TRUTH diff）、半天可做、解掉 v2.0 3 個盲點中的 2 個
- **route-verify Agent F prompt 寫死 4 條 policy 窮舉格式**、不符格式 output reject 重跑、這是 v2.0 最大修正
