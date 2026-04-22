# 路由脈絡驗證：/login 未來影響評估
**Agent E — 未來影響預測**  
**日期**：2026-04-21  
**專案**：venturo-erp  
**評估對象**：src/app/(main)/login/page.tsx + 相關認證系統

---

## 1. 現有登入架構現況

### 核心特徵（為員工專用）
- **登入要件**：公司代號（code）+ 帳號（員工編號/email）+ 密碼
- **驗證流程**：
  1. client 端：code + username + password 送 `/api/auth/validate-login`
  2. server 端：查 workspaces（by code）→ 查 employees（by employee_number/email + workspace_id）
  3. 密碼校驗：Supabase Auth signInWithPassword（authEmail）
  4. 權限讀取：role_tab_permissions（module:tab 格式）
- **登入後目標**：固定 `/dashboard`（或 redirect param）
- **身份模型**：`workspace_id` + `role_id` → `role_tab_permissions` 決定可見範圍

### 承載現況
✅ **員工觀點**：
- 一個 workspace 內可有多角色（admin, tour_leader, sales 等）
- 權限已通用化（module:tab 格式、支援部分覆寫）
- 多 workspace 支援（Super Admin 可切換）

❌ **多租戶外部角色觀點**：
- `workspace_type` 已定義（travel_agency / vehicle_supplier / guide_supplier / transportation / dmc）但登入邏輯**不區分**
- 所有人用同一登入表單（公司代號 + 帳號 + 密碼）
- 登入後導向同一個 dashboard
- 供應商入口（`supplier_portal`）已在 features.ts 但**未串接登入流程**
  - supplier_users 表存在（2026-02-01 建立）但登入驗證不認識
  - 登入只查 employees，不查 supplier_users

---

## 2. 五個新角色加入時的改動評估

### 新角色清單
1. **旅遊業 Agent**（SaaS 付費客戶、獨立旅行社）
2. **當地 Loco Agent**（地接社）
3. **遊覽車公司**
4. **飯店**
5. **餐廳**

### 各角色的改動清點

| 角色 | 登入方式 | 儀表板 | 權限範圍 | 租戶模型 | 改動評估 |
|------|---------|--------|--------|--------|--------|
| **旅遊業 Agent** | 帳密（自己的供應商代碼）| 供應商工作檯 | 只看被邀請團隊的需求 | supplier_workspace（新） | **最大改動** |
| **Loco Agent** | 帳密或邀請碼 | 地接工作檯 | 只看指派的行程 + 景點 | supplier_workspace | **大改動** |
| **遊覽車公司** | 帳密或車隊代碼 | 車輛/行程派遣面板 | 只看自己的車隊 | supplier_workspace | **中改動** |
| **飯店** | 帳密或飯店代碼 | 訂房/入住面板 | 只看自己的訂單 | supplier_workspace | **中改動** |
| **餐廳** | 帳密或餐廳代碼 | 訂餐/廚房面板 | 只看被指派的訂單 | supplier_workspace | **小改動** |

### 核心衝突點

#### (1) **登入身份來源分岔**
現在：`employees.id` + `role_id` → `workspace_roles` → `role_tab_permissions`

未來：
- **員工**：`employees.id`（保持）
- **供應商**：`supplier_users.id` → 無 role_id 對應、權限需要新模型

**改動**：validate-login API 需加 `?userType=employee|supplier` 參數，分流查詢

#### (2) **登入表單 UX 分岔**
現在：統一表單（公司代號 + 帳號 + 密碼）

未來：
- **員工登入**：公司代號 + 帳號 + 密碼（保持）
- **供應商登入**：供應商代號 + 帳號 + 密碼（新）
- SaaS 客戶（旅遊業 Agent）可能需要品牌化登入頁（公司 logo/色系）

**改動**：
- 可能需要 `/login?type=employee|supplier|saas` 路由分支
- 或單一表單但多輸入焦點邏輯（判斷代號前綴決定查詢表）

#### (3) **登入後目標頁分岔**
現在：統一 `/dashboard`

未來：
- **員工**：`/dashboard`（保持）
- **供應商（旅遊業 Agent）**：`/supplier`（已定義）
- **Loco/飯店/餐廳**：各自工作檯（`/supplier/dispatch` 或新頁面）

**改動**：validate-login 回傳 `redirectUrl`，client 端根據 userType 決策

