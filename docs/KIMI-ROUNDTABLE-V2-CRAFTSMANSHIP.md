# Venturo ERP 工程美學圓桌 v2 — 強迫症的天堂

> 給 Kimi 平台多 AI 專家圓桌會議使用。
> 上版 v1（kimi-roundtable-brief.md）聚焦「8 個坑」、這版 v2 聚焦「**工程美學 / craftsmanship**」。
>
> **願景一句話**：當其他工程師看到 Venturo ERP 的 repo、覺得「怎麼能這麼乾淨、這麼嚴謹、這麼極致」— 強迫症的天堂、規範堅持、內容一致不漏。

---

## 0. 為什麼開這場圓桌

William（創辦人）的願景**不是業務 feature 多、是 craftsmanship 強到讓人嘆為觀止**。

關鍵特徵：
- William / Carson 不寫 code、**AI 寫所有 code**（Claude Code 主、Kimi Code 副）
- → 「規範自動 enforce」格外重要、不能靠人記
- → 規範清楚就讓 AI 寫得穩、規範模糊就 AI 各自發揮
- 不要建議「人類學習成本 / 招人難度」這類角度（不適用、Carson 不接 code）

什麼是「強迫症的天堂」：
- ✅ 命名一致、檔案結構像數學公式、每個抽象都有清楚邊界
- ✅ 資安多層防禦、沒有「忘了守的 API」
- ✅ 效能每個面向都調到極致（bundle / Lighthouse / Core Web Vitals 全綠）
- ✅ 規範由 CI / pre-commit / type system 自動 enforce、不靠 AI 自律
- ✅ 0 dead code、0 unused export、0 commented-out code、0 TODO 沒人領
- ✅ 觀測性完整（log / metric / trace / SLO 報警）
- ✅ 文件跟 code 永遠對齊（doc 過時 = bug）

---

## 1. 現況（這次 session 已做到的）

### 已交付（21 commits、production 上線、2026-05-06）
- ✅ **死碼大清**：13,400+ 行刪除（69 source files / 10 deps / DB DROP 6 表 + 4 column / 50+ unused exports）
- ✅ **8 條 API 守門**：所有 require-capability 補完
- ✅ **資安強化**：Cookie httpOnly+secure / Logout 主動清 / 安全漏洞修 / Rate limit / 30 天過期
- ✅ **效能優化**：ModuleGuard 非阻塞 / sidebar 秒出 / fetcher 縮短 / jsPDF dynamic / optimizePackageImports 補
- ✅ **規範補完**：ESLint Phase 2 開（unused-vars warn）/ AGENT-GUIDELINE.md 在 GitHub
- ✅ **業務概念清**：領隊 / 團控 / 需求單 / 確認單 / 通知 / 機器人全砍

詳見：`docs/SESSION-HANDOFF-2026-05-06.md`

---

## 2. 距離「強迫症天堂」的差距（請專家評）

### A. 規範執行落差
- 1028 個 `no-unused-vars` warning（剛開、沒清）
- 100+ 個 `'use client'`（應該 30 以下、Server Component 化）
- TypeScript strict 沒全開（`noImplicitAny` / `noUncheckedIndexedAccess` / `exactOptionalPropertyTypes`）
- 編號規範 doc 跟 code 衝突沒解（CLAUDE.md 寫 `P{YYMMDD}{A-Z}` vs code `DO{YYMMDD}-{NNN}`）

### B. 資安還沒做到 Defense in Depth
- CSP 還有 `unsafe-eval` + `unsafe-inline`
- Rate limiting in-memory fallback（serverless 不可靠）
- 沒有 audit log 機制（誰改了什麼、何時、何處）
- 沒有 secret scanning（git history / build artifact）
- RLS policy 散刻、沒統一 `is_workspace_member()` helper
- 沒有 SAST / DAST / dependency vulnerability CI gate

### C. 效能未到極致
- 沒有 Lighthouse CI（每次 deploy 自動跑、低於 95 擋 merge）
- 沒有 bundle size budget（commit size 失控不會擋）
- 沒有 Core Web Vitals 自動報警
- 沒有 RLS query plan / N+1 query 偵測
- SSR 嵌入 layout context 還沒做（hydration race 治標）
- 圖片沒 next/image 全面化、沒 responsive srcset

