# 6 · Sprint Prioritizer — /login v3.0 後 4 條 DB Pattern 升格排程

**日期**：2026-04-22
**角色**：Sprint Prioritizer
**範圍**：4 條 DB 層 pattern 升格 + 83 張 USING:true 表清單分批
**限制**：純排程、不動代碼

---

## 身份宣告

我是 Sprint Prioritizer。我不問「這個修法對不對」（那是 01-05 的事），我問三題：**不修會不會炸客戶資料、現在還是上線後修、一晚上能塞幾條低風險高收益的 commit**。Venturo 現況：剛 push、Vercel 部署觸發、4 家測試租戶（全是自己人或熟人）、實際用戶= William 自己。這個窗口是**黃金**——壞了也只是自己修、沒客戶要道歉；但也是**最後一扇門**——之後每多 1 個真實用戶、schema migration 就多 1 份「要不要通知」的猶豫。

---

## 1. 四條 Pattern 分層 + 估時

| #     | Pattern                                                      | 威脅描述                                                           | Bucket                      | 估時（人日）         | 理由                                                                                                                                                                                                                                                                           |
| ----- | ------------------------------------------------------------ | ------------------------------------------------------------------ | --------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **A** | `workspaces_delete` USING:true                               | 任何登入員工可 DELETE 任何 workspace row（含別家）                 | 🔴 **上線前必改**           | **0.3 人日**（2-3h） | Venturo = 多租戶 ERP、workspace 是最高層隔離單位。一個 USING:true 的 DELETE policy 等於「租戶自爆按鈕在任何員工手上」。修法單純（加 `is_super_admin()` 或限自家 workspace）、回歸只要驗「一般員工 DELETE 別家 workspace 回 403」。**今晚首選**。                               |
| **B** | `employee_permission_overrides` 無 workspace_id + USING:true | v2.0 點名未修；跨租戶 override 洩漏；任何員工可改任何 override     | 🔴 **上線前必改**           | **0.8 人日**（6h）   | 這是 v2.0 已掛名的舊債、沒修等於每次 audit 都重提一次。含兩步：(1) ALTER TABLE 加 `workspace_id` + backfill（從 role → workspace_roles 聯查）、(2) 改 RLS policy。backfill 要跑 safe-tenant-test。**比 A 重**、但 v2.0 已經掛號、今天收掉心理成本降很多。                      |
| **C** | `_migrations` 無 RLS                                         | schema 版本表可被任一員工讀取                                      | 🟡 **上線後短期（2 週內）** | **0.2 人日**（1-2h） | 讀到只是「知道你升到哪版」、不是資料洩漏、不是寫入面。但有個隱藏風險：**攻擊者可從 migration 名推測 schema 結構**（例：看到 `fix_workspaces_force_rls` 就知道 workspaces 曾經關過 FORCE RLS）。修法：ENABLE RLS + 只開給 service_role / super_admin。上線可帶、但別拖過 2 週。 |
| **D** | `rate_limits` 無 RLS                                         | 任一員工可讀任何用戶的速率限制計數、理論上可 INSERT 偽造計數繞限流 | 🟡 **上線後短期（2 週內）** | **0.3 人日**（2-3h） | **讀**是資訊洩漏中等、**寫**若能偽造計數就可 DDoS 旁路。但當前 4 家測試租戶、沒人會打速率限制、爆炸面接近 0。修法：RLS + user_id / ip 綁定。延後不會痛。                                                                                                                       |

**四條合計**：1.6 人日（含 migration + 回歸 + safe-tenant-test）。

---

## 2. Backlog 排序

```
Night-1（今晚窗口、0.3d）：A
 └─ 動力還在、最低風險、最高象徵意義（「tenant 自爆按鈕關了」）

Sprint-1 Week 1（本週、0.8d）：B
 └─ 要 safe-tenant-test、要 backfill、獨立 session 做
 └─ 清 v2.0 舊債、心理包袱解除

Sprint-1 Week 2（下週、0.5d）：C + D 打包
 └─ 兩個都是「加 RLS」pattern、同一個 mental model、可連做
 └─ 放一起一個 PR、migration 編號連號

Buffer：0.3d（回歸 + type-check + code review）
```

