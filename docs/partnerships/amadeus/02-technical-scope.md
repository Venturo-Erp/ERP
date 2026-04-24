# Venturo × Amadeus 技術整合需求書

**版本**：v1.0
**日期**：2026-04-18
**受眾**：Amadeus Taiwan Technical / Solution Architect
**配套文件**：`01-business-proposal.md`

---

## 文件目的

明確列出 Venturo 要求 **一次性授權**的完整 Amadeus API Scope，
避免未來分階段追加導致多次合約整合費。

**原則：寧可列齊，也不要漏項。**

---

## 1. API Scope 完整清單

### 1.1 查詢類 APIs（階段 1 啟用）

| API                             | 用途                         | 優先級 |
| ------------------------------- | ---------------------------- | ------ |
| Flight Search / Low-Fare Search | 航班搜尋（單程、來回、多段） | P0     |
| Air Availability                | 座位即時查詢                 | P0     |
| Fare Quote                      | 票價即時計算                 | P0     |
| Branded Fares                   | 艙等升級選項                 | P1     |
| Ancillary Catalogue             | 加值服務查詢                 | P1     |
| Airline / Airport Lookup        | 航司、機場 reference data    | P0     |

### 1.2 訂位類 APIs（階段 2 啟用，但一次授權）

| API                            | 用途                         | 優先級 |
| ------------------------------ | ---------------------------- | ------ |
| PNR Create                     | 建立 PNR                     | P0     |
| PNR Retrieve                   | 讀取 PNR                     | P0     |
| PNR Modify                     | 修改 PNR                     | P0     |
| PNR Cancel                     | 取消 PNR                     | P0     |
| Passenger Info                 | 乘客資料（Name、APIS、護照） | P0     |
| Special Service Request（SSR） | 特殊需求（餐食/輪椅/嬰兒）   | P0     |
| Seat Selection                 | 座位選位                     | P0     |
| Form of Payment                | 付款方式註記                 | P1     |

### 1.3 Queue / 航班異動類（**Venturo 殺手功能，階段 1 啟用**）

| API / 機制                          | 用途                    | 優先級             |
| ----------------------------------- | ----------------------- | ------------------ |
| Queue Management API                | 讀寫 QJ / TJ / EJ Queue | P0                 |
| Schedule Change / Schedule Recovery | SSIM / TK / UN 訊息取得 | P0                 |
| Webhook / Push 機制                 | 即時推播，非輪詢        | **P0（強烈要求）** |
| Amadeus Robotics                    | 自動處理 Queue          | P1                 |
| Notification Manager                | 多管道通知              | P1                 |

**說明**：Venturo 的航班異動通知功能對小旅行社極為關鍵，
要求 **Webhook / Push 而非輪詢**，以確保即時性與成本控制。

### 1.4 出票類 APIs（階段 3 啟用，但一次授權）

| API                                      | 用途              | 優先級                        |
| ---------------------------------------- | ----------------- | ----------------------------- |
| E-Ticket Issuance                        | 電子票開票        | P0                            |
| Void                                     | 作廢              | P0                            |
| Refund                                   | 退票              | P0                            |
| EMD（Electronic Miscellaneous Document） | 加值服務憑證      | P1                            |
| Commission / Incentive Tracking          | 佣金追蹤          | P1                            |
| BSP Integration（台灣）                  | 台灣 BSP 結算對接 | P0（如 Venturo 取得票務授權） |

### 1.5 Post-Booking

| API                   | 用途            | 優先級 |
| --------------------- | --------------- | ------ |
| Online Check-in       | 線上報到        | P2     |
| Flight Status         | 航班即時狀態    | P1     |
| Disruption Management | 取消 / 延誤處理 | P1     |
| Itinerary Share       | 行程分享給旅客  | P2     |

### 1.6 加值服務

| API            | 用途                        | 優先級 |
| -------------- | --------------------------- | ------ |
| Seat Map       | 視覺化座位圖                | P1     |
| Meal Selection | 餐食預訂                    | P2     |
| Baggage        | 行李加購                    | P2     |
| Insurance      | 旅平險（若 Amadeus 有提供） | P2     |

### 1.7 報表 / 分析

| API / 資料        | 用途               | 優先級 |
| ----------------- | ------------------ | ------ |
| Sales Report      | 銷售報表           | P1     |
| Daily Transaction | 每日交易明細       | P1     |
| Commission Report | 佣金報表           | P1     |
| MIS Data Feed     | 管理資訊系統資料源 | P2     |

### 1.8 後台 / 整合

| 需求                                | 優先級         |
| ----------------------------------- | -------------- |
| User / Permission Management API    | P0             |
| Audit Log（操作稽核）API            | P0             |
| Sandbox / Test Environment 永久存取 | **P0（必要）** |
| Technical Support 票務系統          | P0             |
| Account Manager 專屬窗口            | P0             |

---

## 2. 合約必備條款（技術角度）

以下條款**必須寫入正式合約**，避免後續爭議：

### 2.1 多租戶 / SaaS 架構（已確認 Amadeus 同意）

> Venturo 為 SaaS 平台，Venturo 的客戶（台灣各家旅行社）
> 透過 Venturo 系統間接使用 Amadeus API。
> 此 **多租戶架構須於合約中明確書面允許**，
> 且不構成違反 Amadeus 單一機構授權條款。

Amadeus BD 已口頭確認此架構可行（2026-04 雙方業務對談），
合約需以書面形式落實。

### 2.2 多環境授權

- **Development**：開發環境，不限次數、不收費
- **Staging**：預備環境，壓力測試用，不限次數、不收費
- **Production**：正式環境，依約定費率計費
- **不得額外收取 Dev / Staging 的整合費**

