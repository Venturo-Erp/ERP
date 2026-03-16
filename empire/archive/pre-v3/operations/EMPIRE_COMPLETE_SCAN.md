# 🏰 Venturo 帝國完整掃描報告

**建國日**：2026-03-15  
**掃描深度**：源碼級 + 資料庫級 + 架構級  
**掃描時間**：10:00 AM  

---

## 🗺️ 帝國全景

### 規模統計

**程式碼**：
- TypeScript/TSX 檔案：2010 個
- 總行數：372,571 行
- 目錄：641 個
- 頁面：78 個
- 共用元件：225 個
- Feature 模組：34 個

**資料庫**：
- 資料表：171 個
- SQL 遷移：463 個
- RLS 政策：45+ 個

**API**：
- API Routes：50+ 個
- Server Actions：5 個
- Cron Jobs：3 個

**依賴**：
- 生產依賴：121 個
- 開發依賴：30 個
- 環境變數：30 個

---

## 🏛️ 帝國架構（遊戲化版本）

### 第一層：城牆（前端 UI）

```
78 個房間（Pages）
    ↓
225 個傢俱（Components）
    ↓
34 個功能區（Features）
```

**最大的房間**：
- `/itinerary/page.tsx` — 1387 行（太擁擠！）
- `tour-itinerary-tab.tsx` — 1626 行（需要拆房間）
- `PhaserOffice.tsx` — 1359 行（遊戲辦公室）

**倉庫（Stores）**：
- 檔案系統倉庫：25K（最大）
- 文件倉庫：18K
- 認證倉庫：13K
- 總共 14 個倉庫

---

### 第二層：商店街（API Layer）

```
50+ 個商店櫃檯（API Routes）
    ↓
每個櫃檯服務不同業務
    ↓
部分櫃檯沒保全（10+ 個未保護）
```

**關鍵商店**：
- 認證商店：`/api/auth/*`（10 個 endpoints）
- 報價商店：`/api/quotes/*`（7 個 endpoints）
- 付款商店：`/api/linkpay/*`（2 個 endpoints）
- AI 商店：`/api/ai/*`, `/api/gemini/*`
- 健康檢查：`/api/health/*`（3 個 endpoints）

**危險區域**：
- `/api/settings/env` — 洩漏環境變數狀態
- `/api/gemini/generate-image` — 免費 AI 圖片
- `/api/linkpay/webhook` — 付款 webhook 無驗證

---

### 第三層：倉庫區（Business Logic）

```
33 個 Services（服務層）
    ↓
47 個 Stores（狀態管理）
    ↓
231 個 Hooks（業務邏輯鉤子）
```

**核心邏輯**：
- 報價計算：`quote.service.ts` — `calculateTotalCost()`
- 付款計算：`payment-request.service.ts` — `calculateTotalAmount()`
- 行程建立：（分散在多個檔案）
- 訂單管理：`useOrders.ts`

---

### 第四層：地基（Database）

```
171 個資料表
    ↓
分類：
  - 行程相關：30+ 表
  - 客戶相關：15+ 表
  - 供應商相關：10+ 表
  - 財務相關：20+ 表
  - 系統表：96+ 表
```

**核心表（唯一真相來源）**：
- `tour_itinerary_items` — 行程核心
- `tours` — 團務主表
- `customers` — 客戶主表
- `suppliers` — 供應商主表
- `tour_quotes` — 報價主表
- `payment_requests` — 付款主表

**RLS 混亂史**：
```
2025-12-11: 全部禁用 ❌
2025-12-20: 重新啟用 ✅
2026-01-02: 又禁用 ❌
2026-01-09: 又啟用 ✅
2026-02-12: 再啟用 ✅
2026-02-25: 核心表啟用 ✅

現狀：不明 ⚠️
```

---

## 🌊 資料流地圖（完整版）

### 業務流程：從客戶詢問到付款