#### (4) **權限模型衝突**
現在：`role_tab_permissions`（module:tab 制）

未來：
- **員工**：role_tab_permissions（保持）
- **供應商**：無 role 概念、需要「供應商角色」表（新建）
  - 旅遊業 Agent：「帳戶管理員」「查詢員」
  - Loco：「調度員」「團隊負責人」
  - 飯店/餐廳：「訂單處理」「主管」

**改動**：
- 新建 `supplier_roles` 表 + `supplier_role_permissions` 表
- supplier_users 需新增 `role_id` 或 `roles` 欄位
- 登入時 supplier_users 走新的權限查詢邏輯

#### (5) **租戶隔離衝突**
現在：`workspace_id`（每個公司一個 workspace）

未來：
- **員工**：workspace_id 決定看到的所有資料（公司內員工/團隊/財務）
- **供應商（跨 workspace）**：
  - 旅遊業 Agent：可能收來自多個 workspace（多個客戶旅行社）的需求
  - Loco/飯店：通常是多 workspace 供應商，需要 cross-workspace 查詢
  - 飯店/餐廳：通常單一地點供應商，可能也跨多個客戶

**改動**：
- RLS policy 需區分 employee_rls vs supplier_rls
- supplier_users 可能需要 `allowed_workspaces` 欄位或關聯表

---

## 3. 現有代碼承載能力評估

### 架構判定：**為員工量身打造，但有通用基礎可延伸**

✅ **通用的部分**：
- `role_tab_permissions` 架構（module:tab 權限制）可對供應商復用
- validate-login 已有 userType 區分的潛力（searchParams 可擴）
- workspace 概念已抽象（不只員工用）

❌ **員工專用的部分**：
- validate-login **只查 employees 表**，supplier_users 完全無視
- 登入表單假設 code = workspace code（供應商可能不符）
- dashboard 路由硬編碼
- RLS policy 以 employees.id 為中心（employees_rls 表明）

### 加新角色的改動粗估

| 改動項 | 檔案數 | 複雜度 | 時間 |
|--------|-------|--------|------|
| **validate-login API 分流** | 1 | 高 | 4-6h |
| **登入表單 userType 判斷** | 1 | 中 | 2-3h |
| **supplier_roles + permissions 表** | 2 (migrations) | 中 | 3-4h |
| **RLS policy 二分法** | 8-10 | 高 | 6-8h |
| **供應商儀表板頁面** | 新 5-10 | 中 | 12-16h |
| **permissions/index.ts + hooks 適配** | 2 | 中 | 3-4h |
| **測試+QA** | 新 5 | 中 | 8-10h |
| **總計** | ~20 個檔案 | **高** | **40-50h** |

### 微調 vs 重寫判定

- **微調**：validate-login 入參擴展、auth-store 分流邏輯、permissions hooks 通用化
- **重寫**：RLS policy（現有員工 RLS 無法同時適用供應商）、儀表板路由邏輯

---

## 4. 「員工登入」vs「供應商登入」UX 分流預判

### 業務場景分析

#### 旅遊業 Agent（SaaS 付費客戶）
- **品牌化需求**：YES — 他們付錢、登入頁應該是他們的品牌（logo/色系）
- **獨立登入入口**：YES — `/login/saas?supplier_id=XXX` 或完全分域名
- **單一頁可載**：NO — SaaS 客戶需要自己的登入體驗

#### Loco Agent（地接社）
- **品牌化**：NO（佣金制、非付費）
- **獨立入口**：不強制，但如果在同一頁會混亂（用戶搞不清楚輸什麼）
- **單一頁載**：勉強可以（代碼前綴區分），但 UX 會膨脹

#### 飯店/餐廳
- **品牌化**：NO
- **獨立入口**：不需要（業務上他們就是被邀請方）
- **單一頁載**：YES — 極簡化、只收訂單、不需完整儀表板

### 現狀評估

登入頁現在是 **Venturo 品牌一體化頁面**（Morandi 金色主題、標題「Venturo 旅遊資源管理系統」）

- ✅ 適合：員工、Loco、飯店、餐廳
- ❌ 不適合：SaaS 旅遊業 Agent（他們想看自己公司名 + 色系）

