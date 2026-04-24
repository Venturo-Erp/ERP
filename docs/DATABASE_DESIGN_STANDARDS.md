# Venturo 資料庫設計規範

> 版本：2.0
> 建立日期：2026-01-12
> 適用範圍：venturo-erp 與 venturo-online 共用資料庫

---

## 一、Venturo 核心概念

### 1.1 這是什麼系統？

**Venturo 不只是 ERP，而是一個完整的旅遊業數位生態系統。**

```
┌─────────────────────────────────────────────────────────────────────┐
│                         VENTURO 生態系統                             │
├─────────────────────────────┬───────────────────────────────────────┤
│     venturo-erp             │           venturo-online               │
│     (員工內部營運)           │           (旅客會員體驗)               │
│                             │                                        │
│  • 團管理、訂單處理          │  • 會員入口、行程瀏覽                  │
│  • 報價設計、行程規劃        │  • 線上報名、付款                      │
│  • 財務會計、人資管理        │  • 旅途日誌、照片牆                    │
│  • 供應商管理、簽證辦理      │  • 團員互動、推薦分享                  │
│                             │                                        │
│       員工專用               │            旅客專用                    │
└─────────────────────────────┴───────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │     Supabase        │
                    │   (共享資料庫)       │
                    └─────────────────────┘
```

### 1.2 價值飛輪

這是 Venturo 的商業模式核心：

```
┌────────┐    ┌────────┐    ┌────────┐    ┌────────┐    ┌────────┐
│  設計   │───►│  銷售   │───►│  出發   │───►│  回憶   │───►│  推薦   │
│ (ERP)  │    │(ERP+會員)│    │ (會員)  │    │ (會員)  │    │ (會員)  │
└────────┘    └────────┘    └────────┘    └────────┘    └───┬────┘
     ▲                                                       │
     └───────────────── 新客戶加入 ◄──────────────────────────┘
```

| 階段     | 系統         | 主要功能                                 |
| -------- | ------------ | ---------------------------------------- |
| **設計** | ERP          | 員工設計行程、製作報價單、上傳景點照片   |
| **銷售** | ERP + Online | 客戶瀏覽行程、線上報名、ERP 處理訂單收款 |
| **出發** | Online       | 旅客查看行程、領隊通知、團員互動         |
| **回憶** | Online       | 上傳照片、GPS 軌跡、生成回憶相簿         |
| **推薦** | Online → ERP | 分享連結給親友、親友變新客戶             |

---

## 二、核心業務流程

### 2.1 提案到旅遊團的完整生命週期

這是 Venturo ERP 最重要的業務流程：

```
【客戶詢價】
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 提案階段 (proposals)                                             │
│                                                                 │
│   狀態：草稿 (draft) → 洽談中 (negotiating)                      │
│                                                                 │
│   ├── 套件 A (proposal_packages)                                │
│   │     ├── 報價單 (quotes) ─ 費用明細                          │
│   │     ├── 行程表 (itineraries) ─ 每日行程（簡易版）            │
│   │     └── 時間軸資料 (timeline_data) ─ 每日行程（時間軸版）     │
│   │                                                             │
│   ├── 套件 B (另一個報價版本)                                    │
│   │     └── ...                                                 │
│   │                                                             │
│   └── 套件 C (第三個版本)                                        │
│         └── ...                                                 │
│                                                                 │
│   客戶選定套件 → 轉開團                                          │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼ 轉開團 (ConvertToTour API)
┌─────────────────────────────────────────────────────────────────┐
│ 旅遊團階段 (tours)                                               │
│                                                                 │
│   狀態：已確認 → 進行中 → 待結案 → 結案                          │
│                                                                 │
│   ├── 訂單 (orders)                                             │
│   │     └── 旅客 (order_members) ─ 護照、聯絡方式                │
│   │                                                             │
│   ├── 需求單 (tour_requests)                                    │
│   │     └── 向供應商採購：機票、飯店、餐廳、交通                  │
│   │                                                             │
│   ├── 財務                                                      │
│   │     ├── 請款單 (payment_requests) ─ 付給供應商               │
│   │     ├── 收款單 (receipt_orders) ─ 向客戶收款                 │
│   │     └── 出納單 (disbursement_orders) ─ 公司支出              │
│   │                                                             │
│   ├── 分配                                                      │
│   │     ├── 房間 (tour_rooms) ─ 住宿安排                        │
│   │     └── 車輛 (tour_vehicles) ─ 交通安排                     │
│   │                                                             │
│   └── 團控 (tour_control_forms) ─ 領隊管理                      │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼ 出團後
┌─────────────────────────────────────────────────────────────────┐
│ 會員體驗階段 (venturo-online)                                    │
│                                                                 │
│   ├── 行程資訊 (traveler_trips)                                 │
│   ├── 即時通知 (traveler_messages)                              │
│   ├── 照片牆 (照片上傳)                                         │
│   └── 分帳功能 (split_groups)                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 資料關聯圖

```
proposals (提案)
  │
  └─── proposal_packages (套件) ─────────────────────┐
         │                                           │
         ├── quote_id ──────► quotes (報價單)        │
         │                      └── quote_items      │
         │                                           │
         ├── itinerary_id ──► itineraries (行程表)   │
         │                                           │
         └── timeline_data (JSONB 時間軸)            │
                                                     │
                                                     ▼
