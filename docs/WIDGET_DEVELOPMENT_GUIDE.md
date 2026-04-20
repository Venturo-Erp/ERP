# Dashboard Widget 開發指南

> 開發新的首頁 widget 前、先讀完這份。
> 特別注意：**付費 widget 要同步做租戶開通 UI**。

---

## 現行架構（2026-04-18）

- Widget 定義位置：`src/features/dashboard/components/widget-config.tsx`
- 資料表：`user_preferences`（排版順序）、`notes`（筆記內容）、其他依 widget 而定
- 權限：首頁整體不受職務（`role_tab_permissions`）管、所有員工都能用 widget
- 租戶開通：**目前所有 widget 預設開、沒有租戶級開關**

---

## 新增 widget 的 Checklist

### 1. Widget 本身
- [ ] 在 `widget-config.tsx` 的 `AVAILABLE_WIDGETS` 陣列加條目
- [ ] 建立元件檔（同目錄）
- [ ] 如有資料持久化：
  - 寫 hook (e.g. `use-notes.ts` 模式)
  - 建 DB 表 + migration + RLS policy + workspace_id FK

### 2. 判斷是否為付費 widget

**哪些算付費？**
- 針對企業加值的 widget（全團即時儀表板、AI 助理、進階統計）
- 需要額外 API 成本、或商業邏輯複雜的

**哪些算基本？**
- 個人工作工具（筆記、計算機、打卡、匯率、天氣、航班查詢）
- **預設通通免費、給所有員工**

### 3. 如果是付費 widget、**必做**這些額外步驟

這套機制跟「分頁級功能控制」共用架構（`workspace_features` + `{prefix}.{code}` 格式）。參考 `tours.contract` 的實作：

#### 3a. 資料層
- feature_code 格式：`dashboard.{widget_id}`（例：`dashboard.advanced_stats`）
- 存到 `workspace_features` 表、沿用現有 `enabled` 欄位
- **不動 DB schema**

#### 3b. widget-config.tsx 加過濾邏輯
```ts
// 在 widget-config.tsx 或 DashboardClient 渲染前過濾
const { isTabEnabled } = useWorkspaceFeatures()
const visibleWidgets = AVAILABLE_WIDGETS.filter(w => {
  if (w.category === 'premium') {
    return isTabEnabled('dashboard', w.id, 'premium')
  }
  return true
})
```

同時在 `AVAILABLE_WIDGETS` 該條目加 `category: 'premium'` 欄位。

#### 3c. **租戶管理頁新增 dashboard 模組卡片**（目前沒有）

今天 `src/app/(main)/tenants/[id]/page.tsx` 的 dashboard 不在 MODULES 裡、沒有「管理分頁」按鈕。
第一個付費 widget 上線時、要做：

1. **把 dashboard 加回 `src/lib/permissions/module-tabs.ts` 的 MODULES**
   ```ts
   {
     code: 'dashboard',
     name: '首頁',
     tabs: [
       { code: 'advanced_stats', name: '進階統計', category: 'premium' },
       // ...
     ],
   }
   ```
2. **確認租戶管理頁**（`/tenants/[id]`）的基本功能卡片 dashboard 列旁、自動出現齒輪按鈕 → Modal
   - 這部分 UI 已經寫好、沿用 `hasManageableTabs` 邏輯、只要 MODULES 有 tabs 就會顯示按鈕
3. **確認 `/hr/roles`**：首頁本來就不在權限矩陣、**不會重新出現**（`MODULES` 的 dashboard 只存 widget tabs、不存「讀/寫」權限）
   - 如果怕 role permission 誤被塞進 dashboard、在 role page 的 `visibleModules` 過濾 `m.code !== 'dashboard'`

#### 3d. 測試
- [ ] Venturo 帳號進任一租戶管理、開齒輪 → 看到 widget 清單、付費 widget 預設關
- [ ] 勾開付費 widget → 儲存 → 該租戶的員工首頁多出這個 widget
- [ ] 不勾 → 員工首頁看不到

---

## 為什麼這麼小心

目前首頁被刻意**排除在職務權限（role_tab_permissions）之外**、因為 widget 是「個人工作工具」。未來要做付費 widget、**不該讓任何員工買了也用不到**、所以租戶開通 = 該租戶全員工都能用。Widget 不走 role 權限。

---

## 快速連結

- Widget 定義：`src/features/dashboard/components/widget-config.tsx`
- 租戶管理頁：`src/app/(main)/tenants/[id]/page.tsx`
- MODULES 定義：`src/lib/permissions/module-tabs.ts`
- `isTabEnabled` helper：`src/lib/permissions/hooks.ts`
- 分頁級控制範例（合約）：`src/features/tours/components/TourTabs.tsx` 的 `contract` tab
