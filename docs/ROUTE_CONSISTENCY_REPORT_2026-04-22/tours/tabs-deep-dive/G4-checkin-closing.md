# G4 深挖研究報告：報到 & 結案 Tab

**Group 4 研究日期**：2026-04-22  
**深挖對象**：`報到 (checkin)` / `結案 (closing)` Tab

---

## 1. 報到 Tab (`tab_value='checkin'`)

**位置**：`src/features/tours/components/tour-checkin/`（含 CheckinMemberList、CheckinQRCode、CheckinSettings）+ 行動版 `src/app/m/tours/[id]/`

### 業務目的推斷
- 現場點名、QR Code 掃描核確；領隊用行動版 scan，PC 版支援手動點名備查
- 狀態一鍵遠端管理（啟用/禁用報到功能）、統計進度條

### 完成度 %
- **UI 層**：✅ 95% — 完整設計（QR Code、成員列表、統計卡片）
- **讀**：✅ 100% — 從 order_members 取 checked_in/checked_in_at（含篩選、搜尋）
- **寫**：✅ 100% — 直寫 order_members.checked_in / checked_in_at（含 toggle enable_checkin on tours 表）
- **操作**：✅ 90% — 手動報到、取消、QR code 掃描已建，惟無「確認掃描」的二次驗證（身分證末 4 碼）
- **下游連動**：⚠️ 50% — 計數正確，但無與 ProfitTab 的銜接；報到結果未觸發提醒

### DB 表依賴
- `tours` (enable_checkin, id)
- `orders` (tour_id → 取 id)
- `order_members` (checked_in: boolean, checked_in_at: timestamptz, workspace_id)

### 核心 hooks / services
- `supabase.from('orders'/'order_members').select/update`（直接 RLS）
- `toast.success/error`（本地反饋）
- `formatDateMonthDayChinese` / `useTourDisplay`（顯示輔助）

### SSOT 有沒有斷
✅ **完整** — 單一真相源：order_members 表上的 checked_in / checked_in_at，無冗餘快取

### 對照 8 條原則
1. **狀態是 SSOT** 🟢 — checked_in 唯一欄位；無「待確認/已確認」分層
2. **寫入必驗業務** 🟡 — 無身分證末 4 碼二驗；QR code URL 直連 online 系統，掃描驗證邏輯在彼方
3. **租戶隔離** 🟢 — order_members.workspace_id 已取，但 supabase query **未明確過濾 workspace_id**（靠 RLS 隱式防護）
4. **既讀既寫隔離** 🟢 — 讀寫同 order_members，無分層
5. **API 明確分角色** 🟡 — CheckinSettings 中切換 enable_checkin 無權限判斷（任何團員可開關？）
6. **小故障不脫線** 🟡 — 離線掃描無本地快取；網路掉線 → 點名失敗
7. **帳務清潔** 🟢 — checked_in 無金錢關聯；不影響收支
8. **未來彈性** 🟡 — 無「多層檢查」（e.g. 領隊核確 → 財務確認）

### 紅旗（業務語言）
1. **QR Code 掃描二驗缺失** — 現行設計無「輸入身分證末 4 碼」的身份確認；可能刷重複
2. **行動版與 PC 版邏輯未共用** — 行動版完全獨立 supabase 查詢，非整合組件；兩版分開演進風險
3. **租戶隔離靠隱式 RLS** — Query 未顯式 eq('workspace_id', user.workspace_id)；若 RLS 策略改動立刻漏水
4. **enable_checkin 無權限卡** — 誰能啟用/禁用報到功能？管理員？領隊？無檢查
5. **報到記錄無用途跟蹤** — checked_in 欄位存，但下游無 hook；無人用這個資料做後續動作

### 特別針對
- **QR code 產生完成度** ✅ 100% — CheckinQRCode.tsx 生成正確 URL (${ONLINE_BASE_URL}/checkin/${tour.code})，支援複製、下載、列印
- **掃描流程** ⚠️ **待驗** — 掃描動作在 online 系統，ERP 無對應 API；無二驗邏輯
- **行動版與 PC 版共用** ❌ — 行動版獨立 `src/app/m/tours/[id]/page.tsx`；不共用 CheckinMemberList 組件；如改 checkin 邏輯需雙修
- **租戶隔離（領隊掃描別租戶團員會怎樣）** ⚠️ **隱式防護** — RLS on order_members 應隔離，但 ERP 未顯式檢查；若 online 系統掃描返回跨租戶成員 ID，ERP 會無聲失敗（無 workspace_id 校驗）
- **checkin 紀錄存哪張表** ✅ — `order_members.checked_in` (boolean) + `order_members.checked_in_at` (timestamptz)；無單獨審計表

