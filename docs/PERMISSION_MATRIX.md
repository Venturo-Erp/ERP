# 權限矩陣設計

## 架構

```
第一層：租戶權限（我們開給租戶）
    ↓
第二層：角色範本（租戶系統主管設定）
    ↓
第三層：個人權限（HR 微調）
```

---

## 第一層：可開放給租戶的模組

> 這是 Corner 後台設定「這個租戶能用哪些功能」

| 模組代碼        | 模組名稱   | 說明               | 預設開放 |
| --------------- | ---------- | ------------------ | -------- |
| `dashboard`     | 首頁       | 儀表板總覽         | ✅       |
| `channel`       | 頻道       | 團協作空間         | ✅       |
| `tours`         | 旅遊團     | 團管理、行程、報價 | ✅       |
| `orders`        | 訂單       | 訂單管理           | ✅       |
| `customers`     | 客戶       | 客戶/公司管理      | ✅       |
| `quotes`        | 報價單     | 快速報價           | ✅       |
| `confirmations` | 團確單     | 供應商確認         | ✅       |
| `contracts`     | 合約       | 電子簽約           | ✅       |
| `finance`       | 財務       | 收款/請款/出納     | ✅       |
| `accounting`    | 會計       | 傳票/帳務/報表     | ❌       |
| `hr`            | 人資       | 出勤/請假/薪資     | ❌       |
| `database`      | 資料庫     | 供應商/景點/車隊   | ✅       |
| `tenants`       | 租戶管理   | 附屬國管理         | ❌       |
| `settings`      | 系統設定   | 公司/角色/選單     | ✅       |
| `local`         | Local 案件 | 地接案件           | ❌       |
| `supplier`      | 供應商入口 | 供應商專用         | ❌       |
| `marketing`     | 行銷       | 行銷工具           | ❌       |
| `visas`         | 簽證       | 簽證管理           | ❌       |
| `esims`         | eSIM       | eSIM 管理          | ❌       |
| `tools`         | 工具       | 機票行程/住宿券    | ✅       |

---

## 第二層：角色範本

> 租戶系統主管設定「這個角色能用哪些功能」

### 預設角色

| 角色代碼      | 角色名稱 | 說明                     |
| ------------- | -------- | ------------------------ |
| `系統主管`       | 系統主管   | 全部權限                 |
| `sales`       | 業務     | 旅遊團、訂單、報價、客戶 |
| `op`          | OP       | 行程、需求單、團確單     |
| `accountant`  | 會計     | 財務、會計、請款確認     |
| `assistant`   | 助理     | 基本讀取                 |
| `tour_leader` | 領隊     | 團資訊、團員名單         |

### 權限粒度

每個模組下可細分：

| 權限類型  | 說明      |
| --------- | --------- |
| `read`    | 讀取      |
| `write`   | 新增/編輯 |
| `delete`  | 刪除      |
| `approve` | 審核      |
| `export`  | 匯出      |

### 資料範圍

| 範圍代碼 | 說明           |
| -------- | -------------- |
| `own`    | 只看自己的資料 |
| `team`   | 看同部門的資料 |
| `all`    | 看全部資料     |

---

## 第三層：個人權限微調

> HR 可以針對特定員工額外開放/限制權限

例如：

- 業務 A 升主管 → 額外開放「審核」權限
- 業務 B 離職中 → 限制「寫入」權限

---

## 旅遊團分頁權限（細項）

| 分頁   | 業務   | OP     | 會計   | 領隊   | 系統主管 |
| ------ | ------ | ------ | ------ | ------ | ------ |
| 總覽   | ✓      | ✓      | ✓      | ✓      | ✓      |
| 訂單   | ✓ 讀寫 | ✓ 讀   | ✓ 讀   | ✗      | ✓ 讀寫 |
| 團員   | ✓ 讀寫 | ✓ 讀   | ✗      | ✓ 讀   | ✓ 讀寫 |
| 行程   | ✓ 讀   | ✓ 讀寫 | ✗      | ✓ 讀   | ✓ 讀寫 |
| 報價   | ✓ 讀寫 | ✓ 讀   | ✓ 讀   | ✗      | ✓ 讀寫 |
| 需求   | ✓ 讀   | ✓ 讀寫 | ✗      | ✗      | ✓ 讀寫 |
| 團確單 | ✓ 讀   | ✓ 讀寫 | ✗      | ✓ 讀   | ✓ 讀寫 |
| 合約   | ✓ 讀寫 | ✓ 讀   | ✗      | ✗      | ✓ 讀寫 |
| 報到   | ✓ 讀   | ✓ 讀寫 | ✗      | ✓ 讀寫 | ✓ 讀寫 |
| 檔案   | ✓ 讀寫 | ✓ 讀寫 | ✓ 讀   | ✓ 讀   | ✓ 讀寫 |
| 結案   | ✗      | ✗      | ✓ 讀寫 | ✗      | ✓ 讀寫 |

---

## 財務模組權限（細項）

| 功能      | 業務   | OP     | 會計          | 系統主管 |
| --------- | ------ | ------ | ------------- | ------ |
| 收款/團體 | ✓ 讀   | ✗      | ✓ 讀寫 + 確認 | ✓      |
| 收款/公司 | ✗      | ✗      | ✓ 讀寫        | ✓      |
| 請款/團體 | ✓ 讀寫 | ✓ 讀寫 | ✓ 讀寫 + 審核 | ✓      |
| 請款/公司 | ✗      | ✗      | ✓ 讀寫        | ✓      |
| 出納單    | ✗      | ✗      | ✓ 讀寫        | ✓      |
| 財務報表  | ✗      | ✗      | ✓ 讀          | ✓      |

---

## DB Schema 設計

### workspace_modules（租戶模組權限）

```sql
CREATE TABLE workspace_modules (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id),
  module_code TEXT NOT NULL,  -- 'tours', 'finance', 'hr'...
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### role_permissions（角色權限範本）

```sql
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id),
  role_code TEXT NOT NULL,  -- 'sales', 'op', 'accountant'...
  module_code TEXT NOT NULL,
  sub_module TEXT,  -- 分頁或子功能
  permissions JSONB NOT NULL,  -- {"read": true, "write": true, "delete": false}
  data_scope TEXT DEFAULT 'own',  -- 'own', 'team', 'all'
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### user_permission_overrides（個人權限覆蓋）

```sql
CREATE TABLE user_permission_overrides (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  module_code TEXT NOT NULL,
  sub_module TEXT,
  permissions JSONB NOT NULL,  -- 覆蓋角色的預設值
  data_scope TEXT,
  granted_by UUID REFERENCES users(id),
  granted_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ  -- 可設定到期日
);
```

---

## 待確認

1. 業務只能看自己的團，還是可以看全部？
2. OP 可以看其他 OP 的團嗎？
3. 報價單的金額要隱藏嗎（對 OP/領隊）？
4. 領隊是否需要看成本？
5. 供應商入口需要哪些功能？

---

**更新時間**：2026-03-28 22:50
