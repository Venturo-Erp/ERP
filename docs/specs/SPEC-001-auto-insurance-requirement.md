# SPEC-001: 自動產生保險需求單

**建立日期**：2026-03-17  
**負責人**：Matthew  
**優先級**：P1（高）  
**預計工時**：2 小時

---

## 📋 需求說明

**背景**：
- 每個團都需要向保險公司發送保險需求
- 目前需要業務手動建立，容易遺漏
- 公司要求保險是必備項目

**目標**：
- 每個團自動產生一筆「保險」需求單
- 自動計算團員人數
- 固定在「其他」分類下

---

## 🎯 功能規格

### 觸發時機

**方案 A：建團時自動建立（推薦）**
- 建立新團時自動產生
- 位置：`src/features/tours/services/create-tour.ts`

**方案 B：進入需求單頁面時檢查**
- 如果沒有保險需求單，自動建立
- 位置：`RequirementsList.tsx` 的 `loadData()`

**William 決定**：先用方案 B（不影響現有流程）

---

## 💻 技術設計

### 資料結構

```typescript
// tour_requests 表
{
  id: uuid,
  workspace_id: uuid,
  tour_id: uuid,
  code: "RQ{隨機8碼}",
  request_type: "other",
  supplier_name: "保險公司", // 或從設定讀取
  supplier_id: null, // 可以之後手動關聯
  items: [
    {
      title: "旅遊平安保險",
      category: "other",
      quantity: 10, // 團員人數
      service_date: "2026-03-21", // 出發日期
      notes: "自動產生"
    }
  ],
  status: "draft",
  hidden: false, // 預設顯示
  created_at: now(),
  // sent_at, replied_at 等留空
}
```

---

## 🔧 實作步驟

### Step 1：建立產生函數

**檔案**：`src/features/confirmations/services/create-insurance-requirement.ts`

```typescript
import { supabase } from '@/lib/supabase/client'

/**
 * 為團自動建立保險需求單
 */
export async function createInsuranceRequirement(
  tourId: string,
  workspaceId: string,
  memberCount: number,
  startDate: string | null
) {
  // 檢查是否已存在保險需求
  const { data: existing } = await supabase
    .from('tour_requests')
    .select('id')
    .eq('tour_id', tourId)
    .eq('request_type', 'other')
    .contains('items', [{ title: '旅遊平安保險' }])
    .single()

  if (existing) {
    console.log('[保險] 需求單已存在，跳過')
    return existing
  }

  // 產生需求單代碼
  const code = `RQ${Math.random().toString(36).substring(2, 10).toUpperCase()}`

  // 建立需求單
  const { data, error } = await supabase
    .from('tour_requests')
    .insert({
      workspace_id: workspaceId,
      tour_id: tourId,
      code,
      request_type: 'other',
      supplier_name: '保險公司', // TODO: 從設定讀取預設保險公司
      supplier_id: null,
      items: [
        {
          title: '旅遊平安保險',
          category: 'other',
          quantity: memberCount,
          service_date: startDate,
          notes: '自動產生'
        }
      ],
      status: 'draft',
      hidden: false,
    })
    .select()
    .single()

  if (error) {
    console.error('[保險] 建立失敗:', error)
    return null
  }

  console.log('[保險] 需求單已建立:', data.code)
  return data
}
```

---

### Step 2：整合到需求單載入

**檔案**：`src/features/confirmations/components/RequirementsList.tsx`

**位置**：`loadData()` 函數內，載入團員資料後

```typescript
// RequirementsList.tsx 的 loadData() 內

// 載入團員資料（現有邏輯）
const { data: orderMembers } = await supabase
  .from('order_members')
  .select('*')
  .eq('order.tour_id', tourId)

const memberCount = orderMembers?.length || 0
setMemberAgeBreakdown({ ... })

// 🆕 自動建立保險需求單
if (memberCount > 0 && tourData.departure_date) {
  await createInsuranceRequirement(
    tourId,
    user?.workspace_id || '',
    memberCount,
    tourData.departure_date
  )
}

// 重新載入需求單（包含新建立的保險）
const { data: requests } = await supabase
  .from('tour_requests')
  .select('*')
  .eq('tour_id', tourId)
setExistingRequests(requests || [])
```

---

### Step 3：UI 特殊標記（可選）

**讓保險需求單更明顯**：

```tsx
// RequirementsList.tsx 渲染時

{existingRequests.map((req) => {
  const isInsurance = req.request_type === 'other' && 
    req.items?.some(item => item.title === '旅遊平安保險')

  return (
    <div 
      key={req.id}
      className={cn(
        "border rounded-lg p-4",
        isInsurance && "border-blue-500 bg-blue-50" // 藍色邊框標示
      )}
    >
      {isInsurance && (
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
          🛡️ 必備項目
        </span>
      )}
      {/* ... 其他內容 */}
    </div>
  )
})}
```

---

## 🧪 測試清單

### 單元測試

- [ ] 團有團員 → 自動建立保險需求
- [ ] 團無團員 → 不建立
- [ ] 已有保險需求 → 不重複建立
- [ ] 團員人數更新 → 保險數量同步更新（未來功能）

### 整合測試

- [ ] 建立新團 → 進入需求單頁面 → 看到保險需求
- [ ] 加入團員 → 重新整理 → 保險數量正確
- [ ] 可以手動編輯保險需求（供應商、備註）
- [ ] 可以發送保險需求給供應商

### 邊界測試

- [ ] 團員數 = 0（不建立）
- [ ] 團員數 > 100（正常建立）
- [ ] 無出發日期（使用 null）
- [ ] 刪除保險需求後重新進入（重新建立）

---

## 📊 驗收標準

### 功能驗收

1. ✅ 每個有團員的團，進入需求單頁面時自動有「保險」項目
2. ✅ 保險數量 = 團員人數
3. ✅ 保險日期 = 出發日期
4. ✅ 不會重複建立
5. ✅ 可以手動修改（供應商、數量、備註）

### 效能驗收

1. ✅ 檢查 + 建立時間 < 500ms
2. ✅ 不影響頁面載入速度
3. ✅ 使用單一 SQL 查詢檢查是否存在

---

## 🔄 後續優化（未來）

### Phase 2：智慧更新

```typescript
// 團員人數變動時自動更新保險數量
// 使用 Supabase Realtime 監聽 order_members
```

### Phase 3：多家保險公司

```typescript
// 從設定檔讀取預設保險公司
// 或讓業務選擇保險公司
const insuranceProvider = await getDefaultInsuranceProvider(workspaceId)
```

### Phase 4：保險金額計算

```typescript
// 根據團員年齡計算保險費用
// 兒童、成人、老人不同費率
```

---

## 📁 檔案變更清單

### 新增檔案

- `src/features/confirmations/services/create-insurance-requirement.ts`

### 修改檔案

- `src/features/confirmations/components/RequirementsList.tsx`
  - 在 `loadData()` 加入自動建立邏輯
  - UI 加入保險項目特殊標記（可選）

### 測試檔案（未來）

- `src/features/confirmations/services/__tests__/create-insurance-requirement.test.ts`

---

## 🚀 部署檢查

- [ ] 程式碼已 commit
- [ ] 已在開發環境測試
- [ ] 已在 staging 測試（如果有）
- [ ] 通知業務新功能上線
- [ ] 更新用戶文件（如果需要）

---

## 📞 聯絡

**有問題找**：
- 需求確認：William
- 技術問題：Matthew
- 測試協助：Leon/Ben

---

## 🔖 版本記錄

| 版本 | 日期 | 變更 |
|------|------|------|
| 1.0 | 2026-03-17 | 初版規格 |
