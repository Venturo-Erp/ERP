# Agent F：/login 的 DB Schema 真相對照

**檔案生成**：2026-04-22
**驗證對象**：`/login` 路由的 DB 層架構 + RLS policy + trigger + 隱藏邏輯

---

## 涉及的 Table

| Table | RLS 狀態 | FORCE RLS | 關連度 | 備註 |
|---|---|---|---|---|
| `workspaces` | enabled | NO FORCE ✓ | 直接 | Login 時查 workspace code、驗證租戶隔離 |
| `employees` | enabled | 不適用 | 直接 | 身份驗證、存放 login 識別符 |
| `workspace_roles` | enabled | 不適用 | 間接 | 登入後權限載入 |
| `employee_permission_overrides` | enabled | NO FORCE | 間接 | Permission 系統、login.md 未提 |
| `employee_route_overrides` | enabled | NO FORCE | 間接 | Route 級權限、login.md 未提 |
| `workspace_job_roles` | enabled | 不適用 | 孤兒 | login.md 提到「職務系統並存」、這表未在 login 時用 |

---

## 發現（按嚴重度排）

### 🔴 1. workspaces 表 RLS Policy 允許任何人讀 workspace code（只有登入後才受限）

**DB 真相**（DB_TRUTH.md workspaces 章節）：
```sql
workspaces_select — SELECT (roles: {public})
  USING: (id = get_current_user_workspace())
```

**現象**：
- Policy 用 `get_current_user_workspace()` 取 auth.uid() 的 workspace_id
- 但 **SELECT 只防讀 workspace 記錄本身**
- 登入前（unauthenticated），`auth.uid()` = NULL
- `get_current_user_workspace()` 對 NULL auth.uid() 回傳什麼？**DB_TRUTH 沒寫函數內容**、但從 login.md 現況「正確查 workspace code」推測是**允許讀全部 workspace**

**跟 UI 的落差**：
- login.md 說「登入時正確查 workspace code」✓ 實際會過
- 但沒提「unauthenticated user 能列舉所有 workspace code」（側信息洩露、不致命但 privacy 瑕疵）

**為什麼重要**：
- 攻擊者能用 login 頁的輸入欄位試出所有可用 workspace code
- 這不是登入驗證失敗、是「尋找 workspace 的過程太暴露」

**CLAUDE.md 合規性**：
- CLAUDE.md 紅線：「workspaces FORCE RLS 必須關」✓ 目前 NO FORCE
- 但沒禁止「unauthenticated 可讀 workspace 列表」

---

### 🔴 2. employees 表在登入時讀 supabase_user_id 但 policy 沒檢查租戶隔離（用 workspace_id 比對）

**DB 真相**（DB_TRUTH.md employees 章節）：
```sql
employees_select — SELECT (roles: {public})
  USING: ((workspace_id)::text = (get_current_user_workspace())::text)
```

**現象**：
- Login API 會查 employees 表找 `supabase_user_id = auth.uid()` 的記錄
- 登入時 auth.uid() 已設（Supabase Auth 完成）
- `get_current_user_workspace()` 對這個 auth.uid() 查 employees 表**求其 workspace_id**
- 邏輯循環：「查 employees 來確認 workspace」vs「用 workspace 限制 employees query」

**跟 UI 的落差**：
- login.md 說「後續 query 自動帶 workspace_id 過濾」✓
- 但沒提 login 當下本身是個「先雞生蛋蛋生雞」的 moment
  - API 無法提前知道 workspace_id（還在查中）
  - 所以 policy 裡 `get_current_user_workspace()` **必須能在 NULL workspace context 下工作**

**為什麼重要**：
- 這表 `get_current_user_workspace()` 函數有「bootstrapping」邏輯
- 如果該函數寫得不對、可能登入時看到別 workspace 的員工資料
- DB_TRUTH 沒列出該函數源碼、無法驗證

---

### 🟡 3. employee_permission_overrides / employee_route_overrides 兩表 RLS Policy 設 `USING: true`（全開）