---

## 2. 結案 Tab (`tab_value='closing'`)

**位置**：`src/features/tours/components/tour-closing-tab.tsx` + 子組件（TourOverview、TourPayments、TourCosts、ProfitTab、BonusSettingTab）

### 業務目的推斷
- 團務完結點：收入確認、支出確認、利潤計算、獎金分配、PDF 報告生成
- 大主管視角：總覽「待確認/已確認」分層；獎金是否該發 / 公司淨利多少

### 完成度 %
- **UI 層**：🟠 60% — 總覽卡、收款表、請款表、利潤表已有；**缺「結帳按鈕動作」（actual_expense 寫入未實裝）**
- **讀**：✅ 95% — receipts (status='1' 已確認), paymentRequests, bonusSettings, memberCount 全讀
- **寫**：🔴 **40%** — closing_status toggle 能寫，**但 actual_expense/expense_note/expense_at 欄位零寫入**（表存欄位，無 hook）
- **操作**：🟡 55% — PDF 生成 OK，closing_status 標記 OK，**但缺「實際支出金額輸入」操作**
- **下游連動**：⚠️ 30% — ProfitTab 依賴結帳資料，BonusSettingTab 可用，但若支出未確認 → 利潤計算基於估算（paymentRequests.amount）

### DB 表依賴
- `tours` (closing_status, closing_date, id, code, name)
- `orders` (tour_id, member_count, total_amount)
- `receipts` (tour_id, order_id, actual_amount, receipt_amount, status='1')
- `order_members` (order_id, checked_in, profit 等銷售欄位)
- `payment_requests` (tour_id, amount, status, supplier_name)
- `tour_bonus_settings` (tour_id, type, bonus, bonus_type, employee_id)
- `tour_itinerary_items` **[未直接用]** — 含 actual_expense, expense_note, expense_at（**存無用**）

### 核心 hooks / services
- `useReceipts()`, `usePaymentRequests()`, `useTourBonusSettings()`, `useMembers()`, `useOrdersSlim()`（SWR 讀取）
- `calculateFullProfit()` — 利潤引擎，公式：收入(confirmed) - 支出(paymentRequests.amount) - 行政費(N/人) - 稅 = 淨利 → 獎金分配
- `generateTourClosingPDF()` — PDF 報告
- `updateTour()` — 寫 closing_status / closing_date

### SSOT 有沒有斷
⚠️ **部分斷裂**：
- `receipts.actual_amount` vs `receipts.receipt_amount` — 二者都讀，優先 actual_amount；業務上「收入」是哪個？
- `totalExpense` = `paymentRequests.reduce(amount)` — **無持久化**；每次重算；若 paymentRequests 誤刪 → 利潤算錯
- `tour_itinerary_items.actual_expense` — **DB 有欄位，代碼零使用**；導致兩套支出體系並存（paymentRequests vs itinerary_items）

### 對照 8 條原則
1. **狀態是 SSOT** 🟡 — 收入有「待確認/已確認」(status='1')，但支出無分層（paymentRequests 無 status='confirmed' vs 'estimated'）；**ProfitTab 直讀已確認收入，混用估算支出**
2. **寫入必驗業務** 🔴 — actual_expense 欄位無寫；結帳未完 ❌
3. **租戶隔離** 🟢 — receipts/paymentRequests/bonusSettings 都由 tour.id 篩，隱式安全
4. **既讀既寫隔離** 🟡 — 讀 receipts (confirmed), 寫 closing_status；無細粒度衝突，但缺「支出確認」寫點
5. **API 明確分角色** 🟡 — 誰能按「標記結團」？無檢查（isAdmin 短路？）
6. **小故障不脫線** 🟢 — 讀寫分離，斷線重載可恢復
7. **帳務清潔** 🔴 — **actual_expense 冗餘欄位；paymentRequests 複數體系；未來寶貴的對帳點**
8. **未來彈性** 🔴 — 支出無「待確認/已確認」分層（原則 4 試煉失敗）；無法實現「大主管看分層利潤」

### 紅旗（業務語言）
1. **結帳 ≠ 結案**：代碼混淆。closing_status 只是標記狀態，無實際「結帳」寫操作；actual_expense 寫入絲毫無進展
2. **支出確認狀態漂浮**：paymentRequests.status 有 pending/confirmed，但 ProfitTab 忽視 status，直接 reduce 所有 amount；導致「待確認支出」誤入利潤計算
3. **利潤計算基準模糊**：確認收入 vs 全部支出 = 不對稱；應是「確認收入 - 確認支出」才合法（原則 4 相反例教）
4. **結帳按鈕缺失**：UI 有「標記結團」，無「結帳」按鈕；結帳動作去哪了？
5. **獎金依賴不穩**：若支出欄位缺值 → ProfitTab 利潤偏高 → 獎金過發 / 公司虧本；無驗證機制

