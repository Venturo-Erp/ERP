# Login 路由脈絡驗證：身份來源、租戶隔離、欄位一致性檢測

**檢測日期**：2026-04-21  
**路由**：`src/app/(main)/login/page.tsx`  
**檢測範圍**：UI → API → Store → Database 四層驗證

---

## 1. 身份真相來源（SSOT）檢測

### 發現：身份來源有 2 套並存

#### 套路 A：Supabase Auth（auth.users）
- **定義位置**：Supabase 管理端 auth.users 表
- **用途**：密碼驗證、Session 管理
- **取用方式**：`supabase.auth.signInWithPassword()`

#### 套路 B：Employees Table（employees.id）
- **定義位置**：`src/types/database.types.ts` - `employees` 表，`src/types/user.types.ts` - `User` 型別
- **用途**：組織身份、組織資料（員工編號、姓名、職位、權限）
- **取用方式**：
  - Login API（validate-login）從 employees 查員工
  - Store（auth-store.ts）構建 `User` 物件

### 關鍵差異點

| 維度 | auth.users | employees |
|------|-----------|-----------|
| ID 欄位 | `user.id`（UUID） | `id`（UUID） |
| 帳號識別 | `email` | `employee_number` 或 `email` |
| 密碼儲存 | Supabase 管 | `password_hash`（DB 內） |
| 標準登入流 | `signInWithPassword()` 後取 user.id | employees 查詢、密碼驗證、回傳 employee.id |

### 同步狀態
**橋接欄位**：`employees.supabase_user_id`
- Login 流程：employees → 取得 supabase_user_id → auth.signInWithPassword() → 回傳 employee 物件
- 前端儲存：Store 裡的 `user.id` 來自 `employee.id`，不是 `auth.users.id`
- 後續 RLS 過濾：用 `employees.supabase_user_id` 判斷帳號擁有權，不用 `employee.id`

### 風險評估：**低 → 中（設計合理但要求同步持續穩定）**
- ✅ 前端 currentUser?.id 確實來自 employees（store 在 setUser 時傳 employee.id）
- ✅ 審計欄位 FK 一律指 employees.id（符合 CLAUDE.md 紅線）
- ⚠️ **假設破裂點**：如果 supabase_user_id 沒同步或被刪除、RLS 可能卡住，但 auth-sync.ts 有修復邏輯

**結論**：身份有兩套（auth vs employee），但同步透過 supabase_user_id 一致，方向單一。

---

## 2. 租戶隔離（RLS）檢測

### 登入後租戶資訊流

**Step 1：UI 蒐集**  
```tsx
// login/page.tsx line 67
const result = await validateLogin(username.trim(), password, trimmedCode, rememberMe)
// code = workspace 代碼（例如 "TP"）
```

**Step 2：API 驗證租戶**  
```
validate-login/route.ts:
  1. 查 workspaces 表，code 大小寫不敏感 (line 25)
  2. 查 employees，eq('workspace_id', workspace.id) (line 47)
  3. 回傳 { employee, workspaceId, workspaceCode, ... }
```

**Step 3：Store 儲存**  
```typescript
// auth-store.ts line 85
workspace_id: employeeData.workspace_id
workspace_code: workspaceInfo.code
```

**Step 4：後續查詢過濾**  
```typescript
// workspace-filter.ts line 103
// 所有查詢強制 eq('workspace_id', user.workspace_id)
return user.workspace_id || null
```

### 租戶隔離風險評估：**中（有但不致命）**

#### 已查證的隔離點
- ✅ 登入後 workspace_id 正確存入 Store（employee.workspace_id）
- ✅ 後續查詢用 getWorkspaceFilterForQuery() 自動帶 workspace 過濾
- ✅ Admin 無法跨 workspace（line 99-100 明確停用）

#### 隔離缺口
- ⚠️ **localStorage 污染風險**：
  - LAST_CODE_KEY、LAST_USERNAME_KEY 存在 localStorage（line 12-13）
  - 如果多使用者共用瀏覽器、前一個使用者的代碼會被新使用者看到
  - 但登入時會覆蓋，不會造成跨租戶查詢
  
- ⚠️ **Session 恢復時租戶沒重新驗證**：
  - auth-guard.tsx 用 localStorage 的 auth-storage 恢復 user（line 146-150）
  - 沒有重新確認 user.workspace_id 是否仍然有效（e.g., 該租戶已被刪除）
  - 假設：workspace_id 在 session 有效期內不變

