## 本批模組整體概念

四個模組分別服務不同角色與業務流程。**Supplier** 模組（派單、財務、請求、車趟）是**旅行社發方**視角：收託客戶的團務需求，派給地接或運輸供應商，追蹤派單、財務結算、車隊排程。**Local**（地接中心）是**地接方**視角：收到旅行社的委託（交通、住宿、導遊等），評估、報價、執行案件。**Customers** 是**終端顧客管理**：個人旅客及企業客戶名冊。**Database** 則是**共用主檔庫**：景點、交通費率、供應商主檔、導遊、車隊、檔案。

關鍵區別：**database/suppliers** 與 **supplier/** 看似重疊但角色完全不同。database/suppliers 是「**供應商主檔黃頁**」（有多少間司機行、酒店、餐廳，每間的聯絡人、費率）；supplier/* 是「**旅行社自身的工作檯**」（我（旅行社）發出去的派單、成本核銷、報表）。database 是「靜態參考資料」，supplier 是「動態業務流程」。customers/companies 與 database/workspaces 也不同：companies 是「**我的客戶公司**」（哪些企業跟我們簽約帶團），workspaces 是「**系統帳號組織**」（旅行社、地接、供應商分別用哪些帳號登入）。

---

## 頁面清單

### 供應商模組（Supplier）

#### /supplier/requests
**Route**: `/supplier/requests`  
**頁面標題**: 供應商請求列表  
**做什麼**: 旅行社查看、列管所有發出去的委託單（待處理、已接受、已拒絕）  
**主要資料對象**: `tour_requests` 表（request_type、status、supplier_name、items）  
**主要動作**: 篩選狀態分頁、搜尋團號或供應商名、點擊進詳情  
**明顯紅旗**: 無明顯

#### /supplier/requests/[id]
**Route**: `/supplier/requests/[id]`  
**頁面標題**: 供應商請求詳情  
**做什麼**: 檢視單筆委託的完整內容與交互狀態、查看報價、修改派單內容  
**主要資料對象**: `tour_requests` 單一記錄、可能涉及 `tours` 關聯、items JSON  
**主要動作**: 編輯派單、接受/拒絕、查看供應商回覆  
**明顯紅旗**: 無明顯

#### /supplier/dispatch
**Route**: `/supplier/dispatch`  
**頁面標題**: 派單管理  
**做什麼**: 旅行社將已確認的需求派給司機或供應商  
**主要資料對象**: `tour_requests`（status='confirmed'或'accepted'）、可能涉及 `employees` 或 `suppliers`  
**主要動作**: 指派人員/司機、查看報價、管理派單  
**明顯紅旗**: 無明顯

#### /supplier/trips
**Route**: `/supplier/trips`  
**頁面標題**: 車趟管理  
**做什麼**: 司機或車行查看收到的派車需求、確認車趟、管理已確認的行程  
**主要資料對象**: `tour_requests`（request_type='transport'）、`tours`（code, name, departure_date, return_date, current_participants）  
**主要動作**: 確認派車（查看報價按鈕）、管理車趟、分頁查看待確認vs已確認  
**明顯紅旗**: 無明顯

#### /supplier/finance
**Route**: `/supplier/finance`  
**頁面標題**: 供應商財務報表  
**做什麼**: 旅行社追蹤供應商成本、報表與結算  
**主要資料對象**: 未直接讀到實裝組件，推測涉及 `tour_requests` 中的成本欄位  
**主要動作**: 查看費用報表、導出  
**明顯紅旗**: 無明顯

---

### 地接模組（Local）

#### /local
**Route**: `/local`  
**頁面標題**: Local 委託管理  
**做什麼**: 地接中心看到自己收到的所有委託單（旅行社派給我的）、快速篩選待處理vs已接受、瀏覽案件  
**主要資料對象**: `tour_requests`（recipient_workspace_id or target_workspace_id = 當前登入者）、各種 status（pending, accepted, completed）  
**主要動作**: 切分頁、搜尋團號、快捷進入「委託收件匣」或「案件列表」  
**明顯紅旗**: 無明顯

#### /local/requests
**Route**: `/local/requests`  
**頁面標題**: 委託收件匣  
**做什麼**: 地接審視新進委託、逐筆接受或拒絕  
**主要資料對象**: `tour_requests`（主要欄位：code, supplier_name, request_type, status, sent_at, reply_note）  
**主要動作**: 按「接受委託」、「拒絕」、查詳情 Dialog、搜尋篩選  
**明顯紅旗**: 無明顯

#### /local/cases
**Route**: `/local/cases`  
**頁面標題**: 案件列表  
**做什麼**: 地接查看已接受的委託、進行中及已完成的案件進度  
**主要資料對象**: `tour_requests`（status in ['accepted', 'completed']）  
**主要動作**: 進行中/已完成分頁、搜尋、點擊進入詳情  
**明顯紅旗**: 無明顯

#### /local/cases/[id]
**Route**: `/local/cases/[id]`  
**頁面標題**: 案件詳情  
**做什麼**: 地接逐案報價、填寫服務內容、最後標記完成  
**主要資料對象**: `tour_requests` 單一記錄（quoted_cost, reply_note, service_date, category, tour_code）  
**主要動作**: 輸入報價金額、輸入報價備註、提交報價、標記完成  
**明顯紅旗**: 無明顯

---

### 顧客模組（Customers）

#### /customers
**Route**: `/customers`  
**頁面標題**: 顧客管理  
**做什麼**: 旅行社維護個人旅客名冊（護照、聯絡方式、飲食禁忌、VIP 等級）、批次匯入、LINE 綁定  
**主要資料對象**: `customers` 表（code, name, passport_name, phone, email, passport_number, national_id, birth_date, passport_expiry, dietary_restrictions, is_vip, verification_status）、`order_members` 關聯核對護照圖片  
**主要動作**: 新增、編輯、刪除顧客、驗證護照、重置密碼、批次匯入、LINE 綁定（QR Code）  
**明顯紅旗**: 無明顯

#### /customers/companies
**Route**: `/customers/companies`  
**頁面標題**: 企業客戶管理  
**做什麼**: 旅行社管理合作企業（Ｂ２Ｂ 客戶）、維護聯絡人、設定付款條件  
**主要資料對象**: `companies` 表（company_name, tax_id, address, contact等），`company_contacts` 子表（聯絡人名單）  
**主要動作**: 新增/編輯/刪除企業、查詢聯絡人、設定 VIP 等級、付款條件  
**明顯紅旗**: 無明顯

---

### 資料庫模組（Database）

#### /database
**Route**: `/database`  
**頁面標題**: 資料庫管理中樞  
**做什麼**: 快速入口，導向各項主檔管理（景點、交通費率、供應商、導遊、車隊、檔案、工作區）  
**主要資料對象**: 無直接 DB 查詢，純導航頁  
**主要動作**: 點擊卡片進入各子模組  
**明顯紅旗**: 無明顯

#### /database/suppliers
**Route**: `/database/suppliers`  
**頁面標題**: 供應商主檔管理  
**做什麼**: 系統管理員維護合作供應商黃頁（司機行、酒店、餐廳、導遊等），對應 Database 外包組件化  
**主要資料對象**: `suppliers` 表（合作供應商基本資料）  
**主要動作**: 新增/編輯/刪除供應商主檔  
**明顯紅旗**: 無明顯

#### /database/tour-leaders
**Route**: `/database/tour-leaders`  
**頁面標題**: 導遊主檔管理  
**做什麼**: 管理內部導遊或合作導遊名冊  
**主要資料對象**: `tour_leaders` 表  
**主要動作**: CRUD  
**明顯紅旗**: 無明顯

#### /database/attractions
**Route**: `/database/attractions`  
**頁面標題**: 景點活動與米其林餐廳管理  
**做什麼**: 維護旅遊景點、米其林餐廳、高端體驗，三個分頁 lazy loading  
**主要資料對象**: 推測涉及 attractions、michelin_restaurants、premium_experiences 表，含分區（region）資料  
**主要動作**: CRUD 景點/餐廳/體驗、分區篩選、限制載入 100 筆避免崩潰  
**明顯紅旗**: 註解提及「Lazy loading」和「Data limiting」，表示之前因載入全表而有性能問題

#### /database/workspaces
**Route**: `/database/workspaces`  
**頁面標題**: 工作區管理（帳號組織）  
**做什麼**: 系統管理員管理旅行社、地接、供應商等不同角色的登入帳號組織（workspace 多租戶）  
**主要資料對象**: `workspaces` 表  
**主要動作**: 新增/編輯/刪除 workspace、設定權限  
**明顯紅旗**: 無明顯

#### /database/transportation-rates
**Route**: `/database/transportation-rates`  
**頁面標題**: 交通費率表管理  
**做什麼**: 維護各國、各路線、各車型的運輸費率（單位：VND、TWD）、KKday 銷售價與成本  
**主要資料對象**: `transportation_rates` 表（country_id, country_name, vehicle_type, category, supplier, route, trip_type, cost_vnd, price_twd, kkday_selling_price, kkday_cost等，max 500 筆）  
**主要動作**: 按國家分組、新增國家、進入詳細表格編輯費率  
**明顯紅旗**: 硬限制 500 筆（limit(500)），若資料爆量需留意

#### /database/fleet
**Route**: `/database/fleet`  
**頁面標題**: 公司車隊管理  
**做什麼**: 維護公司的巴士、客車等車輛清冊  
**主要資料對象**: `fleet` 或 `vehicles` 表  
**主要動作**: CRUD 車輛資料  
**明顯紅旗**: 無明顯

#### /database/company-assets
**Route**: `/database/company-assets`  
**頁面標題**: 公司資產管理  
**做什麼**: 維護公司資產清單（推測為對外展示素材、品牌資源等）  
**主要資料對象**: `company_assets` 表  
**主要動作**: CRUD  
**明顯紅旗**: 無明顯

#### /database/archive-management
**Route**: `/database/archive-management`  
**頁面標題**: 檔案歸檔管理  
**做什麼**: 系統管理員管理已歸檔的團務，可還原或永久刪除  
**主要資料對象**: `tours`（archived=true）、涉及 `channels`、`tour_itinerary_items`、`tour_confirmation_sheets`、`pnrs`、`calendar_events`、`tour_quotes` 關聯清理  
**主要動作**: 還原歸檔團、永久刪除團（含關聯資料清理）  
**明顯紅旗**: 依賴函式 checkTourDependencies，永刪前檢查是否有阻斷者（e.g. 已驗證訂單）；大量級聯刪除（DELETE 多表），需謹慎確認無誤

---

## 關鍵紅旗總結

- **attractions 分頁**: 註解明確指「限制載入 100 筆，避免崩潰」與「Lazy loading」，往後新增景點務必注意載入策略
- **transportation-rates**: `limit(500)` 硬编码，若後續資料成長需調整策略或改為分頁
- **archive-management**: 級聯刪除邏輯複雜，包含多張表，執行前需 checkTourDependencies，防止誤刪有訂單的團
- **customers**: 護照圖片來源多（customers直接欄位、order_members 關聯、LINE 綁定 QR Code），邏輯分散，未來若護照管理擴充需整合
- **supplier/trips**: 直接嵌入 Supabase 查詢，無 feature hook 包裝，與其他供應商頁面風格差異