tours (旅遊團) ◄── proposal_package_id ──────────────┘
  │
  ├── orders (訂單)
  │     └── order_members (旅客)
  │
  ├── tour_requests (需求單)
  │     └── tour_request_items
  │           └── request_responses (供應商回覆)
  │
  ├── payment_requests (請款單)
  │     └── payment_request_items
  │
  ├── receipt_orders (收款單)
  │     └── receipts
  │
  ├── tour_rooms (住宿)
  │     └── tour_room_assignments
  │
  ├── tour_vehicles (交通)
  │     └── tour_vehicle_assignments
  │
  └── tour_control_forms (團控)
```

---

## 三、資料隔離原則

### 3.1 Workspace 概念

Venturo 是多租戶系統，每個「工作空間 (workspace)」代表一家公司或分公司。

```
┌─────────────────────────────────────────────────────────────────┐
│                      Supabase 資料庫                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Workspace A (台北總公司)         Workspace B (台中分公司)       │
│  ┌─────────────────────┐         ┌─────────────────────┐        │
│  │ tours               │         │ tours               │        │
│  │ orders              │         │ orders              │        │
│  │ quotes              │    ✗    │ quotes              │        │
│  │ ...                 │◄───────►│ ...                 │        │
│  └─────────────────────┘ 互相看   └─────────────────────┘        │
│         ▲               不到對方           ▲                     │
│         │                                  │                     │
│    員工 A1, A2, A3                    員工 B1, B2                 │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  共用資料（所有 workspace 都看得到）                              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ countries, cities, regions (地理資料)                       ││
│  │ ref_airlines, ref_airports (航空參考)                       ││
│  │ suppliers, attractions (供應商、景點)                        ││
│  │ templates (各種模板)                                        ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  擁有平台管理資格的人（可以跨 workspace 看所有資料）                      │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 三層資料分類

| 分類         | 特徵         | 範例                 | workspace_id | RLS     |
| ------------ | ------------ | -------------------- | ------------ | ------- |
| **業務資料** | 屬於特定公司 | 旅遊團、訂單、報價單 | ✅ 必須有    | ✅ 啟用 |
| **共用資料** | 所有公司共享 | 國家、城市、供應商   | ❌ 不需要    | ❌ 禁用 |
| **會員資料** | 屬於特定旅客 | 旅客行程、聊天訊息   | 透過 user_id | ✅ 啟用 |

### 3.3 RLS (Row Level Security) 規則

**業務資料的 RLS 模板：**

```sql
-- 員工只能看自己公司的資料
CREATE POLICY "tours_select" ON public.tours FOR SELECT
USING (workspace_id = get_current_user_workspace() OR is_super_admin());

-- 員工只能在自己公司建立資料
CREATE POLICY "tours_insert" ON public.tours FOR INSERT
WITH CHECK (workspace_id = get_current_user_workspace());
```

**會員資料的 RLS 模板：**

```sql
-- 會員只能看自己參加的行程
CREATE POLICY "traveler_trips_select" ON public.traveler_trips FOR SELECT
USING (user_id = auth.uid());
```

---

## 四、表格分類規範

### 4.1 業務資料表格（需要 workspace 隔離）

#### 提案系統

| 表格                | 中文 | 說明         | 生命週期              |
| ------------------- | ---- | ------------ | --------------------- |
| `proposals`         | 提案 | 客戶詢價記錄 | 詢價→洽談→轉團或封存  |
| `proposal_packages` | 套件 | 報價版本方案 | 提案建立後→選定後轉團 |

#### 旅遊團管理

