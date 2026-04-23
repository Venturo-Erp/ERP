# HR 職務管理 + 租戶管理 完整作業流程

**日期**: 2026-04-23  
**狀態**: 已驗證（代碼版本：20260423）  
**目標受眾**: 想真正理解「職務→員工→權限→登入」全流程的開發者

---

## 📋 目錄

- [A. HR 職務管理（Role-Based Access Control）](#a-hr-職務管理)
- [B. 租戶管理（Tenants）](#b-租戶管理)
- [C. 兩者的互動](#c-兩者的互動)
- [D. 結論與核心概念](#d-結論與核心概念)
- [E. 完整流程圖](#e-完整流程圖)

---

## A. HR 職務管理

### A.1 數據模型與表關係

#### 核心三角：`workspace_roles` ↔ `role_tab_permissions` ↔ `employees`

**表定義**（從 code 推演）：

```
workspace_roles（職務表）
├── id: UUID（主鍵）
├── workspace_id: UUID → workspaces.id（租戶隔離）
├── name: TEXT（例："管理員"、"業務"、"會計"、"助理"）
├── description: TEXT（職務說明）
├── is_admin: BOOLEAN（是否為超級管理員）
├── sort_order: INT（排序）
├── created_at / updated_at

role_tab_permissions（職務權限表）
├── id: UUID
├── role_id: UUID → workspace_roles.id（ForeignKey）
├── module_code: TEXT（模組編號，如 "tours"、"finance"、"hr"）
├── tab_code: TEXT | NULL（分頁編號，如 "overview"、"orders"；NULL = 整個模組）
├── can_read: BOOLEAN（可讀）
├── can_write: BOOLEAN（可寫）
├── created_at / updated_at

employees（員工表）
├── id: UUID（主鍵）
├── workspace_id: UUID → workspaces.id（租戶隔離）
├── employee_number: TEXT（員工編號，如 "E001"）
├── chinese_name / english_name / display_name
├── role_id: UUID → workspace_roles.id（職務指派）  ⚠️ 單一值、非陣列
├── job_info: JSONB（遺留：可能包含 role_id，但不再使用）
├── is_active: BOOLEAN
├── status: TEXT（"active" / "probation" / "leave" / "terminated"）
└── ... 其他欄位
```

**數據模型的核心問題**：

❓ **「職務」跟「員工」的關係是 1-to-many 還是 many-to-many？**

✅ **答案**：**1-to-many**（單一職務）。`employees.role_id` 存一個 UUID、指向 `workspace_roles.id`。

- **為什麼**？業務簡單性。小旅行社通常一人一職務（業務、會計各一個）。
- **證據**：
  - `/src/app/(main)/hr/page.tsx:148-159`：員工列表讀 `role_id` 找職務名稱
  - `/src/app/api/tenants/create/route.ts:315-324`：新建員工時直接 `update { role_id: adminRole.id }`
  - ADR-R2 決策（2026-04-18）：「Drop `employee_job_roles` junction table」→ 改 `employees.role_id` 單一欄位

❌ **一個員工能有多個職務嗎？**：否。系統設計上「一人一職務」。

---

### A.2 老闆在「職務管理」頁的實際操作流程

**頁面**：`/src/app/(main)/hr/roles/page.tsx`  
**只有 admin（is_admin=true）能進**（第 421-440 行權限檢查）

#### 操作流程：建職務 → 設權限 → 分配員工

**Step 1：新增職務**
```
老闆點「新增職務」按鈕
  ↓
Dialog 出現：輸入「職務名稱」+ 「說明」
  ↓
POST /api/roles (非 PUT、POST 建新)
  ├── 取得 workspace_id（API 自動 from auth）
  ├── 驗證名稱不為空
  ├── 取得最大 sort_order、+1（排序）
  └── INSERT workspace_roles { name, description, is_admin: false, workspace_id, sort_order }
  ↓
API 回傳新職務（id / name / description / is_admin / sort_order）
  ↓
前端：refresh roles 列表、自動選中新職務
```

**程式碼證據**：`/src/app/(main)/hr/roles/page.tsx:206-234`

---

**Step 2：設定職務權限（最複雜的部分）**

頁面左側列表選中職務 → 右側出現「權限矩陣」。

權限矩陣的結構（`/src/lib/permissions/module-tabs.ts`）：

```
行（modules） × 列（can_read / can_write）
├─ 無 tab 的模組（6 個）：calendar、workspace、todos、visas、design、office
├─ 有 tab 的模組（10 個）：tours、orders、finance、accounting、hr、database、settings
│   例：tours (14 tab：overview / orders / members / itinerary ... + 3 個下拉資格)
└─ 特殊：「下拉資格」tab（isEligibility=true）
    └─ admin 也可個別取消（例：老闆不想 CEO 出現在「代墊款人」下拉）
```

操作方式：
- **模組層級**（第 130-178 行）：勾「可讀取」/「可寫入」→ toggle 該模組全部分頁
- **分頁層級**（第 180-203 行）：展開模組 → 勾每個分頁
- **Admin 的特殊性**（第 315 行 `isAdmin = selectedRole?.is_admin`）：
  - Admin 職務的開關被 disabled（`disabled={isAdmin}`）
  - 但「下拉資格」tab 可以個別取消（`adminCanEdit = tab.isEligibility === true`）

點「儲存」按鈕：
```
PUT /api/roles/{roleId}/tab-permissions
  ├── 前端發送 { permissions: [ 
  │     { module_code: "tours", tab_code: "overview", can_read: true, can_write: true },
  │     { module_code: "tours", tab_code: "orders", can_read: false, can_write: false },
  │     ...
  │   ]}
  ├── API 的 upsert 邏輯：
  │   ├─ 刪除舊的 role_tab_permissions（該 role 的所有 row）
  │   └─ INSERT 新的（前端發來的 payload）
  └── 返回成功
  ↓
前端驗證：GET /api/roles/{roleId}/tab-permissions → 確認 DB 已更新
```

**程式碼證據**：
- 讀權限：`/src/app/(main)/hr/roles/page.tsx:68-88`（GET 權限）
- 儲存：`/src/app/(main)/hr/roles/page.tsx:237-284`（PUT）
- API：檔案不在本報告讀取範圍（但邏輯由 UI 代碼推測）

---

**Step 3：分配員工到職務**

職務管理頁**本身不做員工指派**。指派邏輯在「員工管理」頁（`/hr` 主頁）。

進入「編輯員工」表單：
```
EmployeeForm 組件 (/src/features/hr/components/EmployeeForm.tsx)
  ├── 載入職務列表：GET /api/roles → roles[]
  ├── 表單有「職務」下拉選單（from cachedRoles 或現場 API 查詢）
  ├── 選擇職務 → 存入 formData.role_id
  └── 提交時：PUT /api/users/{employeeId} { role_id: selectedRoleId }
```

**程式碼證據**：`/src/features/hr/components/EmployeeForm.tsx:39 / 75` (useWorkspaceRoles hook)

---

### A.3 `role_tab_permissions` 的寫入時機

❓ **什麼時候新 row 會寫入 `role_tab_permissions`？**

1. **新建職務時**：**不寫入**。只創 `workspace_roles` row、權限表先空著。
   - 老闆必須手動進「職務管理」頁、選職務、勾權限、儲存。
   - 證據：`/src/app/api/roles/route.ts:32-76`（POST 邏輯：只插 workspace_roles、不插 role_tab_permissions）

2. **老闆勾一次就 upsert**？
   - 是的。前端把「當前狀態」（已勾 + 未勾）一併發上去。
   - API 刪舊 row、插新 row。
   - 不是 CSV 匯入。

3. **新租戶建立時**（特殊邏輯）：
   - 新租戶的預設職務（管理員、業務、會計、助理）會**複製 Corner 租戶的模板**。
   - 證據：`/src/app/api/tenants/create/route.ts:326-381`
   - 邏輯：
     ```
     1. 建 4 個預設 workspace_roles
     2. 從 Corner workspace 查 4 個同名職務的 role_tab_permissions
     3. 把 Corner 的 row 複製過來（role_id 改成新租戶的 role_id）
     ```
   - 這樣新租戶的「業務」職務一建出來就帶 Corner 業務的權限模板。

4. **Admin 職務的 backfill**：
   - Migration `20260422150000_backfill_admin_role_tab_permissions.sql`：
   - 背景：舊系統 admin 因前端短路、role_tab_permissions 沒填完整（只 14-24 row）。
   - P001 Phase A 新系統不再短路 → admin 需要完整 54 個 row（6 無 tab 模組 + 48 個 tab）。
   - 修法：對所有 is_admin=true 的 role、UPSERT 完整 54 row、can_read/can_write 都 true。

---

### A.4 新員工預設職務

❓ **新員工剛進來、預設職務是什麼？怎麼指派？**

**答**：**沒有預設**。新員工的 `role_id = NULL`。

操作流程：
```
HR admin 在「員工管理」頁新增員工
  ├─ EmployeeForm 出現
  ├─ 必填：名字、員工編號
  ├─ 選填：職務下拉（預設空白）
  └─ 提交時 INSERT { ..., role_id: <selected> }

如果沒選職務 → role_id = NULL → 員工登入後無任何模組權限（白屏除非給直接 isAdmin 短路、但新系統已拔掉）
```

管理員也可事後修改：編輯員工 → 改職務。

**程式碼證據**：`/src/app/(main)/hr/page.tsx:45-57`（loadRoles、但新建員工時的預設邏輯在 EmployeeForm）

---

### A.5 員工本人能看自己的職務 / 權限嗎？在哪裡看？

❓ **員工能看自己被指派的職務、以及自己有哪些權限嗎？**

**答**：**不能**。系統沒有「我的權限查詢」頁面。

- 員工登入後、能看到的功能是由「権限檢查」決定（每頁路由 layout 檢查 `useTabPermissions`）。
- 員工如果想知道「自己有啥權限」，只能從「能用啥功能」反推。
- 沒有「設定 → 我的權限」之類的頁面。

職務管理（`/hr/roles`）**只有 admin 能進**。員工進不了（第 421 行權限檢查）。

---

### A.6 `workspace_roles` vs `role_tab_permissions` vs `employees.role_id` 的三角關係

```
┌─────────────────────────────────────────────────────────┐
│ workspace_roles（職務表）                                   │
│ id: "role-abc"                                            │
│ name: "業務"                                              │
│ is_admin: false                                           │
│ workspace_id: "ws-001"                                    │
└────────────┬────────────────────────────────────────────┘
             │
             │ 1 : many
             │
┌────────────▼────────────────────────────────────────────┐
│ role_tab_permissions（權限明細表）                        │
│ role_id: "role-abc"                                       │
│ module_code: "tours"、"finance" 等                        │
│ tab_code: "overview"、"orders" 等（或 NULL）              │
│ can_read: true / false                                    │
│ can_write: true / false                                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ employees（員工表）                                       │
│ id: "emp-xyz"                                             │
│ role_id: "role-abc" ← 指向上面的職務                       │
│ workspace_id: "ws-001"                                    │
│ ...                                                       │
└─────────────────────────────────────────────────────────┘

數據流：
1. 老闆在「職務管理」頁操作 → 修改 role_tab_permissions
2. 員工的 role_id 指向某 workspace_roles
3. 員工登入時 → validate-login API 查 role_id → 讀該職務的 role_tab_permissions → 建 permissions 清單 → 回傳
4. 前端儲存 permissions 清單到 authStore → 路由層 layout 讀 authStore.permissions 決定看不看某個分頁
```

**SSOT（Single Source of Truth）**：`role_tab_permissions`

---

### A.7 Admin（超級管理員）vs 一般職務

#### `workspace_roles.is_admin` 的效果

**只有** `is_admin = true` 的職務有特殊待遇：

1. **無法刪除**（第 287-291 行：`if (role.is_admin) { toast('無法刪除管理員角色'); return }`）

2. **職務管理 UI 層**：
   - Admin 職務的 can_read / can_write 開關 disabled（第 355 行 `disabled={isAdmin}`）
   - Admin 職務自動呈現為「全開」（第 353-361 行）
   - 但「下拉資格」tab 可以個別取消（第 384-385 行 `adminCanEdit = tab.isEligibility === true`）

3. **權限檢查層**（驗證登入時）：
   - `validate-login/route.ts:141`：查職務 is_admin 狀態
   - 如果 is_admin=true，authStore.isAdmin 設 true
   - **但新系統不再有「isAdmin 短路」**：admin 也要讀 role_tab_permissions（第 144-161 行）

4. **`role_tab_permissions` 自動 backfill**：
   - 新 workspace 建立時（`tenants/create`），4 個預設職務（包括「管理員」）會從 Corner 複製 role_tab_permissions。
   - Migration backfill：所有 is_admin=true 的職務補完 54 個 row（全開）。

#### Admin Role 的權限初始化時機

**新租戶建立** → admin 職務權限來自 **Corner 模板**

流程（`/src/app/api/tenants/create/route.ts:288-381`）：
```
1. 建 4 個預設 workspace_roles（含 is_admin: name === '管理員'）
2. 查 Corner workspace 的 4 個同名角色
3. 查 Corner 的 role_tab_permissions（所有行）
4. 對應名稱 → 複製到新 workspace 新職務
   - map by role name（都是「業務」、「會計」等）
   - INSERT INTO role_tab_permissions（新 role_id、新 permissions）
5. Corner 的「管理員」職務是全開的（已由 migration backfill）
   → 新租戶的「管理員」也是全開（直接複製）
```

**Migration 時機**（針對既有租戶的 admin）：`20260422150000` → 對所有現存 admin role upsert 54 個全開 row。

**新建租戶的 admin**：由 `tenants/create` 直接從 Corner copy（不需再跑 migration）。

---

## B. 租戶管理（Tenants）

### B.1 誰會用「租戶管理」？Venturo 超管？還是每個租戶老闆？

❓ **租戶管理的用戶級別是什麼？**

**答**：**Venturo 超管 + 被賦予「租戶管理」功能權限的租戶員工**

具體：
```
1. Venturo 超管（平台管理員）
   - 在 Venturo 的「管理後台」（假想存在的另一套系統）
   - 建租戶、查所有租戶、修改租戶設定、刪租戶
   - 證據：tenants/create API 的權限檢查（見 B.2）

2. 各租戶內的「有租戶管理權」的員工（通常是租戶老闆）
   - 進 /tenants 頁面
   - 看自己租戶的詳情、改設定
   - **跨租戶操作**（建租戶、看別租戶）需要「租戶管理」功能權限
```

**頁面**：`/src/app/(main)/tenants/page.tsx`  
**權限檢查**：`/src/app/api/workspaces/route.ts:11-28`（GET 所有租戶）

```typescript
// API 檢查：需要 workspace_features.tenants 開啟
const { data: feature } = await supabase
  .from('workspace_features')
  .select('enabled')
  .eq('workspace_id', auth.data.workspaceId)
  .eq('feature_code', 'tenants')
  .single()

if (!feature?.enabled) {
  return NextResponse.json({ error: '無權限' }, { status: 403 })
}
```

**特殊設計**：`workspace_features.tenants` 是「功能開關」、不是「職務權限」。

---

### B.2 「建立新租戶」的實際情境

❓ **建新租戶的典型場景？**

**答**：Venturo 賣給第二家旅行社（或同客戶新增一個分公司）。

流程（從 UI 層）：

```
Venturo 超管（已登入一個 workspace、有「租戶管理」權限）
  ↓ 進 /tenants 頁面
  ↓ 點「+ 新增租戶」按鈕（建立租戶 Dialog）
  ↓ Step 1：輸入租戶資訊
      - 租戶名稱（例："京遙旅行社"）
      - 租戶代號（例："JINGYAO"，必須大寫英文）
      - 最大員工數（選填）
      - 租戶類型（預設 "travel_agency"）
  ↓ Step 2：輸入第一個管理員資訊
      - 員工編號（預設 "E001"）
      - 管理員名字（例："陳建宏"）
      - Email（選填，可自動生成）
      - 密碼（例："12345678"）
  ↓ Step 3：點「建立」
      ↓ POST /api/tenants/create { workspaceName, workspaceCode, adminName, adminPassword, ... }
      ↓ API 執行「建新租戶」的 10 步驟（見 B.3）
      ↓ 返回登入資訊（workspaceCode、員工編號、密碼）
  ↓ Step 4：「複製登入資訊」的 Card 展示
      ↓ 超管複製資訊、手動告訴新租戶老闆
      ↓ 新租戶老闆用這些資訊登入 → 開始設定自己的職務、員工等

```

**程式碼證據**：`/src/app/(main)/tenants/create-tenant-dialog.tsx:55-176`

---

### B.3 新租戶初始化的完整邏輯

API：`/src/app/api/tenants/create/route.ts`（行 41-537）

#### 權限檢查（第 43-100 行）

```
1. 檢查登入狀態（getServerAuth）
2. 查當前員工資訊（include role_id）
3. 查該員工職務是否有「settings.tenants.can_write」權限
   ├─ role_tab_permissions.module_code = 'settings'
   ├─ role_tab_permissions.tab_code = 'tenants'
   └─ role_tab_permissions.can_write = true
4. 如果無權限 → 403 Forbidden

💡 為什麼不是「workspace_features.tenants」？
   因為 workspace_features 只是「這個功能在這租戶有沒有開通」
   不代表「這個員工有沒有權限用」
   真正的權限在 role_tab_permissions
```

#### 10 個建立步驟（第 138-509 行）

**Step 1：建 workspaces row**（第 184-207 行）
```sql
INSERT INTO workspaces {
  name: "京遙旅行社",
  code: "JINGYAO",
  type: "travel_agency",
  is_active: true,
  premium_enabled: false,
  max_employees: null
}
```

**Step 2-4：建第一個管理員（employee + auth + 綁定）**（第 209-286 行）
- CREATE employees row（employee_number = "E001"、roles = ['admin']、permissions 已廢除、role_id 暫空）
- CREATE auth.users row（email、password、user_metadata 存 workspace_id / employee_id）
- UPDATE employees.supabase_user_id = auth_user_id

**Step 5：建 4 個預設職務**（第 288-325 行）
```sql
INSERT INTO workspace_roles × 4 {
  name: "管理員" / "業務" / "會計" / "助理"
  is_admin: true if name === "管理員" else false
  workspace_id: <new_workspace_id>
}

💡 這時權限表還空著！role_tab_permissions 沒有 row
```

**Step 6：從 Corner 複製 role_tab_permissions（權限模板）**（第 326-381 行）
```
1. 查 Corner 的 4 個同名職務 ID
   WHERE workspace_code = 'CORNER' AND name IN ('管理員', '業務', '會計', '助理')
2. 查 Corner 職務的 role_tab_permissions（所有行）
3. 對應名稱 → 複製到新職務
   INSERT INTO role_tab_permissions × N {
     role_id: <new_role_id>（根據同名對應）
     module_code, tab_code, can_read, can_write（from Corner）
   }

💡 所以新租戶的「業務」一建出來就有 Corner 業務的權限
   新租戶的「管理員」一建出來就有 Corner 管理員的權限（全開 54 row）
   這樣可以避免「新租戶管理員登入後白屏」的 bug
```

**Step 7：初始化 workspace_features（功能開關）**（第 383-454 行）
```
1. 免費功能預設全開：
   dashboard, calendar, workspace, todos, tours, orders, quotes, finance,
   database, hr, settings, customers, itinerary, channel
2. 付費功能預設關：
   accounting, office, bot_line, bot_telegram, fleet, local, supplier_portal, esims
3. Tab 層級功能：
   對每個模組的每個 tab（非 eligibility）
   生成 "module.tab" feature code
   如果 module 在免費清單、tab category 是 basic → enabled: true
   否則 → enabled: false

結果：新租戶預設買了「基本功能」、不需要額外設定
```

**Step 8-10：Soft 步驟（失敗不 rollback）**
- 建公告頻道（channels.INSERT）
- 從 Corner 複製基礎資料（countries）
- 建 workspace bot

#### 回傳值（第 513-528 行）
```json
{
  "success": true,
  "workspace": {
    "id": "...",
    "code": "JINGYAO",
    "name": "京遙旅行社"
  },
  "admin": {
    "employee_id": "...",
    "employee_number": "E001"
  },
  "login": {
    "workspaceCode": "JINGYAO",
    "employeeNumber": "E001",
    "password": "12345678"
  }
}
```

---

### B.4 新租戶預設職務與初始化時機

**預設職務名稱**：`DEFAULT_ROLE_NAMES = ['管理員', '業務', '會計', '助理']`（第 25 行）

**初始化時機**：`tenants/create` 的 Step 5-6

- Step 5：建 4 個 workspace_roles（沒有任何權限行）
- Step 6：複製 Corner 的 role_tab_permissions → 新職務有權限
- 預設老闆是誰？**建租戶時指定的那個人**（adminName / adminEmployeeNumber）
  - 自動分配給「管理員」職務（第 315-324 行）

**預設職務的權限來自哪裡**？**Corner 租戶**（第 326-381 行的 CORNER_WORKSPACE_ID）

這樣設計的好處：
- 新租戶不用重新設定一遍「業務可以看什麼」
- Venturo 可以統一調整 Corner 的職務權限 → 未來新租戶都會用最新的模板
- （缺點：如果 Corner 改了、舊租戶不會自動更新，那是未來的 P007 問題）

---

### B.5 「租戶層級功能開關」與「職務層級權限」的互動邏輯

**兩層守門**：

```
員工能否使用「tours.overview」功能？

1️⃣ 功能層檢查（workspace_features）：
   SELECT enabled FROM workspace_features
   WHERE workspace_id = ? AND feature_code = 'tours.overview'
   ├─ enabled = false → 即使職務有權限也看不到
   └─ enabled = true → 進入第 2️⃣ 層

2️⃣ 職務層檢查（role_tab_permissions）：
   SELECT can_read FROM role_tab_permissions
   WHERE role_id = ? AND module_code = 'tours' AND tab_code = 'overview'
   ├─ can_read = false → 沒權限、看不到
   └─ can_read = true → 可讀取
```

**程式碼證據**：
- 功能層：`/src/lib/permissions/hooks.ts`（`useWorkspaceFeatures`）
- 職務層：`useTabPermissions` hook
- 組合邏輯：`/src/app/(main)/hr/roles/page.tsx:42-51`
  ```typescript
  const visibleModules = useMemo(
    () =>
      MODULES.filter(m => isFeatureEnabled(m.code)).map(m => ({
        ...m,
        tabs: m.tabs.filter(
          t => t.isEligibility || isTabEnabled(m.code, t.code, t.category)
        ),
      })),
    [isFeatureEnabled, isTabEnabled]
  )
  ```

**實例**：
```
新租戶 JINGYAO
├─ workspace_features: accounting = false（未買會計模組）
├─ 會計員的 role_tab_permissions: accounting.vouchers = can_read: true

結果：會計員登入後、accounting 模組完全不顯示（第 1️⃣ 層卡住）
      即使改 workspace_features = true、會計員也能看到

另一個例子：
├─ workspace_features: accounting = true（已買）
├─ 業務員的 role_tab_permissions: accounting = can_read: false

結果：業務員看不到 accounting（第 2️⃣ 層卡住）
```

---

### B.6 Venturo 超管 vs 租戶老闆的區別

#### `isAdmin` 的兩層含義

```
1. 職務層：workspace_roles.is_admin = true
   ├─ 老闆的職務（管理員）通常設 is_admin=true
   ├─ 小員工的職務（業務）設 is_admin=false
   └─ 用途：UI 層判斷「要不要 disable 權限開關」

2. 平台層：Venturo 系統不區分「Venturo 超管」vs「租戶老闆」
   ├─ 都是「某個租戶的管理員」
   ├─ 只要該租戶有 workspace_features.tenants = true
   └─ 且員工職務有 role_tab_permissions.settings.tenants.can_write
       → 就可以建租戶
```

#### 「我可以建租戶」的權限來自哪裡

**答**：職務的 `role_tab_permissions` → `module_code='settings' AND tab_code='tenants' AND can_write=true`

**查詢邏輯**（`/src/app/api/tenants/create/route.ts:83-93`）：
```typescript
if (effectiveRoleId) {
  const { data: rolePermission } = await supabaseAdmin
    .from('role_tab_permissions')
    .select('can_write')
    .eq('role_id', effectiveRoleId)
    .eq('module_code', 'settings')
    .eq('tab_code', 'tenants')
    .single()

  canManageTenants = rolePermission?.can_write ?? false
}
```

#### 「Venturo 超管」概念在 code 裡怎麼表達

**答**：**沒有明確的 `platform_admin` 欄位**。而是：

```
Venturo 架構（推測）：
├─ 有一個「Venturo 內部租戶」（推測就是 Corner 或類似）
├─ 該租戶的某個員工（通常叫「系統管理員」或「Venturo 管理員」）
├─ 職務 is_admin=true
├─ role_tab_permissions.settings.tenants.can_write=true
└─ 然後就可以建租戶、看所有租戶、修改所有租戶

Code 證據：
- Corner workspace hardcoded（CORNER_WORKSPACE_ID = '8ef...'）
- 新租戶都從 Corner 複製模板
- 租戶管理 API 用 admin client、沒有租戶隔離（所有 workspaces 都可查）
```

**未來改進**（P009+）：
- 可以考慮加 `workspaces.created_by` FK → employees
- 或 `platform_admins` 表
- 但目前用「某租戶某員工有租戶管理權」來代理「Venturo 超管」

---

## C. 兩者的互動

### C.1 `/api/tenants/create` 建新租戶時的職務與權限初始化

已詳見 **B.3**。核心：

1. **建職務**（workspace_roles）→ 4 個預設
2. **複製權限**（role_tab_permissions）→ 從 Corner
3. **初始化功能開關**（workspace_features）→ 免費全開、付費關
4. **建管理員員工** → 分配給「管理員」職務

### C.2 「租戶管理」功能的權限設定

**「租戶管理」在 HR 職務管理頁的呈現**：

- 模組編號：`"settings"`
- 分頁編號：`"tenants"`
- 呈現位置：「系統設定」模組 → 「租戶管理」分頁
- Module 定義：`/src/lib/permissions/module-tabs.ts:176-183`
  ```typescript
  {
    code: 'settings',
    name: '系統設定',
    description: '公司與系統配置',
    tabs: [
      { code: 'personal', name: '個人設定', description: '密碼、頭像、個人資料' },
      { code: 'company', name: '公司設定', description: '公司名稱、Logo、聯絡方式' },
      // ❌ 注意：代碼裡沒有 'tenants' tab！
    ],
  }
  ```

**重要發現**：模組定義裡**沒有** `settings.tenants`！

- Module tabs 定義只有 `personal` 和 `company`
- 但 API 權限檢查會查 `role_tab_permissions.settings.tenants`
- 這表示「租戶管理」權限**硬寫在 API 層**、不在 HR 職務管理 UI 裡編輯

**為什麼**？租戶管理是 Venturo 超管功能、不開放給普通租戶編輯（只開放給 Venturo 系統管理員）

### C.3 「資料每個租戶一份」vs「職務模板共用」的分工

#### 資料隔離（按租戶）

```
一租一份：
- employees（員工資料）
- workspace_roles（職務定義）
- role_tab_permissions（職務權限）
- tour（出團資料）
- customers（客戶資料）
- ... 所有業務數據

RLS policy：
  SELECT ... FROM employees WHERE workspace_id = current_workspace_id

所以 CORNER 租戶的員工看不到 JINGYAO 的員工
JINGYAO 租戶的員工也看不到 CORNER 的員工
```

#### 職務模板共用（暫時）

```
新租戶建立時：
  → 複製 CORNER 的 role_tab_permissions
  → 新職務一建出來就帶 CORNER 的權限

但建完之後：
  → 新租戶修改自己的 role_tab_permissions
  → 不會改到 CORNER 的
  → 所以「共用」只在初始化時、之後各過各的
```

**理想狀態**（P007 未來改進）：
- 建立「職務權限模板」table（platform-wide）
- 新租戶建時、可選擇用哪個模板
- 將來模板版本升級、既有租戶可 opt-in 同步

---

## D. 結論與核心概念

### 本質理解

#### 1. HR 職務管理 = 細粒度權限管理系統

```
不是簡單的「一個按鈕開關全部」
而是：
  ├─ 模組級（tours、finance 等）可獨立開關
  ├─ 模組內分頁級（tours.overview、tours.orders 等）各自設定
  ├─ 可讀 / 可寫分開控制
  ├─ 下拉資格（誰能出現在哪個下拉）也在同一套系統管理
  └─ Admin 職務自動全開、但下拉資格可手動調整

實作上：
  - 職務管理 UI 的複雜度來自「所有 module × tab 組合」的矩陣
  - 後端用 role_tab_permissions 作 SSOT
  - 前端登入時讀取、存入 authStore.permissions
  - 路由層每個 layout 檢查 useTabPermissions hook
```

#### 2. 租戶管理 = 多客戶隔離系統

```
Venturo 超管（或有租戶管理權的員工）
  ↓
建租戶（workspaces）
  ↓
自動初始化：
  - 4 個預設職務（from Corner 模板）
  - 職務權限（from Corner template）
  - 功能開關（免費全開、付費關）
  - 第一個管理員（可登入、可管理租戶內部）
  ↓
新租戶老闆登入
  ↓
在自己租戶內：
  - 管理員工
  - 調整職務權限
  - 開啟付費功能
  ↓
員工登入
  ↓
根據職務 + 功能開關決定能看什麼
```

#### 3. 權限檢查的三個層次

```
員工登入時：
  1️⃣ 驗證帳密（/api/auth/validate-login）
     ├─ 查 workspace.code（租戶）
     ├─ 查 employee.role_id（職務）
     ├─ 查 role_tab_permissions（職務權限）
     └─ 回傳 permissions[] 清單

瀏覽頁面時：
  2️⃣ 路由層檢查（layout.tsx）
     ├─ 讀 useTabPermissions hook
     ├─ 查 workspace_features（功能開通）
     ├─ 查 authStore.permissions（職務權限）
     └─ 無權限 → 404 或 redirect

API 層檢查：
  3️⃣ 每支 API 檢查（tenants/create 例）
     ├─ 查 employee.role_id
     ├─ 查 role_tab_permissions.can_write
     └─ 無權限 → 403 Forbidden
```

#### 4. 新員工的權限到有權限的流程

```
HR 建新員工
  ↓ 分配職務（role_id = "某職務 ID"）
  ↓ 老闆修改職務權限（職務管理頁）
  ↓ 新員工登入（validate-login API）
     ├─ 查 role_id → 找職務
     ├─ 查 role_tab_permissions
     └─ 建 permissions[] 清單
  ↓ 前端儲存 authStore.permissions
  ↓ 路由層讀 useTabPermissions → 顯示模組

全流程由 role_tab_permissions SSOT 驅動
```

### 你现在真正理解的：

✅ **職務 = 一組權限設定**（包括模組、分頁、讀寫）  
✅ **員工 = 分配給某個職務**（employees.role_id）  
✅ **權限 = 職務的細節行（role_tab_permissions）**  
✅ **租戶 = 獨立的系統實例**（workspace_id 隔離所有資料）  
✅ **Admin 職務 = 全開但可調整下拉資格**  
✅ **職務模板 = 新租戶從 Corner 複製**  
✅ **權限檢查 = 3 層（驗證 → 路由 → API）**  

---

## E. 完整流程圖

### E.1 Venturo 超管建新租戶 → 員工登入 → 看到權限頁面

```
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 1: 超管建租戶                                              │
└─────────────────────────────────────────────────────────────────┘

  Venturo 超管（有租戶管理權限）
    ↓ 進 /tenants 頁
    ↓ 點「新增租戶」
    ↓ Step 1: 輸入「京遙 / JINGYAO」
    ↓ Step 2: 輸入第一個管理員「陳建宏 / E001 / password」
    ↓ Step 3: 點「建立」
      ↓ POST /api/tenants/create
      ├─1. CREATE workspaces { name: "京遙", code: "JINGYAO", ... }
      ├─2. CREATE employees { workspace_id, employee_number: "E001", ... }
      ├─3. CREATE auth.users { email, password, user_metadata }
      ├─4. UPDATE employees.supabase_user_id = auth_user_id
      ├─5. INSERT workspace_roles × 4 { 管理員, 業務, 會計, 助理 }
      ├─6. FROM CORNER SELECT role_tab_permissions
      │   → INSERT role_tab_permissions × N （新 role_id 對應）
      ├─7. INSERT workspace_features × 20+ （免費全開、付費關）
      ├─8. INSERT channels { name: "公告", ... }
      ├─9. FROM CORNER SELECT countries → INSERT × N
      └─10. setup workspace bot
    ↓ 返回 { workspace, admin, login }
    ↓ 超管複製登入資訊 → 手工告訴新老闆

┌─────────────────────────────────────────────────────────────────┐
│ PHASE 2: 租戶老闆登入 + 設定職務權限                              │
└─────────────────────────────────────────────────────────────────┘

  陳建宏（新租戶老闆）
    ↓ 登入頁輸入「JINGYAO / E001 / password」
    ↓ POST /api/auth/validate-login
      ├─ SELECT * FROM workspaces WHERE code = 'JINGYAO'
      ├─ SELECT * FROM employees WHERE workspace_id = ?, employee_number = 'E001'
      ├─ 驗證密碼
      ├─ SELECT workspace_roles WHERE id = employees.role_id（管理員）
      ├─ SELECT role_tab_permissions WHERE role_id = 管理員職務 ID
      ├─ 建 permissions[] = [ "tours:overview", "tours:orders", ..., "finance:payments", ... ]
      └─ 返回 { employee, workspace, isAdmin: true, permissions: [...] }
    ↓ authStore.setUser({ user: employee, permissions: [...], isAdmin: true })
    ↓ 進首頁（/）
      ├─ layout 檢查 isAdmin = true → 顯示所有側邊欄選項
      ├─ 可進 /hr/roles（職務管理）
      ├─ 可進 /hr（員工管理）
      └─ 可進 /tenants（租戶管理）

  陳建宏進 /hr/roles（職務管理頁）
    ↓ 左側列表選「業務」
    ↓ 右側出現權限矩陣（所有 MODULES × tabs）
    ├─ tours 模組展開 → 14 個分頁
    ├─ finance 模組展開 → 11 個分頁
    ├─ hr 模組 → 2 個分頁
    └─ ...
    ↓ 陳建宏設定業務的權限：
      ├─ tours: 可讀所有、可寫 overview / orders
      ├─ finance: 可讀 payments、不可寫
      ├─ hr: 沒有任何權限
      ├─ ...
    ↓ 點「儲存」
    ↓ PUT /api/roles/{業務職務ID}/tab-permissions
      ├─ DELETE FROM role_tab_permissions WHERE role_id = 業務職務ID
      └─ INSERT role_tab_permissions × M （陳建宏剛勾的組合）
    ↓ 前端驗證：GET /api/roles/... → 確認保存
    ↓ 完成

┌─────────────────────────────────────────────────────────────────┐
│ PHASE 3: 新員工進來 + 被分配職務 + 登入                            │
└─────────────────────────────────────────────────────────────────┘

  陳建宏（老闆）進 /hr（員工管理頁）
    ↓ 點「新增員工」
    ↓ EmployeeForm 出現
      ├─ 輸入名字、編號、聯絡方式等
      ├─ 從「職務」下拉選「業務」
      └─ 點「保存」
    ↓ POST /api/users （新增員工）
      └─ INSERT employees { workspace_id, employee_number, ..., role_id: 業務職務ID }
    ↓ 系統自動為新員工建 auth 帳戶？
       不一定。可能由 HR 後續手動建、或由員工自己改密碼
       這裡代碼不詳、假設老闆或 HR 管理

  張三（新員工 / 業務）
    ↓ 登入頁輸入「JINGYAO / E002 / password」
    ↓ POST /api/auth/validate-login
      ├─ 驗證帳密 ✓
      ├─ SELECT employees WHERE employee_number = 'E002', workspace_id = JINGYAO_ID
      ├─ role_id = 業務職務 ID（陳建宏分配的）
      ├─ SELECT role_tab_permissions WHERE role_id = 業務職務 ID
      │  返回：tours:overview / tours:orders / finance:payments （可讀）等
      ├─ 建 permissions[] = [ "tours:overview", "tours:orders", "finance:payments", ... ]
      └─ 返回 { employee, permissions: [...], isAdmin: false }
    ↓ authStore.setUser({ permissions: [...], isAdmin: false })
    ↓ 進首頁（/）
      ├─ layout 檢查 isAdmin = false → 只顯示有權限的側邊欄
      ├─ 檢查 useTabPermissions("tours", "overview") → true （有權限）
      ├─ 所以側邊欄有「旅遊團管理」→「總覽」
      ├─ 檢查 useTabPermissions("hr", "roles") → false （無權限）
      ├─ 所以側邊欄沒有「人資管理」→「職務管理」
      └─ 側邊欄最終只顯示：tours, orders, finance 的部分分頁
    ↓ 張三進 /tours/overview
      ├─ layout 檢查 useTabPermissions("tours", "overview") → true
      ├─ 頁面載入
      ├─ 所有 API 呼叫時 attach employee.id
      └─ backend RLS policy: SELECT ... WHERE workspace_id = employee.workspace_id
    ↓ 張三試圖進 /hr/roles
      ├─ layout 檢查 useTabPermissions("hr", "roles") → false
      ├─ redirect 或 404 (Unauthorized)
      └─ 看不到職務管理

┌─────────────────────────────────────────────────────────────────┐
│ PHASE 4: 陳建宏決定「業務不能改財務」→ 修改權限                   │
└─────────────────────────────────────────────────────────────────┘

  陳建宏進 /hr/roles
    ↓ 選「業務」
    ↓ 右側權限矩陣 → finance.payments 原本 可讀 + 可寫
    ↓ 陳建宏取消「可寫」 (finance.payments 改為 可讀 但 不可寫)
    ↓ 點「儲存」
    ↓ PUT /api/roles/{業務ID}/tab-permissions
      └─ 更新 role_tab_permissions { role_id: 業務ID, ..., can_write: false }
    ↓ 完成
    ↓ 張三（已登入的業務）此時還看得到「finance.payments」
       (authStore.permissions 還是舊的、client 側)
       重新登入後 → validate-login 重讀權限 → 發現沒有寫入權限
       ↓ payment 頁面的「新增」、「編輯」按鈕變灰 (can_write = false)

```

### E.2 ASCII 框圖：三角關係

```
                     workspace（租戶）
                          |
              ┌───────────┼───────────┐
              |           |           |
         workspace_roles  |    employees
         (職務表)         |    (員工表)
              |          |           |
         ┌────┴────┐     |      ┌────┴────┐
         |  ID     |     |      | ID      |
         | name    |     |      | role_id ─── 指向 workspace_roles.id
         | is_admin|     |      | workspace_id
         └────┬────┘     |      └────┬────┘
              |          |           |
              └─────────┬┘───────────┘
                        |
                   role_tab_permissions
                   (權限表)
                        |
                   ┌────┴────────┐
                   | role_id     │ → workspace_roles.id
                   | module_code │
                   | tab_code    │
                   | can_read    │
                   | can_write   │
                   └─────────────┘

核心邏輯：
  employee.role_id → 找 workspace_roles
               ↓
               找 role_tab_permissions（該職務的所有權限行）
               ↓
               建 permissions[] 清單回傳給 client

3 層檢查發生地點：
  ✓ validate-login：讀 role_tab_permissions → permissions[]
  ✓ route layout：讀 authStore.permissions → useTabPermissions hook
  ✓ API handler：再次讀 role_tab_permissions 確認（例 tenants/create）
```

---

## 最終檢查清單

你現在應該能回答：

- [ ] 「職務」表 = `workspace_roles`、員工 = `employees.role_id` → 1-to-many 關係
- [ ] 老闆建職務後、必須**手動進職務管理頁**設定權限（不是自動全開）
- [ ] `role_tab_permissions` 一次更新就是「刪舊 + 插新」（not upsert one by one）
- [ ] 新員工的 `role_id` 預設 = NULL、必須 HR 分配、或老闆在員工編輯時設定
- [ ] Admin 職務自動全開（UI 層 disabled + migration backfill）、但下拉資格可手動調
- [ ] 新租戶的職務權限**從 Corner 複製**、不是預設白開
- [ ] 租戶管理只有「有 settings.tenants.can_write」的員工能做
- [ ] 新員工登入 → validate-login 讀 role_tab_permissions → 建 permissions[] → 存 authStore
- [ ] 路由層 layout 讀 useTabPermissions hook + workspace_features 雙層檢查
- [ ] 「租戶管理」權限**硬寫在 API 層**、HR 職務管理 UI 裡沒有 `settings.tenants` tab