### D. 觀測性 / 可靠性弱
- Sentry 有但沒 SLO（錯誤率 / latency 紅線）
- 沒 structured logging（log 是純字串、不能 query）
- 沒 trace（API call 來自哪個流程、看不到）
- 沒 health check 標準化（除了 /api/health 簡易版）
- e2e 環境壞掉、無 deploy gate

### E. 工程紀律（CI / 自動化）
- 沒 PR template（William 一人 review、靠記憶）
- 沒 conventional commits（commit message 格式不一）
- 沒 changelog 自動產生
- 沒 release notes 機制
- 沒 dependency 升級 PR 自動化（Dependabot / Renovate）
- 沒 GitHub Actions（hook 在本機跑、push 後沒 server-side 防線）
- pre-commit hook 強、但 server-side hook 弱

### F. 文件 / 業務語境同步
- AGENT-GUIDELINE 寫了、但業務脈絡只有 brain/wiki 知道
- ADR（架構決策記錄）沒有
- 「為什麼這麼設計」散在 commit message、不在文件
- 業務硬規則（紅線 ⑦/⑧/⑨）只在 trigger SQL / CLAUDE.md、沒 vault

### G. 命名 / 結構美學
- 命名混雜：`features/disbursement` vs `features/finance/payments`（同層級不一致）
- 'orders' / 'order_members' / 'tour_orders' 命名差異
- 抽象層深度不一致（有的功能 deep nesting、有的扁平）
- 「util」目錄是 dumping ground、沒分類
- types/ vs */types.ts 混用

### H. UI 一致性
- 莫蘭迪色系定了、但實際使用散刻
- Dialog level={1|2|3} 規範、沒自動 enforce
- 列表 15 筆規範、沒 lint rule
- 響應式 breakpoint 沒系統化

---

## 3. 8 位專家獨立發言（必須各自署名、不要整合）

### 🧹 專家 1：Clean Code / 重構大師（Uncle Bob 風格）
看上面差距 §G「命名 / 結構美學」、給 5 個「改了 William 看到會嘆氣」的具體調整。
要 actionable file path + 改成什麼、不要 generic「請保持 SOLID」。

### 🏛 專家 2：架構美學家（DDD / Hexagonal / Feature-first）
看現在 `src/app/(main)/finance/` + `src/features/finance/` + `src/lib/` 三層、給「優雅化」方向。
評估：要不要走 feature-first / DDD bounded context / monorepo 拆 packages？
**現實約束**：1000+ 檔案、不能停下來重寫、要漸進方案。

### 🛡 專家 3：資安強迫症（OWASP / Zero Trust）
看 §B 差距、給 OWASP Top 10 對齊清單。
特別評：CSP unsafe-* 怎麼漸進拔（不破現有）？Audit log 表結構？SAST / DAST 怎麼接 CI？

### ⚡ 專家 4：效能狂人（Lighthouse / Core Web Vitals / Bundle）
目標：所有頁面 Lighthouse 95+、LCP < 2.5s、CLS < 0.1、FID < 100ms。
給：bundle budget 怎麼設、Lighthouse CI 怎麼接、SSR 嵌入 layout context 具體實作（避開紅線 hydration race）。

### 🤖 專家 5：規範自動化（CI / pre-commit / type system）
看 §A + §E、給「規範由系統 enforce、不靠人記」清單：
- ESLint Phase 3-5 該怎麼漸進開（不爆 PR）？
- TypeScript strict 怎麼漸進升？
- GitHub Actions 哪些 check 必加（lint / type / test / lighthouse / a11y / bundle）？
- pre-commit hook vs server-side check 怎麼分工？

### 🎨 專家 6：工程文化（Stripe / Vercel / Linear 等級）
看完整現況、給 5 條「Stripe 工程師看到會說 wow」的差距 + 改進。
**重點**：規範堅持、內容一致不漏的精神、怎麼自動化（不靠 William 一人 review）。

### 🔧 專家 7：漸進重構策略（Strangler Fig / Branch by Abstraction）
看 §A + §G + §H、給「漸進到強迫症天堂」的執行路線：
- 哪些 P0（這週做）？
- 哪些 P1（這月）？
- 哪些 P2（這季）？
- 「'use client' 100→30」怎麼分批？「1028 warnings」怎麼漸進清？

