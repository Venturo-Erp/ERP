# 🌐 Venturo Online (B2C) — 完整功能地圖

**版本**：v1.0  
**負責人**：大祭司 William AI  
**對應系統**：venturo-online  
**定位**：B2C 客戶端 — 讓客人自助瀏覽、報名、管理行程

---

## 📊 系統現況

### ✅ 已完成（一紀）

#### 🏠 首頁 `/`

- [ ] 行程推薦輪播
- [ ] 熱門行程卡片
- [ ] 搜尋列（國家、日期、關鍵字）
- [ ] 快速篩選（主題、天數、價格）

#### 🔐 登入/註冊 `/login`

- [x] 電話號碼登入
- [x] 帳號密碼登入 `/login/account`
- [ ] Line 登入（OAuth）
- [ ] Google 登入（OAuth）
- [ ] 忘記密碼流程

#### 👤 個人中心 `/profile`

- [x] 個人資料編輯 `/profile/edit`
- [x] 大頭貼上傳 `/profile/edit/avatar`
- [x] 我的 QR Code `/profile/qrcode`（用於報到）
- [x] 常用旅伴管理 `/profile/companions`
  - [x] 新增旅伴 `/profile/companions/add`
- [x] 好友列表 `/profile/friends`
- [x] 會員憑證 `/profile/licenses`
- [x] 認證資料 `/profile/certifications`
- [x] 個人設定 `/profile/settings`
- [x] 我的貼文 `/profile/posts/[id]`
- [x] 查看他人資料 `/profile/[id]`

#### 📦 訂單管理 `/orders`

- [x] 訂單列表 `/orders`
- [x] 訂單詳情 `/order/[id]`
  - [x] 團員管理 `/order/[id]/members`
  - [ ] 行程內容查看
  - [ ] 付款狀態
  - [ ] 報到資訊

---

## 🏗️ 待建功能（二紀~六紀）

### 二紀：行程展示 + 報名系統

#### 🗺️ 行程瀏覽

- [ ] `/tours` — 行程列表頁
  - [ ] 卡片模式（預設）
  - [ ] 列表模式切換
  - [ ] 篩選器
    - [ ] 國家/地區
    - [ ] 出發日期範圍
    - [ ] 天數（1-3天、4-7天、8+天）
    - [ ] 價格區間
    - [ ] 主題標籤（美食、溫泉、文化、自然）
  - [ ] 排序（價格、日期、熱門度）
  - [ ] 分頁/無限滾動

- [ ] `/tours/[slug]` — 行程詳情頁
  - [ ] **世界樹東面**（行程內容）
    - [ ] 每日行程展開/收合
    - [ ] 景點圖片輪播
    - [ ] 餐食說明
    - [ ] 住宿資訊
  - [ ] 出團日期選擇器
  - [ ] 價格顯示（成人/孩童/嬰兒）
  - [ ] 包含/不包含項目
  - [ ] 注意事項
  - [ ] 報名按鈕 → 跳報名表單

#### 📝 報名系統

- [ ] `/tours/[slug]/register` — 報名表單
  - [ ] Step 1：選擇人數（成人/孩童/嬰兒）
  - [ ] Step 2：填寫團員資料
    - [ ] 從常用旅伴快速帶入
    - [ ] 護照號碼、出生日期、性別
    - [ ] 緊急聯絡人
    - [ ] 飲食需求（素食、過敏）
  - [ ] Step 3：確認資訊
  - [ ] Step 4：送出報名

- [ ] 報名成功頁
  - [ ] 訂單編號
  - [ ] 下一步指示（等待確認）
  - [ ] 加入行事曆按鈕

#### 💳 付款系統

- [ ] `/order/[id]/payment` — 付款頁
  - [ ] 訂金/全額選擇
  - [ ] 付款方式
    - [ ] 信用卡（串接綠界 ECPay）
    - [ ] ATM 轉帳（虛擬帳號）
    - [ ] 超商代碼
    - [ ] Line Pay
  - [ ] 付款成功/失敗頁面

---

### 三紀：出發前準備

#### ✈️ 出發準備區

- [ ] `/order/[id]/prepare` — 行前準備
  - [ ] 簽證進度追蹤
  - [ ] 護照檢查提醒
  - [ ] 保險購買連結
  - [ ] 天氣預報
  - [ ] 匯率資訊
  - [ ] 行李清單（可勾選）
  - [ ] 領隊聯絡方式

#### 📱 報到系統

- [ ] `/order/[id]/checkin` — 線上報到
  - [ ] QR Code 掃描（現場用）
  - [ ] 護照上傳
  - [ ] 簽到確認
  - [ ] 座位選擇（遊覽車）

#### 🗺️ 行程追蹤（旅程中）