### 建議（不動手）
- **保守方案**：/login 維持現狀（員工），新開 `/supplier/login` 給所有供應商（不區分）
  - 優點：改動最小
  - 缺點：SaaS 客戶仍看不到自己品牌
  
- **激進方案**：/login 加 `?type=` 參數 → 動態切換背景/標題
  - 優點：單一 URL 支援多品牌
  - 缺點：複雜化頁面邏輯、需要供應商基本資料（logo/色系）在系統內

- **分域方案**：SaaS 客戶買 subdomain（如 `acme.venturo.ai/login`），走 middleware 路由分流
  - 優點：最乾淨的 UX、品牌完全分離
  - 缺點：基礎設施複雜、需多租戶網域管理

---

## 5. 「現在便宜、以後貴」的預留接口清單

### 🔴 **Top 3 預留接口**（做一下會很划算）

#### (1) **Validate-Login API 參數化工人型（CRITICAL）**
現況：
```typescript
// src/app/api/auth/validate-login/route.ts
const { username, password, code } = validation.data
```
硬編碼只查 employees 表。

預留方案：
```typescript
const { username, password, code, userType } = validation.data  // 新增 userType
// 根據 userType 決策查 employees vs supplier_users
```

成本：現在 10 分鐘改一行參數、以後加供應商登入需改 validate-login 邏輯（會牽動 client 端 store + login 頁）。

---

#### (2) **Auth Store 身份抽象層（CRITICAL）**
現況：
```typescript
// src/stores/auth-store.ts
type EmployeeRow = Database['public']['Tables']['employees']['Row']
const buildUserFromEmployee() // 只認員工
```
User 物件假設來自 employees。

預留方案：
```typescript
type UserRow = EmployeeRow | SupplierUserRow  // 聯合型
function buildUserFromData(row: UserRow, userType: 'employee'|'supplier') { ... }
```

成本：現在 20 分鐘抽象 buildUserFromEmployee 成通用 buildUser、以後加供應商不用改 store 核心。

---

#### (3) **RLS Policy 預留表（CRITICAL）**
現況：
```sql
-- 所有表都走 employees_rls
CREATE POLICY employee_rls ON tour_itineraries
  USING (workspace_id = (SELECT workspace_id FROM employees WHERE id = auth.uid()))
```

預留方案：
```sql
-- 新建 user_contexts 表追蹤身份
CREATE TABLE user_contexts (
  auth_id uuid PRIMARY KEY,
  user_type 'employee'|'supplier',
  employee_id uuid,
  supplier_user_id uuid
)

-- RLS 改參考 user_contexts
USING (workspace_id = (SELECT ... FROM user_contexts WHERE auth_id = auth.uid()))
```

成本：現在 建 1 張表 + 修 5-10 個 RLS policy（2-3h）、以後不改就撐。

---

### 🟡 **次要 3 個**（做了更舒服）

#### (4) **Login Page 登入模式開關**
加一個 query param：`/login?mode=employee|supplier` → 切換表單標籤 / placeholder
成本：現在 30 分鐘、以後需要拆 form 會很麻煩

#### (5) **Permissions Hooks 通用化**
現在 useTabPermissions 只適應 module:tab 制。
預留：加參數 `useTabPermissions({ entityType: 'employee'|'supplier', ... })`
成本：現在 1h 通用化、以後要支援供應商特定權限會繞好多彎

#### (6) **Dashboard 路由通用化**
現在登入後硬導 `/dashboard`。
預留：validate-login 回 `userDashboardUrl`（employee → `/dashboard`, supplier → `/supplier`）
成本：現在 15 分鐘改一行、以後改起來會牽動 login 頁 + store + API 三處

---

## 總結表

| 預留點 | 現在成本 | 未來成本（不預留） | 優先級 |
|--------|---------|-----------------|--------|
| (1) validate-login userType 參數化 | 10 分 | 2-3h（回溯改） | 🔴 |
| (2) auth-store 身份抽象層 | 20 分 | 1-2h（分散改） | 🔴 |
| (3) RLS user_contexts 預表 | 2-3h | 6-8h（全改 policies） | 🔴 |
| (4) login 模式開關 | 30 分 | 1-2h（form 拆解） | 🟡 |
| (5) useTabPermissions 通用化 | 1h | 1-2h（新供應商權限邏輯） | 🟡 |
| (6) 儀表板路由通用化 | 15 分 | 1h（三處改） | 🟡 |