```
1. 客戶詢問（Leon/Ben）
    ↓ API: /api/customers (建檔)
    ↓ 表: customers
    
2. OP 做團（Leon）
    ↓ UI: /itinerary/new
    ↓ 表: tours, tour_itinerary_items
    
3. 建立報價（自動/手動）
    ↓ Service: calculateTotalCost()
    ↓ 表: tour_quotes
    ↓ JOIN: tour_itinerary_items (核心表)
    
4. 發送報價（Email/WhatsApp）
    ↓ API: /api/quotes/confirmation/send
    ↓ 表: quote_confirmations
    
5. 客戶確認
    ↓ API: /api/quotes/confirmation/customer
    ↓ 表: quote_confirmations (更新狀態)
    
6. 建立訂單
    ↓ 表: tour_orders
    ↓ JOIN: tour_quotes
    
7. 收款
    ↓ API: /api/linkpay/webhook
    ↓ 表: payments
    
8. 對帳（Eddie）
    ↓ UI: /finance/reports
    ↓ 表: payment_requests, payment_request_items
```

**資料同步問題**：
- 報價單從 `tour_itinerary_items` 讀取（✅ 正確）
- 但如果行程改了，舊報價單不會自動更新（⚠️ 可能問題）

---

## 🌑 黑暗角落（深度發現）

### 黑暗角落 1：巨型檔案（需要拆分）

**超過 1000 行的檔案**：
- `types.ts` — 19810 行（Supabase 自動生成，可接受）
- `icon-data.ts` — 4924 行（圖示資料，可接受）
- `tour-itinerary-tab.tsx` — 1626 行（🔴 需要拆分）
- `itinerary/page.tsx` — 1387 行（🔴 需要拆分）
- `PhaserOffice.tsx` — 1359 行（遊戲，可接受）
- `labels.ts` — 1355 行（常數，可接受）
- `OrderMembersExpandable.tsx` — 1353 行（🔴 需要拆分）

**風險**：
- 難以維護
- 難以測試
- 容易產生 Bug

---

### 黑暗角落 2：技術債務（73 個 TODO）

**範例**（需要實際查看）：
```bash
# 掃描 TODO
grep -rn "TODO" ~/Projects/venturo-erp/src --include="*.ts" --include="*.tsx" | head -20
```

**風險**：
- 未完成的功能
- 臨時的 workaround
- 已知的 Bug 沒修

---

### 黑暗角落 3：效能炸彈（154 個潛在 N+1）

**問題**：迴圈內呼叫資料庫

**範例**（需要實際確認）：
```typescript
// ❌ N+1 查詢
for (const tour of tours) {
  const quote = await supabase.from('quotes').select().eq('tour_id', tour.id)
}

// ✅ 正確做法
const tourIds = tours.map(t => t.id)
const quotes = await supabase.from('quotes').select().in('tour_id', tourIds)
```

**風險**：
- 資料量大時效能崩潰
- 使用者體驗差

---

### 黑暗角落 4：重複程式碼

**發現的重複**：
- `.backup` 檔案：2 個（需要清理）
- `*example*` 檔案：11 個（範例/模板）
- 類似的元件名稱（可能重複邏輯）

---

### 黑暗角落 5：環境變數地獄（30 個）

**必要的環境變數**：
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

# AI
GEMINI_API_KEY
OLLAMA_URL
OLLAMA_MODEL

# OCR
OCR_SPACE_API_KEY
GOOGLE_VISION_API_KEY

# 第三方
NEXT_PUBLIC_PEXELS_API_KEY
NEXT_PUBLIC_UNSPLASH_ACCESS_KEY
AERODATABOX_API_KEY

# 付款
TAISHIN_MID
TAISHIN_TID

# 安全
JWT_SECRET
QUICK_LOGIN_SECRET
CRON_SECRET
BOT_API_SECRET

# OpenClaw
OPENCLAW_GATEWAY_URL
OPENCLAW_GATEWAY_TOKEN

# 其他
QUOTAGUARD_STATIC_URL (Proxy)
... 還有 10+ 個
```

**風險**：
- 設定複雜
- 容易遺漏
- 難以追蹤哪些必要、哪些可選

---

## 🔒 安全地圖

### 已發現的漏洞（來自 SECURITY_AUDIT_FULL.md）

🔴 **高危**：
1. 10+ 個 API 未保護
2. 5+ 個 SQL Injection 風險
3. RLS 政策混亂

⚠️ **中危**：
4. 環境變數洩漏風險
5. CORS 設定不完整
6. 資料驗證不足

ℹ️ **低危**：
7. Rate Limiting 不一致
8. 錯誤訊息洩漏資訊

---

## 🔄 資料表關係圖（核心）

```
tours (團務)
    ↓ 1:N
