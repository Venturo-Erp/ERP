# Venturo ERP 欄位使用情況分析

**分析時間**：2026-03-10 06:33  
**分析者**：馬修 🔧  
**目的**：識別多餘欄位，減少 AI 誤用風險

---

## 🎯 William 的核心洞察

> **多餘欄位 = AI 的噪音**
>
> AI 看到欄位 → 以為要用 → 但欄位已廢棄 → 誤用 → 出錯
>
> 刪除不是潔癖 → 是**減少認知負擔**

---

## 📊 分析結果

### ❌ 完全未使用的欄位（建議刪除）

#### 1. `tours.op_staff_id`

- **使用次數**：0 次
- **前端代碼**：完全沒有引用
- **資料庫**：欄位存在，但沒有 migration 記錄（可能是歷史遺留）
- **建議**：**立即刪除**
- **風險**：低（沒有任何代碼使用）
- **Migration**：
  ```sql
  -- Remove unused field: tours.op_staff_id
  ALTER TABLE tours DROP COLUMN IF EXISTS op_staff_id;
  ```

---

### ⚠️ 使用率極低的欄位（建議評估）

#### 2. `employees.last_login_at`

- **使用次數**：2 次
- **前端代碼**：
  - 只在 `src/data/entities/employees.ts` 的 SELECT 查詢中列出
  - **沒有任何地方實際使用這個值**
- **建議**：**標註為廢棄** 或 **刪除**
- **風險**：低（雖然被查詢，但沒有被使用）
- **評估問題**：
  1. 這個欄位原本的目的是什麼？（追蹤員工最後登入時間）
  2. 未來會需要這個資料嗎？（可能用於審計、安全性監控）
  3. 如果保留，是否應該實作功能來更新這個值？

---

### ✅ 正常使用的欄位

**employees 表格（32 欄位）**：

- 30 個欄位正常使用（使用 5+ 次）
- 1 個欄位使用率極低（`last_login_at`）

**tours 表格（17 欄位）**：

- 16 個欄位正常使用
- 1 個欄位完全未使用（`op_staff_id`）

**orders 表格（12 欄位）**：

- 所有欄位都有使用

---

## 🔍 深入分析

### tours.op_staff_id 的歷史

**可能的起源**：

1. 早期設計時想要記錄「OP 專員」（Operator Staff）
2. 後來改用 `controller_id` 欄位（使用 7 次）
3. `op_staff_id` 成為廢棄欄位，但沒有被清理

**證據**：

```typescript
// src/lib/supabase/types.ts (自動生成)
tours: {
  Row: {
    controller_id: string | null // ✅ 使用 7 次
    op_staff_id: string | null // ❌ 使用 0 次
  }
}
```

**影響**：

- AI 看到 `op_staff_id` 和 `controller_id` 兩個欄位
- 可能會誤判：「哦，有兩個不同角色的員工」
- 實際上只有 `controller_id` 在使用

---

### employees.last_login_at 的狀況

**當前使用**：

```typescript
// src/data/entities/employees.ts:14
const EMPLOYEE_FIELDS = 'id,employee_number,display_name,...,last_login_at,...'
```

**問題**：

- 欄位被查詢出來
- 但沒有任何地方顯示或使用這個值
- 也沒有任何登入時更新這個欄位的邏輯

**建議**：

1. **Option A（推薦）**：刪除欄位 + 從 SELECT 查詢中移除
2. **Option B**：實作功能 — 登入時更新 `last_login_at`，並在 UI 顯示「最後登入時間」

---

## 🎯 建議行動

### 立即行動（P0）

#### 1. 刪除 `tours.op_staff_id`

```sql
-- Migration: 20260310063300_remove_unused_op_staff_id.sql
-- 刪除多餘欄位，減少 AI 誤用風險

ALTER TABLE tours DROP COLUMN IF EXISTS op_staff_id;

-- 註記：此欄位已被 controller_id 取代，完全未使用
```

**影響評估**：

- ✅ 前端代碼：無影響（沒有使用）
- ✅ 資料庫：無影響（欄位無資料或資料無用）
- ✅ 類型定義：執行 `supabase gen types` 更新
- ✅ AI 認知：減少 1 個噪音欄位

---

### 待決策（P1）

#### 2. 評估 `employees.last_login_at`

**選項 A：刪除**

```sql
-- Migration: 20260310063400_remove_unused_last_login_at.sql
ALTER TABLE employees DROP COLUMN IF EXISTS last_login_at;
```

- 優點：徹底清理
- 缺點：失去歷史資料（如果有的話）

**選項 B：保留 + 實作功能**

```typescript
// 登入時更新
await supabase
  .from('employees')
  .update({ last_login_at: new Date().toISOString() })
  .eq('id', employeeId)

// HR 頁面顯示
<TableCell>
  {employee.last_login_at
    ? formatDate(employee.last_login_at)
    : '從未登入'}
</TableCell>
```

- 優點：有實際功能
- 缺點：需要開發時間

**選項 C：標註為廢棄（最小改動）**

```typescript
// src/lib/supabase/types.ts 加註解
tours: {
  Row: {
    /** @deprecated 未使用，等待刪除 */
    last_login_at: string | null
  }
}
```

- 優點：警示 AI 不要使用
- 缺點：欄位還在

**William，你選哪個？**

---

## 🔄 後續工作

### Phase 1：執行刪除（如果確認）

1. 寫 migration（`op_staff_id` + 可能的 `last_login_at`）
2. 執行 migration
3. 更新類型定義：`npx supabase gen types typescript`
4. 檢查 TypeScript 編譯錯誤（應該沒有）

### Phase 2：擴大掃描

分析其他資料表：

- `customers` — 36 個欄位
- `suppliers` — 很多欄位
- `payments` — 財務相關
- `quotes` — 報價相關

**預估時間**：

- Phase 1（刪除 op_staff_id）：10 分鐘
- Phase 2（全面掃描）：1-2 小時

---

## 📝 教訓

### 為什麼會有多餘欄位？

1. **功能迭代** — 原本想做 A，後來改做 B，A 的欄位沒清
2. **沒有定期審查** — 欄位累積，沒人定期檢視
3. **害怕刪除** — 「萬一以後要用呢？」→ 結果一直不用
4. **缺乏文檔** — 不知道某個欄位的用途，不敢刪

### 正確的做法

1. **每次功能變更** — 檢查是否有廢棄欄位
2. **定期審查**（月度/季度）— 掃描未使用欄位
3. **勇敢刪除** — 有 git 歷史，刪了可以恢復
4. **Migration 註解** — 為什麼加這個欄位，什麼時候可以刪

---

## ✅ 總結

### 發現

- ❌ `tours.op_staff_id` — 完全未使用（建議刪除）
- ⚠️ `employees.last_login_at` — 使用率極低（建議評估）

### 影響

- 多餘欄位 = AI 誤用的風險
- 清理欄位 = 降低認知負擔

### 下一步

等待 William 決定：

1. **立即刪除 `op_staff_id`？**（推薦 ✅）
2. **`last_login_at` 怎麼處理？**（A: 刪除 / B: 實作 / C: 標註廢棄）
3. **要擴大掃描其他表嗎？**（customers, suppliers, payments...）

---

_建立者：馬修 🔧_  
_時間：2026-03-10 06:33_  
_下一步：等待 William 決策_