### 📊 專家 8：可觀測性 / SRE
看 §D 差距、給 production 監控清單：
- Sentry alert 規則怎麼設？
- structured logging 怎麼導入（既有 logger.ts 怎麼演進）？
- SLO（uptime / error rate / latency）怎麼定義 + 怎麼報警？
- API trace 跨 client→server→Supabase 怎麼接？

---

## 4. 給每位專家的標準輸出格式

```markdown
### 專家 [X]：[領域] 觀點

#### 🎯 我看現況、最該優先做的 5 件事
1. [具體 action] — 影響 [什麼] — 估時 [多久]
2. ...
3. ...
4. ...
5. ...

#### 🔧 我推薦的工具 / 機制
- ...

#### ⚠️ 我注意到的盲點 / 風險
- ...

#### 💎 「強迫症天堂」要做到這層才算
- ...
```

最後彙整（圓桌平台統一寫）：

```markdown
## 圓桌共識（多數同意 / 高信心）
- ...

## 圓桌衝突（不同專家看法不同、需 William + Claude 拍板）
- A 觀點 vs B 觀點 — 各自理由

## 整合 P0 / P1 / P2 行動清單
（按優先級排）
```

---

## 5. 必讀資產（請每位專家讀完再發言）

GitHub URL（Kimi 平台直接讀）：

1. **AGENT-GUIDELINE v1.3**（紅線 / 業務硬規則 / 已修待修）
   ```
   https://github.com/Venturo-Erp/ERP/blob/main/docs/AGENT-GUIDELINE.md
   ```

2. **本檔（圓桌 brief v2）**
   ```
   https://github.com/Venturo-Erp/ERP/blob/main/docs/KIMI-ROUNDTABLE-V2-CRAFTSMANSHIP.md
   ```

3. **Session 接手指南**（最新進度）
   ```
   https://github.com/Venturo-Erp/ERP/blob/main/docs/SESSION-HANDOFF-2026-05-06.md
   ```

4. **CLAUDE.md**（紅線、五大方向、優先順位）
   ```
   https://github.com/Venturo-Erp/ERP/blob/main/CLAUDE.md
   ```

5. **`.claude/CLAUDE.md`**（編號規範、Supabase 連線）
   ```
   https://github.com/Venturo-Erp/ERP/blob/main/.claude/CLAUDE.md
   ```

請每位專家點進這 5 個 URL 全讀完、再發言。

---

## 6. 關鍵業務脈絡（不在 code、給專家補上下文）

- **Venturo / 漫途整合行銷**：台灣旅行社 SaaS ERP、目標客戶中小型旅行社（Tata / Corner / 永豐合作客戶）
- **創辦人**：William（不寫 code）+ Carson（不寫 code）、所有 code 由 AI 寫
- **業務 stack 完整鏈**：tour（建團）→ orders（接單）→ quotes（報價）→ contracts（簽約）→ payment_requests（請款）→ receipts（收款）→ disbursement_orders（出納）→ accounting（會計）
- **客戶量級**：少（< 10 個 workspace）但每個 workspace 業務複雜
- **優先順位（William 親口）**：資安 #1 → 效能 #2 → SSOT #3
- **這次 session 砍掉的業務概念**：領隊 / 團控 / 需求單 / 確認單 / 公開報名 / 通知 / 公告 / 頻道 / VENTURO 機器人

---

## 7. 期待產出 + 行動

我們會拿圓桌結論：

1. **共識的部分** → 直接寫進 `AGENT-GUIDELINE v1.4` + 排進 P0/P1
2. **衝突的部分** → William + Claude 討論拍板
3. **工作流改進** → 寫進 GitHub Actions / pre-commit / lint rule

下次 session 開頭、Claude 會讀圓桌結論 + 本檔、繼續推進到「強迫症天堂」。

---

## 8. 給專家的最後一句話

> 你正在 review 一個由 **AI 寫所有 code、創辦人不接 code** 的 SaaS。
> 規範越清楚 / 越自動 enforce、AI 寫得越穩。
> 「教 AI 寫 code」跟「教人寫 code」不一樣 — 不要建議「程式設計師職涯規劃」「招募策略」這類無關角度。
> 聚焦：**怎麼讓這個 repo 在工程美學上、達到讓 Stripe / Linear / Vercel 工程師說 wow 的程度**。

---

> 圓桌會議結束後、請把彙整結果存為 `docs/KIMI-ROUNDTABLE-V2-RESULTS.md`、push 上 GitHub。
> Claude / Kimi Code 下次 session 自動讀。