### 特別針對

#### 結帳未完是主戰場
- **actual_expense 欄位無寫入** 🔴 — DB 有欄位（tour_itinerary_items），但代碼零寫；該欄位應記領隊實支金額
- **totalExpense 計算方式** 🟡 — `paymentRequests.reduce((s, pr) => s + (pr.amount || 0))` 即時算；無持久化 tour.total_cost
  - 問題：paymentRequests 誤刪 → 無法追溯原值
  - 應當：tour.total_cost (確認支出) vs tour.estimated_cost (估算) 分層存
- **缺「結帳確認」動作**：無界面讓用戶點「確認支出金額」、鎖定利潤計算

#### 結案 ≠ 結帳
- **結案** = closing_status = 'closed'（只改狀態，無金額鎖）
- **結帳** = actual_expense 寫入 + 支出確認 + 利潤固化
- 代碼混淆：handleToggleClosingStatus 誤名為「結案」，實為標記狀態，非真正結帳

#### ProfitTab 利潤計算公式
```
基礎公式 (profit-calculation.service.ts):
收款總額(confirmed) - 支出總額(全部) - 行政費(N/人) - 稅(%) = 淨利 → 獎金分配

實際代碼:
confirmedIncome = receipts.filter(r => r.status==='1').reduce(...)  // ✅ 已確認
totalExpense = paymentRequests.reduce(...)  // ❌ 全部支出，無確認篩選
```
- **分層缺失** ❌ — 無「待確認/已確認」支出分層；大主管無法區分「保守利潤(已確認支出)」vs「樂觀利潤(含待確認估算)」

#### BonusSettingTab 依賴斷裂
- 利潤計算依賴 paymentRequests 全集 + bonusSettings；若支出未確認，獎金可能誤算
- **無驗證**：若 actual_expense 為空、paymentRequests 為空 → 利潤 = 確認收入（虛高）→ 獎金過發

#### 誰能按「結案」按鈕
- `handleToggleClosingStatus` 無權限判斷 ⚠️
- 假設：tour 頁籤組件外層已有權限卡（靠 tab 能見性），但此處無二次驗證
- 應當：`if (!isAdmin && !user.permissions.includes('tour_closing'))` → 禁用按鈕

---

## 綜合問題矩陣

| 面向 | 報到 | 結案 | 優先度 | 根因 |
|------|------|------|--------|------|
| 完成度 | 95% | 40% | P0 | 支出寫入未實裝 |
| SSOT | ✅ | 🟡 部分斷 | P0 | actual_expense 冗餘欄位 |
| 分層（原則4） | ✅ | 🔴 無支出分層 | P0 | paymentRequests 無 status 篩選 |
| 業務驗證 | 🟡 無二驗 | 🔴 無結帳操作 | P1 | 設計當時未實裝完整流程 |
| 租戶隔離 | 🟡 隱式 | 🟢 隱式 | P2 | RLS 防護足，但代碼未顯式 |
| 權限檢查 | 🟡 缺缺 | 🟡 缺缺 | P2 | 無 isAdmin / permission 卡 |

---

## 修復建議

### 報到 Tab
1. **加身分證末 4 碼二驗** — online 系統掃描後、ERP 驗證前 require passport_number 末位
2. **顯式 workspace_id 篩選** — select … where workspace_id = user.workspace_id
3. **enable_checkin 加權限卡** — 僅 isAdmin 或具「團務管理」權限的人

### 結案 Tab（主修）
1. **actual_expense 寫入 hook** — 在結帳頁加「實際支出金額」欄、寫入 tour_itinerary_items.actual_expense + expense_note + expense_at
2. **支出確認分層** — paymentRequests.status 區分；ProfitTab 分別計「確認支出」和「全部支出」利潤
3. **結帳 ≠ 結案** — 分兩步：(1) 結帳（鎖定支出）→ (2) 標記結案；按鈕改名、邏輯清晰
4. **tour.total_cost 持久化** — 不再 paymentRequests 即時算，而是結帳時寫入 tours.total_cost
5. **ProfitTab 分層展示** — 分欄顯示「已確認利潤」vs「全部支出利潤」
6. **權限卡** — handleToggleClosingStatus + 結帳操作都檢 isAdmin

---

_此報告重點聚焦「結帳未完是團末層的主戰場」；報到 Tab 設計成熟、結案 Tab 實裝中斷。_
