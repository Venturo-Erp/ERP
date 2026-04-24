# Venturo ERP · 馬拉松體檢總報告

**掃描日期**：2026-04-23 → 2026-04-24（跨一夜）
**方法**：10 位不同專業靈魂、接力跑、每位跑完主 Claude 覆盤、最後總結
**輸入**：前 6 份模組體檢（`00-INDEX.md`）+ BACKLOG.md + 全專案 code / schema / docs
**總報告**：10 位 × 平均 450 行 ≈ **4700 行證據**、本檔是壓縮版總表

---

## 📊 TL;DR（給老闆一頁）

**能不能上線？** 🟡 **能、但有 8 條紅線上線前必須清**。其他都是 Post-Launch 優化。

**跨視角盤查的核心價值**：

- 前面 6 模組（縱切）找到 ~18 個問題
- 10 位靈魂（橫切）**多找到 24 個 BACKLOG 沒列的新問題**
- 浮現 **17 種跨視角 pattern**（修一次省 N 次）

**最爆的 3 個**：

1. **Tenants Create API 建新租戶會炸**（INDEX ①、**根因是 CI 沒 E2E smoke**、DevOps 指出）
2. **外部 API / Webhook 沒防禦**（LINE / LinkPay / Gemini timeout + webhook 無冪等）
3. **編號生成 race condition 跨 4 模組**（voucher / order / tour / receipt 全都沒 DB RPC）

**最可能被忽略的 3 個**：

1. **會計 DB 層無借貸平衡 CHECK**（Bookkeeper 獨有）
2. **報表全在 client 端計算**（Corner 資料量小看不出、規模化會卡）
3. **420 份 docs 無索引**（新人來會迷路 2-3 天）

---

## 🔴 上線前必清清單（8 條紅線）

按「修法成本 × 風險」排序：

| #   | 紅線                                                                 | 影響                                    | 修法                                                                 | 工時      | 來源                               |
| --- | -------------------------------------------------------------------- | --------------------------------------- | -------------------------------------------------------------------- | --------- | ---------------------------------- |
| 1   | **Tenants Create 寫已砍欄位 + 多步驟無 transaction**                 | 建新租戶必炸                            | 刪 L235-250 + 改 DB RPC                                              | S (30min) | INDEX ① + SRE                      |
| 2   | **CI 缺 E2E smoke（login + create-tenant + 主流程）**                | 下一個 #1 不會被提前發現                | `.github/workflows/ci.yml` 加 `e2e-smoke` job                        | S (1h)    | DevOps 獨有                        |
| 3   | **外部 API timeout 無 fallback**（LINE / LinkPay / Gemini）          | 外部掛一個、使用者白屏                  | 加 8s timeout + 錯誤 UI                                              | M (半天)  | SRE                                |
| 4   | **Webhook 無冪等（idempotency_key schema + code）**                  | LINE/META/LinkPay 重試會建兩筆 / 扣兩次 | schema 加 `idempotency_key` + middleware                             | M (半天)  | SRE + Data                         |
| 5   | **編號生成 race condition**（voucher / order / tour / receipt 4 處） | 高併發時撞號、unique constraint fail    | 4 個編號都改 DB RPC + `FOR UPDATE`                                   | M (半天)  | DBA + SRE + Architect + Bookkeeper |
| 6   | **會計借貸平衡缺 DB CHECK constraint**                               | SQL 直 insert 能寫壞帳                  | journal_vouchers 加 `CHECK (abs(total_debit - total_credit) < 0.01)` | S (30min) | Bookkeeper 獨有                    |
| 7   | **出團日不自動鎖單**                                                 | 出團當天還能改團員、data integrity 風險 | `tour.status='ongoing'` 時 order_members 變 read-only                | S-M       | Workflow 獨有                      |
| 8   | **database.types.ts 過期**（還有 is_active / permissions）           | TS 欺騙、會寫出下一個 #1                | `npm run db:types` regen                                             | S (5min)  | INDEX ②                            |

**總工時**：約 **2 天工程時間**（1 人）或 **4-6 小時專注 session**。

---

## 🟠 上線後第一週必清（12 條）

這些不卡上線、但上線 1 週內不清會變成客訴來源：

