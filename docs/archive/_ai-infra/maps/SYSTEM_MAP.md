# System Map

> Venturo ERP — 旅行社多租戶營運系統
> Tech: Next.js 14 + Supabase + TypeScript
> 259 tables, 35+ features

---

## Domains

| Domain          | 路徑             | 說明                   |
| --------------- | ---------------- | ---------------------- |
| dashboard       | /dashboard       | 首頁儀表板             |
| orders          | /orders          | 訂單管理（核心）       |
| tours           | /tours           | 出團管理（核心）       |
| itinerary       | /itinerary       | 行程設計               |
| customers       | /customers       | 客戶管理               |
| customer-groups | /customer-groups | 客戶群組               |
| finance         | /finance         | 收款/請款/結案         |
| quotes          | /quotes          | 報價單                 |
| proposals       | /proposals       | 提案                   |
| confirmations   | /confirmations   | 團確單                 |
| contracts       | /contracts       | 合約                   |
| supplier        | /supplier        | 供應商管理             |
| visas           | /visas           | 簽證管理               |
| esims           | /esims           | eSIM 管理              |
| scheduling      | /scheduling      | 排程                   |
| calendar        | /calendar        | 日曆                   |
| hr              | /hr              | 人事                   |
| marketing       | /marketing       | 行銷                   |
| reports         | /reports         | 報表                   |
| files           | /files           | 檔案管理               |
| todos           | /todos           | 待辦事項               |
| tools           | /tools           | 工具                   |
| design          | /design          | 手冊設計系統           |
| brochures       | /brochures       | 手冊管理               |
| office          | /office          | 辦公室                 |
| settings        | /settings        | 系統設定               |
| traveler-chat   | /traveler-chat   | 旅客通訊               |
| workspace       | /workspace       | 工作區設定             |
| tenants         | /tenants         | 租戶管理（超級管理員） |

---

## Core Modules (Features)

```
src/features/
├── orders/          # 訂單 CRUD、訂單成員、護照
├── tours/           # 出團管理、團員、行程同步
├── itinerary/       # 行程編輯器（每日行程、景點、交通）
├── finance/         # 收款、請款、結案、利潤計算
├── payments/        # 金流（LinkPay、台新）
├── quotes/          # 報價單產生、版本管理
├── proposals/       # 提案→轉團
├── confirmations/   # 團確單（供應商確認）
├── customers/       # 客戶資料、護照
├── suppliers/       # 供應商管理
├── supplier/        # 供應商入口
├── contracts/       # 合約管理
├── visas/           # 簽證申請追蹤
├── esims/           # eSIM 銷售
├── scheduling/      # 排程管理
├── calendar/        # 日曆檢視
├── hr/              # 人事管理
├── members/         # 工作區成員
├── design/          # 手冊設計（16 元件 × 2 風格）
├── designer/        # 行程手冊設計器
├── dashboard/       # 儀表板
├── files/           # 檔案管理
├── todos/           # 待辦事項
├── office/          # 辦公室
├── game-office/     # 遊戲化辦公室
├── fleet/           # 車隊管理
├── disbursement/    # 出納
├── tour-confirmation/ # 團確單
├── tour-leaders/    # 領隊管理
├── transportation-rates/ # 交通費率
├── traveler-chat/   # 旅客聊天
├── workspaces/      # 工作區
└── attractions/     # 景點資料庫
```

---

## Shared Libraries

```
src/lib/
├── auth/            # 認證（JWT 簽名）
├── db/              # Supabase client
├── api/             # API 工具
├── cache/           # 快取
├── constants/       # 常數
├── data/            # 共用資料
├── excel/           # Excel 匯出
├── actions/         # Server Actions
└── analytics/       # 分析
```

---

## Stores (State Management)

```
src/stores/
├── core/create-store.ts    # 通用 store 工廠
├── accounting-store.ts     # 會計
├── file-system-store.ts    # 檔案系統
└── workspace/
    ├── workspace-store.ts  # 工作區全域狀態
    ├── members-store.ts    # 成員
    ├── chat-store.ts       # 聊天
    ├── channel-store.ts    # 頻道
    ├── canvas-store.ts     # 畫布
    └── rich-document-store.ts # 文件
```

---

## API Routes

| Route                  | 說明                            |
| ---------------------- | ------------------------------- |
| /api/auth/\*           | 認證（登入、密碼、員工同步）    |
| /api/itineraries/\*    | 行程 CRUD + AI 生成             |
| /api/quotes/\*         | 報價單 + 團確單                 |
| /api/proposals/\*      | 提案 + 轉團                     |
| /api/linkpay/\*        | 台新金流 webhook                |
| /api/travel-invoice/\* | 旅行業代收轉付收據              |
| /api/ocr/passport      | 護照 OCR（Google Vision + MRZ） |
| /api/ai/\*             | AI 功能（圖片編輯、景點建議）   |
| /api/gemini/\*         | Gemini 圖片生成                 |
| /api/storage/\*        | 檔案上傳                        |
| /api/health/\*         | 健康檢查                        |
| /api/traveler-chat/\*  | 旅客通訊                        |
| /api/meeting/\*        | 會議                            |
| /api/cron/\*           | 定時任務                        |
| /api/airports          | 機場資料庫                      |
| /api/meeting/\*        | AI 會議（send, summary）        |
| /api/tenants/\*        | 租戶管理                        |
| /api/settings/\*       | 系統設定                        |

---

## Key Technical Facts

- **Multi-tenant**: workspace_id 隔離，RLS 162 張表
- **Auth**: JWT 簽名 + server-only secret
- **Storage**: Supabase Storage（護照 = private bucket）
- **State**: Zustand stores（三代並存）
- **PDF**: 自建 PDF 引擎（手冊、報價單、收據）
- **Tests**: 1515+ unit tests (Vitest) + E2E (Playwright)
- **Bundle**: ~34MB（Univerjs 佔 43%）
- **Deploy**: Vercel

---

## Trip Lifecycle (Core Business Flow)

```
提案(Proposal) → 版本 → 開團(Tour) → 報價單(Quote) ↔ 行程表(Itinerary)
                                          ↓
                                     需求總覽 → 需求單 → 供應商
                                                    ↓
                                              確認單(Confirmation) → 交接 → Online App
```