### 2.3 並發連線與配額

- 並發連線數：至少 **100** 起跳（SaaS 多租戶需高並發）
- API 月呼叫量：初始配額 **10 萬次/月**，視營運量級調整
- 超量費率：透明公開，不得事後調整

### 2.4 資料權利

- **PNR / Ticket 資料**：Venturo 及客戶可無限次數匯出、保存
- **資料保留期間**：至少 7 年（符合台灣稅務規範）
- **合約終止後資料遷移**：
  - 終止後 90 天內，Venturo 可完整匯出所有歷史資料
  - Amadeus 協助必要的資料轉換（不得收取額外整合費）

### 2.5 白標 / Sub-license

- Venturo 有權在自有品牌下提供 Amadeus 功能
- Venturo 有權將 Amadeus 功能作為 SaaS 服務轉授權給下游旅行社
- Venturo 的下游旅行社可使用 Amadeus 功能，
  **無需與 Amadeus 另行簽約**

### 2.6 API 版本升級保障

- Amadeus 推出新版本 API 時，**舊版至少再支援 18 個月**
- 升級必要的程式調整，Amadeus 提供**免費技術諮詢**
- 不得以升級為由增收整合費

### 2.7 服務等級（SLA）

| 指標           | 承諾                                     |
| -------------- | ---------------------------------------- |
| API 可用性     | ≥ 99.5% 月                               |
| 故障響應時間   | P1 < 1 小時 / P2 < 4 小時 / P3 < 24 小時 |
| 計畫性維護通知 | 至少 7 天前告知                          |
| 故障補償       | 依 SLA 比例退費或延長合約                |

### 2.8 資安與合規

- **資料加密**：API 傳輸全程 TLS 1.3 以上
- **憑證管理**：Amadeus 提供 API Key / OAuth 2.0 token 管理
- **PCI-DSS**：若涉及支付，雙方遵守
- **台灣個資法**：Amadeus 須配合台灣個資法處理流程

### 2.9 整合費一次結清

- **本合約涵蓋所有列於第 1 節的 API Scope**
- Venturo 一次性支付整合費用
- 未來 Venturo 啟用本合約任一 API **不得再收整合費**
- 僅可依照「使用量」計價

---

## 3. 技術架構示意

### 3.1 系統整合架構

```
┌──────────────────────────────────────────┐
│  旅行社 A   旅行社 B   旅行社 C  ...       │ ← SaaS 客戶
└──────────────┬───────────────────────────┘
               │  Web / Mobile
               ▼
┌──────────────────────────────────────────┐
│        Venturo SaaS 平台                  │
│  ┌────────────────────────────────────┐  │
│  │ 雙模式 UI（簡單 / 專業）             │  │
│  └────────────────────────────────────┘  │
│  ┌────────────────────────────────────┐  │
│  │ Venturo API Gateway                │  │
│  │ - 租戶識別                           │  │
│  │ - 權限控管                           │  │
│  │ - API 配額管理                       │  │
│  └────────────────────────────────────┘  │
│  ┌────────────────────────────────────┐  │
│  │ Amadeus Integration Layer          │  │
│  │ - API 呼叫代理                       │  │
│  │ - 快取層                             │  │
│  │ - Queue 監控 + Webhook 處理          │  │
│  └────────────────────────────────────┘  │
└──────────────┬───────────────────────────┘
               │  HTTPS / OAuth 2.0
               ▼
┌──────────────────────────────────────────┐
│        Amadeus GDS APIs                   │
│  Search │ Book │ Ticket │ Queue │ ...    │
└──────────────────────────────────────────┘
```

### 3.2 航班異動通知流程

```
Amadeus Airline System
         │
         ▼
   Amadeus Queue（SSIM / TK / UN）
         │
         ▼ Webhook Push
Venturo Integration Layer
         │
         ├─► 寫入 Venturo ERP（訂單變更歷程）
         ├─► 推播業務（App / Email / LINE）
         ├─► 推播旅客（可選）
         └─► 自動草擬改票方案
```

---

## 4. Venturo 技術棧（給 Amadeus 參考）

| 層級               | 技術                                 |
| ------------------ | ------------------------------------ |
| 前端               | Next.js 15 / React 18                |
| API / 後端         | Next.js Route Handlers + Node.js     |
| 資料庫             | PostgreSQL（Supabase 託管）          |
| 部署               | Vercel（前端 / API）+ Supabase（DB） |
| 代收轉付 / 固定 IP | 遠振 VPS / Oracle Cloud 雙區         |
| 異地備份           | Backblaze B2（加密）                 |

Venturo 可配合 Amadeus 要求的 TLS 版本、IP 白名單、固定 IP 等。

---

## 5. 未決 / 待討論事項

- [ ] Amadeus 建議的初始 Sandbox 存取時程
- [ ] Webhook vs 輪詢：Amadeus 官方推薦方式確認
- [ ] 台灣 BSP 整合的具體路徑（Venturo 若取得票務資格後）
- [ ] 特殊機票類型支援（團體票、兒童票、寵物票）
- [ ] 跨 GDS 整合可能性（若 Venturo 未來同時接 Sabre / Galileo，Amadeus 立場）

---

## 6. 下一步

1. Amadeus 審閱本技術需求書，標記可授權範圍
2. 雙方技術會議釐清 Webhook / Sandbox / SLA 細節
3. Amadeus 提供整合費用報價（一次結清）
4. 簽署 NDA → 框架合約 → 技術 SOW

---

_本文件為草稿 v1.0，William 審閱後定稿。_
