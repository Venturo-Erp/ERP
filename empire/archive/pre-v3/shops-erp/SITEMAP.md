# Venturo ERP 網站地圖和業務邏輯

**最後更新**：2026-03-13  
**總路由數**：78 個

---

## 🎯 核心業務流程

### **旅遊團生命週期**

```
1. 建立旅遊團
   └─ tours（開團/提案/模板）
   
2. 規劃行程
   └─ tour_itinerary_items（核心表：飯店/餐廳/行程）
   └─ itineraries.daily_itinerary（展示層：給客戶看的）
   
3. 產生報價
   └─ quotes（讀取核心表計算成本）
   
4. 客戶下訂
   └─ orders（訂單）+ order_members（團員）
   
5. 向供應商詢價
   └─ tour_requests（需求單：讀取核心表）
   
6. 確認訂單
   └─ tour_confirmation_sheets（確認單：讀取核心表）
   
7. 收款付款
   └─ payment_requests（請款單）
   └─ disbursement_orders（撥款單）
   
8. 出團結算
   └─ tour_expenses（結帳單：讀取核心表）
```

---

## 📊 核心資料表

### **旅遊團核心表**

| 表格 | 用途 | 資料性質 |
|------|------|---------|
| **tours** | 主表 | 團號、機場代號、國家、出發日 |
| **tour_itinerary_items** | 核心表（唯一真相來源） | 飯店/餐廳/行程/成本 |
| **itineraries** | 展示層 | daily_itinerary（給客戶看的） |

### **報價相關**

| 表格 | 用途 |
|------|------|
| **quotes** | 報價單（讀取核心表） |
| **tier_pricings** | 分級定價（成人/兒童/嬰兒） |

### **訂單相關**

| 表格 | 用途 |
|------|------|
| **orders** | 訂單主表 |
| **order_members** | 團員資料 |

### **供應商相關**

| 表格 | 用途 |
|------|------|
| **tour_requests** | 需求單（讀取核心表） |
| **tour_confirmation_sheets** | 確認單（讀取核心表） |
| **suppliers** | 供應商資料 |

### **財務相關**

| 表格 | 用途 |
|------|------|
| **payment_requests** | 請款單（代收） |
| **disbursement_orders** | 撥款單（代付） |
| **tour_expenses** | 結帳單（讀取核心表） |

---

## 🗺️ 網站地圖（78 個路由）

### **🏠 首頁和儀表板**

- `/` — 首頁
- `/dashboard` — 儀表板
- `/monitoring` — 監控中心（AI Agents）
- `/workspace` — 工作區

---

### **✈️ 旅遊團管理**

#### **主要功能**
- `/tours` — 旅遊團列表
- `/tours/[code]` — 旅遊團詳情頁
  - Tab: 基本資訊
  - Tab: 行程規劃（tour_itinerary_items 核心表）
  - Tab: 報價單
  - Tab: 訂單
  - Tab: 需求單
  - Tab: 確認單
  - Tab: 檔案管理

#### **行程編輯**
- `/itinerary` — 行程列表
- `/itinerary/new` — 行程編輯器（核心！）
  - 編輯 daily_itinerary（展示層）
  - 編輯 tour_itinerary_items（核心表）
- `/itinerary/block-editor` — 區塊編輯器
- `/itinerary/print` — 列印行程表

#### **報價管理**
- `/quotes` — 報價單列表
- `/quotes/[id]` — 報價單詳情（讀取核心表計算成本）
- `/quotes/quick/[id]` — 快速報價

---

### **👥 客戶和訂單**

- `/customers` — 客戶列表
- `/customers/companies` — 企業客戶
- `/customer-groups` — 客戶群組
- `/orders` — 訂單管理
  - 關聯 order_members（團員）
  - 關聯 payment_requests（請款）

---

### **💰 財務管理**

#### **主要功能**
- `/finance` — 財務總覽
- `/finance/payments` — 收付款記錄
- `/finance/requests` — 請款單（代收）
- `/finance/treasury` — 金庫管理
- `/finance/treasury/disbursement` — 撥款單（代付）

#### **旅遊發票**
- `/finance/travel-invoice` — 旅遊發票列表
- `/finance/travel-invoice/[id]` — 發票詳情
- `/finance/travel-invoice/create` — 建立發票

#### **財務報表**
- `/finance/reports` — 報表總覽
- `/finance/reports/monthly-income` — 月收入報表
- `/finance/reports/monthly-disbursement` — 月支出報表
- `/finance/reports/tour-pnl` — 團體損益表（讀取核心表）
- `/finance/reports/unpaid-orders` — 未付款訂單
- `/finance/reports/unclosed-tours` — 未結團報表

---

### **🏢 供應商管理**

- `/database/suppliers` — 供應商資料庫
- `/supplier/requests` — 需求單管理（讀取核心表）
- `/supplier/dispatch` — 派車管理
- `/supplier/finance` — 供應商財務

---

### **📚 資料庫**

- `/database` — 資料庫總覽
- `/database/attractions` — 景點資料庫
- `/database/fleet` — 車隊管理
- `/database/tour-leaders` — 領隊資料
- `/database/transportation-rates` — 交通費率
- `/database/company-assets` — 公司資產
- `/database/workspaces` — 工作空間管理
- `/database/archive-management` — 封存管理

---

### **🎨 設計和網站**

- `/design` — 網站設計總覽
- `/design/new` — 網站編輯器
  - 使用 daily_templates（模板）
  - 讀取 daily_itinerary（行程展示）
- `/brochure` — 手冊預覽
- `/brochures` — 手冊管理

---

### **📋 確認單和文件**