#### 風險等級細化
- **登入流**：RLS 穩定
- **Session 恢復**：假設 workspace_id 不變，若租戶被刪除資料會 404 但不會看到別人資料

**結論**：租戶過濾**結構上正確**，localStorage 污染風險**低但存在**、Session 恢復無重驗證**假設合理但脆弱**。

---

## 3. 欄位名一致性（三層對齐）

### 登入相關欄位追蹤

#### 欄位 A：帳號
| 層級 | 欄位名 | 備註 |
|------|--------|------|
| UI | `username`（state） | input 的 value |
| API | `employee_number` / `email`（ilike 查詢） | 支援兩種 |
| DB | `employees.employee_number` / `employees.email` | CHAR / VARCHAR |
| Store | **欄位缺失** | User 型別沒存帳號 |

**問題**：Store 裡無「帳號」欄位，只有 `employee_number` 和 `email` 都有。UI 重新登入時需要手動輸入，無法從 Store 取得。

---

#### 欄位 B：密碼
| 層級 | 欄位名 | 備註 |
|------|--------|------|
| UI | `password`（state） | input 的 value |
| API | 驗證時 `password`、DB 存 `password_hash` | 一進 API 就只查 hash |
| DB | `employees.password_hash` | Bcrypt |
| Store | **無** | User 型別無 password_hash |

**設計**：正確，密碼不應存在 Store。

---

#### 欄位 C：「記住我 30 天」
| 層級 | 欄位名 | 實裝位置 |
|------|--------|--------|
| UI | `rememberMe`（checkbox state） | login/page.tsx line 20 |
| API | `rememberMe` 參數 | validate-login/route.ts 無接收（！） |
| DB | **不存在** | employees / auth.users 表都無此欄 |
| Store | **無** | User 型別無 remember_expires_at / remember_token |

**發現**：
1. UI 勾選「記住我（30 天內免重新登入）」
2. 傳給 validateLogin()（auth-store.ts line 67）
3. validateLogin() 接收參數但 **沒有使用**（line 168 有參數、但函數體內沒用到 rememberMe）
4. API 也沒接收（validate-login/route.ts 無 rememberMe 參數）
5. 資料庫無相應欄位
6. **結論**：**欄位名三層不一致、更嚴重的是該功能根本未實裝**

---

## 4. 總結表

| 檢測項 | 狀態 | 風險 | 備註 |
|--------|------|------|------|
| **身份真相 SSOT** | 2 套並存但同步 | 低→中 | auth.users ↔ employees via supabase_user_id |
| **登入租戶過濾** | 結構正確 | 中（隱患） | localStorage 污染、Session 恢復無重驗 |
| **帳號欄位一致** | 散 | 中 | employee_number vs email 支援但 Store 無統一 |
| **密碼欄位一致** | 正確 | 低 | 不應在 Store，設計妥當 |
| **記住我實裝** | **未實裝** | **高** | UI 勾選但 API/DB/Store 全無 |

---

## 5. 欄位名一致性細節：記住我

**期望行為**（UX 文案）：勾選「記住我（30 天內免重新登入）」→ 30 天內回訪無需再輸密碼

**實際狀況**：
- ❌ UI 有 checkbox、label 文案清楚
- ❌ rememberMe 參數傳到 validateLogin()，但沒用
- ❌ validate-login API 無接收此參數
- ❌ 無 remember_token / remember_expires_at 欄位
- ❌ Store 無此資訊
- ❌ 30 天 session 延期邏輯不存在

**目前實裝的替代機制**：Zustand persist（line 306）+ Supabase Session（自動管理）
- Zustand 把 user / isAuthenticated / isAdmin 存 localStorage（auth-storage）
- 下次訪問 AuthGuard 從 localStorage 恢復（不重新登入）
- 但無明確的「30 天過期」邏輯、靠 Supabase session 自動過期

**欄位名混亂度**：
- 勾選了「30 天」但無欄位對應
- rememberMe state ≠ API 參數 ≠ DB 欄位 ≠ Store 屬性
- **名字叫 rememberMe，但實際是 Zustand persist（全自動、無時限）**

---

## 簽名

檢測完成時間：2026-04-21  
檢測 Agent：B（身份真相 / 租戶隔離 / 欄位一致性）  
涉及檔案：12 個 （login/page.tsx、auth-store.ts、validate-login/route.ts、auth-sync.ts、workspace-filter.ts、auth-guard.tsx、user.types.ts、database.types.ts）
