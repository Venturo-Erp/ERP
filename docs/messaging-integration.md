# Facebook Messenger + Instagram DM 客服整合

## 📌 架構說明

這是 **B2B 服務**，不是 SaaS 自助平台：
- ✅ 租戶申請後，**我們手動設定**
- ✅ 沒有前台 UI、OAuth 授權流程
- ✅ 內部管理 API（需要 Admin API Key）

---

## 🚀 Phase 1：核心 Webhook + AI 客服

### 1. Meta 開發者設定

#### 1.1 建立 Facebook App
1. 前往 [Meta for Developers](https://developers.facebook.com/)
2. 建立新應用程式 → 選擇「Business」類型
3. 新增產品：
   - **Messenger**
   - **Instagram Messaging API**（需通過審核）

#### 1.2 設定 Webhook
**Webhook URL:**
```
https://app.cornertravel.com.tw/api/messaging/webhook
```

**驗證 Token:**（自訂字串，填入 `.env.local`）
```bash
META_VERIFY_TOKEN=your_custom_verify_token_here
```

**訂閱事件：**
- Messenger: `messages`, `messaging_postbacks`
- Instagram: `messages`

#### 1.3 取得 Access Token
1. 前往 **Messenger Settings** → **Page Access Token**
2. 選擇 Facebook 粉絲專頁 → 產生 Token
3. 複製 Token，填入 `.env.local`：
```bash
META_PAGE_ACCESS_TOKEN=your_page_access_token_here
```

#### 1.4 取得 App Secret
1. 前往 **Settings** → **Basic**
2. 複製 **App Secret**，填入 `.env.local`：
```bash
META_APP_SECRET=your_app_secret_here
```

---

### 2. 環境變數設定

編輯 `.env.local`，新增以下變數：

```bash
# Meta 設定
META_APP_SECRET=your_app_secret_here
META_VERIFY_TOKEN=your_custom_verify_token_here
META_PAGE_ACCESS_TOKEN=your_page_access_token_here

# Claude API（用於 AI 客服）
CLAUDE_API_KEY=sk-ant-xxx

# 內部管理 API Key（自訂，用於手動設定租戶）
MESSAGING_ADMIN_API_KEY=your_admin_api_key_here
```

---

### 3. Database Migration

執行資料庫遷移：

```bash
cd ~/Projects/venturo-erp
supabase db push
```

或手動執行：
```bash
psql $DATABASE_URL < supabase/migrations/20260403_messaging_tenants.sql
```

---

### 4. 測試 Webhook

#### 4.1 本地測試（使用 ngrok）
```bash
# 安裝 ngrok
brew install ngrok

# 啟動 ngrok
ngrok http 3000

# 複製 ngrok URL（例如：https://abc123.ngrok.io）
# 在 Meta 開發者後台設定 Webhook URL：
# https://abc123.ngrok.io/api/messaging/webhook
```

#### 4.2 測試訊息
1. 前往 Facebook 粉絲專頁
2. 傳送測試訊息
3. 檢查 AI 是否回覆

---

## 🔧 內部管理 API

### 新增租戶配置

**Endpoint:** `POST /api/messaging/admin/tenant`

**Headers:**
```
Authorization: Bearer YOUR_MESSAGING_ADMIN_API_KEY
Content-Type: application/json
```

**Body:**
```json
{
  "workspace_id": "8ef05a74-1f87-48ab-afd3-9bfeb423935d",
  "tenant_name": "角落旅行社",
  "platform": "messenger",
  "page_id": "123456789",
  "page_access_token": "EAAxxxxxx",
  "webhook_secret": "abc123",
  "system_prompt": "你是角落旅行社的 AI 客服..."
}
```

**範例（curl）:**
```bash
curl -X POST https://app.cornertravel.com.tw/api/messaging/admin/tenant \
  -H "Authorization: Bearer YOUR_ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "workspace_id": "8ef05a74-1f87-48ab-afd3-9bfeb423935d",
    "tenant_name": "角落旅行社",
    "platform": "messenger",
    "page_id": "123456789",
    "page_access_token": "EAAxxxxxx"
  }'
```

---

### 查詢租戶配置

**Endpoint:** `GET /api/messaging/admin/tenant?workspace_id=xxx`

**Headers:**
```
Authorization: Bearer YOUR_MESSAGING_ADMIN_API_KEY
```

---

### 更新租戶配置

**Endpoint:** `PATCH /api/messaging/admin/tenant`

**Body:**
```json
{
  "id": "tenant_uuid",
  "is_active": false
}
```

---

### 刪除租戶配置

**Endpoint:** `DELETE /api/messaging/admin/tenant?id=xxx`

---

## 🛠️ Claude Function Calling

### 已實作工具

#### 1. `get_historical_tour_cost`
查詢過往行程預估費用（根據目的地和天數）

**範例對話：**
```
用戶：日本 5 天大概多少錢？
AI：（自動呼叫工具）→ 根據歷史資料，日本 5 天行程平均每人約 NT$ 35,000
```

### 未來擴充工具
- `search_available_tours` — 查詢可報名行程
- `check_booking_status` — 查詢訂單狀態
- `transfer_to_human` — 轉接真人客服

---

## 📊 監控與日誌

### 查詢對話記錄
```sql
SELECT * FROM customer_service_conversations
WHERE platform = 'messenger'
ORDER BY created_at DESC
LIMIT 100;
```

### 查詢租戶配置
```sql
SELECT * FROM messaging_tenants
WHERE is_active = true;
```

---

## 🚨 注意事項

1. **Instagram Messaging API 需審核**
   - 需提交審核申請（預計 2-7 天）
   - 審核通過前只能測試，無法正式使用

2. **Meta Access Token 過期**
   - Page Access Token 不會過期（除非重新生成）
   - 但需定期檢查權限是否正常

3. **Rate Limiting**
   - Webhook 限制：100 requests/min
   - Meta API 限制：依據粉絲專頁規模

4. **安全性**
   - `META_APP_SECRET` 不可外洩
   - `MESSAGING_ADMIN_API_KEY` 只給內部團隊使用

---

## 📦 檔案結構

```
src/
├── app/api/messaging/
│   ├── webhook/route.ts              # 統一 Webhook（FB/IG）
│   ├── admin/tenant/route.ts         # 內部管理 API
│   └── reply/route.ts                # 統一回覆 API（未來）
├── lib/messaging/
│   └── ai-handler.ts                 # Claude 整合 + Function Calling
supabase/migrations/
└── 20260403_messaging_tenants.sql    # Database Schema
```

---

## ✅ Phase 1 完成檢查清單

- [ ] Meta App 建立完成
- [ ] Webhook URL 設定並驗證通過
- [ ] Database Migration 執行成功
- [ ] `.env.local` 變數設定完成
- [ ] 測試 Messenger 訊息回覆成功
- [ ] 測試 `get_historical_tour_cost` 工具
- [ ] 內部管理 API 測試成功

---

**開發者：Matthew 🔧**  
**完成日期：2026-04-03**