| #   | 問題                                                                 | 來源                | 優先 |
| --- | -------------------------------------------------------------------- | ------------------- | ---- |
| 9   | **Sentry 裝了零 alert + 無 SLO 定義**                                | SRE + DevOps        | P1   |
| 10  | **Logger PII leak**（email / auth 細節進 log）                       | Security            | P1   |
| 11  | **收款 status `'0'/'1'` vs 請款 `'pending'/'confirmed'` 混用**       | 02-finance + UX     | P1   |
| 12  | **Receipt `'confirmed'` 應不可逆 + Order.payment_status 無自動同步** | Workflow 獨有       | P1   |
| 13  | **表單無 auto-save draft**（業務員報價掉資料月 6 小時）              | UX 獨有             | P1   |
| 14  | **報表 3 張全 client 端計算** = accounting 試算/損益/資產負債        | DBA + 01-accounting | P2   |
| 15  | **/orders 無 server-side 分頁**（/tours 已修、/orders 沒跟上）       | DBA                 | P2   |
| 16  | **Orders 跨域直 import Tours service**（recalculateParticipants 等） | Architect 獨有      | P2   |
| 17  | **Cron job 無 retry / heartbeat**（失敗整夜無人知）                  | SRE + DevOps        | P2   |
| 18  | **無 rollback / reset-db 自動化 script**                             | DevOps              | P2   |
| 19  | **列印 / 匯出 18 處 `dangerouslySetInnerHTML`**                      | Security + UX       | P2   |
| 20  | **本地 dev 可能連 production Supabase DB**                           | DevOps              | P2   |

---

## 🟡 Post-Launch 架構清單（14 條）

這些不修也活得下去、但長期維護會越來越痛：

- 6 個跨模組 helper（number-generator / state-machines / withAdminGuard / DECIMAL_TOLERANCE / CRUD factory / query hooks）
- **OrderMembersExpandable 1449 行 + tour-itinerary-tab 1914 行**（加入 Wave 7）
- **god component 整套拆**（Wave 7 已 4 個、+ 新 2 個 = 6 個）
- customers vs traveler_profiles SSOT 決策
- 46 處 `as unknown as` 業務邏輯分批清
- Feature Flag 系統（解決 ai-bot 4 tab 空殼 + 未來灰度發布）
- Secret rotation SOP
- Retention policy（稅務 7 年、個資法、GDPR）
- Loading / Empty / Error / Validation 4 個 UX pattern 統一化
- 業務術語 ↔ 系統術語對照表（給新員工）
- `docs/` 420 份 md 整理索引 + 過期標記
- 命名規則統一（現況 snake + Pascal + camel 3 套並存）
- ai-bot 4 個空殼 tab 用 flag 隱藏或完整做
- 台灣發票邏輯（字軌 / 作廢 / 401 表）如果 Corner 要用系統開發票

---

## 🟢 做得好的（別改壞）

Wave 0-6 修掉很多、目前這些是護城河：

- ✅ RLS 主體穩健（28 張 NO FORCE、workspace_id filter 完整）
- ✅ Audit FK 統一指 employees(id)（17 表 30+ FK）
- ✅ FK index 已補 103 條（Wave 1b）
- ✅ CASCADE → RESTRICT 已改 109 條（Wave 6）
- ✅ Login / 密碼 / rate limit / is_active guard（Wave 0）
- ✅ Webhook HMAC 簽驗（LINE + LinkPay + Meta 都對）
- ✅ Bundle size monitor（bundle-size.yml）
- ✅ CI lint / type-check / build
- ✅ per-request admin client（CLAUDE.md 紅線守住）
- ✅ Logger 分層 / 遠端送
- ✅ Labels 中央化（部分）
- ✅ Entity hook factory pattern（database 模組展現）
- ✅ 借貸平衡前後端都驗
- ✅ 期末結轉邏輯符合會計規則（月 / 季 / 年）
- ✅ Dashboard widget 系統

---

## 🔁 17 種跨視角 pattern（修一次省 N 次）

這是馬拉松最大的收穫 —— 不是 18 個獨立 bug、是 17 種系統性 pattern：

