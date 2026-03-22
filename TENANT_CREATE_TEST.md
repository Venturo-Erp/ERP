# 租戶建立功能測試清單

## 前置條件

- [x] 用 Corner 的 super_admin 帳號登入（William / Carson）
- [x] 確認 GitHub Actions 部署完成

## 測試步驟

### 1. 進入租戶管理頁面

- URL: `/tenants` 或從側邊欄選擇

### 2. 點擊「新增租戶」按鈕

### 3. Step 1: 填寫公司資訊

- 公司名稱: `測試旅行社`
- 公司代號: `TESTTRAVEL` (必須大寫英文字母)
- 公司類型: `旅行社`
- 點擊「下一步」

### 4. Step 2: 填寫管理員資訊

- 員工編號: `E001` (預設值)
- 管理員姓名: `王小明`
- Email: `test-admin@example.com`
- 密碼: `12345678` (預設值)
- 點擊「建立」

### 5. Step 3: 檢查登入資訊

應該顯示：

- 公司代號: TESTTRAVEL
- 員工編號: E001
- Email: test-admin@example.com
- 密碼: 12345678
- 點擊「複製全部」可以複製所有登入資訊

### 6. 驗證建立成功

#### 6.1 檢查 Supabase (workspaces 表)

```sql
SELECT * FROM workspaces WHERE code = 'TESTTRAVEL';
```

應該有一筆記錄。

#### 6.2 檢查 employees 表

```sql
SELECT * FROM employees WHERE workspace_id = (
  SELECT id FROM workspaces WHERE code = 'TESTTRAVEL'
);
```

應該有一筆 E001 的管理員記錄，且 `supabase_user_id` 不為 null。

#### 6.3 檢查 profiles 表

```sql
SELECT * FROM profiles WHERE workspace_id = (
  SELECT id FROM workspaces WHERE code = 'TESTTRAVEL'
);
```

應該有一筆 profile 記錄。

#### 6.4 檢查 channels 表（公告頻道）

```sql
SELECT * FROM channels WHERE workspace_id = (
  SELECT id FROM workspaces WHERE code = 'TESTTRAVEL'
);
```

應該有一個「公告」頻道。

#### 6.5 檢查 auth.users

```sql
SELECT * FROM auth.users WHERE email = 'test-admin@example.com';
```

應該有一筆 auth 用戶記錄。

### 7. 測試登入

- 登出當前帳號
- 用以下資訊登入：
  - 公司代號: TESTTRAVEL
  - 員工編號: E001
  - 密碼: 12345678
- 應該可以成功登入

### 8. 檢查基礎資料

登入後檢查：

- 國家列表是否有資料
- 城市列表是否有資料
- 公告頻道是否存在

## 預期錯誤測試

### 錯誤 1: 公司代號重複

- 輸入已存在的公司代號
- 應顯示：「公司代號已存在」

### 錯誤 2: 公司代號格式錯誤

- 輸入小寫或包含數字: `test123`
- 應顯示：「公司代號必須為大寫英文字母」

### 錯誤 3: 必填欄位缺失

- 不填公司名稱或管理員姓名
- 「下一步」/「建立」按鈕應該 disabled

### 錯誤 4: Email 格式錯誤

- 輸入無效的 email: `test@`
- 「建立」按鈕應該 disabled

### 錯誤 5: 非 Corner super_admin 測試

- 用其他公司的管理員帳號登入
- 應該看不到「新增租戶」按鈕
- 或者點擊後顯示：「只有 Corner 的 super_admin 可以建立租戶」

## API 端點

### POST /api/tenants/create

**請求範例**:

```json
{
  "workspaceName": "測試旅行社",
  "workspaceCode": "TESTTRAVEL",
  "workspaceType": "travel_agency",
  "adminEmployeeNumber": "E001",
  "adminName": "王小明",
  "adminEmail": "test-admin@example.com",
  "adminPassword": "12345678"
}
```

**成功回應**:

```json
{
  "success": true,
  "data": {
    "workspace": {
      "id": "xxx",
      "code": "TESTTRAVEL",
      "name": "測試旅行社"
    },
    "admin": {
      "employee_id": "yyy",
      "employee_number": "E001",
      "email": "test-admin@example.com"
    },
    "login": {
      "workspaceCode": "TESTTRAVEL",
      "employeeNumber": "E001",
      "email": "test-admin@example.com",
      "password": "12345678"
    }
  }
}
```

**錯誤回應範例**:

```json
{
  "success": false,
  "message": "公司代號已存在",
  "code": "VALIDATION_ERROR"
}
```

## 日誌檢查

### Vercel Logs

查看以下日誌：

- `Creating tenant: TESTTRAVEL (測試旅行社)`
- `Workspace created: xxx`
- `Employee created: yyy`
- `Auth user created: zzz`
- `Announcement channel created`
- `Base data seeded`
- `Workspace bot created`
- `Tenant created successfully: TESTTRAVEL`

### 錯誤日誌

如果失敗，應該看到：

- `Permission denied: isSuperAdmin=false, workspace=XXX` (權限不足)
- `Failed to create workspace:` (workspace 建立失敗)
- `Failed to create employee:` (employee 建立失敗)
- `Failed to create auth user:` (auth 建立失敗)

## 已知問題修正記錄

### 2026-03-09

1. ✅ 權限檢查邏輯混亂 → 統一為「只有 Corner 的 super_admin」
2. ✅ 前端邏輯分散 → 統一到 `/api/tenants/create` API
3. ✅ 沒有事務控制 → 失敗時自動 rollback
4. ✅ 錯誤處理不完善 → 統一錯誤處理和日誌

## 測試結果

- [ ] 測試通過
- [ ] 測試失敗（原因：**\*\***\_**\*\***）

測試人員：**\*\***\_\_\_**\*\***
測試時間：**\*\***\_\_\_**\*\***
