# 7 個中度孤兒表 業務拍板問卷
> 給 William 看、用業務語言、每題給「保留 / 重做 / 砍」三選一
> 調查日：2026-05-01。所有 7 張表 DB 均 0 row。

---

## 1. visas（簽證）

**現況**：
- DB 0 筆、30 欄（含 `applicant_name`、`visa_type`、`country`、`status`、`fee`、`cost`、`vendor`、`expected_issue_date`、`is_urgent` 等完整流程欄位）
- UI：**有完整頁面** `src/app/(main)/visas/page.tsx` → `src/features/visas/VisasPage`，14 個 component（VisasList / AddVisaDialog / SubmitVisaDialog / ReturnDocumentsDialog / BatchPickupDialog / CustomerMatchDialog…）
- Sidebar：`/visas`「簽證管理」獨立入口、`requiredPermission: 'visas'`、feature flag 已註冊（`workspace_features`）
- API：無獨立 `/api/visas/`、走 entity hook 直接讀寫
- 訂單頁整合：`OrderListView` 有「一鍵辦簽證」按鈕、`BatchVisaDialog` 批次送簽
- 跟其他表重疊：無（獨立流程）
- venturo-app 對應：**有完整 visas schema**（`docs/SCHEMA_PLAN.md` 設計好、`apps/web/app/(tenant)/visas/page.tsx` 已寫頁面、欄位幾乎一樣：visa_type / status / fee / cost / vendor / is_urgent…）

**業務問題**：
你打算讓客戶做簽證辦理流程嗎？
- 「保留」 → 我會把 visa 表跟 UI 都修齊、達 venturo-app 標準
- 「重做」 → 砍現有、之後依新規範重建
- 「砍」 → 連 UI 跟 API 一起拔光、表 DROP

**我的建議**：**保留**。venturo-app 已經把 visas 列為核心模組、ERP 這邊 schema + 14 個 component 都建好了、只欠資料、砍掉是可惜。

---

## 2. messages（訊息）

**現況**：
- DB 0 筆、21 欄（`channel_id`、`content`、`author` jsonb、`attachments` jsonb、`reactions` jsonb、`parent_message_id` 自我引用支援討論串、`is_pinned`、`reply_count`…）
- UI：**有頻道聊天功能**、`src/app/(main)/channel/`、`src/components/workspace/channel-chat/`（ChatMessages / ThreadPanel / 14 個 hook、含 `useChannelEffects` Realtime 訂閱 `messages` 表）
- Sidebar：頻道（`/channel`）已上線、`channels` 表 24 row、`channel_members` 22 row
- API：`src/stores/workspace/chat-store.ts`（loadMessages / sendMessage / delete / pin / reaction / threading）+ `bot/ticket-status` + `bot-notification` + `channel-notify` 四處 INSERT
- 跟其他表重疊：**跟 `line_messages`（0 row）只在概念上像、實際是兩張不同的表**。`messages` = 內部員工頻道聊天（搭 `channels` / `channel_members`）；`line_messages` = LINE 對外客服訊息。語意不同、不算冗餘
- venturo-app 對應：venturo-app 沒有員工聊天功能、SCHEMA_PLAN.md 完全沒列 messages / channels

**業務問題**：
你打算讓員工在 ERP 內部聊天（取代 LINE 群組）嗎？
- 「保留」 → 我會把 channels + messages 修齊、做成 Slack 風格內部頻道
- 「重做」 → 砍現有、之後重建
- 「砍」 → 連頻道功能整套拔光（`channels` 24 row + `channel_members` 22 row + UI + chat-store）、改用外部 LINE/Slack

**我的建議**：**保留**（但需問清楚優先順序）。基礎建設都建好（24 個頻道有人開、22 人加入、Realtime 訂閱寫好）、只是沒人傳訊息。如果你不打算做內部聊天 SaaS、考慮砍；如果保留、建議補一個 demo seed 推員工試用。

---

## 3. members（團員）

