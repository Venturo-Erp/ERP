# 公開頁面與行動版盤點（2026-04-21）

## 本批整體概念

本批共 25 頁，分為三大軌道：

1. **/(public)/p/* 現代展示系統**（4 頁）：新時代品牌官網，定位高端客群，時間軸視覺、sticky 導航、LINE 整合客製化報價。重視視覺衝擊與用戶故事化。

2. **/public/* 舊工具系統**（10 頁）：多年沿用的供應商/客人協作頁面，風格統一 Morandi 色系，實用導向。包括行程查看、報價問卷、合約簽署、保險名單、需求單回覆。

3. **根層頁面 + /m/** （8 頁）：登入前導流 + 行動版 PWA 集散地。/landing 是市場頁，/about 在建，根 / 直接送到 dashboard（登入用戶），/m/* 暫時只有車行司機確認（純表單，無複雜邏輯）。

三套系統並存：/(public)/p/ 是 C 端新體驗，/public/* 是 B2B（供應商）+ 舊 C 端保留，根層是單點入口。**沒有衝突，各司其職**。

---

## 頁面清單（依 route 前綴分段）

### (public)/p/* — 現代 C 端客製化系統

#### /p/tour/[code]
- **Route**: `/(public)/p/tour/[code]?ref=E001`
- **標題**: 行程詳情頁（時間軸風格）
- **做什麼**: 客人查看特定團的完整行程、價格、導遊資訊，點「立即報名」
- **資料對象**: `tours`, `itineraries`, `employees`, `workspaces`, `airport_images`（HERO 背景）, `order_members`（團員清單選項）
- **主要動作**: 「立即報名」→ /p/tour/[code]/register, 「諮詢專屬顧問」→ tel: 公司電話, 「分享」心型按鈕
- **紅旗**: 無明顯。結構清潔，sticky 導航無 console.log。

#### /p/customized
- **Route**: `/(public)/p/customized`
- **標題**: 探索世界（客製化入口）
- **做什麼**: 客人瀏覽發佈的客製化範本（目的地列表），選擇進入 DIY 選景點
- **資料對象**: `wishlist_templates` (published status), `workspaces`, `wishlist_template_items` (count)
- **主要動作**: 點卡片 → /p/customized/[slug], 撥電話
- **紅旗**: 無明顯。但 COMPANY 常數寫死備用值，實際從 workspace 查，邏輯安全。

#### /p/customized/[slug]
- **Route**: `/(public)/p/customized/[slug]`
- **標題**: 客製化詳情頁（景點 DIY 選擇）
- **做什麼**: 客人點擊景點卡片選/取消，右側展示已選清單，填表→送詢價→產生追蹤碼
- **資料對象**: `wishlist_templates`, `wishlist_template_items`, `workspaces`, `customer_inquiries` (insert), `customers` (by LINE 查綁定), auth (LINE OAuth)
- **主要動作**: 景點卡片切換、「送出詢價」→ Dialog 填表、LINE 登入、「用 LINE 登入接收通知」、「查看進度」→ /p/customized/track/[code]
- **紅旗**: 
  - Dialog 內有「客戶比對」流程（首次 LINE 用戶自動比對舊客戶或新建），複雜邏輯但封裝良好
  - LINE 登入缺少 error handling（catch 吞掉，toast 無法推送），但主流程不阻斷
  - 景點圖片默認 MapPin 圖標，但分類標籤顯示完整

#### /p/customized/track/[code]
- **Route**: `/(public)/p/customized/track/[code]`
- **標題**: 追蹤詢價單進度
- **做什麼**: 客人用追蹤碼查看詢價單狀態（pending/contacted/quoted/converted/cancelled）、已選景點、公司回覆、追加留言
- **資料對象**: `customer_inquiries`, `wishlist_templates`, `workspaces`
- **主要動作**: 「追加留言」→ 存入 notes，「查看進度」（刷新），撥電話
- **紅旗**: 無明顯。狀態機制清晰，公司回覆 (internal_notes) 與客戶留言分開。

---

### public/* — 舊工具系統（供應商 + 舊 C 端）

#### /public/booking/[tourCode]
- **Route**: `/(none)/public/booking/[tourCode]`
- **標題**: 行程詳情頁（舊版，報名 Dialog）
- **做什麼**: 客人查看行程，點「我要報名」打開 Dialog，填聯絡資訊提交
- **資料對象**: `tours`, `itineraries`, `employees`, `workspaces`, `orders` (insert), `order_members` (create)
- **主要動作**: 「我要報名」Dialog，「確認報名」→ POST /api/bookings
- **紅旗**: 
  - 硬編碼 "Corner Travel Collection" 品牌名
  - 無明顯權限檢查（公開連結，無特殊限制）

#### /public/itinerary/[tourCode]
- **Route**: `/(none)/public/itinerary/[tourCode]?ref=E001`
- **標題**: 行程詳情頁（舊版，含航班）
- **做什麼**: 同上，但支援航班資訊表、Daily itinerary、業務資訊底欄
- **資料對象**: 同上，加 flights 欄位
- **主要動作**: 同上
- **紅旗**: 
  - 硬編碼 "Corner Travel Collection"
  - flights 欄位可能無資料（欄位存在但查詢時分支檢查）

#### /public/contract/sign/[code]
- **Route**: `/(none)/public/contract/sign/[code]`
- **標題**: 合約簽署頁
- **做什麼**: 客人/簽署人查看合約內容（含團資料、團員名單、行程詳情），簽署並上傳簽名圖、身份證明
- **資料對象**: `contracts`, `tours`, `workspaces`, `order_members`, `itineraries`
- **主要動作**: 簽署（含上傳簽名圖、身份證字號等）、提交
- **紅旗**: 
  - 處理舊合約 fallback（include_itinerary 從 contract_data 讀），但邏輯多層
  - signer_type 分支邏輯複雜（個人/公司）

#### /public/insurance/[code]
- **Route**: `/(none)/public/insurance/[code]`
- **標題**: 保險團員名單頁
- **做什麼**: 供應商或團務人員列印/查看團員名單（含生日、身份證、人數），可下載 Excel 簽名版
- **資料對象**: `tours`, `order_members`, `customers`, `workspaces`, `tour_documents` (find member list Excel)
- **主要動作**: 「下載 Excel」→ signed URL
- **紅旗**: 
  - body HTML 內聯 style（非 React，純 HTML template），不易維護
  - 身份證遮罩邏輯簡單（前 2 後 2，中間用 ●），安全性可接受

#### /public/request/[token]
- **Route**: `/(none)/public/request/[token]`
- **標題**: 需求單回覆頁（供應商填報價）
- **做什麼**: 供應商填寫報價單：住宿房型、餐食單價、統包價、備註，可暫存/送出確認
- **資料對象**: `tour_requests`, `tours`, `tour_documents`
- **主要動作**: 「暫時儲存」→ UPDATE items/note, 「確認送出」→ UPDATE status=replied, replied_at
- **紅旗**: 
  - 大量 inline style（非 Tailwind），表格結構複雜但邏輯正確
  - 無顯著 validation（允許空報價），但留言可追加修正
  - auto-save indicator (lastSaved timestamp) 友善

#### /public/transport-quote/[tourId]
- **Route**: `/(none)/public/transport-quote/[tourId]`
- **標題**: 遊覽車報價頁（多項版）
- **做什麼**: 車行供應商為整個團的多段遊覽車報價，或填寫司機資訊確認
- **資料對象**: `tour_requests`, `tour_itinerary_items`, `tours`, `ref_airports`, `countries`
- **主要動作**: 「填寫司機資訊」→ TransportConfirmForm, 「提交報價」→ POST
- **紅旗**: 
  - 分支複雜（requestId/itemId 分別處理），邏輯層疊
  - SSOT 設計：airport_code → city_name_zh → country_name 遞進查詢

#### /public/transport-quote/[tourId]/[requestId]
- **Route**: `/(none)/public/transport-quote/[tourId]/[requestId]`
- **標題**: 遊覽車報價頁（單一需求版）
- **做什麼**: 同上，但針對單一 requestId
- **資料對象**: 同上，加 history queries (prev quotes)
- **主要動作**: 同上，展示歷史報價供參考
- **紅旗**: 
  - SSOT 重複（airport_code 查詢邏輯與 [tourId] 版本雷同）
  - 歷史報價篩選邏輯（replied_at/created_at）可能漏掉草稿

#### /public/accommodation-quote/[tourId]/[requestId]
- **Route**: `/(none)/public/accommodation-quote/[tourId]/[requestId]`
- **標題**: 住宿報價頁
- **做什麼**: 飯店供應商填寫房型、單價、總價、備註
- **資料對象**: `tour_requests`, `tours`
- **主要動作**: 「提交報價」→ POST
- **紅旗**: 
  - 初始讀取，沒有 history 查詢（vs transport-quote 版本有），不一致

#### /public/meal-quote/[tourId]/[requestId]
- **Route**: `/(none)/public/meal-quote/[tourId]/[requestId]`
- **標題**: 餐食報價頁
- **做什麼**: 餐廳供應商填寫人數、單價、總價、備註
- **資料對象**: `tour_requests`, `tours`
- **主要動作**: 同上
- **紅旗**: 同上

#### /public/activity-quote/[tourId]/[requestId]
- **Route**: `/(none)/public/activity-quote/[tourId]/[requestId]`
- **標題**: 活動報價頁
- **做什麼**: 同上，針對景點活動
- **資料對象**: 同上
- **主要動作**: 同上
- **紅旗**: 同上（預期存在但內容同規格）

---

### 根層 + 其他

#### / (root)
- **Route**: `/`
- **標題**: （無）
- **做什麼**: 直接 redirect('/dashboard')，等效於登入後首頁入口
- **資料對象**: 無
- **主要動作**: redirect
- **紅旗**: 無明顯

#### /landing
- **Route**: `/landing`
- **標題**: Venturo ERP 行銷落地頁
- **做什麼**: 未登入用戶的市場頁面：Hero section、Pain points（之前vs之後對比）、Features（Dashboard/Documents/Accounting）、Pricing（Free/Pro/Founder）、Footer
- **資料對象**: 無（純 hardcoded labels）
- **主要動作**: 「登入」→ /login, 「聯絡」→ mailto:, 「開始方案」→ /login
- **紅旗**: 
  - 計畫功能（screenshot placeholder），視覺未完成
  - 定價策略硬編碼（未從 DB 讀）

#### /about
- **Route**: `/about`
- **標題**: 關於我們
- **做什麼**: 約頁面，內容從 labels constants 讀取（目前為 stub）
- **資料對象**: 無
- **主要動作**: 無
- **紅旗**: 無明顯（頁面架構就位，內容可展開）

#### /confirm/[token]
- **Route**: `/confirm/[token]`
- **標題**: 報價確認頁
- **做什麼**: 客人點開郵件連結，查看報價單（團號、報價金額、日期、人數等），填寫名字/email/電話/備註確認接受報價
- **資料對象**: `quotes` (API: /api/quotes/confirmation/customer?token=), `employees` (created_by reference)
- **主要動作**: 「確認報價」→ POST /api/quotes/confirmation/customer, 輸入聯絡資訊
- **紅旗**: 
  - 'use client' 頁面，狀態機制清晰（loading/ready/confirming/success/error/already_confirmed）
  - 表單驗證最小化（只檢查名字）

#### /transport/[id]/confirm
- **Route**: `/transport/[id]/confirm`
- **標題**: 遊覽車司機確認頁
- **做什麼**: 車行供應商填寫司機姓名、電話、車牌、車型，確認交通項目預訂
- **資料對象**: `tour_itinerary_items`, `tours`
- **主要動作**: 「提交司機資訊」→ TransportConfirmForm, 或「已確認」狀態展示已填寫內容
- **紅旗**: 
  - 硬編碼 emoji 表情（❌ ✅ 🚌）
  - 無 loading state（純 server component 查詢後返回）

#### /view/[id]
- **Route**: `/view/[id]`
- **標題**: 公開分享行程頁
- **做什麼**: 客人用公開連結查看行程詳情（用 itinerary id），可以分享給朋友
- **資料對象**: `itineraries`, `tours` (metadata for OG tags)
- **主要動作**: 「查看」+「分享」OG metadata 最佳化
- **紅旗**: 
  - Server component，generateMetadata 支援 OG，但圖片 fallback 邏輯簡單

---

### /m/* — 行動版 PWA（行員工具）

#### 目前狀態
- **只發現** `/transport/[id]/confirm` 在 /m/ 下無重複
- **預期架構**: /m/ 作為行動版命名空間，但實際上目前都用絕對路由，未發現真正的 /m/* 頁面

若有 /m/* 頁面，預期用途：
- 領隊/司機 PWA：簽到、加團員、拍收據
- 行社內部：團務查詢、簽單確認

**現況**：/m/ 資料夾存在但無頁面掃到。可能：
1. 尚未開發
2. 架構遷移中（改用 layout group，e.g. (mobile)）
3. 在其他路徑

---

## 重點討論項

### Q1: (public)/p/* 跟 public/* 是兩套系統嗎？

**是的，有意為之**。

- **(public)/p/*** = 新一代 C 端（客人直接購買、客製化 DIY）
  - 視覺：Morandi 色系、時間軸、sticky 導航、hero 背景圖
  - 互動：LINE 整合、詢價單追蹤、客製化景點選擇
  - 定位：高端/自助旅遊客群

- **/public/** = 舊工具系統（多年沿用、B2B 供應商協作 + 舊 C 端保留）
  - 視覺：同色系，但風格簡潔務實
  - 互動：報價問卷、合約簽署、需求單回覆
  - 定位：供應商、稍低端客群或流程驗證

**為什麼並存？**
- /p/* 是「新生態」，試水高端市場
- /public/* 是「既有」，支撐舊客戶、供應商協作
- 可獨立迭代，互不干擾

### Q2: /m/* 行動版給誰用？

**目前無明確定位**。目錄存在但無頁面。推測：

1. 若日後開發，可能是 **行社內部員工 + 領隊 PWA**（簽到、開單、拍照）
2. 或 **客人行動端簡化版**（目前 /public/* 已支援手機，未必需要 /m/)

**現況**：/public/* 已 responsive，無強制 /m/ 需求。

### Q3: landing 跟 root page.tsx 差在哪？

- **root (/)**: 無頁面，直接 redirect('/dashboard') → 登入用戶首頁
- **/landing**: 市場頁（未登入、SEO 導流）

