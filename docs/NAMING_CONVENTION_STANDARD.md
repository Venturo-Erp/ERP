# VENTURO 命名規範標準

> ⚠️ **DEPRECATED 2026-05-02**：本文件已過期、跟憲法 `VENTURO_ERP_STANDARDS.md` Section 1 + `FIELD_NAMING_STANDARDS.md` 重疊、且提及已不再使用的 IndexedDB。命名 SSOT 改以 `FIELD_NAMING_STANDARDS.md` 為準。
>
> **仍有效的核心結論**：snake_case + 表名複數 + 不混 camelCase。這幾條已收進憲法 Section 1、不必再從本檔讀。
>
> **計畫**：本檔不再更新、未來合併進憲法後刪除。

> 版本：2.0
> 生效日期：2025-01-15
> 狀態：⚠️ deprecated

---

## 🎯 核心原則

**VENTURO 系統統一使用 snake_case 命名**

### 為什麼選擇 snake_case？

1. **資料庫一致性** - PostgreSQL/Supabase 使用 snake_case
2. **IndexedDB 一致性** - 本地資料庫使用 snake_case
3. **避免轉換** - 前後端統一，無需欄位名稱轉換
4. **簡化維護** - 一種命名風格，降低認知負擔
5. **版本決議** - v7 (2025-10-08) 決議全面 snake_case

---

## 📋 命名規範

### ✅ 正確範例

#### 資料庫欄位

```sql
CREATE TABLE employees (
  id UUID PRIMARY KEY,
  employee_number TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  is_active BOOLEAN DEFAULT true,
  hire_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### TypeScript 型別

```typescript
export interface Employee extends BaseEntity {
  id: string
  employee_number: string
  first_name: string
  last_name: string
  is_active: boolean
  hire_date?: string
  created_at: string
  updated_at: string
}
```

#### IndexedDB Schema

```typescript
{
  name: 'employees',
  keyPath: 'id',
  indexes: [
    { name: 'employee_number', keyPath: 'employee_number', unique: true },
    { name: 'is_active', keyPath: 'is_active', unique: false },
    { name: 'created_at', keyPath: 'created_at', unique: false },
  ]
}
```

#### 程式碼使用

```typescript
// ✅ 正確
const employee = await localDB.read<Employee>('employees', id)
console.log(employee.employee_number)
console.log(employee.is_active)
console.log(employee.created_at)

// ✅ 正確
const tour = await localDB.create<Tour>('tours', {
  id: uuid(),
  code: 'TYO250115',
  name: '東京五日遊',
  start_date: '2025-01-20',
  end_date: '2025-01-24',
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
})
```

---

### ❌ 錯誤範例

#### TypeScript 型別（不要用 camelCase）

```typescript
// ❌ 錯誤：使用 camelCase
export interface Employee {
  employeeNumber: string // ❌
  firstName: string // ❌
  isActive: boolean // ❌
  hireDate?: string // ❌
  createdAt: string // ❌
  updatedAt: string // ❌
}
```

#### 程式碼使用（不要混用）

```typescript
// ❌ 錯誤：混用命名風格
const employee = await localDB.read<Employee>('employees', id)
console.log(employee.employeeNumber) // ❌ camelCase
console.log(employee.is_active) // ✅ snake_case
// 混亂！
```

#### 欄位名稱轉換（不需要）

```typescript
// ❌ 錯誤：不需要轉換層
function toSnakeCase(obj: any) {
  // ❌ 不要寫這種函數
  // camelCase → snake_case 轉換
}

function toCamelCase(obj: any) {
  // ❌ 不要寫這種函數
  // snake_case → camelCase 轉換
}
```

---

## 📖 常用欄位對照表

### 員工相關

| 欄位說明 | ✅ 正確命名       | ❌ 錯誤命名      |
| -------- | ----------------- | ---------------- |
| 員工編號 | `employee_number` | `employeeNumber` |
| 名字     | `first_name`      | `firstName`      |
| 姓氏     | `last_name`       | `lastName`       |
| 到職日期 | `hire_date`       | `hireDate`       |
| 是否啟用 | `is_active`       | `isActive`       |

### 旅遊團相關

| 欄位說明   | ✅ 正確命名      | ❌ 錯誤命名     |
| ---------- | ---------------- | --------------- |
| 團號       | `code`           | `tourCode`      |
| 旅遊團名稱 | `name`           | `tourName`      |
| 開始日期   | `start_date`     | `startDate`     |
| 結束日期   | `end_date`       | `endDate`       |
| 最小人數   | `min_people`     | `minPeople`     |
| 最大人數   | `max_people`     | `maxPeople`     |
| 當前人數   | `current_people` | `currentPeople` |

### 訂單相關

| 欄位說明 | ✅ 正確命名      | ❌ 錯誤命名     |
| -------- | ---------------- | --------------- |
| 訂單編號 | `code`           | `orderCode`     |
| 旅遊團ID | `tour_id`        | `tourId`        |
| 客戶ID   | `customer_id`    | `customerId`    |
| 付款狀態 | `payment_status` | `paymentStatus` |
| 總金額   | `total_amount`   | `totalAmount`   |

### 通用欄位

| 欄位說明 | ✅ 正確命名    | ❌ 錯誤命名   |
| -------- | -------------- | ------------- |
| ID       | `id`           | `id`          |
| 建立時間 | `created_at`   | `createdAt`   |
| 更新時間 | `updated_at`   | `updatedAt`   |
| 刪除時間 | `deleted_at`   | `deletedAt`   |
| 是否啟用 | `is_active`    | `isActive`    |
| 是否VIP  | `is_vip`       | `isVip`       |
| 電話號碼 | `phone_number` | `phoneNumber` |

---

## 🔧 實作指南

### 1. 建立新型別

```typescript
// ✅ 正確：全部 snake_case
export interface NewFeature extends BaseEntity {
  id: string
  feature_name: string
  feature_type: string
  is_enabled: boolean
  config_data: Record<string, any>
  created_at: string
  updated_at: string
}
```

### 2. 建立 Schema

```typescript
// ✅ 正確：name 和 keyPath 都是 snake_case
{
  name: 'new_features',
  keyPath: 'id',
  autoIncrement: false,
  indexes: [
    { name: 'feature_name', keyPath: 'feature_name', unique: true },
    { name: 'feature_type', keyPath: 'feature_type', unique: false },
    { name: 'is_enabled', keyPath: 'is_enabled', unique: false },
    { name: 'created_at', keyPath: 'created_at', unique: false },
  ],
}
```

### 3. 使用 Store

```typescript
// ✅ 正確
export const useNewFeatureStore = createStore<NewFeature>('new_features', 'NF')