**現況**：
- DB 0 筆、40 欄（`order_id`、`tour_id`、`chinese_name`、`english_name`、`passport_number`、`passport_expiry`、`emergency_contact`、`room_type`、`assigned_room`、`add_ons` array、`refunds` array…）— **跟 `order_members` 高度重疊**
- UI：無獨立頁面
- code 引用：唯一一處 = `tour_dependency.service.ts:61` 刪 tour 時 `delete from members where tour_id`（防孤兒）
- **重要發現**：`src/data/entities/members.ts` 的 `useMembers()` 實際是 `createEntityHook<Member>('order_members'...)` — **指向 `order_members`、不是 `members`**。所以 `useMembers()` 不算對 `members` 表的引用
- 跟其他表重疊：**完全被 `order_members`（150 row）取代**。`order_members` 比 `members` 多 5 欄（passport_name_print / sort_order / selling_price / cost_price / profit / 各種 hotel checkin 欄位）、是真正的活表
- venturo-app 對應：沒有 `members` 表、用 `order_members`（沿用 ERP 結構）

**業務問題**：
這張 `members` 表是 `order_members` 之前的舊版、現在沒人用、可以砍嗎？
- 「保留」 → 不建議、已被 order_members 蓋掉
- 「重做」 → 不適用
- 「砍」 → DROP 表、`tour_dependency.service.ts:61` 那行也刪掉

**我的建議**：**砍**。`order_members` 才是 SSOT、`members` 是死表、`tour_dependency.service.ts` 那行是過時防護。

---

## 4. departments（部門）

**現況**：
- DB 0 筆、11 欄（`name`、`code`、`description`、`is_active`、`display_order`）
- UI：`/settings/company/page.tsx` 有「部門管理」section（line 662-786、列表 + 新增 + 排序）、**只在 `isFeatureEnabled('departments')` 開啟時顯示**
- 業務整合：`tours.department_id` FK → `departments.id`（DB 已建）；`TourBasicInfo` 表單有「部門選擇」、開團時部門代號會加進團號前綴（`JY-CNX250501A`、見 `useTourOperations.ts:170`）
- API：無獨立 endpoint、走 entity hook
- 跟其他表重疊：無
- venturo-app 對應：**沒有 departments 表**（venturo-app 是「一人 SaaS」假設、HR 直接到員工級）
- 殘留考古：在 `lib/permissions/features.ts` 註冊為 feature flag，註解寫「付費功能、目前僅勁揚使用」（`departments.ts:5`）

**業務問題**：
你要不要繼續賣「部門 module」（多部門團號前綴 + 團指派部門）給大型旅行社？
- 「保留」 → 修齊 features.ts 跟 settings UI、依舊作為付費 module
- 「重做」 → 不適用
- 「砍」 → 把 `tours.department_id` FK 拔掉、TourBasicInfo 砍部門選單、`useTourOperations.ts:170` 拔前綴邏輯、settings UI section 砍、feature flag 註銷

**我的建議**：**砍**。註解寫「目前僅勁揚使用」、勁揚 0 row、表示連勁揚也沒在用。venturo-app 已決定不做部門層、保留 ERP 這邊只是技術債。

---

## 5. linkpay_logs（藍新金流付款連結 log）

**現況**：
- DB 0 筆、14 欄（`receipt_number`、`linkpay_order_number`、`price`、`link`、`status` int 0=待付/1=已付/2=失敗、`payment_name`、`end_date`）
- UI：`/finance/payments` 收款頁有「LinkPay」付款方式（5 種之一：現金/匯款/刷卡/支票/LinkPay）、`usePaymentData.handleCreateLinkPay` 呼叫 `/api/linkpay`
- API：`src/app/api/linkpay/route.ts`（產連結 + 寫 log）、`src/app/api/linkpay/webhook/route.ts`（接藍新通知更新 status）、3 處 INSERT/UPDATE 都正確
- 跟其他表重疊：無、跟 `receipts` 是 1:1 關係（receipt_number 為連結鍵）
- venturo-app 對應：**沒有 linkpay 相關表**（venturo-app 還沒整合金流）
- 殘留考古：在 `tenant_scoped_unique_codes.sql`（2026-04-21）有索引處理、`workspace-filter.ts` 列為租戶隔離表、是有意保留

