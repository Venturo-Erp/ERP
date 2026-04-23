# 多公司架構規範

> **最後更新**: 2026-01-02
> **適用對象**: TP（角落台北）、TC（角落台中）為完整功能公司，其他公司為受限公司

---

## 公司類型

| 類型         | 公司代碼 | 說明                         |
| ------------ | -------- | ---------------------------- |
| **完整功能** | TP, TC   | 擁有所有功能，可管理其他公司 |
| **受限功能** | JY, 其他 | 受限功能，完全獨立資料       |

---

## 功能限制（受限公司）

### 不可使用的功能

| 功能               | 說明                   | 實作位置     |
| ------------------ | ---------------------- | ------------ |
| **Timebox**        | 時間盒排程功能         | 側邊欄隱藏   |
| **LinkPay**        | LinkPay 付款方式       | 付款選項隱藏 |
| **會計系統**       | 傳票、會計報表         | 側邊欄隱藏   |
| **行程編輯器**     | 視覺化行程編輯         | 側邊欄隱藏   |
| **跨公司員工管理** | 新增員工時選擇其他公司 | 選擇器隱藏   |

### 可使用的功能

| 功能       | 說明                   |
| ---------- | ---------------------- |
| 旅遊團管理 | 建立、編輯、管理旅遊團 |
| 訂單管理   | 建立、編輯訂單         |
| 客戶管理   | 管理客戶資料           |
| 報價單     | 建立、編輯報價單       |
| 收款/請款  | 財務收款請款功能       |
| 簽證管理   | 簽證申請追蹤           |
| 員工管理   | 管理自己公司的員工     |
| 行事曆     | 公司行事曆             |
| 頻道/訊息  | 內部溝通               |
| 待辦事項   | 任務管理               |

---

## 資料隔離規則

### 完全隔離的資料（各公司獨立）

每家公司只能看到自己的資料，透過 RLS (Row Level Security) 強制執行：

| 資料表                | 說明                                                             |
| --------------------- | ---------------------------------------------------------------- |
| `customers`           | 客戶資料                                                         |
| `tours`               | 旅遊團                                                           |
| `orders`              | 訂單                                                             |
| `order_members`       | 訂單成員                                                         |
| `quotes`              | 報價單                                                           |
| `itineraries`         | 行程表                                                           |
| `receipts`            | 收款單                                                           |
| `payment_requests`    | 請款單                                                           |
| `disbursement_orders` | 出納單                                                           |
| `visas`               | 簽證                                                             |
| `todos`               | 待辦事項                                                         |
| `calendar_events`     | 行事曆事件                                                       |
| `channels`            | 頻道                                                             |
| `messages`            | 訊息                                                             |
| `employees`           | 員工（employee_number 在公司內唯一，store 啟用 workspaceScoped） |
| `tour_documents`      | 團文件                                                           |

### 共享資料（全公司可見，目前僅 TP/TC 有資料）

| 資料表                 | 說明       | 備註           |
| ---------------------- | ---------- | -------------- |
| `countries`            | 國家       | 基礎地理資料   |
| `regions`              | 地區       | 基礎地理資料   |
| `cities`               | 城市       | 基礎地理資料   |
| `destinations`         | 目的地     | 旅遊目的地     |
| `attractions`          | 景點       | 旅遊資料庫     |
| `michelin_restaurants` | 米其林餐廳 | 旅遊資料庫     |
| `premium_experiences`  | 頂級體驗   | 旅遊資料庫     |
| `suppliers`            | 供應商     | 可考慮未來隔離 |
| `tour_leaders`         | 領隊       | 可考慮未來隔離 |

---

## 認證格式

### Supabase Auth Email 格式

```
{WORKSPACE_CODE}_{EMPLOYEE_NUMBER}@venturo.com
```

範例：

- TP 的 E001：`TP_E001@venturo.com`
- TC 的 E001：`TC_E001@venturo.com`
- JY 的 E001：`JY_E001@venturo.com`

### 員工編號規則

- 員工編號在**公司內唯一**，不是全域唯一
- 每家公司都從 E001 開始
- 資料庫使用 composite unique: `(workspace_id, employee_number)`

---

## 新增公司 SOP

### 1. 建立 Migration

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_create_XX_workspace.sql
BEGIN;