| 表格                  | 中文     | 說明               | 生命週期              |
| --------------------- | -------- | ------------------ | --------------------- |
| `tours`               | 旅遊團   | 團號、日期、目的地 | 轉團建立→出團→結案    |
| `orders`              | 訂單     | 客戶訂購記錄       | 開團→收款→出團        |
| `order_members`       | 旅客     | 護照、聯絡方式     | 訂單建立後→出團後保留 |
| `tour_leaders`        | 領隊指派 | 領隊人員           | 出團前指派            |
| `tour_addons`         | 團體加購 | 保險、WiFi 等      | 開團設定              |
| `tour_rooms`          | 房間分配 | 住宿安排           | 出團前規劃            |
| `tour_vehicles`       | 交通安排 | 車輛安排           | 出團前規劃            |
| `tour_departure_data` | 出發資訊 | 集合時間地點       | 出團前設定            |
| `tour_control_forms`  | 團控表   | 領隊管理表單       | 出團中使用            |

#### 行程與報價

| 表格            | 中文     | 說明         | 生命週期             |
| --------------- | -------- | ------------ | -------------------- |
| `itineraries`   | 行程表   | 每日行程安排 | 提案→開團→出團後保留 |
| `quotes`        | 報價單   | 客戶報價     | 提案→確認→鎖定       |
| `quote_items`   | 報價項目 | 費用明細     | 隨報價單             |
| `confirmations` | 確認書   | 客戶確認文件 | 確認後建立           |

#### 需求採購

| 表格                     | 中文       | 說明         | 生命週期       |
| ------------------------ | ---------- | ------------ | -------------- |
| `tour_requests`          | 需求單     | 向供應商採購 | 開團→回覆→確認 |
| `tour_request_items`     | 需求項目   | 採購明細     | 隨需求單       |
| `request_responses`      | 供應商回覆 | 回覆報價     | 供應商回覆時   |
| `request_response_items` | 回覆項目   | 回覆明細     | 隨回覆         |

#### 財務管理

| 表格                    | 中文     | 說明       | 生命週期      |
| ----------------------- | -------- | ---------- | ------------- |
| `payment_requests`      | 請款單   | 付給供應商 | 需求確認→付款 |
| `payment_request_items` | 請款項目 | 費用明細   | 隨請款單      |
| `receipt_orders`        | 收款單   | 向客戶收款 | 訂單→收齊     |
| `receipts`              | 收據     | 單筆收款   | 每次收款      |
| `disbursement_orders`   | 出納單   | 公司支出   | 付款時        |
| `payments`              | 付款記錄 | 交易記錄   | 付款時        |
| `travel_invoices`       | 代轉發票 | 旅行業發票 | 開立時        |

#### 會計系統

| 表格                | 中文     | 說明     | 生命週期     |
| ------------------- | -------- | -------- | ------------ |
| `journal_vouchers`  | 傳票     | 會計傳票 | 財務事件觸發 |
| `journal_lines`     | 傳票分錄 | 借貸明細 | 隨傳票       |
| `accounting_events` | 會計事件 | 觸發事件 | 業務操作時   |
| `chart_of_accounts` | 科目表   | 會計科目 | 初始設定     |
| `erp_bank_accounts` | 銀行帳戶 | 帳戶資訊 | 初始設定     |

#### 簽證管理

| 表格       | 中文     | 說明     | 生命週期       |
| ---------- | -------- | -------- | -------------- |
| `visas`    | 簽證申請 | 代辦記錄 | 收件→送件→取件 |
| `usa_esta` | 美國ESTA | 美簽申請 | 申請→核准      |

#### PNR/機票

| 表格             | 中文    | 說明        | 生命週期  |
| ---------------- | ------- | ----------- | --------- |
| `pnr_records`    | PNR記錄 | Amadeus訂位 | 訂位→出票 |
| `pnr_passengers` | PNR旅客 | 旅客名單    | 隨PNR     |
| `pnr_segments`   | 航班段  | 航班資訊    | 隨PNR     |
| `pnrs`           | 簡易PNR | 簡化訂位    | 快速建立  |

#### HR與排班

| 表格                  | 中文     | 說明     | 生命週期  |
| --------------------- | -------- | -------- | --------- |
| `leader_schedules`    | 領隊排班 | 值班表   | 每月排班  |
| `leader_availability` | 領隊狀態 | 可用時段 | 領隊設定  |
| `attendance_records`  | 出勤記錄 | 打卡     | 每日      |
| `leave_requests`      | 請假申請 | 假期     | 申請→核准 |
| `payroll_records`     | 薪資記錄 | 月薪     | 每月      |

