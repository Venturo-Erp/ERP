# Marathon 09 · DevOps Automator 🛠 體檢報告

**扮演靈魂**：DevOps Automator（自動化一切重複、Pipeline 即文件、環境分層、IaC）
**掃描日期**：2026-04-24
**範圍**：CI/CD / Secrets / Env / Observability / Backup / Migration / Feature flag / IaC / Scripts
**方法**：Pipeline 考古 + config 盤點 + runbook inspection

---

## 一句話裁決

**能上線、但缺 3 個 DevOps 護欄**：CI 沒 E2E smoke（這是 INDEX ① 漏洞的根因）、Sentry 裝了零 Alert、無「一鍵 rollback / reset-db / migrate」腳本。上線後若故障、要 SSH 手動救。

---

## 🔴 Critical（上線前必補）

### A. CI Pipeline 缺 E2E Smoke Test（INDEX ① 漏洞的根因）

**位置**：`.github/workflows/ci.yml`

**現況**：
```yaml
jobs:
  quality:
    - npm run format:check
    - npm run lint
    - npm run type-check
  build:
    - npm run build
```

✅ lint / type-check / build 都有
❌ **零 E2E smoke**
❌ **零 login API 驗證**
❌ **零「建新租戶」流程測試**

**為什麼是根因**：
INDEX ① 發現「Tenants Create API 會炸」、原因是 2026-04-23 DROP 欄位但沒改 API。**如果 CI 有 E2E smoke、推送時立刻會 fail**、不會 ship 壞 code 到 prod。

**修法（S）**：
```yaml
jobs:
  e2e-smoke:
    needs: build
    steps:
      - run: npm run test:e2e:smoke  # login + create-tenant + basic flow
```

至少要 cover：
- Login API（4 個租戶 + TESTUX）
- Create tenant 流程
- 基本業務（建團 / 訂單 / 收款）

### B. Observability：Sentry 裝了零 Alert

**位置**：`next.config.ts`、`src/app/global-error.tsx`

- ✅ `@sentry/nextjs` 已裝
- ❌ **Sentry DSN 沒設**（`.env.example` 只是註解）
- ❌ **零 alert rule**
- ❌ **無 SLO 定義**

**修法（M）**：
1. Sentry Project 建起來、DSN 注入 Vercel env
2. Alert rules：error rate > 5%/min → Slack、新 issue 自動開 GitHub issue、付款錯誤 → page on-call
3. SLO：P95 < 2s、Availability 99.9%、MTTR 30 min

### C. 無自動化部署/回滾腳本（Rollback 要 SSH）

**現況**：
- ✅ Vercel 自動從 main build + deploy
- ✅ Preview deploy（PR 自動產）
- ❌ 無一鍵 rollback
- ❌ 無一鍵 reset-db
- ❌ 無一鍵 migrate
- `scripts/` 有 ~60 個舊 import script、**零個 devops 自動化**

**修法（M）**：`scripts/rollback.sh` / `reset-db.sh` / `migrate.sh` + `package.json` script 封裝成 `npm run rollback:last` 等。

---

## 🟠 Major（會在事故中吃苦）

### D. Cron Jobs 無 Retry / Failure Handling

**位置**：`vercel.json` crons + `src/app/api/cron/`

Vercel Cron 執行單次、無重試、若失敗整夜無人發現、無 heartbeat check。

**修法**：
- 加 exponential backoff retry
- 完善 `cron_execution_logs`（開始時 insert status='running'、完成時 update）
- 超時 30 分無更新 → 告警
- `/api/health/crons` endpoint

### E. 環境分層不完整（本地 dev 可能連 production DB）

**現況**：
- ✅ Vercel env vars 分 preview / production
- ❌ 本地 `.env.local` 可能設成 production Supabase URL
- ❌ Supabase Branching 未啟用
- ❌ 無 TESTUX 隔離資料池

**風險**：本地 `npm run dev` 改 schema / seed data 可能污染真實資料。

**修法（M）**：Supabase Branching + 本地 docker-compose 跑獨立 supabase。

### F. Secret Management 無 rotation（**注意：原始 agent 誤判為 P0、實際為 M 風險**）

**現況**：
- ✅ `.env.production` **有在 `.gitignore` 保護**（L41 `.env.production`）
- ✅ `git ls-files` 確認未追蹤實際 env.production（只有 `.env.production.example`）
- ❌ 但 **本地 `.env.production` 檔案存在**（Jan 11 建）、人為 force-add 可能繞過 gitignore
- ❌ 無 pre-commit hook 二次防護
- ❌ 無 key rotation SOP（員工離職 → 誰記得要換？）
- ❌ 無 secret scanning

**修法（S-M）**：
1. `.husky` pre-commit hook：禁止 commit `.env.production` + scan `SERVICE_ROLE_KEY` pattern
2. 本地 `.env.production` 刪掉、改用 `vercel env pull`
3. 建「Secret Rotation SOP」（每季或人員變動）

---

## 🟡 Minor（Post-Launch 自動化機會）

### G. 無 Feature Flag 系統

- ✅ `workspace_features` 表（功能 per workspace）
- ❌ 無 feature flag 系統（unleash / growthbook / 自刻）
- ❌ 新功能 hardcoded 等待手工 enable

**關聯 INDEX**：ai-bot 5 tab 只有 1 個能用、要 feature flag 隱藏另外 4 個。

**修法（L）**：基於 `workspace_features` 自刻 hook：
```typescript
useFeatureFlag('ai_bot_meta'): boolean
{isEnabled('ai_bot_meta') && <MetaTab />}
```

---

## 🟢 做得好的