-- 1. 建立 workspace
INSERT INTO public.workspaces (id, name, code)
VALUES (
  gen_random_uuid(),
  '公司全名',
  'XX'  -- 2 字母代碼
);

-- 2. 建立第一位員工（系統主管）
INSERT INTO public.employees (
  id,
  workspace_id,
  employee_number,
  display_name,
  english_name,
  chinese_name,
  password_hash,
  roles,
  permissions,
  status
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM public.workspaces WHERE code = 'XX'),
  'E001',
  '顯示名稱',
  'ENGLISH_NAME',
  '中文名稱',
  crypt('初始密碼', gen_salt('bf')),
  ARRAY['admin']::text[],
  ARRAY['settings']::text[],
  'active'
);

COMMIT;
```

### 2. 建立 Supabase Auth 帳號

透過 API 或 Dashboard 建立：

- Email: `XX_E001@venturo.com`
- Password: 初始密碼

### 3. 驗證清單

- [ ] 登入成功
- [ ] 只能看到自己公司的資料
- [ ] 看不到 TP/TC 的客戶、訂單等
- [ ] 側邊欄沒有受限功能（Timebox、會計等）
- [ ] 付款方式沒有 LinkPay
- [ ] 新增員工時沒有 workspace 選擇器
- [ ] 機器人通知只發給自己公司
- [ ] 行事曆只顯示自己公司的事件

---

## 程式碼位置

### 功能限制

```typescript
// src/lib/feature-restrictions.ts
const FULL_FEATURE_WORKSPACES = ['TP', 'TC']

export type RestrictedFeature = 'timebox' | 'linkpay' | 'accounting' | 'itinerary_editor'

export function hasFullFeatures(workspaceCode: string): boolean
export function isFeatureAvailable(feature: RestrictedFeature, workspaceCode: string): boolean
export function getAvailablePaymentMethods(workspaceCode: string): string[]
```

### 使用範例

```typescript
// 檢查功能是否可用
import { isFeatureAvailable, hasFullFeatures } from '@/lib/feature-restrictions'

// 在側邊欄過濾功能
if (isFeatureAvailable('timebox', user.workspace_code)) {
  // 顯示 Timebox
}

// 檢查是否為完整功能公司
if (hasFullFeatures(user.workspace_code)) {
  // 顯示進階選項
}
```

### RLS Policy 範本

```sql
-- 業務資料表的標準 RLS
CREATE POLICY "table_select" ON public.table_name FOR SELECT
USING (workspace_id = get_current_user_workspace() OR is_super_admin());

CREATE POLICY "table_insert" ON public.table_name FOR INSERT
WITH CHECK (workspace_id = get_current_user_workspace());

CREATE POLICY "table_update" ON public.table_name FOR UPDATE
USING (workspace_id = get_current_user_workspace() OR is_super_admin());

CREATE POLICY "table_delete" ON public.table_name FOR DELETE
USING (workspace_id = get_current_user_workspace() OR is_super_admin());
```

---

## 未來考慮

### 可能需要隔離的共享資料

如果未來其他公司需要完全獨立：

1. **供應商** (`suppliers`) - 新增 workspace_id，複製現有資料
2. **領隊** (`tour_leaders`) - 新增 workspace_id，複製現有資料
3. **景點/餐廳/體驗** - 新增 workspace_id，或維持共享但加入編輯權限控制

### 新增受限功能

如需新增功能限制：

1. 在 `feature-restrictions.ts` 的 `RestrictedFeature` 加入新功能
2. 在 `restrictedFeatures` 陣列加入該功能
3. 在相關 UI 加入 `isFeatureAvailable()` 檢查

---

## 測試檢查清單

### 新公司上線前

- [ ] **登入測試**
  - 正確的帳號密碼可登入
  - 錯誤的密碼會被拒絕

- [ ] **資料隔離測試**
  - 看不到其他公司的客戶
  - 看不到其他公司的訂單
  - 看不到其他公司的旅遊團
  - 行事曆只有自己的事件
  - 訊息只有自己公司的頻道

- [ ] **功能限制測試**
  - 側邊欄沒有 Timebox
  - 側邊欄沒有會計系統
  - 付款沒有 LinkPay 選項
  - 新增員工沒有 workspace 選擇

- [ ] **機器人/通知測試**
  - 只收到自己公司的通知
  - 不會收到 TP/TC 的通知