- [ ] `/order/[id]/live` — 即時行程
  - [ ] 今日行程
  - [ ] 景點導覽（文字/語音）
  - [ ] 集合時間提醒
  - [ ] 景點打卡
  - [ ] 照片上傳（分享給團員）
  - [ ] 領隊廣播訊息

---

### 四紀：社群 + 會員系統

#### 🎖️ 會員等級

- [ ] `/profile/membership` — 會員中心
  - [ ] 等級顯示（銅/銀/金/鑽石）
  - [ ] 升級條件
  - [ ] 專屬優惠
  - [ ] 點數累積/兌換

#### 📸 旅遊社群

- [ ] `/community` — 旅遊社群
  - [ ] 遊記發佈
  - [ ] 照片分享
  - [ ] 景點評分
  - [ ] 留言互動

- [ ] `/tours/[slug]/reviews` — 行程評價
  - [ ] 參加過的團員評分
  - [ ] 評價回覆（旅行社）

#### 🎁 優惠 + 推薦

- [ ] `/promotions` — 優惠活動
  - [ ] 早鳥優惠
  - [ ] 團購優惠
  - [ ] 推薦好友（推薦碼）
  - [ ] 優惠券管理

---

### 五紀：進階功能

#### 🔔 通知系統

- [ ] 站內通知中心
  - [ ] 出團確認通知
  - [ ] 付款提醒
  - [ ] 行程變更通知
  - [ ] 促銷訊息
- [ ] Push Notification（App）
- [ ] Email 通知
- [ ] Line 通知

#### 🧳 客製化行程

- [ ] `/custom-tour` — 客製化需求表單
  - [ ] 人數、天數、預算
  - [ ] 偏好國家/主題
  - [ ] 特殊需求
  - [ ] 送出後等旅行社報價

#### 📊 行程比較

- [ ] 加入比較清單（最多 3 個）
- [ ] 並排比較表格
  - [ ] 價格
  - [ ] 天數
  - [ ] 包含項目
  - [ ] 住宿等級

---

### 六紀：AI 智能助手

#### 🤖 AI 行程規劃師

- [ ] `/ai-planner` — AI 規劃助手
  - [ ] 問答式規劃（我想去哪、預算多少）
  - [ ] 自動推薦行程
  - [ ] 智能比價

#### 💬 AI 客服

- [ ] 即時聊天機器人
  - [ ] 常見問題自動回答
  - [ ] 行程查詢
  - [ ] 轉接真人客服

---

## 🔗 跨系統整合點

### 與 ERP 的資料同步

1. **行程資料** → ERP tours 表同步到 Online
   - 行程標題、描述、價格、日期
   - 可報名人數（剩餘名額）
   - 上架/下架狀態

2. **訂單資料** → Online 訂單寫入 ERP orders
   - 客人報名 → ERP 收到新訂單
   - 付款狀態同步
   - 團員資料進入 ERP travelers

3. **會員資料** → Online users ↔ ERP customers
   - 帳號統一（SSO）
   - 會員等級同步

### 與 AI Console 的整合

1. **AI 客服** → 呼叫 AI Console API
2. **行程推薦** → AI 分析用戶偏好

---

## 📱 技術架構

### 前端

- **框架**：Next.js 15 (App Router)
- **UI**：Tailwind CSS + shadcn/ui
- **狀態管理**：Zustand
- **驗證**：Supabase Auth

### 後端

- **資料庫**：Supabase PostgreSQL（與 ERP 共用）
- **儲存**：Cloudflare R2（圖片/影片）
- **支付**：綠界 ECPay

### 部署

- **平台**：Vercel
- **CDN**：Cloudflare

---

## 📊 資料表需求

### Online 專用表

```sql
-- 行程上架設定（控制哪些行程顯示在 Online）
CREATE TABLE public_tours (
  id uuid PRIMARY KEY,
  tour_id uuid REFERENCES tours(id),
  published boolean DEFAULT false,
  featured boolean DEFAULT false,
  display_order integer,
  created_at timestamp DEFAULT now()
);

-- 客戶評價
CREATE TABLE tour_reviews (
  id uuid PRIMARY KEY,
  tour_id uuid REFERENCES tours(id),
  user_id uuid REFERENCES auth.users(id),
  rating integer CHECK (rating >= 1 AND rating <= 5),
  comment text,
  images text[],
  created_at timestamp DEFAULT now()
);

-- 優惠券
CREATE TABLE coupons (
  id uuid PRIMARY KEY,
  code text UNIQUE NOT NULL,
  discount_type text CHECK (discount_type IN ('percent', 'fixed')),
  discount_value numeric,
  valid_from timestamp,
  valid_until timestamp,
  max_uses integer,
  used_count integer DEFAULT 0
);

-- 會員等級
CREATE TABLE membership_tiers (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  min_points integer,
  benefits jsonb
);
```

---

**完成時間**：2026-03-17 04:30  
**狀態**：待 Matthew 檢視整合
