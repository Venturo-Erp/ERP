# Marathon 10 · Codebase Onboarding Engineer 🗺 體檢報告

**扮演靈魂**：Codebase Onboarding Engineer（新人第一天、沒人帶）  
**掃描日期**：2026-04-24  
**視角**：第一次 clone repo 到看到 localhost 首頁、有多痛？ 文件體系夠友善嗎？  
**預設背景**：工程師懂 Node.js / React / TypeScript、但不懂這個特定系統  
**方法**：走一遍新人 Day 1 → Week 1 的完整路徑、記錄摩擦點

---

## 一句話裁決

**新人語氣**：我第一天花了 2 小時搞環境（.env 設定、Supabase 連線），才跑起來；然後立馬就卡在「到底什麼是租戶、什麼是工作區」的概念混亂。有些文件很硬（CLAUDE.md 紅線清楚），但沒有 **「新人 Day 1 清單」**。

---

## 🔴 第一天就會卡（新人跑不起來）

### 1. 環境變數地雷多、文件分散

**症狀**：有 `.env.example` 和 `.env.local.example` 兩份、都是範本、卻說不清楚該複製哪份。

**新人挫折**：

- 讀 README.md 說「npm install 後 npm run dev」、但沒說要先設 `.env.local`
- `.env.example` 有 147 行、`.env.local.example` 只有 26 行、不曉得哪些是必填、哪些是可選
- 直接 `npm install` 後 `npm run dev` → **port 3000 起得來、但進不了首頁**（Supabase 連不上）
- 花 30 分鐘 Google「Supabase NEXT_PUBLIC_SUPABASE_URL」才搞懂「你得去 Supabase 拿 key」

**證據**：

- `/Users/williamchien/Projects/venturo-erp/.env.example` — 147 行、全是參考、沒標「Day 1 最少這些」
- `/Users/williamchien/Projects/venturo-erp/.env.local.example` — 26 行、但清單不完整（缺 Supabase URL）
- `README.md` L25-43 說「npm install 後 npm run dev」、零提 `.env` 設定

**修法**：

- [ ] 新增 `.env.local.example` 明確標記「必填項」和「可選項」
- [ ] `README.md` 第一個 setup block 加「複製 `.env.local.example` 為 `.env.local` 並填入 Supabase URL」

---

### 2. Supabase 連線要求不清楚、新人要自己猜

**症狀**：沒有明確說「這是 local dev 用 Corner workspace？還是連 prod Supabase？」

**新人挫折**：

- `.env.local.example` 說「your_supabase_url」、新人不知道該去哪個 Supabase project 拿
- 跑 `npm run dev` 後看到「Network Error」、卡了 20 分鐘想「是我的 URL 錯了？還是 key 錯了？」
- 最後被迫問同事或查 Slack 記錄

**證據**：

- `docs/DEVELOPMENT_GUIDE.md` L17 說「Supabase 為唯一資料來源」、但沒說「新人該連哪個 Supabase project」
- `docs/SUPABASE_GUIDE.md` 沒看到快速「Setup for local dev」段落

**修法**：

- [ ] `README.md` 或新增 `SETUP_LOCAL_DEV.md`、明確寫「Supabase project 代號是 wzvwmawpkapcmkfmkvav、此為 Corner workspace 共用 dev/test 環境」
- [ ] 提供「複製這個 .env.local」給新人（不用自己填）

---

### 3. `npm run dev` 啟動後不知道該進哪個頁面

**症狀**：`localhost:3000` 首頁無法直接看到功能、要先登入、但新人沒有測試帳號

**新人挫折**：

- `npm run dev` 起動了、開 `http://localhost:3000` → **登入頁**、但沒有測試帳號
- README.md 零提「測試帳號」
- `.env.local.example` 有註解的 Demo 帳號、但 comment 說「已 deprecated」
- 被迫問「我該怎麼登入」

**證據**：

- `README.md` 沒有「測試帳號」段落
- `.env.local.example` L121-126 的 demo 帳號被標「⚠️ DEPRECATED」
- `tests/e2e/.env.example` 有測試帳號（`CORNER`、`E001`、`00000000`）、但新人不知道去讀 E2E 測試的 env

