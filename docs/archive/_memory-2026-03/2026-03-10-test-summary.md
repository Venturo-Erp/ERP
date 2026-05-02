# 2026-03-10 測試總結

## 🎯 核心發現

### 問題根源：建立租戶時沒有設定 permissions

**SUCCESS 公司 E001（舊流程）**：

```json
{
  "roles": ["admin"],
  "permissions": [] // ❌ 空的！
}
```

**CORNER 公司 E001（參考）**：

```json
{
  "roles": ["super_admin", "sales", "assistant"],
  "permissions": ["*", "todos", "payments", "requests", ...]  // ✅ 完整
}
```

**TEST 公司 E001（新流程）**：

```json
{
  "roles": ["admin"],
  "permissions": [
    "*",
    "todos",
    "payments",
    "requests",
    "visas",
    "calendar",
    "workspace",
    "quotes",
    "tours",
    "orders",
    "customers",
    "hr"
  ] // ✅ 已修復
}
```

---

## ✅ 已完成修復

### 1. 修復 `/api/tenants/create`

**檔案**：`src/app/api/tenants/create/route.ts`

**修改內容**：

```typescript
// 建立管理員時設定完整 permissions
const { data: employee, error: empError } = await supabaseAdmin.from('employees').insert({
  workspace_id: workspace.id,
  employee_number: adminEmployeeNumber,
  chinese_name: adminName,
  display_name: adminName,
  email: adminEmail.toLowerCase(),
  roles: ['admin'],
  permissions: [
    '*',
    'todos',
    'payments',
    'requests',
    'visas',
    'calendar',
    'workspace',
    'quotes',
    'tours',
    'orders',
    'customers',
    'hr',
  ], // ← 新增
  is_active: true,
})
```

### 2. 建立測試租戶（TEST）

- 公司：測試旅行社
- 代號：TEST
- 管理員：E001 / admin@test.com / 12345678
- ✅ 有完整 permissions

### 3. 修復 SUCCESS 公司權限（手動）

已更新 E001@success 的 permissions 為完整權限

---

## 🔧 其他成果

### 欄位清理

- ✅ 刪除 `tours.op_staff_id`（完全未使用）
- ✅ 刪除 `employees.last_login_at`（使用率極低）
- ✅ 掃描其他核心表格（customers, suppliers, payments, quotes）— 全部健康

### Workflow 設計

- ✅ 完成「開發 → 出錯 → 測試」工作流設計
- 📄 文檔：`memory/2026-03-10-workflow-design.md` (6KB)

---

## ⚠️ 待解決問題

### HR「新增員工」按鈕仍然失效

**測試狀況**：

- ❌ SUCCESS 公司（已修復權限）— 按鈕無反應
- ❌ TEST 公司（待測試）— 登入後發現還是 SUCCESS session
- ✅ CORNER 公司（William 的）— 按鈕正常運作

**下一步**：

1. 登出 SUCCESS
2. 登入 TEST
3. 測試「新增員工」按鈕
4. 如果還失效 → 深入 debug 前端代碼

---

## 📚 知識記錄

### 教訓 1：建立租戶要設定 permissions

**問題**：只設定 roles 不夠，前端可能檢查 permissions 陣列

**解決方案**：建立管理員時同時設定：

- `roles`: ['admin']
- `permissions`: ['*', ...完整權限列表]

### 教訓 2：測試要用正確的租戶

**問題**：瀏覽器記住 SUCCESS session，以為登入 TEST 其實還在 SUCCESS

**解決方案**：確認 Console 的登入訊息，確保登入正確租戶

### 教訓 3：過度診斷浪費時間

**問題**：花 2 小時研究 hydration mismatch，真正原因只是殘留進程

**解決方案**：

1. 先檢查系統狀態（進程、port）
2. 清理 → 重啟
3. 如果還有問題，才檢查代碼

---

## 🕐 時間記錄

- 06:48-07:05：測試 + 診斷權限問題 + 建立 TEST 公司

---

_建立者：馬修 🔧_  
_狀態：測試中_
