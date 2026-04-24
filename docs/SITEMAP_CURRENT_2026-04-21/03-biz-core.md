# Venturo ERP 業務核心模組現況地圖

**盤點日期**：2026-04-21  
**涵蓋範圍**：詢價、客製化行程、行程、訂單、確認單、排程、合約 7 大流程

## 業務核心模組整體概念

從業務角度，這 10 頁串起台灣旅行社的完整生命週期：客人提詢價 → 內部客製化行程報價 → 確定成行時建立團 → 開始售票建訂單 → 團確定出發後建立確認單（機票、簽證、飯店）→ 團務人員排程資源→ 團開始前簽供應商合約。**inquiries / customized-tours / tours / orders 之間是縱向轉換關係**：詢價來自客人或內部、客製化行程模板讓業務報價、報價成交後升級為 tours 記錄、tours 開賣後會多筆 orders。**列表頁 5 個**（inquiries、customized-tours、tours、orders、contracts），**詳編頁 4 個**（customized-tours[id]、tours[code]、confirmations[id]、scheduling）。

---

## 頁面清單

### /inquiries

**Route**: `/inquiries`  
**頁面標題**: 詢價單管理  
**做什麼**: 業務人員追蹤進來的客人詢價單，按狀態分類（待處理→已聯繫→已報價→已成交），支援客人基本資訊編輯、景點追蹤、內部備註記錄。  
**主要資料對象**: `customer_inquiries` (詢價單記錄、客人聯絡資訊、想去景點清單、狀態流轉)  
**主要動作**: 標記狀態（已聯繫、已報價、已成交、取消）、開詳情 Dialog 看完整客人資訊、內部備註編輯  
**明顯紅旗**: 無明顯

### /customized-tours

**Route**: `/customized-tours`  
**頁面標題**: 客製化行程管理  
**做什麼**: 內部建立和管理客製化行程模板（景點組合），支援草稿/發佈狀態、生成客人可看的公開連結，可追蹤有多少詢價引用此模板。  
**主要資料對象**: `wishlist_templates` (行程模板、草稿/發佈狀態、景點計數、詢價來源追蹤)  
**主要動作**: 新增模板、編輯名稱/連結代碼、發佈到公開頁面、複製分享連結、進入詳編頁編輯景點內容  
**明顯紅旗**: 無明顯

### /customized-tours/[id]

**Route**: `/customized-tours/[id]`  
**頁面標題**: 客製化行程編輯  
**做什麼**: 左右分流編輯一個行程模板：左側已選景點清單（含地區標籤、拖拖拉拉排序不支援但有序號顯示）、右側景點庫（國家篩選 + 搜尋、按下 + 號快速加入）。分兩個頁籤：景點管理 & 基本設定。  
**主要資料對象**: `wishlist_templates` (模板詳情), `wishlist_template_items` (景點列表), `attractions` (景點庫、公開景點或 workspace 自建景點), `countries` (國家篩選選項)  
**主要動作**: 從景點庫加入景點、刪除已選景點、設定景點地區、儲存基本設定、發佈/取消發佈、複製連結、預覽公開頁  
**明顯紅旗**: 右側景點庫篩選重複查詢（國家 + 搜尋狀態變化時都要重新計算 filteredAttractions，但沒有 useMemo 或防抖）

### /tours

**Route**: `/tours`  
**頁面標題**: 行程管理（由 `/features/tours` 模組託管）  
**做什麼**: 列表顯示所有確定成行的旅遊團（建立後自動產生團代碼），支援篩選（地區、時間、狀態）、搜尋、快速新增。  
**主要資料對象**: `tours` (團代碼、名稱、出發日期、參加人數、定價、行程狀態)  
**主要動作**: 點列表進詳情、新增團、團狀態轉換、建立需求單(訂購景點、供應商服務)  
**明顯紅旗**: 本頁只是委派，實作在 features/tours，無法從本檔直接看細節

### /tours/[code]

**Route**: `/tours/[code]`  
**頁面標題**: 行程詳情（動態取 tour.name）  
**做什麼**: 團詳編頁，分多個頁籤（總覽、行程日程、報名者、費用、工作頻道、合約、展示行程等，會根據 workspace 啟用的功能自動隱藏付費 tab），支援 PNR 查詢、建立供應商需求單、工作頻道快速進入。  
**主要資料對象**: `tours` (團核心資訊、定價), `tour_itinerary_items` (行程日程), `orders` (參加名單推導), `channels` (工作頻道)  
**主要動作**: 切換頁籤、新增/編輯行程日程、開啟需求單對話框、進工作頻道溝通、查看/建立合約  
**明顯紅旗**: 使用 URL 參數 `?tab=xxx` 控制頁籤，但沒有完整驗證（假如傳入無效 tab 值會怎樣）；`CODE_LABELS` 和 `TOUR_DETAIL_PAGE_LABELS` 有些標籤重複

### /orders