**修法**：

- [ ] `README.md` 加「預設測試帳號」段、給新人一個能直接登入的帳號
- [ ] `.env.local.example` 把 Demo 帳號移到頂部「Optional: for quick testing」、去掉 deprecated 標籤（如果不支援就直接刪）

---

### 4. 第一次 type-check 會噴 error、新人以為自己弄壞了

**症狀**：未讀取類型的地方很多、`npm run type-check` 會看到「不知道根源何在」的 error

**新人挫折**：

- `npm run dev` 能跑、但 `npm run type-check` 看到 ~50 個 error
- 新人以為「我 clone 壞了」或「我改了什麼」
- 實際上是既有的 type error（前 9 位同學的報告裡列出「46 處 `as unknown as`」）

**證據**：

- `docs/CODE_STANDARDS.md` 或 `CLAUDE.md` 有禁止 `as any`、但沒有「已知有 XX 個先前遺留的 type-check error 是正常的」的段落

**修法**：

- [ ] 在 type-check 報告裡加註「已知 X 個遺留 error 屬 technical debt、不影響開發」

---

## 🟠 第一週會痛（無人帶會繞遠路）

### 1. 概念混亂：「工作區」「租戶」「workspace」三種叫法混用

**症狀**：同一個概念在不同文件有不同名稱、新人讀文件時一直要翻譯

**新人挫折**：

- `README.md` L13 說「工作空間系統」
- `CLAUDE.md` 和其他技術文件說「workspace」
- `docs/BUSINESS_MAP.md` 用「租戶」
- 新人讀 code 時看 `workspaceId`、讀業務文件時看「租戶」、永遠要猜「是同一個東西嗎？」

**證據**：

- `README.md` L114：「工作空間」
- `CLAUDE.md` 多處：「workspace」
- `docs/BUSINESS_MAP.md` 多處：「租戶」
- `src/types/` 的欄位都是 `workspace_id`

**修法**：

- [ ] `docs/GLOSSARY.md` 新增「術語表」：統一中英對應（租戶 = workspace = 工作區）、選一個為標準用語、文件全統一

---

### 2. 「員工」「用戶」「顧客」「客戶」混用、新人分不出來

**症狀**：系統中有四個角色、但文件和 code 的命名不一致

**新人挫折**：

- DB 表叫 `employees`、但某些地方說「用戶」
- 「顧客」和「客戶」在文件中似乎是同一個、但 code 裡 `customers` 和 `travelers`
- 新人讀文件：「開團要加團員」→ 查 code → 看 `order_members`、`tour_members`、`traveler_profiles` → 困惑

**證據**：

- `README.md` L74：「團員名單管理」
- `src/features/members/` 資料夾存在
- `src/features/tours/` 有 tour_members 相關 hook
- `src/features/orders/` 有 order_members 相關 hook
- DB 有 `travelers` 和 `customers` 兩個主表（BACKLOG.md 提到「後續考慮合併」）

**修法**：

- [ ] `docs/GLOSSARY.md` 加「角色與實體對應」：
  - 員工 = `employees` = 公司內部人員
  - 顧客 = `customers` = 買旅遊產品的人
  - 團員 = `order_members` = 某一筆訂單的旅行者清單（SSOT）

---

### 3. 文件太多（419 份 .md）、新人不知道該讀哪些

**症狀**：新人困惑「我該怎麼入門？」

**證據**：

```
$ find docs -name "*.md" | wc -l
419
```

新人看到 419 份文件、沒有「入門清單」、會試著讀 DEV_INDEX.md（裡面說「按任務類型選文件」）、但新人的任務是「我剛進來、什麼都不懂」，無法按「任務類型」分類。

**修法**：

- [ ] 新增 `docs/ONBOARDING_PATH.md`：

  ```
  # 新人第 1 天必讀（30 分鐘）
  1. README.md — 系統全景
  2. docs/GLOSSARY.md — 術語表（工作區/租戶/員工/顧客...）
  3. docs/CODE_MAP.md — 頁面路由速查（我在哪裡、往哪去）

  # 新人第 1 週選讀
  - 要改業務邏輯？讀 BUSINESS_MAP.md + CLAUDE.md 紅線
  - 要改 UI？讀 COMPONENT_GUIDE.md
  - 要加 API？讀 DEV_STANDARDS.md

  # 為什麼不一次讀全部？
  超過 400 份文件、讀完要 20 小時。專案設計了「按需讀」系統、
  先用最小化清單啟動腦子、再按任務類型補充。
  ```