#### 車隊管理

| 表格              | 中文     | 說明     | 生命週期  |
| ----------------- | -------- | -------- | --------- |
| `fleet_vehicles`  | 車輛     | 車輛登記 | 購入→報廢 |
| `fleet_drivers`   | 司機     | 司機資料 | 入職→離職 |
| `fleet_schedules` | 車輛排程 | 使用排程 | 出團前    |

#### 協作溝通

| 表格              | 中文   | 說明     | 生命週期  |
| ----------------- | ------ | -------- | --------- |
| `channels`        | 頻道   | 聊天頻道 | 建立→封存 |
| `messages`        | 訊息   | 聊天內容 | 發送      |
| `todos`           | 待辦   | 待辦事項 | 建立→完成 |
| `calendar_events` | 行事曆 | 日期提醒 | 建立→過期 |

#### 客戶管理

| 表格              | 中文     | 說明     | 生命週期  |
| ----------------- | -------- | -------- | --------- |
| `customers`       | 客戶     | 旅客資料 | 建立→長期 |
| `customer_groups` | 客戶分組 | VIP分類  | 設定      |
| `companies`       | 廠商     | 供應商   | 建立→長期 |

---

### 4.2 共用資料表格（禁用 RLS）

#### 地理參考

| 表格           | 中文 | 說明          |
| -------------- | ---- | ------------- |
| `countries`    | 國家 | IATA 國家代碼 |
| `cities`       | 城市 | 全球城市      |
| `regions`      | 地區 | 區域分組      |
| `ref_airports` | 機場 | IATA 機場代碼 |

#### 航空參考

| 表格                  | 中文     | 說明       |
| --------------------- | -------- | ---------- |
| `ref_airlines`        | 航空公司 | IATA 代碼  |
| `ref_booking_classes` | 艙等     | F/J/C/Y    |
| `ref_ssr_codes`       | 特殊服務 | 餐食、輪椅 |

#### 系統設定

| 表格                    | 中文     | 說明     |
| ----------------------- | -------- | -------- |
| `system_settings`       | 系統設定 | 全域參數 |
| `accounting_categories` | 會計分類 | 費用科目 |

#### 模板

| 表格               | 中文     | 說明       |
| ------------------ | -------- | ---------- |
| `cover_templates`  | 封面模板 | 行程表封面 |
| `daily_templates`  | 日程模板 | 每日行程   |
| `flight_templates` | 航班模板 | 常用航班   |

#### 供應商與景點

| 表格          | 中文   | 說明     |
| ------------- | ------ | -------- |
| `suppliers`   | 供應商 | 食宿交通 |
| `attractions` | 景點   | 旅遊景點 |
| `restaurants` | 餐廳   | 用餐地點 |
| `hotels`      | 飯店   | 住宿選擇 |

---

### 4.3 會員資料表格（venturo-online）

| 表格                    | 中文     | 說明     | 隔離方式        |
| ----------------------- | -------- | -------- | --------------- |
| `traveler_profiles`     | 旅客檔案 | 會員資料 | user_id         |
| `traveler_trips`        | 旅客行程 | 已購行程 | user_id         |
| `traveler_messages`     | 旅客訊息 | 群組聊天 | conversation_id |
| `traveler_expenses`     | 旅客費用 | 分帳記錄 | user_id         |
| `customer_travel_cards` | 會員卡   | 點數卡   | customer_id     |

---

## 五、命名規範

### 5.1 表格命名

| 規則       | 正確                          | 錯誤                  |
| ---------- | ----------------------------- | --------------------- |
| snake_case | `tour_requests`               | `TourRequests`        |
| 複數形式   | `orders`                      | `order`               |
| 有意義前綴 | `pnr_records`, `pnr_segments` | `records`, `segments` |

### 5.2 欄位命名

| 規則            | 正確         | 錯誤        |
| --------------- | ------------ | ----------- |
| snake_case      | `created_at` | `createdAt` |
| 外鍵加 \_id     | `tour_id`    | `tour`      |
| 布林用 is*/has* | `is_active`  | `active`    |

### 5.3 標準欄位

每個業務表格必須包含：

```sql
CREATE TABLE public.example (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 業務欄位...
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  updated_by TEXT
);
```

---

## 六、修復歷史

### 6.1 Workspace 隔離修復（2026-01-12 完成）

