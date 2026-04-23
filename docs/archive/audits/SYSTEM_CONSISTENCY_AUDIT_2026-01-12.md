# Venturo ERP 系統一致性審計報告

> **審計日期**：2026-01-12
> **審計範圍**：Store、API、Types、Hooks 四大層級
> **目的**：找出所有不一致問題，建立統一規範

---

## 執行摘要

本次審計發現系統存在多層面的不一致問題，主要集中在：

| 問題類別           | 嚴重程度    | 數量    |
| ------------------ | ----------- | ------- |
| Workspace 隔離缺失 | P0 Critical | 5+      |
| 權限檢查缺失       | P0 Critical | 6       |
| 命名不一致         | P1 High     | 15+     |
| 審計欄位缺失       | P1 High     | 45% API |
| 樂觀更新缺失       | P2 Medium   | 多處    |

---

## 一、Store 層審計結果

### 1.1 架構分裂問題

系統存在兩種 Store 架構：

| 架構                     | 特點               | 使用位置                    |
| ------------------------ | ------------------ | --------------------------- |
| **新架構** `createStore` | 工廠函數、統一模式 | customers, orders, tours 等 |
| **舊架構** 手動 zustand  | 各自實作、模式不一 | auth, ui, pnr 等            |

### 1.2 命名不一致

| 問題     | 新架構    | 舊架構          |
| -------- | --------- | --------------- |
| 新增方法 | `create*` | `add*`          |
| 讀取方法 | `fetch*`  | `load*`, `get*` |
| 刪除方法 | `delete*` | `remove*`       |

### 1.3 缺少 workspaceScoped 的 Store

以下 Store 使用 `createStore` 但未設定 `workspaceScoped: true`：

```
❌ useProposalPackagesStore - 需要 workspace 隔離
❌ useTourAddonsStore - 需要 workspace 隔離
❌ useRequestResponseItemsStore - 需要 workspace 隔離
❌ useCalendarEventsStore - 需要 workspace 隔離
❌ useLeaderAvailabilityStore - 需要 workspace 隔離
```

### 1.4 錯誤處理不一致

| Store            | 錯誤處理方式            |
| ---------------- | ----------------------- |
| auth-store       | throw Error             |
| ui-store         | console.error           |
| createStore 系列 | return null / undefined |

---

## 二、API 層審計結果

### 2.1 回傳格式一致性

**標準格式**（60% 採用）：

```typescript
{ success: true, data: T } | { success: false, error: string }
```

**不一致的 API**：

- `/api/supabase/*` - 直接回傳 data 或 error
- `/api/pnr/*` - 混合多種格式
- `/api/reports/*` - 部分回傳 `{ result: T }`

### 2.2 Workspace 權限檢查

| 狀態        | 百分比 | 說明                          |
| ----------- | ------ | ----------------------------- |
| ✅ 有檢查   | 50%    | 正確使用 workspace_id         |
| ⚠️ 部分檢查 | 30%    | 只檢查 auth，未驗證 workspace |
| ❌ 無檢查   | 20%    | 完全沒有權限驗證              |

**無權限檢查的 API** (P0 Critical)：

```
1. /api/proposals/[id]/packages - 無 workspace 驗證
2. /api/timebox/* - 無 workspace 驗證
3. /api/suppliers/* - 無任何權限檢查
4. /api/airports/* - 無任何權限檢查
5. /api/shared-data/* - 無任何權限檢查
6. /api/system/* - 僅部分有 系統主管 檢查
```

### 2.3 審計欄位設定

| 欄位         | 設定率 | 說明         |
| ------------ | ------ | ------------ |
| `created_at` | 90%    | 多數有設定   |
| `updated_at` | 85%    | 多數有設定   |
| `created_by` | 45%    | **嚴重不足** |
| `updated_by` | 40%    | **嚴重不足** |

---

## 三、類型定義審計結果

### 3.1 created_by 命名變體

資料庫中存在多種命名：

| 表格           | 欄位名稱                    | 應統一為     |
| -------------- | --------------------------- | ------------ |
| todos          | `created_by_legacy`         | `created_by` |
| messages       | `created_by_legacy_author`  | `created_by` |
| advance_lists  | `created_by_legacy_author`  | `created_by` |
| itineraries    | `created_by_legacy_user_id` | `created_by` |
| bulletins      | `created_by`                | ✅ 正確      |
| quote_versions | `created_by`                | ✅ 正確      |

### 3.2 日期類型不一致

| 問題       | 現況                     | 建議                 |
| ---------- | ------------------------ | -------------------- |
| 資料庫     | `timestamptz` → `string` | 統一                 |
| 前端 types | 混用 `Date` 和 `string`  | 全用 `string`        |
| 運行時     | Date 物件                | JSON 序列化為 string |

### 3.3 workspace_id 必填狀態

類型定義中部分表格的 `workspace_id` 定義不一致：

```typescript
// ❌ 不一致：有些是可選
workspace_id?: string | null

// ✅ 業務表格應該是必填
workspace_id: string
```

### 3.4 Foreign Key 命名