**為什麼 A 不等到跟 B 一起做？**

- A 修法極單純（改一個 policy）、不需 safe-tenant-test、0.3d 就能收
- B 要動 schema + backfill、今晚開這種 session 風險偏高（累了改 schema = 不好的組合）
- 把 A 今晚收掉、B 放到獨立 session、切分正確

---

## 3. 機會窗：今晚就該修的 Top 選擇

**背景**：剛 push 完、Vercel 正在部署、William 狀態好、單核心工作流允許 1 條今晚再推的低風險 commit。

### 推薦 #1（強推）：**Pattern A — `workspaces_delete` 加 系統主管 guard**

- **風險**：極低。改一條 RLS policy、不動 schema、不動 code、不動前端
- **收益**：極高。關掉 multi-tenant 系統最危險的一顆按鈕、v3.0 覆盤清單 -1
- **時間**：2-3h（含寫 migration、local supabase 驗、type-check、safe-tenant-test「員工 A 刪別家 workspace → 403」）
- **Revertable**：✅ down migration 就是 `USING true` 恢復、但沒人會想 revert
- **驗收話術**：「我用 Corner 的一般員工帳號、試刪 Jingyao workspace、被擋在 403、我放心了。」

### 推薦 #2（備選、若 #1 做完還有動力）：**`_migrations` 加 RLS**（Pattern C）

- **風險**：極低。加 ENABLE RLS + super_admin only policy、service_role 自動豁免
- **收益**：中。關掉一個資訊洩漏點、不是核心但順手
- **時間**：1-2h
- **注意**：確認 supabase CLI 跑 migration 時用 service_role 連線（應該是、但驗一下）、否則 CLI 自己讀不到 `_migrations` 就炸
- **Revertable**：✅

**不推薦今晚做 B**：schema 變更 + backfill + cross-tenant 測試 = 需要整場安靜的 session、不是「再推一個 commit」的尺度。
**不推薦今晚做 D**：rate_limits 動它要碰 auth middleware、複雜度跟「晚上再推一條」不匹配。

---

## 4. 83 張 USING:true 表的分批 Sprint 計畫

讀 `_using_true_tables.txt`、大致可分 4 類：

### 類別 α · 全域參考表（by design、不動、~25 張）

`ref_airports / ref_countries / ref_destinations / luxury_hotels / michelin_restaurants / premium_experiences / badge_definitions / payroll_allowance_types / payroll_deduction_types / supplier_categories / magic_library / bot_registry` ...

→ **處理方式**：`_PATTERN_MAP.md` 標 ⚫ **廢棄（by design）**、寫 ADR 記錄「全域參考表 USING:true 是正確設計」、以後 audit 自動跳過。**0.2 人日做一次性標記**。

### 類別 β · 敏感資料、必修（10-12 張、Sprint 1-2 內收）

`profiles / friends / private_messages / notifications / api_usage / api_usage_log / employee_payroll_config / personal_expenses / itinerary_permissions / customer_inquiries / pnr_passengers / pnr_segments`

→ **處理方式**：每張 0.2-0.4 人日、分批。

- **Sprint 1（本週、Night-1 + 5 張）**：profiles、friends、private_messages、notifications、employee_payroll_config → **2 人日**
- **Sprint 2（下週、6 張）**：personal*expenses、api_usage/api_usage_log、itinerary_permissions、customer_inquiries、pnr*\* → **2.5 人日**

### 類別 γ · 團務 / 供應商（30-35 張、Sprint 3-4）

`tour_* / trip_members* / vendor_costs / supplier_* / brochure_versions / restaurants / website_*`

→ **處理方式**：跟 /tours /finance/payments 路由驗同步處理、Blueprint 走到對應路由時順手做 RLS。不獨立 sprint、**掛在路由驗的尾巴**。