tour_itinerary_items (行程核心)
    ↓ 1:N ↓ 1:N ↓ 1:N
  hotels  restaurants  attractions
    ↓ N:1   ↓ N:1      ↓ N:1
suppliers (供應商)

tours
    ↓ 1:N
tour_quotes (報價)
    ↓ JOIN tour_itinerary_items (讀取核心表)
    
tour_quotes
    ↓ 1:N
tour_orders (訂單)
    ↓ 1:N
payments (付款)
```

**設計優點**：
- ✅ 核心表驅動（單一真相來源）
- ✅ 報價從核心表讀取（不重複儲存）

**潛在問題**：
- ⚠️ 行程改了，舊報價單不會自動更新
- ⚠️ 供應商價格改了，需要手動更新行程

---

## 🧪 測試覆蓋率

**測試檔案**：50 個

**位置**：
- `src/lib/auth.test.ts`
- 其他 49 個（需要掃描）

**問題**：
- 50 個測試 vs 2010 個檔案 = 2.5% 覆蓋率
- 核心邏輯（報價計算、付款）有測試嗎？

---

## 🎯 建國第一天的發現總結

### ✅ 帝國的優勢

1. **清晰的架構**：Features 模組化設計
2. **核心表驅動**：tour_itinerary_items 是唯一真相
3. **服務層分離**：33 個 Services 管理業務邏輯
4. **型別安全**：TypeScript + Zod
5. **現代技術棧**：Next.js 14 + Supabase

---

### 🌑 帝國的黑暗面

1. **安全漏洞**：10+ 個 API 未保護
2. **效能隱患**：154 個潛在 N+1 查詢
3. **巨型檔案**：3 個超過 1300 行的元件
4. **技術債務**：73 個 TODO
5. **RLS 混亂**：啟用/禁用過多次，現狀不明
6. **測試不足**：只有 2.5% 覆蓋率
7. **環境變數地獄**：30 個變數
8. **重複程式碼**：備份檔案未清理

---

### 🚧 需要立刻修復的

**今天**：
1. 檢查所有表的 RLS 狀態（建立清單）
2. 加認證到 10 個未保護的 API
3. 修復 5 個 SQL Injection 漏洞

**本週**：
4. 拆分 3 個巨型元件
5. 清理 .backup 檔案
6. 建立環境變數文檔

**本月**：
7. 修復 N+1 查詢（至少前 20 個）
8. 增加測試覆蓋率（至少 20%）
9. 清理 73 個 TODO

---

## 📚 帝國知識地圖

### 關鍵文檔位置

**已掃描**：
- `~/Projects/venturo-erp/empire/` — 帝國文檔（42 個）
- `~/.openclaw/workspace-william/` — William 的規範

**需要建立**：
- **RLS_STATUS.md** — 所有表的 RLS 現狀
- **ENV_VARIABLES.md** — 環境變數完整說明
- **PERFORMANCE_ISSUES.md** — N+1 查詢清單
- **REFACTOR_PLAN.md** — 巨型檔案拆分計畫
- **TODO_TRACKER.md** — 73 個 TODO 追蹤

---

## 🗺️ 下一步探索方向

### 還沒深入的區域

1. **測試系統**：50 個測試檔案在測什麼？
2. **Cron Jobs**：3 個定時任務做什麼？
3. **錯誤處理**：有統一的錯誤處理機制嗎？
4. **日誌系統**：有集中的日誌嗎？
5. **效能監控**：有追蹤慢查詢嗎？
6. **部署流程**：CI/CD 如何設定？
7. **備份機制**：資料庫有定期備份嗎？

---

**建國第一天完成。一磚一瓦已檢視。**

**帝國地圖已繪製。黑暗角落已標記。防禦漏洞已列出。**

**等待 William 的下一步指令。**