**DB 真相**（DB_TRUTH.md 兩表章節）：
```sql
employee_permission_overrides_select — SELECT (roles: {public})
  USING: true

employee_route_overrides — 分為兩 policy：
  - employees_read_own_overrides: (employee_id = auth.uid() OR ...)
  - service_role_manage_overrides: (auth.role() = 'service_role')
```

**現象**：
- `employee_permission_overrides` 任何登入用戶都能讀所有 override
- `employee_route_overrides` 有適當的 policy（用戶只能讀自己的 + service_role 全開）
- 矛盾：兩張表概念相同、policy 強度不一

**跟 UI 的落差**：
- login.md 完全沒提這兩張表（不屬於「登入本身」但會在登入後載入權限時用到）
- UI 聲稱「權限長在人身上」，但登入後若一起 batch load 這兩表，會洩露所有人的 override

**為什麼重要**：
- 登入後權限載入流程（auth-store.ts）是否會一起打包這兩表？
- 如果會、就違反租戶隔離
- login.md 沒提、無法驗證這個 query 有沒有做

---

### 🟡 4. 28 張表（包含登入後即時用到的 tour_itinerary_items）設 FORCE RLS，但 policy 無 service_role 例外

**DB 真相**（引 WAVE_2_5_RLS_ANALYSIS.md）：
```
tour_itinerary_items（行程核心表、dashboard 和團務頁面要讀）
confirmations（確認單）
files / folders（附件系統）
visas（簽證）
... 等 28 張
```

所有 policy 都是：
```sql
USING: (workspace_id = get_current_user_workspace())
```

沒有：
```sql
USING: (workspace_id = get_current_user_workspace()) OR (auth.role() = 'service_role')
```

**現象**：
- 這 28 張表若被 API route 用 admin client 查（e.g. 登入後同步用戶狀態），會被 RLS 擋
- 症狀：404 或空結果（資料明明存在）
- 登入時不會馬上爆（login API 本身沒直接讀這些表），但登入後首頁 dashboard 載入就會

**跟 UI 的落差**：
- login.md 說登入成功後「重導」，沒提登入後**首頁數據加載**要從這些表讀
- 實際上用戶登入完、看不到任何團務資訊，會以為登入失敗

**為什麼重要**：
- 登入驗證本身可能過、但登入**後驗証**會爆
- 這是 4-20 workspaces bug 同類問題、已識別但未修復
- 計劃中（WAVE_2_5）但等 William 授權

---

### 🟡 5. employees 表欄位 login 識別方式複雜：employee_number vs email vs supabase_user_id，三層對應不明

**DB 真相**（DB_TRUTH.md employees 章節）：
```sql
employee_number    text     — login UI 用的「帳號」
email              text     — 也可以當帳號
supabase_user_id   uuid     — 橋接 auth.users 密碼表
user_id            uuid     — 註： user_id 也存在但類型同、用途不同
```

**現象**：
- login.md 說「帳號（員工編號或 email）」
- DB 實際存了三個識別符
- API validate-login 流程：
  1. Supabase Auth 驗密（用 auth.users 的 email / phone）
  2. 成功後拿 auth.uid()
  3. 在 employees 查 `supabase_user_id = auth.uid()`
  4. 拿到 employee_number + email

**落差**：
- UI 欄位叫「帳號」、但不清楚收的是 employee_number 還是 email
- 若改成只接 employee_number、舊用 email 登入的 user 會被拒
- 若改成只接 email、某些 employee_number 重複的情況會有麻煩

**為什麼重要**：
- 這是「欄位三層不一致」問題（登入頁 / API / DB）
- login.md 提過但沒追蹤到底
- CLAUDE.md 也沒明確規範「employee_number 是全局唯一還是每 workspace 唯一」

---

### 🟢 6. Trigger `trigger_auto_set_workspace_id` 在 employees INSERT 時自動填 workspace_id，但登入驗證流程未提