| #   | Pattern                                  | 發現者                       | 影響範圍                                                | 修法                                                    |
| --- | ---------------------------------------- | ---------------------------- | ------------------------------------------------------- | ------------------------------------------------------- |
| 1   | **外部輸入信任邊界未統一**               | Security                     | LINE/META/LinkPay/OCR/LLM/JSON.parse 6 入口             | 中央 untrusted-input-gateway                            |
| 2   | **資料密集功能全 client 算**             | DBA                          | 3 報表 + orders + dashboard widget                      | 下推 DB `GROUP BY`                                      |
| 3   | **編號生成 race**                        | DBA+SRE+Architect+Bookkeeper | 4 模組                                                  | 統一 DB RPC + `FOR UPDATE`                              |
| 4   | **HTML 安全 × 列印 × 無障礙三位一體**    | Security+UX                  | 18 處 dangerouslySetInnerHTML                           | CSP 收緊 + 抽渲染 util                                  |
| 5   | **效能 vs 正確性政策缺失**               | DBA                          | 全 ERP                                                  | `DATABASE_DESIGN_STANDARDS.md` 補章節                   |
| 6   | **外部依賴無防禦**                       | SRE                          | LINE/META/LinkPay/Gemini/Claude/OpenAI 6 依賴           | 統一 fetch wrapper（timeout + retry + circuit breaker） |
| 7   | **冪等性缺席**（schema + code 兩層）     | SRE+Data                     | POST / webhook / 雙擊                                   | `idempotency_key` 欄位 + middleware                     |
| 8   | **觀察性近零**                           | SRE+DevOps                   | Sentry 無 alert / 無 SLO / 無 on-call                   | Sentry DSN + alert rule + runbook                       |
| 9   | **跨域引用繞層級**                       | Architect                    | Orders → Tours 直 import service                        | 抽 API 邊界                                             |
| 10  | **god component 吞噬分層**               | Architect                    | 6 個 >1000 行檔案                                       | Wave 7 薄殼化                                           |
| 11  | **會計內控不在 DB CHECK**                | Bookkeeper                   | journal_vouchers                                        | DB CHECK constraint                                     |
| 12  | **旅行社專業會計未接**                   | Bookkeeper                   | 代收代付 / 佣金 / 匯兌 / 發票                           | 需 William 拍板範圍                                     |
| 13  | **State 轉換無自動下游 hook**            | Workflow                     | 收款→傳票、出團→鎖單、結案→核算                         | 事件驅動架構（可用 DB trigger 或 event bus）            |
| 14  | **多租戶隔離品質不均**（候補、需具體化） | Data                         | RLS policy 寫法不一                                     | 驗證各表 policy                                         |
| 15  | **使用者反饋迴路殘缺**                   | UX                           | loading/empty/error/validation/draft/術語 6 層          | 統一 component + 規範                                   |
| 16  | **自動化基礎設施缺失**                   | DevOps                       | CI E2E / rollback / feature flag / secret rotation 全缺 | 補齊 script + pipeline                                  |
| 17  | **文件過載 + 新人入口模糊**              | Onboarding                   | 501 份 md、無索引、新人迷路                             | 加 INDEX.md + 過期標記 + 命名統一                       |

---

## 📋 10 位靈魂貢獻評比

| 位  | 靈魂                  | 真新貢獻               | 重報（扣分）                  | 獨有 pattern    |
| --- | --------------------- | ---------------------- | ----------------------------- | --------------- |
| 1   | 🔒 Security           | 3 P0 + 2 P1            | 1（Corner UUID）              | #1 #4           |
| 2   | 💾 Database Optimizer | 2 P0 + 1 修法升級      | 0                             | #2 #3（共同）#5 |
| 3   | ⚡ SRE                | 4 P0 + 1 P1            | 2（Voucher race / singleton） | #6 #7 #8        |
| 4   | 🏛 Software Architect | 1 P0 + 2 Wave 7 補     | 1（編號第 4 次）              | #9 #10          |
| 5   | 📒 Bookkeeper         | 1 P0 + 業務 4 題       | 1（3200/3300）                | #11 #12         |
| 6   | 🔄 Workflow           | 1 P0 + 2 P1 + 6 業務題 | 0                             | #13             |
| 7   | 🧬 Data Engineer      | 1 P1 新視角            | 5（最多）                     | #14（候補）     |
| 8   | 🎨 UX Architect       | 1 P0 + 5 P1            | 4（都有業務解讀補充）         | #15             |
| 9   | 🛠 DevOps             | 2 P0 + 1 P1            | 1 誤判（.env commit）         | #16             |
| 10  | 🗺 Onboarding         | 3 P0/P1 + 1 P1 新      | 2（術語 / 分層）              | #17             |

**最有貢獻**：SRE（4 P0 + 3 pattern）、UX（6 痛點業務翻譯）、Onboarding（補新人視角）
**扣分最多**：Data Engineer（claim 大、5 項重報）
**誤判**：DevOps（`.env.production` 以為在 Git、實際 gitignore 擋）

---

## 💬 需 William 業務拍板（8 題）

從馬拉松過程浮現、不是工程能決定的：

