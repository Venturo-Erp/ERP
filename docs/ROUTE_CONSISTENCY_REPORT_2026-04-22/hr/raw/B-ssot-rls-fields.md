# Agent B：HR SSOT / RLS / 欄位一致性

**驗證日期**：2026-04-22

---

## 🔴 高嚴重度

### 1. 兩套職務概念並存 — SSOT 破碎

**問題**：
- `workspace_roles`：權限系統用（id, name, is_admin, sort_order）
- `workspace_job_roles`：曾想用的「選人標籤」系統（id, name, sort_order）
- 同一個「職務」概念、兩個表、定義不同

**影響**：
- API 層有 `/api/roles`（workspace_roles）和 `/api/job-roles`（workspace_job_roles）
- 建團時「選業務」用的 selector_field_roles 指向 workspace_roles
- 但 `/api/job-roles` 無人呼叫，形成孤兒端點
- 同一名稱「業務」可能在兩個表各存一份、ID 不同

**根本原因**：過渡期設計，有兩套系統但最終只用了一套（workspace_roles）。

**建議修復優先級**：P1（清理 workspace_job_roles 表和 /api/job-roles 端點）

---

### 2. RLS 政策不一致

**問題**：
- `workspace_selector_fields`：✅ 有 RLS policy（FORCE ROW LEVEL SECURITY）
- `selector_field_roles`：✅ 透過 workspace_selector_fields 間接過濾
- `workspace_job_roles`：❌ **無 RLS policy**（現在用 USING (true)，形同虛設）

**影響**：
- API 層有補救（明確 eq('workspace_id', workspaceId)）
- 但 DB 政策與實際脫節，如果繞過 API 直接查表會漏租戶隔離

**建議修復優先級**：P2（補 RLS policy，但 API 層已防守）

---

## 🟡 中嚴重度

### 3. API ↔ UI 欄位名不一致

**問題**：
```
EmployeeForm：
  - 讀進 roles state（型別 Role interface）
  - 顯示 role.name、存 role.id

API /api/roles：
  - 返 { id, name, description, is_admin, sort_order, workspace_id, … }

API /api/job-roles：
  - 返 { id, name, sort_order, created_at }

TeamSettingsTab：
  - 同時用兩個 API、但邏輯混亂
  - L74：fetch('/api/roles') ← 註釋說要的是 workspace_job_roles，但實際查的是 workspace_roles
```

**影響**：
- UI state 變數名過度簡化（兩個概念都叫 roles、都叫 name）
- 前端開發容易搞混

**建議修復優先級**：P2（改變數名稱使其明確，例如 rolePermissions vs jobRoles）

---

### 4. 欄位名過度簡化造成歧義

同一個 `.name`、三種意思：
1. 權限角色名稱（workspace_roles.name）— 「業務」、「會計」
2. 選人標籤名稱（workspace_job_roles.name）— 「業務」（但可能不同）
3. 員工職位名稱（employees.job_title）— 「副總」、「資深業務」

無法區分、容易搞混。

---

### 5. API 層欄位洩露

- GET /api/roles 和 /api/job-roles 都返 workspace_id
- 前端無須知道租戶 ID（安全性考量）

**建議修復優先級**：P3（低優先，移除返回值中的 workspace_id）

---

### 6. POST 寫入時欄位驗證缺失

- POST /api/roles：無驗證 description（允許 null）
- POST /api/job-roles：只取 name、無 description
- DELETE /api/job-roles：無檢查「此職務有員工在用」

**建議修復優先級**：P3

---

## 🟢 低嚴重度

### 7. SWR 快取不同步

- EmployeeForm 用 `useWorkspaceRoles()` hook（SWR 快取）
- TeamSettingsTab 用 `fetch('/api/roles')`（無快取）
- 新增職務後，TeamSettingsTab 不自動更新（需手動 refresh）

**建議修復優先級**：P3（統一用 SWR 或都用 fetch）

---

## 修復建議清單（優先序）

| P | 項目 | 影響 | 工作量 |
|---|---|---|---|
| **P0** | 統一職務源：刪 workspace_job_roles、只用 workspace_roles | SSOT 破碎 | 中 |
| **P1** | 補 workspace_job_roles RLS policy（或刪表） | 租戶隔離 | 小 |
| **P2** | API 欄位名標準化、UI 變數名明確化 | 開發穩定度 | 小 |
| **P3** | 移除 API 返回 workspace_id、統一 SWR 快取 | 安全 + 體驗 | 小 |

---

## 核心結論

職務管理的 SSOT 破碎於「兩套系統並存」。建議上線前確認：保留哪一套（workspace_roles？）、另一套是否真的不用（可歸檔）。