---

### 4. 架構清楚度中等、但層級關係不明確

**症狀**：新人讀 CODE_MAP 能找到檔案、但不太懂「為什麼這個組件在 `features/tours/components/`、那個在 `components/`？」

**新人挫折**：

- `CODE_MAP.md` §3「目錄結構」清楚列出了路徑
- 但沒有「為什麼」的段落
- 新人加組件時無法判斷「該放在哪裡」

**證據**：

- `docs/CODE_MAP.md` L91-127 只有樹、沒有「分層原則」說明
- `docs/ARCHITECTURE_STANDARDS.md` 可能有、但不在「新人必讀」
- 新人會在 Slack 問「這個組件該放 features 還是 components？」

**修法**：

- [ ] `docs/CODE_MAP.md` 加「分層規則」段：
  ```
  ## 分層規則
  - `components/` — 跨功能複用的通用組件（Button、Dialog、Table）
  - `features/<module>/components/` — 該功能特定的組件（OrderDialog 只有 orders 用）
  - `features/<module>/hooks/` — 該功能的 custom hooks（useOrders、useOrdersFilters）
  - `stores/` — 全局狀態（用戶認證、工作區上下文）
  ```

---

### 5. 命名慣例有規範、但新人第一次改 code 仍會踩雷

**症狀**：`NAMING_CONVENTION_STANDARD.md` 清楚說「全 snake_case」、但新人會在:

- 建新 component 時猶豫「要用 PascalCase 嗎？」
- 建新 hook 時問「camelCase 還是 snake_case？」

**新人挫折**：

- 讀了規範、但規範太抽象（「全 snake_case」、「但組件用 PascalCase」）
- 新人改 code 時要記住 3 種並存的規則
- 容易寫出 `create_tour_dialog.tsx` (錯誤) 而不是 `CreateTourDialog.tsx`

**證據**：

- `NAMING_CONVENTION_STANDARD.md` 定義了 snake_case for DB + types、PascalCase for components
- 但在同一個檔案內存在 3 種命名（`tour_itinerary_items` table、`TourItineraryItems` type、`TourItineraryTab` component）
- 新人容易混

**修法**：

- [ ] `NAMING_CONVENTION_STANDARD.md` 加「速查表」：
  ```
  | 東西 | 規則 | 例子 |
  |---|---|---|
  | DB 欄位 | snake_case | tour_itinerary_items |
  | TypeScript type | PascalCase | type TourItineraryItem = {} |
  | 檔案名（component） | PascalCase | TourItineraryTab.tsx |
  | 檔案名（hook） | camelCase | useTourItineraryItems.ts |
  | 檔案名（工具） | kebab-case | format-tour-date.ts |
  ```

---

### 6. CLAUDE.md 紅線明確、但新人讀起來會有「這只是建議嗎？」的疑慮

**症狀**：CLAUDE.md 有兩個紅線（RLS + Audit FK）、新人讀完後仍會問「真的會炸嗎？還是只是不推薦？」

**新人挫折**：

- CLAUDE.md 說「🛑 DB 紅線」、新人以為「好吧、我知道了」
- 但新人仍可能想「不過如果我現在只是改一個小功能、可能不會踩到」
- 等他真踩到、才會懊悔「早知道就聽警告了」

**證據**：

- `CLAUDE.md` L17-31 有明確說「症狀」和「歷史」
- 但新人沒有「之前出過的真實 bug」的故事、所以很難內化這個警告的嚴重性

**修法**：

- [ ] `CLAUDE.md` 的紅線段加「Case Study」：
  ```
  **案例 2026-04-20**：某工程師改 audit FK、指向 auth.users 而不是 employees、
  導致「建新行程表」INSERT 炸、全公司新功能當掉 2 小時。
  解決：改 FK、重新跑 migration、驗證 17 張表。
  ```

---