### 類別 δ · 系統內部 / log（~15 張、最後或廢棄）

`syncqueue / cron_execution_logs / decisions_log / region_stats / workload_summary / expense_monthly_stats / expense_streaks / traveler_tour_cache`

→ **處理方式**：多數是 log / cache、USING:true 影響低、但統一標「service_role only」更乾淨。**Sprint 4（1 個月後）一次批次處理**、0.5 人日。

### Sprint 骨架總表

| Sprint     | 週次     | 範圍                           | 人日   | 產出             |
| ---------- | -------- | ------------------------------ | ------ | ---------------- |
| S0 Night-1 | 今晚     | Pattern A（workspaces_delete） | 0.3    | migration + test |
| S1         | Week 1   | Pattern B + β 類 5 張          | 2.8    | 6 個 migrations  |
| S2         | Week 2   | Pattern C + D + β 類 6 張      | 3.0    | 8 個 migrations  |
| S3         | Week 3-4 | γ 類（跟路由驗同步）           | inline | 隨 Blueprint 走  |
| S4         | Month 2  | δ 類 + α 類標記 ADR            | 0.7    | 收尾             |

**合計**：~7 人日跨 4 個 sprint、不影響 60 天路線圖主幹。

---

## 5. 對照 Venturo 60 天路線圖

**問題**：這些 pattern 該插隊、還是等 12 路由驗完再統一 clean up？

**答案**：**分開處理、不互斥**。

- Pattern A：**插隊今晚**。路由驗不到 `workspaces_delete`（它是 DB 層、不是頁面）、等也等不出來。
- Pattern B：**插隊本週**。v2.0 舊債、路由驗再發現一次就重複工。
- Pattern C / D：**插隊 2 週內**。跟路由驗平行、不搶 William 時間。
- γ 類（30+ 張團務相關）：**跟路由驗同步**、不另開戰場。Blueprint 走到 /tours 時、順手把 tour\_\* 的 RLS 帶到位。
- β 類剩下的 / α / δ：**路由驗完再說**。

**理由**：路由驗的產出是「頁面 SITEMAP + 業務語言驗收話術」、RLS 修復的產出是「DB schema + policy」、兩者產物不同、不要硬綁。

**紅線**：A + B 必須上線前收、否則上線當天有爆炸面。C + D 上線帶著但 2 週內還。

---

## 200 字摘要

**四條 pattern 兩紅兩黃**。紅：A `workspaces_delete` USING:true（上線前必修、0.3 人日、**今晚就該做**）、B `employee_permission_overrides` 無 workspace*id（v2.0 舊債、本週收、0.8 人日、需 safe-tenant-test）。黃：C `_migrations` 無 RLS（2 週內、0.2 人日）、D `rate_limits` 無 RLS（2 週內、0.3 人日）。83 張 USING:true 表分 4 類：ref*\* 全域表 ⚫ 標 by design（25 張）、敏感資料 🔴 分 2 sprint 修（12 張）、團務相關 🟡 跟路由驗同步（35 張）、系統 log 🟢 最後批次（15 張）。跟 60 天路線圖**平行不互斥**、A/B 插隊、C/D 平行、γ 類跟路由驗一起走。

---

## Top 3 今晚就該修

1. **🥇 Pattern A — `workspaces_delete` USING:true 加 系統主管 guard**（2-3h、極低風險、關掉 multi-tenant 最危險按鈕、v3.0 覆盤清單 -1）
2. **🥈 Pattern C — `_migrations` 加 RLS + super_admin only**（1-2h、順手清掉資訊洩漏點、與 #1 同 mental model 可連做）
3. **🥉 α 類 25 張 ref\_\* 表一次性標 ADR「by design USING:true」**（30 分鐘寫 ADR + 更新 `_PATTERN_MAP.md`、未來 audit 自動跳過、心理包袱 -25 張）

**單晚預算上限建議 1-2 條**（#1 必、#2 若還有動力、#3 是零風險收尾）。**不要今晚動 B**——schema + backfill 配疲勞 = 地雷組合。
