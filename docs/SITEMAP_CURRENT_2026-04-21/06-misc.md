# 週邊模組盤點（06-misc）

掃描日期：2026-04-21
涵蓋頁數：13

## 本批模組整體概念

本批 13 頁涵蓋四大類功能：

- **加值類**（AI / 行銷 / 監控 / 戰情室）：提升營運效率與決策速度的系統工具。AI 客服（Line + Meta）、行銷素材版庫、即時監控中心（iframe 內嵌）、William 的管理儀表板。
- **操作工具類**（簽證 / eSIM / 檔案）：地勤日常執行工具。簽證申報流程、eSIM 庫存與發行、雲端檔案系統。
- **資料定義類**（型錄 / 頻道）：內容與渠道管理的設定頁。brochure 與 brochures 並存（舊路由 redirect + 新路由）、頻道協作空間。
- **租戶管理類**（租戶 / 結團報表）：平台管理資格視角。租戶開通、功能授權、團體結團財務報表。

**特別注意**：`/brochure` 與 `/brochures` 確實並存 — 舊路由 redirect 到 `/design/new`，新路由是 DesignPage + category filter。

## 頁面清單

### /ai-bot — AI & 機器人管理
- **做什麼**：設定 LINE Messaging API + Meta (IG / FB Messenger) 機器人連線，管理群組好友、對話記錄、AI 設定、知識庫
- **主要資料**：`line_groups`、`line_users`、`suppliers`、`line_setup`、`meta_setup`
- **主要動作**：「平台連線」、「群組&好友」、「對話記錄」、「AI 設定」、「知識庫」
- **紅旗**：`// 忽略` 註解；Meta 部分佈局完整但實裝未見（iframe 還是佔位？）

### /brochure — 型錄列表（舊路由）
- **做什麼**：重定向舊路由至 `/design/new`，保留 URL 參數
- **主要資料**：無（純重定向）
- **主要動作**：無
- **紅旗**：Legacy 遺留、與 brochures 並存

### /brochures — 手冊頁面（新路由）
- **做什麼**：DesignPage wrapper、篩選 category = 「brochure」
- **主要資料**：design 素材資料庫（category 欄）
- **主要動作**：素材搜尋、新建、編輯、刪除
- **紅旗**：無明顯

### /channel — 頻道工作空間
- **做什麼**：群組聊天與頻道協作空間（雙欄、手機三層：左側頻道樹、中間聊天、右側細節）
- **主要資料**：`workspaces`、`channels`、`channel_groups`
- **主要動作**：選頻道、傳訊息、刷新頻道列表
- **紅旗**：`logger.log` + 🔵🔥 emoji 滿地（debug 遺留）；多個 hasLoaded flag 序列化邏輯；動態 import 造成 TS 推導困難

### /esims — eSIM 清單
- **做什麼**：列表、新增、編輯、刪除 eSIM 記錄（號碼、套餐、價格、供應商訂單編號）
- **主要資料**：`esim`、`tour` 關聯
- **主要動作**：「新增 eSIM」、「進階搜尋」、「編輯」、「刪除」
- **紅旗**：無明顯

### /files — 檔案管理
- **做什麼**：三欄檔案瀏覽器（資料夾樹、檔案列表、檔案預覽），響應式隱顯
- **主要資料**：`files`、`folders`（file_system_store）
- **主要動作**：選資料夾、選檔案、預覽、上傳
- **紅旗**：無明顯

### /marketing — 行銷素材
- **做什麼**：DesignPage wrapper、篩選 category = 「social」或「banner」
- **主要資料**：design 素材資料庫
- **主要動作**：素材搜尋、新建、編輯、刪除
- **紅旗**：無明顯

### /monitoring — 監控中心
- **做什麼**：整合兩個 iframe（Star-Office-UI AI Agents 即時狀態、OpenClaw Mission Control 任務 Kanban）、三分頁
- **主要資料**：外部系統（localhost:19000、:3100）；統計數字硬編碼
- **主要動作**：切分頁、iframe 切換
- **紅旗**：iframe URL 全硬編；統計數字硬編（8 agent、3 活躍、12 進行中、45）；實裝明顯未完

### /tenants — 租戶列表
- **做什麼**：平台管理資格視角、列出所有租戶、顯示員工數與系統主管、可編輯/啟用停用、新增租戶
- **主要資料**：`workspaces`、`employees`
- **主要動作**：「新增租戶」、「編輯」、「啟用/停用」、「進入詳情」
- **紅旗**：無明顯

### /tenants/[id] — 租戶詳情
- **做什麼**：租戶基本資訊、系統主管卡片、核心方案與付費加購功能開關（module 級 + tab 級）、重設系統主管密碼
- **主要資料**：`workspaces`、`workspace_features`、`employees`
- **主要動作**：「儲存」（toggle feature switch）、「重設密碼」、「管理分頁」
- **紅旗**：預設密碼邏輯複雜；**密碼作為明文警告框顯示（安全隱憂）**

### /visas — 簽證管理
- **做什麼**：簽證申報工作流、客戶比對、批次撿件 / 駁回、申請單上傳、狀態分頁（草稿 / 已提交 / 已核准 / 已駁回 ...）
- **主要資料**：`visas`、`tours`、`orders`、`customers`
- **主要動作**：「新增簽證」、「提交」、「比對客戶」、「批次撿件」、「駁回」
- **紅旗**：無明顯；hook 結構清晰

### /war-room — 戰情室（作戰會議室）
- **做什麼**：William 的管理儀表板、三分頁（魔法圖書館依賴版本庫、Bot 管理、任務看板）
- **主要資料**：`magic_library`、`bot_registry`、`tasks`（untyped client）
- **主要動作**：「檢查更新」、「管理機器人」、「追蹤任務」
- **紅旗**：表不在 generated types 中（TS 使用 untyped Supabase）；功能模組多但整合度未知

### /reports/tour-closing — 團體結團報表
- **做什麼**：已結團行程的財務報表、列出收入 / 成本 / 毛淨利、統計業務獎金 / OP 獎金 / 團體獎金、按月篩選、支持 Excel 匯出
- **主要資料**：`tours`（archived=true）、`orders`、`order_members`、`payment_requests`
- **主要動作**：「選月份」篩選、「匯出 Excel」
- **紅旗**：無明顯；批量查詢最佳化、記憶體運算

---

## 重點回答

**Q1: brochure vs brochures 是不是並存？**
是。兩個路由都存在、未合併、標題都用「手冊」。

**Q2: 哪幾頁看起來只是骨架？**
- `/monitoring` — iframe URL + 統計全硬編、實裝明顯未完
- `/channel` — 初始化邏輯複雜、debug log 滿地
- `/war-room` — 框架完整但表 untyped、功能整合度未知

**Q3: war-room / monitoring / reports 三者功能看起來重疊嗎？**
未見重疊。各司其職：monitoring 是外部系統整合、war-room 是內部工具 + 依賴、reports 是財務輸出。