## 🟡 Post-Launch 整理機會

### 1. .md 檔無 Last-Updated 時戳、新人無法判斷文件新鮮度

**症狀**：新人讀文件時問「這個文件是最新的嗎？有沒有過期的資訊？」

**證據**：

- 大多數 .md 沒有「最後更新」日期
- `DEVELOPMENT_GUIDE.md` 頂部有「最後更新: 2026-01-22」、但部分內容已過時（例如 L17 說「Next.js 16」、實際是 15.5.4）

**建議**：

- [ ] 所有 .md 頂部加 `Last Updated: 2026-04-24` + 負責人
- [ ] 建立「文件更新檢查表」、上線前確認無過期資訊

---

### 2. 前 9 位同學發現的「新人陷阱」未集中列在 onboarding doc

**症狀**：馬拉松審計發現 18 個問題、其中新人容易踩的有：

- 幽靈欄位（code 在用、DB 沒有）
- Stub 頁面（UI 能點、但功能沒實作）
- 硬編 UUID（複製 code 時無法直接跑）

**建議**：

- [ ] 新增 `docs/KNOWN_ISSUES.md`、列出「新人要避開的 XX 個坑」

---

### 3. Onboarding Checklist 不存在

**症狀**：新人完成 Day 1 setup 後、無法自評「我現在能做什麼任務？」

**建議**：

- [ ] 新增 `docs/ONBOARDING_CHECKLIST.md`：

  ```
  # 新人第 1 天
  - [ ] Clone repo、npm install 完成
  - [ ] .env.local 設定、npm run dev 跑起來
  - [ ] 登入系統、看到首頁儀表板

  # 新人第 1 週
  - [ ] 讀 GLOSSARY.md、理解 4 個主要概念（工作區、員工、顧客、團員）
  - [ ] 讀 CODE_MAP.md、學會快速定位檔案
  - [ ] 改一個簡單的 UI label（體驗 code → npm run dev → 看成果）
  - [ ] 跑一次 type-check、看懂 error 訊息
  - [ ] 讀 CLAUDE.md 的 2 個紅線、背熟為什麼

  # 新人第 2 週
  - [ ] 做第一個「Good First Issue」（新人任務）
  - [ ] 提出一個 PR、體驗 review 流程

  # 新人第 1 個月
  - [ ] 實作一個完整功能（API + 頁面 + 測試）
  - [ ] 修一個 production bug
  - [ ] 熟悉 RLS / 多租戶的運作方式
  ```

---

## 🟢 做得好的（新人會感謝）

### 1. README.md 簡潔、核心功能描述清楚

**讚**：新人打開 README 秒懂「這是旅遊團管理系統」、有 7 個功能區塊列表。

---

### 2. CODE_MAP.md 的路由快速對照表

**讚**：新人要找「收款頁在哪」、打開 CODE_MAP 秒查到 `/finance/payments` → `src/app/(main)/finance/payments/page.tsx`。省了 grep 時間。

---

### 3. CLAUDE.md 紅線非常清楚

**讚**：2 個紅線寫得比較嚴肅、附了症狀、歷史、修法。新人讀了會怕、也會記著。

---

### 4. 大部分檔案有「新手不讀沒關係」的段落

**讚**：例如 DEV_INDEX.md 說「純 bug 修復不需要讀任何文件」、降低新人焦慮。

---

### 5. 命名規範統一且有據可查

**讚**：NAMING_CONVENTION_STANDARD.md 明確說「全 snake_case」、雖然有例外、但至少有一份規範可查。

---

## 跨視角 pattern 候選

根據前 9 位同學的報告 + 我的新人視角、有 3 個重複 pattern 值得關注：

| Pattern                               | 為什麼對新人重要                                     |
| ------------------------------------- | ---------------------------------------------------- |
| **概念混淆**（工作區/租戶/workspace） | 新人容易被同事同義詞轟炸、無法建立心智模型           |
| **文件分散無索引**                    | 新人迷失在 419 份 .md、浪費 2-3 小時找「我該讀什麼」 |
| **沒有「新人陷阱」清單**              | 新人會踩同一個坑 N 次、每次都要問同事                |

---

## 給下一站（MARATHON-TOTAL.md）的 hint