| 表格                     | 修復內容             | Migration                                           |
| ------------------------ | -------------------- | --------------------------------------------------- |
| `proposal_packages`      | ✅ 添加 workspace_id | `20260112200000_workspace_isolation_complete.sql`   |
| `tour_addons`            | ✅ 添加 workspace_id | `20260112210000_naming_convention_complete_fix.sql` |
| `request_response_items` | ✅ 添加 workspace_id | `20260112210000_naming_convention_complete_fix.sql` |

### 6.2 表格命名修復（2026-01-12 完成）

| 舊名稱                  | 新名稱                     | Migration                                           |
| ----------------------- | -------------------------- | --------------------------------------------------- |
| `Itinerary_Permissions` | ✅ `itinerary_permissions` | `20260112210000_naming_convention_complete_fix.sql` |
| `Tour_Expenses`         | ✅ `tour_expenses`         | `20260112210000_naming_convention_complete_fix.sql` |

### 6.3 欄位命名修復（2026-01-12 已確認）

以下欄位在 `20260112100000_consolidate_naming_convention.sql` 中已修復為 snake_case：

| 表格                    | 已修復欄位                                                                                                                          |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `payments`              | ✅ created_at, order_id, payment_date, payment_number, payment_type, received_by, tour_id, updated_at                               |
| `price_list_items`      | ✅ created_at, item_code, item_name, minimum_order, supplier_id, unit_price, updated_at, valid_from, valid_until                    |
| `quote_categories`      | ✅ created_at, quote_id, updated_at                                                                                                 |
| `quote_versions`        | ✅ change_note, created_at, created_by, quote_id                                                                                    |
| `receipt_payment_items` | ✅ created_at, item_name, receipt_id                                                                                                |
| `tour_refunds`          | ✅ created_at, member_id, order_id, processed_by, processing_status, refund_amount, refund_date, refund_reason, tour_id, updated_at |
| `payment_request_items` | ✅ unit_price                                                                                                                       |

### 6.4 目前狀態

**所有命名規範問題已修復** ✅

- 43 個欄位命名已改為 snake_case
- 2 個表格命名已改為 snake_case
- 3 個表格已添加 workspace_id
- TypeScript types.ts 已重新生成並同步

---

## 七、新增表格檢查清單

建立新表格前，確認：

- [ ] 這是什麼類型的資料？（業務/共用/會員）
- [ ] 屬於哪個業務流程？（提案/旅遊團/財務/...）
- [ ] 生命週期是什麼？（何時建立/更新/刪除）
- [ ] 與哪些表格有關聯？

建立時，確認：

- [ ] 表格名稱符合 snake_case
- [ ] 業務表格有 workspace_id
- [ ] 有 created_at, updated_at
- [ ] RLS 政策正確設定
- [ ] 加入 WORKSPACE_SCOPED_TABLES（如果需要）
- [ ] **審計欄位 FK 正確**（見第八節）
- [ ] **編號 / 識別碼欄位 UNIQUE 含 `workspace_id`**（見第九節）

---

## 八、審計欄位慣例（`created_by` / `updated_by` / 等）

> 這一節起源於 2026-04-20 `REFACTOR_PLAN_AUDIT_TRAIL_FK.md` 重構。
> 當時全系統 17 張表、30+ 欄位亂指，結果 client 傳 employee id 但 FK 要 auth uid → 存檔就炸。
> 規則定出來後，新表務必照做。

### 8.1 誰指誰、為什麼

**ERP 內部操作追溯 → `employees(id)`**

- 場景：「哪位員工建立/修改這筆業務資料」
- 欄位名：`created_by`、`updated_by`、`performed_by`、`uploaded_by`、`locked_by`、`last_unlocked_by`
- FK：`REFERENCES public.employees(id) ON DELETE SET NULL`
- 例外：無（即使是 Supabase Auth 登入進來，也要記 employee.id，因為 UI 顯示的是員工姓名）

**用戶身份/社交/traveler → `auth.users(id)`**

- 場景：「這個 row 就是一個 Supabase 用戶本身」、社交關係、私訊
- 欄位名：`user_id`、`sender_id`、`receiver_id`、`friend_id`、`supabase_user_id`
- FK：`REFERENCES auth.users(id)`（cascade 策略依語意）
- 典型例子：`profiles.id`、`traveler_profiles.id`、`friends.*`、`private_messages.*`、`employees.user_id`、`employees.supabase_user_id`

### 8.2 新表審計欄位模板