**Route**: `/orders`  
**頁面標題**: 訂單管理  
**做什麼**: 記錄該團的所有銷售筆數（誰賣的、客人幾人、收多少、還欠多少），按付款狀態分類（未繳、部分繳、全繳），自動過濾掉簽證/ESIM 虛擬產品訂單。  
**主要資料對象**: `orders` (訂單編號、關聯團、銷售人員、客人聯絡人、付款狀態、應收金額、已收金額), `tours` (出發日期用於排序)  
**主要動作**: 新增訂單（自動產生編號 `團代碼-O01/02/...`，預估 2 人預設金額），篩選狀態、搜尋訂單號/團名/客人姓名、進訂單詳情編輯  
**明顯紅旗**: 無明顯

### /confirmations

**Route**: `/confirmations`（列表頁委派到 `@/features/confirmations` 模組）  
**頁面標題**: 確認單管理  
**做什麼**: 列表顯示已產生的確認單（機票、飯店、簽證等），支援狀態篩選。  
**主要資料對象**: `confirmations` (確認單類型、預訂號、確認號、關聯團、狀態)  
**主要動作**: 進詳情編輯、刪除、列印  
**明顯紅旗**: 本頁只是委派，實作在 features/confirmations，無法從本檔直接看細節

### /confirmations/[id]

**Route**: `/confirmations/[id]`  
**頁面標題**: 編輯確認單（Edit Confirmation）  
**做什麼**: 確認單詳編：分左(編輯器)右(預覽)兩欄，支援機票、飯店、簽證、租車等多種類型。機票型支援 PNR 匯入（HTML 解析）、自動提取乘客名單 / 航班段 / 艙等。支援列印。  
**主要資料對象**: `confirmations` (預訂號、確認號、類型、data JSON 結構 FlightData/HotelData/...), `flightPassenger / FlightSegment` (機票子結構)  
**主要動作**: 選擇確認單類型、填入預訂/確認號、匯入 PNR、編輯乘客 / 航班 / 行李 / 特殊備註、儲存、列印、回到列表  
**明顯紅旗**: PNR 匯入邏輯寫在頁面裡（`handleImportPNR`），沒有抽成 hook；目前只有 HTML 解析、沒有 PDF/email 附件支援

### /scheduling

**Route**: `/scheduling`（委派到 `@/features/scheduling` 模組）  
**頁面標題**: 資源排程  
**做什麼**: 動態渲染排程系統，預期支援導遊 / 車輛 / 飯店房間等資源的日期分配。  
**主要資料對象**: `tours` (出發日期), `tour_itinerary_items` (每日活動), 資源表（導遊、車、房間等）  
**主要動作**: 拖拖拉拉分配資源、衝突檢測、確認  
**明顯紅旗**: 本頁只是委派，features/scheduling 的實作詳情無法從本檔看

### /contracts

**Route**: `/contracts`  
**頁面標題**: 合約管理  
**做什麼**: 列表顯示有合約的團（or 從 URL `?tour_id=xxx` 指定單一團），支援新增合約（需先選團）、編輯、檢視、列印信封、刪除。自動過濾無合約的團。  
**主要資料對象**: `tours` (團資訊、contract_template / contract_content / contract_completed / contract_archived_date 等合約欄位)  
**主要動作**: 點列表進編輯對話框、新增合約（打開選團對話框選→自動開新增對話框）、檢視合約、列印信封、刪除合約、發佈狀態顯示  
**明顯紅旗**: 自動打開對話框的邏輯用 `hasAutoOpened` flag 防止重複觸發，但可能在快速刷新時失效；刪除合約邏輯更新 6 個欄位（contract_template/content/created_at/notes/completed/archived_date），如果其中某個欄位新加了 NOT NULL 限制會炸

---

## 關鍵關係總結

| 流程                             | 說明                                                                                          |
| -------------------------------- | --------------------------------------------------------------------------------------------- |
| **inquiries → customized-tours** | 業務人員看詢價單時可参考客製化行程模板，反向 customized-tours 表記 inquiries_count            |
| **customized-tours → tours**     | 客製化行程是內部模板，發佈後客人可看；成交後業務人員會建立 tours（獨立記錄）                  |
| **tours → orders**               | 團確定成行後，銷售人員建多筆訂單（每個客戶一筆），order_number 自動產生為 `團代碼-O01/02/...` |
| **tours → confirmations**        | 團確定出發後，簽簽證、買機票，每件事件建一筆 confirmation 紀錄                                |
| **tours → scheduling**           | 團行程排定後，導遊 / 車輛 / 飯店等資源在排程系統分配                                          |
| **tours → contracts**            | 團發車前簽供應商合約（飯店、遊覽車、餐廳），紀錄於 tours.contract\_\* 欄位                    |

**列表 vs 詳編的分層**：

- 列表頁（5 個）：inquiries、customized-tours、tours、orders、contracts — 看全貌、快速篩選、批次操作
- 詳編頁（4 個）：customized-tours/[id]（景點編輯）、tours/[code]（行程日程）、confirmations/[id]（確認單編輯）、scheduling（資源排程） — 深度編輯、多頁籤、複雜互動