- `/confirmations` — 確認單列表（讀取核心表）
- `/confirmations/[id]` — 確認單詳情
- `/contracts` — 合約管理
- `/files` — 檔案管理

---

### **📅 行事曆和待辦**

- `/calendar` — 行事曆（團體出發日）
- `/scheduling` — 排程管理
- `/todos` — 待辦事項

---

### **📊 報表**

- `/reports/tour-closing` — 結團報表

---

### **🛂 簽證和 eSIM**

- `/visas` — 簽證管理
- `/esims` — eSIM 管理

---

### **👨‍💼 人力資源**

- `/hr` — 人資總覽
- `/hr/attendance` — 出勤管理
- `/hr/leave` — 請假管理
- `/hr/payroll` — 薪資管理

---

### **📱 行銷和溝通**

- `/marketing` — 行銷管理
- `/traveler-chat` — 旅客對話
- `/meeting` — 會議室

---

### **⚙️ 設定**

- `/settings` — 設定總覽
- `/settings/company` — 公司設定
- `/settings/workspaces` — 工作空間設定
- `/settings/permissions` — 權限管理
- `/settings/menu` — 選單設定
- `/settings/modules` — 模組設定

---

### **🛠️ 工具**

- `/tools/flight-itinerary` — 航班行程工具
- `/tools/hotel-voucher` — 飯店憑證工具
- `/tools/reset-db` — 重置資料庫（開發用）

---

### **🔐 系統**

- `/login` — 登入頁
- `/unauthorized` — 未授權頁
- `/tenants` — 租戶管理
- `/office` — 辦公室
- `/office/editor` — 辦公室編輯器

---

## 🎯 核心架構原則

### **1️⃣ 核心表是唯一真相來源**

**tour_itinerary_items = 唯一真相來源**

- ✅ 所有飯店/餐廳/行程/成本都記錄在這裡
- ✅ 其他表格（報價/需求/確認/結帳）都是**讀取**核心表
- ❌ 不要在其他地方重複記錄相同資料

### **2️⃣ 展示層和業務邏輯分離**

**daily_itinerary（展示層）vs tour_itinerary_items（業務邏輯）**

- itineraries.daily_itinerary = 給客戶看的（漂亮的行程表）
- tour_itinerary_items = 給公司用的（成本管理/供應商）
- 兩者用途不同，都需要保留

### **3️⃣ 簡單勝過複雜**

- ✅ 保持架構簡單
- ✅ 避免過度設計
- ✅ 不要建立不必要的中間表

### **4️⃣ 聚焦產品化**

- ERP 產品化 + 第一個外部客戶 = 唯一重要的事
- 技術債可以等，客戶不能等

---

## 📋 重要業務規則

### **旅遊團建立**
- 三種方式：開團（有出發日）/提案（無出發日）/模板（無出發日）
- 都寫入同一個 `tours` 表，只是 `status` 不同
- 必須記錄：`airport_code`（機場代號）+ `country`（國家）

### **行程規劃**
- 行程編輯器（/itinerary/new）是核心功能
- 同時編輯兩個資料來源：
  - daily_itinerary（展示層：title/highlight/description）
  - tour_itinerary_items（業務邏輯：hotel/meals/cost）

### **報價流程**
1. 讀取 tour_itinerary_items（核心表）
2. 計算總成本（estimated_cost）
3. 加上毛利（8-15%）
4. 產生報價單（quotes）

### **需求單流程**
1. 讀取 tour_itinerary_items（核心表）
2. 按供應商分組
3. 產生需求單（tour_requests）
4. 發送給供應商

### **確認單流程**
1. 供應商回覆報價
2. 讀取 tour_itinerary_items（核心表）
3. 更新 actual_cost（實際成本）
4. 產生確認單（tour_confirmation_sheets）

### **結帳流程**
1. 出團結束
2. 讀取 tour_itinerary_items（核心表）
3. 計算 estimated_cost vs actual_cost
4. 產生結帳單（tour_expenses）
5. 計算毛利

---

## 📊 資料流向圖

```
建立旅遊團（tours）
    ↓
規劃行程（行程編輯器）
    ├─ itineraries.daily_itinerary（展示層）
    └─ tour_itinerary_items（核心表）⭐
        ↓
        ├─ quotes（報價單）→ 讀取核心表計算成本
        ├─ tour_requests（需求單）→ 讀取核心表詢價
        ├─ tour_confirmation_sheets（確認單）→ 讀取核心表確認
        └─ tour_expenses（結帳單）→ 讀取核心表結算
```

---

## 🎨 前端設計原則

### **Venturo 產品信念**
1. **流暢** — 減少點擊，記住習慣
2. **準確** — 資料模型優先，不硬做
3. **不囉嗦** — 只顯示需要的資訊
4. **簡化** — 複雜的事情，簡單地呈現
5. **資料是護城河** — 功能可以複製，資料和業務邏輯不能

### **UI 設計風格**
- Morandi 色系（柔和質感）
- 減少認知負擔
- Tab 式導航（tours/[code] 頁面）
- 靈活的 JSONB 欄位（給業務彈性）

---

## 🚀 下一步

### **產品化重點**
1. **第一個外部客戶** — 唯一重要的事
2. **核心功能驗證** — 確保核心流程順暢
3. **資料完整性** — 核心表資料正確
4. **使用者體驗** — 減少點擊、流暢操作

### **技術債管理**
- ✅ 真正沒用的表格 → 立刻刪除
- ✅ 已刪除功能的殘留 → 立刻清理
- ⏸️ 不同用途的欄位 → 保留（不是技術債）
- ⏸️ 架構優化 → 等有第一個客戶後再評估

---

**維護者**：馬修（Matthew）  
**最後更新**：2026-03-13
