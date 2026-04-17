# 成長方向會議報告

## 會議日期：2026-04-16

## 參與角色：SEO 專家、行銷策略師

---

### 執行摘要（3 句話總結）

角落旅行社目前是一個**內部 ERP 系統**，公開頁面僅限於行程分享連結（`/view/[id]`、`/public/itinerary/[tourCode]`），完全沒有面向搜尋引擎的內容頁面、部落格、或品牌官網。SEO 基礎設施幾乎為零——無 sitemap.xml、無 robots.txt、無結構化資料（JSON-LD）、無 canonical 標籤，且所有公開頁面都是動態路由，搜尋引擎難以爬取。品牌定位「高端不是貴，是值得」非常清晰且有差異化，但目前完全沒有線上可見度的管道將這個定位轉化為流量與客戶。

---

### SEO 現況檢查

| 項目                         | 狀態               | 建議                                                                                                                                                         |
| ---------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **sitemap.xml**              | 不存在             | 建立 Next.js App Router 的 `app/sitemap.ts`，動態產生公開行程頁面的 sitemap                                                                                  |
| **robots.txt**               | 不存在             | 建立 `app/robots.ts`，允許爬取公開頁面、禁止爬取 ERP 後台路由                                                                                                |
| **Meta Title / Description** | 部分實作           | 根 layout 的 title 是「Venturo ERP」（B2B 名稱），非品牌名稱；`/view/[id]` 有動態 OG metadata，但 `/public/itinerary/[tourCode]` 完全沒有 `generateMetadata` |
| **Open Graph 標籤**          | 僅 `/view/[id]` 有 | `/public/itinerary/[tourCode]`（主要對客頁面）缺少 OG 標籤，LINE/FB 分享時無法正確預覽                                                                       |
| **結構化資料 (JSON-LD)**     | 不存在             | 建議加入 `TravelAction`、`TouristTrip`、`Organization` 等 Schema.org 結構化資料                                                                              |
| **Canonical URL**            | 不存在             | 所有公開頁面都沒有 canonical 標籤                                                                                                                            |
| **品牌官網 / Landing Page**  | 不存在             | 目前沒有 `/` 首頁或品牌介紹頁面，域名直接進入 ERP 登入畫面                                                                                                   |
| **部落格 / 內容頁面**        | 不存在             | 完全沒有 blog、文章、目的地介紹等可被搜尋引擎索引的內容頁面                                                                                                  |
| **多語系 hreflang**          | 不存在             | 雖然有 next-intl 架構，但公開頁面未設定 hreflang alternate                                                                                                   |
| **圖片 SEO**                 | 部分               | Next.js Image 優化已啟用（avif/webp），但公開頁面未使用 `next/image`，缺少 alt 屬性                                                                          |
| **效能監控**                 | 已有               | Vercel Analytics + Speed Insights 已整合，Sentry 錯誤追蹤已啟用                                                                                              |
| **安全標頭**                 | 已有               | X-Frame-Options、CSP、XSS Protection 等已完整設定                                                                                                            |
| **部署架構**                 | 已有               | Vercel standalone 輸出，Turbopack 啟用，生產環境基礎穩固                                                                                                     |

---

### 內容策略建議

#### 現況分析

品牌目前的內容策略完全依賴社群平台（IG、FB、LINE），沒有任何「自有媒體」（owned media）可以累積 SEO 價值。BRAND_MAP.md 中定義的優質內容方向（深度景點介紹、文化脈絡、美食故事）非常適合做長尾 SEO 內容，但目前完全沒有承載這些內容的技術架構。

#### 建議方向

**1. 目的地深度內容（長尾 SEO 核心）**

基於品牌文案風格建立目的地資料庫頁面，例如：

- `/destinations/chiang-mai` — 清邁深度旅遊指南
- `/destinations/chiang-mai/temples` — 清邁寺廟文化探索
- `/experiences/khao-soi-samerjai` — 在地美食故事

這些頁面對應 BRAND_MAP 中的內容方向：有文化脈絡、有個人觀點、有具體細節，正好是 Google 偏好的 E-E-A-T（Experience, Expertise, Authoritativeness, Trustworthiness）內容。