```sql
CREATE TABLE public.your_new_table (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- ... business columns ...

  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.employees(id) ON DELETE SET NULL
);
```

**重點**：

- `ON DELETE SET NULL`（不要 CASCADE，不要 NO ACTION）——員工離職刪 row 時、不要把他建立過的業務資料全刪
- `created_by` 和 `updated_by` 都 nullable——允許系統操作（如 trigger 自動寫入）時留 NULL
- 不要加 NOT NULL 到這些欄位上（除非有非常明確的業務需求）

### 8.3 Code 端寫入規則

```typescript
// ✅ 正確
const { user: currentUser } = useAuthStore()
await createItem({
  ...data,
  created_by: currentUser?.id || undefined,  // undefined 讓 DB 留 NULL
  updated_by: currentUser?.id || undefined,
})

// ❌ 錯誤：傳空字串會 FK 炸
created_by: currentUser?.id || '',

// ❌ 錯誤：傳寫死字串會 FK 炸
created_by: 'current_user',

// ❌ 錯誤：傳 auth.users uid（employee.id 和 auth.users.id 不是同一個）
const { data: { user: authUser } } = await supabase.auth.getUser()
created_by: authUser.id,  // NO，這是 Supabase auth uid，不是 employee.id

// ✅ 如果在 Server API route 中、沒有 currentUser context
const auth = await getServerAuth()
created_by: auth.data.employeeId,  // getServerAuth 回傳 employee id
```

### 8.4 為什麼 `currentUser.id` = `employee.id`？

看 `src/stores/auth-store.ts` `buildUserFromEmployee`：

```ts
return {
  id: employeeData.id, // 這就是 employees.id
  // ...
}
```

所以整個 front-end `currentUser?.id` 永遠是 `employees.id`。跟 Supabase Auth 的 `auth.users.id` 是不同 uuid。

---

## 九、多租戶表編號 UNIQUE 規範

> 起源：2026-04-21 migration `20260421120000_tenant_scoped_unique_codes.sql`。
> 事件：御風租戶建不出當日第一張出納單、撞角落租戶的 `DO260423-001`。13 張多租戶表的單欄全域 UNIQUE 全部踩到同一個反模式。

### 9.1 鐵律

**有 `workspace_id` 的表、編號 / 識別碼欄位的 UNIQUE 必須含 `workspace_id`**：

```sql
-- ❌ 錯：全域 UNIQUE、新租戶會撞到別家
CREATE TABLE disbursement_orders (
  code TEXT UNIQUE,     -- 禁止
  workspace_id UUID NOT NULL,
  ...
);

-- ✅ 對：tenant-scoped UNIQUE、每家租戶獨立編號空間
CREATE TABLE disbursement_orders (
  code TEXT NOT NULL,
  workspace_id UUID NOT NULL,
  ...
  UNIQUE (workspace_id, code)
);
```

### 9.2 為什麼

- **可用性**：客戶端 SELECT 被 RLS 擋 → 看到 0 筆 → 算 nextNum=1 → INSERT 撞別家 `-001` → 23505 炸。retry 沒用（每次都算出同編號）
- **資訊洩漏**：全域 UNIQUE 下、租戶可以用 INSERT 探測「別家今天開幾張單」—— 看不到內容但看得到**數量**，對競爭對手是營運情報

### 9.3 例外

全域 UNIQUE **只有**下列情境合理：

- 外部系統給的識別碼、全球唯一（LINE user_id、eSIM 序號、RFC 5322 Message-ID 等）
- 一個 workspace 一份的設定表（UNIQUE 就是 `workspace_id` 本身）
- 共用資料表（無 workspace_id，如 `ref_cities`、`ref_destinations`）

### 9.4 公開 URL 例外情境

如果 `code` 被公開 URL 當全域 key 查詢（無 workspace 參數），改 tenant-scoped 會炸短網址。此類表需先決 URL 設計（短 UUID vs 路徑加租戶識別），**不該保留全域 UNIQUE 當作「設計取捨」**。

目前已知（待 Batch 2 處理）：`tours.code`、`tour_requests.code`、`contracts.code`

### 9.5 受影響的 migration 歷史

- 2026-04-21：13 張表從全域 UNIQUE 改 tenant-scoped（`20260421120000_tenant_scoped_unique_codes.sql`）
- 新增表時、CI 應擋住違反 9.1 的 migration（TODO：寫 `tests/e2e/db-schema-invariants.spec.ts` 守門）

---

_規範文件結束_