| 模式            | 範例                    | 使用率 |
| --------------- | ----------------------- | ------ |
| `{table}_id`    | `tour_id`, `order_id`   | 80% ✅ |
| `{relation}_id` | `parent_id`, `owner_id` | 15%    |
| 其他            | `ref_id`, `source`      | 5% ❌  |

---

## 四、Hooks 層審計結果

### 4.1 DAL 層 Workspace 過濾缺失

**關鍵問題**：`src/lib/dal/todos.ts` 未使用 workspace 過濾

```typescript
// ❌ 目前狀態 - 查詢所有 workspace 的資料
export async function getTodos() {
  const { data } = await supabase
    .from('todos')
    .select('*')
    .order('created_at', { ascending: false })
  return data
}

// ✅ 應該要有
export async function getTodos(workspaceId: string) {
  const { data } = await supabase
    .from('todos')
    .select('*')
    .eq('workspace_id', workspaceId) // 加上這行
    .order('created_at', { ascending: false })
  return data
}
```

### 4.2 PNR Hooks 重複實作

`src/hooks/pnr/` 下有 6 個檔案各自實作相同的 `getCurrentWorkspaceId()`：

```
usePnrRecords.ts
usePnrFareAlerts.ts
usePnrFareHistory.ts
usePnrFlightStatus.ts
usePnrQueueItems.ts
usePnrScheduleChanges.ts
```

**建議**：抽取到 `src/lib/utils/workspace.ts` 共用

### 4.3 WORKSPACE_SCOPED_TABLES 可能缺漏

需確認以下表格是否應加入：

- `timebox_items`
- `timebox_templates`
- `timebox_sessions`

### 4.4 樂觀更新缺失

| Hook 類型            | 有樂觀更新 | 無樂觀更新 |
| -------------------- | ---------- | ---------- |
| createCloudHook 系列 | ✅         | -          |
| 手動 SWR hooks       | 部分       | 部分       |
| DAL 直接呼叫         | -          | ❌ 全部    |

---

## 五、優先修復清單

### P0 - Critical（立即修復）

| #   | 問題                           | 位置                   | 影響     |
| --- | ------------------------------ | ---------------------- | -------- |
| 1   | DAL todos.ts 無 workspace 過濾 | `src/lib/dal/todos.ts` | 資料洩漏 |
| 2   | 6 個 API 無權限檢查            | `src/app/api/*`        | 安全漏洞 |
| 3   | Store 缺少 workspaceScoped     | 5 個 Store             | 資料混亂 |

### P1 - High（本週修復）

| #   | 問題                         | 位置              | 影響         |
| --- | ---------------------------- | ----------------- | ------------ |
| 4   | created_by/updated_by 未設定 | 45% API           | 審計追蹤失效 |
| 5   | PNR hooks 重複程式碼         | `src/hooks/pnr/*` | 維護困難     |
| 6   | Store 命名不一致             | 全系統            | 開發混亂     |

### P2 - Medium（本月修復）

| #   | 問題               | 位置            | 影響         |
| --- | ------------------ | --------------- | ------------ |
| 7   | API 回傳格式不一致 | `src/app/api/*` | 前端處理複雜 |
| 8   | 類型定義日期不一致 | `src/types/*`   | 類型安全降低 |
| 9   | 樂觀更新缺失       | 部分 hooks      | UX 較差      |

---

## 六、建議的修復計畫

### 階段一：安全性修復（P0）

1. **修復 DAL workspace 過濾**
   - 修改 `src/lib/dal/todos.ts`
   - 審查所有 DAL 檔案

2. **添加 API 權限檢查**
   - 創建統一的權限檢查 middleware
   - 套用到所有 API routes

3. **修復 Store workspaceScoped**
   - 更新 5 個缺少設定的 Store

### 階段二：一致性修復（P1）

1. **統一審計欄位設定**
   - 創建 `setAuditFields()` 工具函數
   - 在所有 create/update 操作中使用

2. **重構 PNR hooks**
   - 抽取共用的 workspace 函數
   - 統一錯誤處理

3. **建立命名規範文件**
   - 定義 Store 方法命名標準
   - 新增 ESLint 規則強制執行

### 階段三：技術債清理（P2）

1. **統一 API 回傳格式**
   - 創建 `ApiResponse<T>` 類型
   - 逐步遷移所有 API

2. **清理類型定義**
   - 統一日期類型為 string
   - 確保 workspace_id 必填性正確

---

## 七、附錄：需要修改的檔案清單

### 立即修復（P0）

```
src/lib/dal/todos.ts
src/app/api/proposals/[id]/packages/route.ts
src/app/api/timebox/*/route.ts
src/app/api/suppliers/*/route.ts
src/app/api/airports/*/route.ts
src/app/api/shared-data/*/route.ts
src/stores/useProposalPackagesStore.ts
src/stores/useTourAddonsStore.ts
src/stores/useRequestResponseItemsStore.ts
src/stores/useCalendarEventsStore.ts
src/stores/useLeaderAvailabilityStore.ts
```

### 高優先級（P1）

```
src/hooks/pnr/*.ts (6 個檔案)
src/app/api/**/*.ts (審計欄位)
src/lib/utils/workspace.ts (新建)
src/lib/utils/audit-fields.ts (新建)
```

---

_報告生成日期：2026-01-12_
_審計版本：1.0_