**業務問題**：
你打算讓客戶用藍新 LinkPay 線上收款（產生付款連結傳給客人付款）嗎？
- 「保留」 → 整套留著、找一個團實測一輪生資料
- 「重做」 → 不適用
- 「砍」 → API + UI 5 種付款方式拔到剩 4 種、表 DROP、藍新整合全砍

**我的建議**：**保留**。整套金流串接（webhook 都寫好、merchant ID 都設好、production 模式都打開、見 migrations `set_newebpay_production`）、只是還沒人用 LinkPay 收款。砍掉等於浪費前期串接成本。

---

## 6. tour_addons（團附加產品）

**現況**：
- DB 0 筆、11 欄（`tour_id`、`name`、`description`、`price`、`quantity`）
- UI：**沒有頁面**、沒有任何 component
- code 引用：唯一一處 = `tour_dependency.service.ts:62` 刪 tour 時清空（孤兒防護）
- 跟其他表重疊：**部分被 `order_members.add_ons` array 欄位取代**（`members`/`order_members` 已有 add_ons array 存附加品）
- venturo-app 對應：沒有
- 殘留考古：migration `20251130110006_create_tour_addons.sql`（2025-11）建立、之後 4 個月 0 動作

**業務問題**：
你要不要做「團附加產品」功能（一團統一賣的加購：浮潛/SIM 卡/接送、不依個別團員）？
- 「保留」 → 我會建 UI（團詳情頁加 tab）+ 開團員勾選邏輯
- 「重做」 → 不適用、原本就沒做完
- 「砍」 → 表 DROP、`tour_dependency.service.ts:62` 那行也刪、附加品全靠 `order_members.add_ons` 個人勾選

**我的建議**：**砍**。建好 4 個月沒做 UI、表示業務優先級不高。`order_members.add_ons` 已涵蓋「個人加購」、整團加購用備註欄即可、不值得開新 module。

---

## 7. companies（公司客戶）

**現況**：
- DB 0 筆、30 欄（`code`、`name`、`tax_id`、`industry`、`employee_count`、`annual_travel_budget`、`payment_terms`、`credit_limit`、`is_vip`、`vip_level`、`total_orders`、`total_spent`…）
- UI：**有完整頁面** `src/app/(main)/customers/companies/page.tsx`（列表 + 新增 + 編輯 + 詳情、含 CompanyFormDialog / CompanyDetailDialog / CompanyTableColumns）
- Sidebar：透過 `/customers` 入口進入、breadcrumb 有「公司客戶」
- API：無獨立 endpoint、走 entity hook
- 衍生表：`company_contacts`（FK → companies.id、0 row）、`company_announcements`（0 row）
- 跟其他表重疊：跟 `customers`（385 row、個人客戶）並列、概念互補不衝突（B2C 個人 vs B2B 企業）
- venturo-app 對應：**沒有 companies 表**（SCHEMA_PLAN.md 只列個人 customers）
- 殘留考古：migration `20251130110003_create_companies.sql`（2025-11）建好整套（含 contacts / announcements）、頁面也 UI 完整、就是 0 個客人

**業務問題**：
你打算讓客戶管理「企業客戶」（公司行號訂團、月結付款、年度差旅預算）嗎？
- 「保留」 → 修齊頁面、之後對 B2B 旅行社（ex 出差團）開賣
- 「重做」 → 不適用、UI 都做完了
- 「砍」 → 整個 `/customers/companies` 頁面 + 3 張表（companies + contacts + announcements）+ entity hook 全拔

**我的建議**：**砍**。venturo-app 已決定走 B2C「角落旅遊」+ 個人 customers 路線、ERP 保留 B2B 表是過去想做沒做完的殘留。除非你明確要轉攻 B2B 出差旅行、否則 UI + DB 全砍乾淨、未來真的要做再依 venturo-app 標準重建。

---

## 統計

| # | 表 | 我的建議 |
|---|----|---------|
| 1 | visas | 保留 |
| 2 | messages | 保留（看你要不要做內部聊天） |
| 3 | members | 砍 |
| 4 | departments | 砍 |
| 5 | linkpay_logs | 保留 |
| 6 | tour_addons | 砍 |
| 7 | companies | 砍 |

7 題、3 保留 / 4 砍、其中 messages 看你業務方向再決定。