**2. 行程故事化頁面（轉換核心）**

目前 `/public/itinerary/[tourCode]` 已有完整的行程展示，但缺乏：

- SEO metadata（title、description、OG tags）
- 結構化資料（TouristTrip schema）
- 可分享的永久連結（目前用 tourCode，對 SEO 友善）

**3. 品牌故事頁面（信任建立）**

建立 `/about`、`/philosophy` 等靜態頁面，傳達「高端不是貴，是值得」的品牌理念。

---

### 用戶獲取管道分析

| 管道                        | 現況                                                 | 潛力                                   | 優先級   |
| --------------------------- | ---------------------------------------------------- | -------------------------------------- | -------- |
| **LINE 官方帳號**           | 已整合，有 webhook、AI 客服、保險自動存檔            | 高——已是核心客服管道，可強化為 CRM     | 維護優化 |
| **Google 自然搜尋（SEO）**  | 零基礎                                               | 極高——旅遊是高搜尋量垂直市場           | P0 建設  |
| **Facebook 社群**           | 有策略規劃（BRAND_MAP），技術未整合                  | 中高——FB 仍是 30-45 歲台灣用戶主力平台 | P1       |
| **Instagram**               | 有策略規劃，技術未整合                               | 中——視覺說故事，但導流能力弱           | P1       |
| **LINE 分享行程連結**       | 已有（`/view/[id]`、`/public/itinerary/[tourCode]`） | 中——口碑傳播核心，但缺乏 OG 預覽       | P0 修復  |
| **Google 商家檔案**         | 未知                                                 | 高——本地搜尋「旅行社」的核心管道       | P0 建立  |
| **FB/IG Messenger 整合**    | 計畫中                                               | 中——擴大客服觸及                       | P2       |
| **付費廣告（Google/Meta）** | 未啟用                                               | 中——品牌定位不追流量，但精準投放可行   | P2       |
| **KOL/旅遊部落客合作**      | 未啟用                                               | 中高——符合品牌「有深度」定位           | P2       |
| **電子報**                  | 未啟用                                               | 中——會員經營，配合 LINE CRM            | P2       |

---

### 品牌定位 x 成長的整合建議

角落旅行社的品牌定位「高端不是貴，是值得」在成長策略上有一個關鍵優勢：**不需要追流量，只需要精準觸及對的人**。

這意味著：

1. **內容優先於廣告**——品牌文案風格（深度、有溫度、有故事性）天然適合 SEO 長尾策略。寫一篇「契迪龍寺的時間重量」比投一則「清邁五天四夜特惠」更符合品牌調性，而且 SEO 文章的邊際成本趨近於零。

2. **轉換率優先於曝光量**——公開行程頁面（`/public/itinerary/[tourCode]`）已經有「我要報名」CTA 和報名 Dialog，這是很好的轉換漏斗。但目前缺乏從「被搜尋到」到「看到行程」的路徑。

3. **口碑分享是最大槓桿**——30-45 歲都會探索者的決策路徑通常是：朋友推薦 → LINE 分享 → 看行程 → 報名。目前 `/view/[id]` 的 OG metadata 已經做了（支援 LINE 預覽），但 `/public/itinerary/[tourCode]` 完全缺少，這是直接影響轉換的技術債。

4. **SaaS 端的 SEO 策略不同**——Venturo ERP 作為旅行社 SaaS 產品，目標客群是「小旅行社，沒官網，用社群接單」。這些客群的搜尋意圖是「旅行社管理系統」「旅遊 ERP」「團控系統」。建議將 SaaS 行銷與旅行社品牌分開，用不同域名或子域名。

---

### 具體建議（按優先級）

#### P0 — 立即執行（1-2 週）

**1. 修復公開行程頁面的 OG Metadata**

- 為 `/public/itinerary/[tourCode]/page.tsx` 加入 `generateMetadata`
- 目前此頁面是 `'use client'`，需要重構為 Server Component + Client Component 分離
- 參考 `/view/[id]/page.tsx` 的做法（已有 `generateMetadata`）
- 影響：LINE/FB 分享時能正確顯示行程標題和封面圖

**2. 建立 robots.txt**