// 使用
const { items, loading, create, update } = useNewFeatureStore()

await create({
  id: uuid(),
  feature_name: 'dark_mode',
  feature_type: 'ui',
  is_enabled: true,
  config_data: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
})
```

### 4. 在 Component 中使用

```typescript
// ✅ 正確
function FeatureList() {
  const { items } = useNewFeatureStore();

  return (
    <div>
      {items.map(feature => (
        <div key={feature.id}>
          <h3>{feature.feature_name}</h3>
          <p>Type: {feature.feature_type}</p>
          <p>Enabled: {feature.is_enabled ? 'Yes' : 'No'}</p>
          <p>Created: {new Date(feature.created_at).toLocaleDateString()}</p>
        </div>
      ))}
    </div>
  );
}
```

---

## 🚫 禁止事項

### 1. ❌ 不要混用命名風格

```typescript
// ❌ 錯誤：一個物件裡混用
interface BadExample {
  employeeNumber: string // camelCase
  first_name: string // snake_case
  isActive: boolean // camelCase
  created_at: string // snake_case
}
```

### 2. ❌ 不要建立轉換函數

```typescript
// ❌ 錯誤：不需要這些
function toSnakeCase(obj: any) {}
function toCamelCase(obj: any) {}
function convertKeys(obj: any) {}
```

### 3. ❌ 不要在 API 層轉換

```typescript
// ❌ 錯誤：不需要轉換層
class ApiClient {
  async get(url: string) {
    const data = await fetch(url)
    return this.convertToCamelCase(data) // ❌ 不要
  }
}
```

### 4. ❌ 不要使用別名

```typescript
// ❌ 錯誤：不要用別名混淆
const employeeNumber = employee.employee_number // ❌
const isActive = employee.is_active // ❌

// ✅ 正確：直接使用
console.log(employee.employee_number) // ✅
console.log(employee.is_active) // ✅
```

---

## ✅ 檢查清單

### 新增功能時

- [ ] TypeScript interface 全部 snake_case
- [ ] Schema 的 name 和 keyPath 全部 snake_case
- [ ] 程式碼存取欄位全部 snake_case
- [ ] 沒有使用 camelCase
- [ ] 沒有建立轉換函數
- [ ] 測試資料也使用 snake_case

### Code Review 時

- [ ] 檢查是否有 camelCase 欄位
- [ ] 檢查是否有混用情況
- [ ] 檢查是否有轉換邏輯
- [ ] 檢查 Schema 定義是否正確
- [ ] 檢查型別定義是否正確

### 修改現有程式碼時

- [ ] 確認相關的型別定義
- [ ] 確認 Schema 定義
- [ ] 一次性修改所有相關檔案
- [ ] 測試修改後的功能
- [ ] 更新相關文檔

---

## 📚 參考資料

### 相關文檔

- `NAMING_CONVENTION_AUDIT.md` - 命名規範檢查報告
- `VENTURO_5.0_MANUAL.md` - 系統手冊
- `src/lib/db/schemas.ts` - Schema 定義標準
- `src/types/base.types.ts` - 基礎型別標準

### 決策記錄

- **v7 (2025-10-08)**: 決議全面統一使用 snake_case 命名
- **v11 (2025-01-07)**: 新增 syncQueue 表，遵循 snake_case
- **2025-01-15**: 建立正式命名規範文檔

---

## 🎓 常見問題

### Q1: 為什麼不用 TypeScript 慣例的 camelCase？

**A**: 因為我們的資料直接來自資料庫（IndexedDB/Supabase），使用 snake_case 可以：

- 避免前後端轉換
- 減少錯誤機會
- 簡化維護
- 統一命名風格

### Q2: 如果第三方套件使用 camelCase 怎麼辦？

**A**: 只在介接第三方套件時局部使用，內部系統一律 snake_case。

### Q3: 舊程式碼還在用 camelCase 怎麼辦？

**A**: 參考 `NAMING_CONVENTION_AUDIT.md` 的修復計劃，逐步遷移。

### Q4: schemas.ts 的 name 和 keyPath 有什麼區別？

**A**:

- `name`: 索引名稱，用於查詢時指定索引
- `keyPath`: 實際欄位名稱，對應資料物件的屬性
- **兩者都應該使用 snake_case**

---

**文檔版本**: 2.0
**最後更新**: 2025-01-15
**維護者**: William Chien
**狀態**: ✅ 正式規範