| #   | 題                                           | 來源       | 影響           |
| --- | -------------------------------------------- | ---------- | -------------- |
| 1   | Corner/JINGYAO/YUFEN 上線要用系統開發票嗎？  | Bookkeeper | 發票邏輯 P0/P3 |
| 2   | 旅行社營收認列時點（簽約/收款/出發/回程）？  | Bookkeeper | 跨期財報       |
| 3   | 有沒有外幣 / 海外業務？                      | Bookkeeper | 匯兌損益       |
| 4   | Corner 目前怎麼記代收代付？                  | Bookkeeper | 稅務合規       |
| 5   | 會計傳票要不要自動產（收款/付款/結案觸發）？ | Workflow   | 流程設計       |
| 6   | LinkPay 連結自動發給客戶 vs 業務手動？       | Workflow   | UX 決策        |
| 7   | 出團日要不要自動鎖單？（建議做）             | Workflow   | data integrity |
| 8   | Receipt 'confirmed' 要不要不可逆？（建議做） | Workflow   | state machine  |

---

## 🗂 輸出索引

| #   | 檔案                                      | 行數        | 核心貢獻                                      |
| --- | ----------------------------------------- | ----------- | --------------------------------------------- |
| 00  | [ROSTER.md](./00-ROSTER.md)               | 72          | 靈魂配對名冊                                  |
| 01  | [Security 🔒](./01-security.md)           | 637         | 6 入口 / CSP / Webhook 簽驗                   |
| 02  | [DB Optimizer 💾](./02-db-optimizer.md)   | 413         | 報表下推 / JSONB GIN / voucher race           |
| 03  | [SRE ⚡](./03-sre.md)                     | 769         | 外部 API fallback / webhook 冪等 / 觀察性     |
| 04  | [Architect 🏛](./04-architect.md)         | 462         | 跨域繞層 / god component                      |
| 05  | [Bookkeeper 📒](./05-bookkeeper.md)       | 530         | DB CHECK / 代收代付 / 4 業務題                |
| 06  | [Workflow 🔄](./06-workflow.md)           | 493         | 狀態轉換 hook / 6 業務流程決策                |
| 07  | [Data Engineer 🧬](./07-data-engineer.md) | 452         | schema 缺 idempotency_key                     |
| 08  | [UX Architect 🎨](./08-ux.md)             | 183         | auto-save draft / 6 UX pattern                |
| 09  | [DevOps 🛠](./09-devops.md)               | 259         | CI E2E smoke / rollback script / feature flag |
| 10  | [Onboarding 🗺](./10-onboarding.md)       | 392         | env 清單 / type-check 既有 error / 501 份 md  |
| -   | **總計**                                  | **4662 行** | 17 跨視角 pattern                             |

---

## 🎯 執行建議

### 今晚 / 明天白天（8 條紅線）

從 #1 開始做、**有依賴順序**：

1. 先 ② regen types（5min）→ ① fix tenants create（30min）→ ⑧ 驗證（5min）
2. ⑥ 加 DB CHECK（30min）
3. ② CI 加 E2E smoke（1h）→ 這是未來防線
4. ⑤ 編號 race 4 處（半天、統一 DB RPC）
5. ③④ 外部 API + webhook 冪等（各半天）
6. ⑦ 出團自動鎖單（S-M）

**總計 2 天工程時間**。

### 上線後第 1 週

處理 12 條 🟠、特別是 Sentry alert + PII sanitize + status 統一。

### Post-Launch 架構

14 條 🟡 進 BACKLOG、分批跑 Wave 7/8/9。

### William 拍板

8 題業務決策、建議排一個半小時會議（或 async 回覆）。

---

## 📝 結語

馬拉松的價值不是「找新 bug」、是：

1. **確認前 6 模組 audit 的發現跨視角被驗證**（真問題 vs 噪音）
2. **找到 BACKLOG 以外的 24 個新問題**（外部依賴 / 冪等性 / 觀察性 / 會計 DB CHECK / 流程 hook / UX 反饋 / DevOps 基建 / 新人體驗）
3. **抽出 17 種跨模組 pattern**（修一次省 N 次）
4. **分出工程修 vs 業務拍板**（8 題需要 William）

上線這件事、**能上但該先清 8 條紅線**。跨視角體檢證明這套 ERP 主體健康、邊界需要補。

---

_10 位靈魂馬拉松完成、主 Claude 覆盤完成、總報告完成。_
_掃描期間：2026-04-23 晚 → 2026-04-24 凌晨、跨一夜。_