**流程**：
```
未登入 → /landing (市場頁、Call-to-Action 到 /login)
  ↓ 登入
已登入 → / (redirect → /dashboard)
```

### Q4: 哪些頁面是問卷型、哪些是查詢型？

**問卷型**（供應商填寫、客人確認）：
- /public/request/[token] — 報價問卷（住宿、餐食、活動）
- /public/transport-quote/[tourId]/[requestId] — 車行報價問卷
- /public/accommodation-quote/[tourId]/[requestId] — 飯店報價問卷
- /public/meal-quote/[tourId]/[requestId] — 餐廳報價問卷
- /public/activity-quote/[tourId]/[requestId] — 活動報價問卷
- /p/customized/[slug] — 景點 DIY 選擇（詢價問卷）
- /confirm/[token] — 報價確認表單
- /transport/[id]/confirm — 司機資訊確認表單

**查詢型**（瀏覽、監控、分享）：
- /p/tour/[code] — 行程展示、價格查詢、導遊介紹
- /p/customized — 目的地目錄
- /public/booking/[tourCode] — 行程預覽（含報名 Dialog）
- /public/itinerary/[tourCode] — 行程詳情（含航班）
- /public/contract/sign/[code] — 合約檢視（+ 簽署）
- /public/insurance/[code] — 團員名單檢視（+ 下載）
- /p/customized/track/[code] — 詢價單進度追蹤（+ 追加留言）
- /view/[id] — 行程公開分享
- /landing — 市場頁
- /about — 關於頁

---

**End of Report**