| 面向 | 評價 |
|---|---|
| CI lint/type-check/build | ✅ 基礎完整 |
| `.gitignore` secret 保護 | ✅ 有、但需 pre-commit 二次防護 |
| Vercel env UI 管理 | ✅ Good |
| Logger 分層（level + context + remote） | ✅ Good |
| Webhook HMAC 簽驗（LINE + LinkPay + Meta）| ✅ 三家都對 |
| `cron_execution_logs` 表 | ✅ 有、但 heartbeat 缺 |
| `bundle-size.yml` 監控 | ✅ 好習慣 |
| Supabase Config `.supabase/config.toml` | ✅ 本地友善 |

---

## 跨視角 Pattern 候選（DevOps 補充）

從前面靈魂的發現、DevOps 角度補修法：

| Pattern | 前面誰發現 | DevOps 建議修法 |
|---|---|---|
| Tenants Create 無 transaction + CI 無 E2E | Index ① + SRE | **CI E2E smoke** + DB RPC transaction |
| Voucher race | DBA + SRE + Architect | DB RPC + `FOR UPDATE` |
| LINE/LinkPay timeout fallback | SRE | 加 8s timeout + queue retry |
| Logger PII | Security | Logger sanitize rules（mask email/phone） |
| Rate limit 分散式 | Security | Redis / Upstash |
| Webhook idempotency | SRE + Data | `idempotency_key` DB 欄位 + header |

---

## 給下一位靈魂（Onboarding Engineer）的 hint

新工程師 5 分鐘要能上手、DevOps 要把這些先做好：
- [ ] `npm run rollback:last` / `npm run db:reset` 能跑
- [ ] Local dev 不碰 production DB
- [ ] Runbook：「Sentry alert 怎麼辦」「Supabase 掛了怎麼救」
- [ ] Monitoring dashboard：Vercel + Sentry + DB query
- [ ] SLO / on-call 輪轉
- [ ] Pre-commit hook 秒過（type-check + E2E smoke）

如果這些 DevOps 都沒做、新工程師 onboard 會是災難。

---

## 執行順序

### 🔴 上線前（S）
1. CI E2E smoke（最優先、根治 INDEX ①）
2. Pre-commit hook 擋 secret commit
3. 本地 `.env.production` 刪、改 `vercel env pull`

### 🟠 上線前或第 1 週（M）
4. Sentry DSN + alert 規則 + SLO 定義
5. Cron retry + heartbeat

### 🟡 Post-Launch（L）
6. rollback / reset-db / migrate 自動化 scripts
7. Env 分層（Supabase Branching）
8. Feature flag 系統
9. Distributed rate limit
10. Webhook idempotency

---

_DevOps Automator 簽名：自動化能拯救人生、但前提是先建起基礎設施的鐵軌。手動 SSH 救火是上個世代的 DevOps。_

---

## 🔁 主 Claude 覆盤

**⚠️ 這位 agent 有 1 個重大誤判、我驗證後降級**。

### 1. 真問題過濾

| # | DevOps 說 | 覆盤後 | 備註 |
|---|---|---|---|
| **原 A `.env.production` 在 Git repo** | 🔴 P0 | ⚠️ **誤判、已降 M** | 驗證：`.gitignore` L41 有擋、`git ls-files` 未追蹤、本地檔存在但未 commit。修法是加 pre-commit hook 二次防護、不是 P0 恐慌 |
| **CI 缺 E2E smoke** | 🔴 | 🔴 **真、新、DevOps 獨有** | 這是 INDEX ① 漏洞的**根因**、agent 指得對 |
| Sentry 零 alert | 🔴 | ⚠️ 部分重複（SRE 已提）、但 DevOps 補具體 SLO 設計、算深化 |
| 無 rollback/reset-db script | 🔴 | 🔴 **真、新** |
| Cron 無 retry | 🟠 | 部分重複（SRE 提）、DevOps 補 `cron_execution_logs` 完善 |
| **本地可能連 prod DB（Env 分層）** | 🟠 | 🟠 **真、新、P1** |
| 無 feature flag | 🟡 | 🟡 **真、新**、跟 ai-bot 4 tab 空殼呼應 |
| Secret rotation SOP 缺 | 🟡 | 🟡 真、新 |

**覆盤結論**：
- **2 個真 P0 新**：CI E2E smoke、無 rollback script
- **1 個 P1 新**：本地連 prod DB 風險
- **1 個誤判降級**：`.env.production` commit（本地檔非 Git、降到 M）
- **2 個 Sentry/Cron 細化**（SRE 已提、DevOps 加實作）
- **2 個 Post-Launch 新**：feature flag、secret rotation SOP

### 2. 重複 / 扣分

- Sentry alert（SRE 已提）、但 DevOps 加具體 SLO 數字、不算純重複
- Cron retry（SRE 已提）、DevOps 加 cron_execution_logs 完善修法、算互補
- **誤判 `.env.production` 為 Git 追蹤** — agent 沒驗證 `.gitignore`、直接聲稱 P0、扣分

### 3. 跨視角 pattern 累積（1-9 位）

| # | Pattern | 狀態 |
|---|---|---|
| 1-13 | 前累計 | 繼承 |
| 14（候補）| 多租戶隔離品質不均（Data）| 需驗 |
| 15 | 使用者反饋迴路殘缺（UX）| 穩定 |
| **16** | **自動化基礎設施缺失**（CI E2E / rollback script / feature flag / secret rotation）| **DevOps 新** |

累計 **15 穩定 + 1 候補**。

### 4. DevOps 真正獨有貢獻

- **CI E2E smoke 是 INDEX ① 的根因** — 這個關聯只有 DevOps 指得出
- **無 rollback script** — 事故救援能力缺
- **本地 dev 可能連 prod DB** — 開發階段就能踩壞 Corner 真資料

---
