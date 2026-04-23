# Agent A：HR 代碼現況分析

**驗證日期**：2026-04-22  
**路由**：`/hr` + `/hr/roles` + 相關 API

---

## 代碼現況速覽

### `/hr` 首頁（員工列表）
- 展示在職員工列表（篩選：status != terminated、employee_type != bot）
- 表格欄位：員工編號、姓名、**職務名稱**（從 workspace_roles 查詢）、聯絡、狀態、到職日期
- 右上「新增員工」按鈕開新增對話框（EmployeeForm）
- 點行列可編輯（同樣用 EmployeeForm）

### `/hr/roles` 頁面（職務 + 權限管理）
- **左側面板**：職務列表（useRoles hook 取資料）；新增按鈕開 Dialog
- **右側面板**：選中職務後展開權限矩陣
  - 46 個模組（calendar, workspace, todos, tours, orders, finance, accounting, hr…）
  - 每模組多個分頁（tab）
  - 每 tab 有 can_read / can_write toggle
  - 系統主管職務的權限鎖死全開（禁用 toggle）

### 職務權限儲存與呈現
- **定義來源**：`src/lib/permissions/module-tabs.ts` 硬編陣列（46 個模組 + N 個 tab）
- **DB 表**：`role_tab_permissions`（role_id, module_code, tab_code, can_read, can_write）
- **呈現**：/hr/roles 頁面逐模組展開，勾選 can_read/can_write 後 PUT 到 API

### 新增/編輯職務流程
**新增職務**：
- Dialog 輸入 name、description
- POST `/api/roles` → 自動遞增 sort_order、is_admin=false

**編輯職務權限**：
- 選職務 → 勾權限 → 按「儲存」
- PUT `/api/roles/{roleId}/tab-permissions`，body: {permissions: [{module_code, tab_code, can_read, can_write}…]}
- 後端先刪舊權限、再插新的

### 員工職務分配
- 員工表頂層欄位：`role_id`（指向 workspace_roles.id）
- 新增員工時 EmployeeForm 必須選擇職務
- 讀取時：優先讀 role_id、fallback job_info.role_id（過渡期相容）
- 員工登入後 useTabPermissions 自動 fetch `/api/users/{userId}/role` 取職務、再取權限

---

## 核心關係圖

```
職務定義（workspace_roles）
  ├─ 屬性：name, is_admin, sort_order
  └─ 權限關聯：role_tab_permissions

↓ 員工繼承

員工（employees.role_id）
  └─ 登入時 → fetch 職務 → fetch 職務權限 → 簽入 JWT

↓ 系統檢查

每個路由在運行時
  └─ useTabPermissions → 查 JWT 中的 role_id → 檢查 can_read/can_write
```

---

## 總結

**架構清晰**：職務 → 職務有哪些權限 → 員工繼承職務的權限的流程正確實現。

**缺口**：見 Agent C + D 的發現（isAdmin 短路、員工能自改職務等）。

**技術債**：見 Agent B（孤兒表 workspace_job_roles）。