### 我發現的「新人體驗」跨視角洞察

**共通點**（前 9 位同學也有提）：

1. **文件多但索引弱**——419 份 .md、沒有「新人 Day 1」的明確清單
2. **概念混用**——「租戶」「工作區」「workspace」、文件中交互使用、沒有 glossary
3. **沒有「已知陷阱」**——安全專家/DBA/架構師各自發現的雷、零集中在 onboarding 清單

### 建議給 William 的優先級

**Tier 1（上線前一週做）**：

- [ ] 新增 `.env.local.example` 的完整版（目前只有 26 行、缺關鍵 key）
- [ ] `README.md` 加 setup 小節（複製 .env、填 Supabase URL、運行 npm run dev）
- [ ] 新增 `docs/GLOSSARY.md`（4 個核心概念統一定義）

**Tier 2（上線後 2 週）**：

- [ ] 新增 `docs/ONBOARDING_PATH.md`（新人 Day 1 / Week 1 / Month 1 清單）
- [ ] 新增 `docs/KNOWN_ISSUES.md`（10 個新人最常踩的坑）
- [ ] `CLAUDE.md` 紅線加 case study（真實故事會比警告更有效）

**Tier 3（優化、不緊急）**：

- [ ] 每份 .md 加「Last Updated」欄位
- [ ] 建「文件新鮮度檢查表」（季度驗證無過期資訊）

### 新人上線第一週的「活下來」方案

如果只做 Tier 1（6-8 小時工作量）、新人可以在 **1 小時內** 完成 setup、**3 天內** 修完第一個 bug、**1 週內** 獨立做簡單功能。

如果不做任何 onboarding 改進、現狀下新人會耗掉 **8-12 小時** 在「理解系統全景」、只能用「問同事」來補文件空缺。

---

_最後更新：2026-04-24_
_掃描工具：Codebase Onboarding Engineer Agent_

---

## 🔁 主 Claude 覆盤（最終覆盤）

### 1. 真問題過濾

| #                                     | Onboarding 說 | 覆盤後                                               | 備註                                        |
| ------------------------------------- | ------------- | ---------------------------------------------------- | ------------------------------------------- |
| A1 env var 無新人清單                 | 🔴            | 🔴 **真、新**                                        | `.env.example` 147 行、沒標「必填 vs 選填」 |
| A2 無測試帳號指南                     | 🔴            | 🟡 **半重複**                                        | `DEMO_ACCOUNTS.md` 存在但 deprecated        |
| A3 既有 type-check error 新人不知正常 | 🔴            | 🔴 **真、新**                                        | 新人以為自己弄壞                            |
| B1 概念三種叫法                       | 🟠            | ⚠️ 部分重複（UX 提過）、新人角度補完                 |
| B2 角色名稱混亂                       | 🟠            | ⚠️ 同上                                              |
| **B3 420 份文件無索引**               | 🟠            | 🟠 **真、驗證過**（docs/ 420 + root 81 = 501 份 md） |
| B4 分層規則不明確                     | 🟠            | 🟡 部分重複（Architect 提過）                        |
| B5 命名規則 3 種並存                  | 🟠            | 🟠 **真、新**（snake + Pascal + camel）              |

**結論**：3 P0/P1 新 + 1 P1 新 + 部分重複

### 2. Onboarding 獨有價值

其他 9 位都是「工程師看工程師」、Onboarding 是「**新人看工程師**」。這視角其他 9 位覆蓋不到。

### 3. 跨視角 pattern 累積（最終 10 位）

| #      | Pattern                                                       | 狀態              |
| ------ | ------------------------------------------------------------- | ----------------- |
| 1-15   | 前累計                                                        | 繼承              |
| 16     | 自動化基礎設施缺失（DevOps）                                  | 穩定              |
| **17** | **文件過載 + 新人入口模糊**（501 份 md 無索引、入門路徑不明） | **Onboarding 新** |

**最終累計 16 穩定 + 1 候補（Data 的多租戶隔離品質、需驗證）**

---

## 🏁 10 位靈魂馬拉松結束

10 份報告 + 10 次覆盤完成。下一步：`MARATHON-TOTAL.md` 總報告。