```
# app/robots.ts
export default function robots() {
  return {
    rules: [
      { userAgent: '*', allow: '/public/', disallow: ['/api/', '/(main)/'] },
    ],
    sitemap: 'https://yourdomain.com/sitemap.xml',
  }
}
```

**3. 建立 sitemap.xml**

```
# app/sitemap.ts — 動態產生公開行程的 sitemap
```

**4. 申請 Google 商家檔案**

- 不需要技術開發，純行政作業
- 對「XX 旅行社」本地搜尋極為重要

#### P1 — 短期建設（1-2 月）

**5. 建立品牌 Landing Page**

- `/` 首頁不應該直接進入 ERP 登入
- 建立一個品牌首頁：品牌故事 + 精選行程 + CTA
- 或考慮分離：`erp.venturo.com`（ERP）vs `cornertravel.com`（品牌官網）

**6. 為公開行程頁面加入結構化資料**

```json
{
  "@context": "https://schema.org",
  "@type": "TouristTrip",
  "name": "行程名稱",
  "description": "行程描述",
  "itinerary": { ... }
}
```

**7. 建立目的地資料庫的公開頁面**

- codebase 中已有旅遊資源資料（destinations、attractions、ref_countries）
- 將這些資料轉為可公開訪問的 SEO 頁面
- 路由規劃：`/destinations/[country]/[city]`

**8. 修復 `/public/itinerary/[tourCode]` 的技術債**

- 這個頁面目前是純 client-side rendering，搜尋引擎爬蟲無法看到內容
- 需要改為 SSR（Server Component + 資料預取）

#### P2 — 中期規劃（3-6 月）

**9. 內容行銷系統**

- 建立部落格架構（可用 Supabase 儲存文章，或整合 headless CMS）
- 內容方向參照 BRAND_MAP：景點深度介紹、文化脈絡解析、旅行觀點
- 每週 1-2 篇長文（800-1200 字），配合 FB 深度內容策略

**10. FB Messenger / IG DM 整合**

- 已在計畫中，優先級跟隨業務需求

**11. 電子報系統**

- 配合 LINE CRM，建立 email 管道
- 內容：私房路線推薦、限量行程通知（與 LINE 推播策略一致）

**12. SaaS 行銷分離**

- Venturo ERP 的 SaaS 行銷建議獨立域名與 Landing Page
- 目標關鍵字：「旅行社管理系統」「旅遊業 ERP」「團控軟體」
- 內容：功能介紹、客戶見證、免費試用

---

### 下一步行動

| 行動項目                                           | 負責角色      | 預計時間 | 依賴               |
| -------------------------------------------------- | ------------- | -------- | ------------------ |
| 修復 `/public/itinerary/[tourCode]` 的 OG metadata | 前端開發      | 2 天     | 無                 |
| 建立 `app/robots.ts`                               | 前端開發      | 0.5 天   | 確認正式域名       |
| 建立 `app/sitemap.ts`                              | 前端開發      | 1 天     | 確認哪些行程公開   |
| 申請 Google 商家檔案                               | 行銷/行政     | 1 天     | 公司地址與聯絡方式 |
| 規劃品牌首頁設計                                   | 設計師 + 行銷 | 1 週     | 品牌素材準備       |
| 公開行程頁 SSR 重構                                | 前端開發      | 3 天     | 無                 |
| 目的地公開頁面 MVP                                 | 前端開發      | 1 週     | 資料庫已有資料     |
| 結構化資料（JSON-LD）導入                          | 前端開發      | 2 天     | OG metadata 完成後 |
| 域名策略決議（品牌 vs ERP 分離）                   | 創辦人        | 決策會議 | 無                 |

---

> **會議結論**：技術基礎穩固（Vercel、Supabase、Next.js），品牌定位清晰，但線上可見度幾乎為零。最大的快速勝利是修復公開行程頁面的 OG metadata（影響每一次 LINE 分享的轉換率），以及建立 robots.txt + sitemap.xml（讓搜尋引擎開始認識這個網站）。中期目標是將品牌的內容能力從社群平台延伸到自有媒體（SEO 頁面），建立可持續累積的流量資產。
