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

## 視覺設計規範（2026-04-23 定稿）

### 原則：**柔和 morandi 米金、統一四邊陰影、自適應高度**

不要用飽和色 CTA、不要用寫死高度、不要破版面一致性。

### 容器結構（4 個 widget 必走這套）

```tsx
<div className="h-full">                                    {/* SortableWidget 會給 h-full + min-h-0 */}
  <div className="h-full rounded-2xl border border-border/70 shadow-lg backdrop-blur-md
                  transition-all duration-300 hover:shadow-lg hover:border-border/80
                  bg-gradient-to-br from-[widget主色] via-card to-[widget輔色]">
    <div className="p-4 space-y-3 h-full flex flex-col">
      {/* Header */}
      {/* Content */}
      {/* Actions (optional) */}
    </div>
  </div>
</div>
```

- **圓角**：`rounded-2xl`
- **陰影**：`shadow-lg`（靠 DashboardClient 的 `overflow-visible` content 區保護不被切）
- **邊框**：`border border-border/70`
- **內距**：`p-4 space-y-3`（不要 p-5 / space-y-4、會太鬆）

### Header 結構（4 個 widget 必一致）

```tsx
<div className="flex items-start gap-2">
  <div className={cn(
    'rounded-full p-2 text-white shadow-sm shadow-black/10',
    'bg-gradient-to-br from-morandi-gold/40 to-morandi-container/60',  {/* 柔和米金 icon 背景 */}
    'ring-1 ring-border/50'
  )}>
    <IconName className="w-4 h-4 drop-shadow-sm" />
  </div>
  <div className="flex-1 min-w-0">                               {/* min-w-0 避免長文字擠破版 */}
    <p className="text-sm font-semibold text-morandi-primary leading-tight tracking-wide">
      {title}
    </p>
    <p className="text-xs text-morandi-secondary/90 mt-1 leading-relaxed truncate">
      {subtitle}                                                 {/* 或動態資訊、如日期 */}
    </p>
  </div>
</div>
```

**關鍵尺寸**（4 個 widget 都一致、不要只改一個）：
- Icon 圓框：`p-2`（不要 p-2.5）
- Icon 本體：`w-4 h-4`（不要 w-5 h-5）
- 外框 ring：`ring-1`（不要 ring-2 + ring-offset）
- Shadow：`shadow-sm`（不要 shadow-lg）
- 文字間距：`gap-2`（不要 gap-3）

### 按鈕規範

**CTA 主按鈕**（= 號、上班等）：
```tsx
className="bg-gradient-to-br from-morandi-gold/40 to-morandi-container/60
           text-morandi-primary ring-1 ring-border/50
           hover:from-morandi-gold/60 hover:to-morandi-container/80
           shadow-md hover:shadow-lg rounded-xl"
```
→ 柔和米金漸層、深色文字、**不用白字 + 飽和金**（跟 morandi 風格衝突）

**次要按鈕**（數字鍵等）：
```tsx
className="bg-gradient-to-br from-card to-morandi-container/30
           border border-morandi-gold/30
           hover:from-morandi-gold/10 hover:to-morandi-gold/20
           hover:border-morandi-gold/50
           shadow-sm hover:shadow-md rounded-xl"
```
→ 幾乎白底、hover 才出金色

**已完成 / Disabled**：
```tsx
className="bg-gradient-to-br from-morandi-green/10 to-morandi-green/20
           border border-morandi-green/30 text-morandi-green"
```
→ 淡綠或淡金、表示狀態、不可互動

### 響應式（Dashboard 佈局、不是單一 widget）

Grid 用 **container query**、不是 viewport：

```tsx
<div className="@container flex-1 min-h-0">
  <div className="grid grid-cols-1 @md:grid-cols-2 @5xl:grid-cols-3 @min-[1500px]:grid-cols-4
                  grid-rows-2 auto-rows-fr gap-6 h-full">
```

- 判斷依據是 grid 父容器**實際寬度**（含 sidebar 收合計算）、不是 viewport
- Widget 高度 = row 高度自動分配、不寫死 `h-96`
- 內容超過 row 高度、widget 內部自己 `overflow-y-auto`

### 禁忌

| 不要 | 為什麼 |
|---|---|
| `bg-morandi-gold` 純飽和金 | 跟 morandi 淡雅風衝突 |
| `shadow-xl` 以上陰影 | 會被 content overflow 切掉 |
| 寫死 `h-96` / `h-[XXXpx]` | Mac 14/16 / 外接螢幕不同尺寸、會切或留白 |
| 三色 `from-X via-Y to-Z` 漸層 | 兩色太近看不出 via；想要明顯用透明度拉對比 |
| icon `w-5 h-5` / `p-2.5` | 跟已統一的 `w-4 h-4 / p-2` 不一致、只改一個會很怪 |
| 漏 `min-w-0` 在 flex-1 div | 長文字會把 widget 撐破欄 |

### 新增 widget 的視覺檢查清單

寫完 widget、動工前比對這 6 點：

- [ ] 容器用 `rounded-2xl shadow-lg p-4 space-y-3`
- [ ] Header icon `p-2 / w-4 h-4 / ring-1`、跟其他 widget 視覺對齊
- [ ] Icon 漸層用柔和米金 `from-morandi-gold/40 to-morandi-container/60`（或該 widget 的對應色系、保持飽和度層級）
- [ ] 按鈕全部漸層、禁止 `bg-morandi-gold` 純色
- [ ] 全部 `text-morandi-primary` / `text-morandi-secondary`、不直接寫 `text-black` / `text-gray-500`
- [ ] 內容如果可能超過 widget 高度、加 `overflow-y-auto`（如便條紙、計算機）

---

## 快速連結

- Widget 定義：`src/features/dashboard/components/widget-config.tsx`
- 租戶管理頁：`src/app/(main)/tenants/[id]/page.tsx`
- MODULES 定義：`src/lib/permissions/module-tabs.ts`
- `isTabEnabled` helper：`src/lib/permissions/hooks.ts`
- 分頁級控制範例（合約）：`src/features/tours/components/TourTabs.tsx` 的 `contract` tab
