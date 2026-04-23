# Agent C：HR 邏輯重複 + 必抓 Pattern

**驗證日期**：2026-04-22

---

## 🔴 重大風險：Role-gate vs Permission-gate 混用

### 問題所在

**位置**：
- `src/lib/permissions/hooks.ts` (L284, L294)
- `src/lib/permissions/useTabPermissions.tsx` (L80, L97, L113, L122)

**代碼**：
```typescript
// usePermissions() 中
canAccess(): return isAdmin ? true : (檢查 role_tab_permissions)
canEdit(): return isAdmin ? true : (檢查 role_tab_permissions)

// useTabPermissions() 中
canRead(): return isAdmin ? true : (查詢 DB)
canWrite(): return isAdmin ? true : (查詢 DB)
```

**問題**：
- 系統主管 flag 一開、細粒度權限全部繞過
- `role_tab_permissions` 表定義的「業務職務有哪些權限」完全失效
- 只要員工被標 isAdmin=true，DB 裡的權限設定就無效

### 後果

1. **職務系統形同虛設** — William 在 `/hr/roles` 定義的權限矩陣，對系統主管無效
2. **違反「權限長在人身上」原則**（/login 驗證時發現的原則 1）
3. **無法實現「系統主管職務」的真實含義** — 應該是「被分配到系統主管職務的員工有全部權限」，而不是「isAdmin flag 全開」

### 對比：API 層正確做法

`src/app/api/permissions/check/route.ts` ✅ 沒有 isAdmin 短路，而是真實查 role_tab_permissions。

**矛盾**：前端和 API 層的邏輯不一致。

---

## 🟡 UI 寫了但後端沒對應：部分案例

### `/hr/roles` 頁面的權限 UI

**現象**：
- UI 完整：46 個模組 × 多個 tab 的 can_read / can_write toggle
- 能 POST 到 API：`PUT /api/roles/{roleId}/tab-permissions`

**但**：
因為前端 `useTabPermissions()` 有 isAdmin 短路，實際運作時：
- 員工 A 被標 isAdmin=true
- William 在 UI 上把「業務」職務的「tours」權限改成「無讀寫」
- 員工 A 登入仍然能用 tours（因為 isAdmin=true 被短路了）

→ **UI 設定本身無意義**（只對沒有系統主管資格 員工生效）

---

## 🟡 歷史遺留：兩套權限系統共存

### 舊系統（字符陣列，已棄用但還在）

```typescript
// employees 表仍有
roles: ['admin']  // 陣列格式
permissions: ['*', 'tours', 'finance', …]
```

位置：`src/lib/permissions/index.ts` L22-37（SYSTEM_PERMISSIONS、FEATURE_PERMISSIONS）

### 新系統（模組 × 分頁二維表）

```typescript
workspace_roles → role_tab_permissions（模組 × tab × can_read/can_write）
```

### 相容層疊加

`src/lib/permissions/index.ts` 的 `hasPermissionForRoute()` 函數同時處理兩種格式。

**風險**：
- parsePermissions() / toPermissionsArray() 轉換邏輯複雜（L103-147）
- 容易出現「設定的新系統權限沒同步進舊系統」

**@deprecated 標記**：L305 有註釋 `isAdmin // @deprecated 向下相容`，表示 isAdmin 本來就是過時設計。

---

## ✅ 正確做的地方

1. `/api/permissions/check` — API 層不用 isAdmin 短路，正確查 role_tab_permissions
2. `/api/roles/[roleId]` — 刪除 系統主管職務時有檢查
3. RLS 層面 — 表上有 RLS policy

---

## 三個必抓 Pattern 總結

| Pattern | 發現 | 位置 | 嚴重度 |
|---------|------|------|--------|
| **Role-gate vs Permission-gate** | isAdmin 短路 | usePermissions / useTabPermissions | 🔴 CRITICAL |
| **UI 假功能** | 權限 UI 因 isAdmin 短路形同虛設 | /hr/roles 頁面 | 🟡 MEDIUM |
| **歷史遺留** | 舊的字符陣列權限系統還活著 | employees.roles / permissions | 🟡 MEDIUM |

---

## 根本建議

**刪除 isAdmin 短路**，改用「系統主管職務」概念：
- 員工被分配到「系統主管」職務 → 從 workspace_roles 查到有全部 can_read=true, can_write=true
- 不需要代碼層的特殊處理（if isAdmin return true）
- 這樣才能實現「職務是身份卡」的原則