**DB 真相**（DB_TRUTH.md employees 表 Triggers 欄）：
```
trigger_auto_set_workspace_id — BEFORE INSERT
```

**現象**：
- 新員工建檔時、若 workspace_id 沒傳、trigger 自動從 auth context 取 `get_current_user_workspace()`
- 登入後權限系統若要建帳號，會觸發這個 trigger
- 但 login.md 沒提「登入時會不會新增 employees 記錄」

**為什麼重要**：
- 如果 login 時碰到「auth.users 有、employees 沒有」的邊界情況，trigger 會救場
- 否則登入會空結果
- 這是隱形的「自動修復」，UI 層看不到，但很重要

---

### 🟢 7. workspaces 表的多個 audit / setup 欄位（created_by、updated_by、setup_state），但 login 時只關心 code + id

**DB 真相**（DB_TRUTH.md workspaces 章節）：
```
created_by         uuid     REFERENCES employees(id)
updated_by         uuid     REFERENCES employees(id)
setup_state        jsonb    — 記錄初始化狀態
_needs_sync        boolean
_synced_at         timestamp
_deleted           boolean
```

**現象**：
- workspaces 表很複雜，但 login 驗證流程只用 `code` 和 `id`
- 其他欄位是給「租戶管理 / 後台」用，login 忽視它們

**為什麼重要**：
- login.md 沒提這些欄位存在
- 但 DB 真相顯示 setup_state 有初始化檢查（`"has_employees": false`）
- 若登入 API 不檢查 `is_active` 或 setup_state，可能讓未初始化的租戶登入成功、之後操作爆炸

---

## 跟既有 login.md 結論的關係

### 補充了哪幾條

1. **RLS policy 的 unauthenticated 邊界** — login.md 說「正確查 workspace code」，但沒提該查詢在登入前是否能列舉
2. **28 張表 FORCE RLS bug** — 登入後首頁會爆、不是登入驗證爆
3. **employee_permission_overrides RLS 全開** — 權限系統的隱形洩露
4. **trigger_auto_set_workspace_id 救場邏輯** — 登入邊界的自動修復

### 矛盾了哪幾條

**無直接矛盾**（login.md 沒涵蓋的層級、不是對立、是補集）

---

## 推薦進 _INDEX 的 DB 層跨路由 Pattern（若有）

### 1. 「Unauthenticated RLS policy 設計困境」

**Pattern 名稱**：`unauthenticated-rls-bootstrap`

**描述**：
- 登入前需要查 workspace code 確認租戶存在（允許 unauthenticated）
- 但登入後 RLS 應該限制只看自己的租戶
- 解：用兩層查詢
  - 前置查（unauthenticated）：`SELECT id, code FROM workspaces` 無 RLS
  - 後置查（authenticated）：用 RLS policy 限制

**已命中的路由**：`/login`

**可能也中的路由**：`/public/*`、`/invite/*`（邀請 link）

---

### 2. 「FORCE RLS + service_role 衝突」

**Pattern 名稱**：`force-rls-service-role-conflict`

**描述**：
- FORCE RLS 讓 service_role（admin client）也受 policy 管
- Policy 內用 `get_current_user_workspace()` 但 service_role 沒 auth.uid()
- 結果：API 查詢回空

**已命中的路由**：`/login`（28 張表的登入後首頁爆）、`/dashboard`、`/tours/*`

**建議修法**：全 28 張 NO FORCE（WAVE_2_5 方案 A）

---

### 3. 「欄位識別符多重定義」

**Pattern 名稱**：`multi-identifier-ambiguity`

**描述**：
- `employee_number` vs `email` vs `supabase_user_id` 三層對應
- UI 層不清楚收哪一個
- DB 層三個都存

**已命中的路由**：`/login`、`/hr/*`（新增員工頁）

**建議修法**：明確定義登入時「帳號欄位 = employee_number」（只接這個），email 是 Supabase Auth 層的事

---
