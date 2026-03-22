# ⚖️ Venturo 帝國憲法

**帝國級的設計原則、禁止事項、最佳實踐**

---

## 🔴 憲法條文（絕對禁止）

### 第一條：永遠不要手動編輯 `openclaw.json`

**只能用 `openclaw` CLI 官方指令。**

**理由**：

- 手動編輯 → 格式錯誤 → gateway 當機
- CLI 有驗證機制，保證正確性

**教訓**：

- 2026-03-08：手動編輯 `openclaw.json` → gateway 當機 → 浪費 2 小時除錯

**正確做法**：

```bash
# ✅ 正確
openclaw config set key value
openclaw agents add william

# ❌ 錯誤
vim ~/.openclaw/openclaw.json
```

---

### 第二條：永遠用關聯表，不用 JSONB

**JSONB = 雜物袋，找不到東西。**

**理由**：

- ✅ 關聯表：可查詢（SELECT、JOIN）、可追蹤（誰改了什麼）、可驗證（外鍵約束）
- ❌ JSONB：難查詢（要用 jsonb 函數）、難追蹤（只能看整個 JSON）、難驗證（沒有 schema）

**範例**：

```sql
-- ❌ 錯誤：用 JSONB 存飯店資料
CREATE TABLE tours (
  id UUID PRIMARY KEY,
  hotels JSONB -- 雜物袋！
);

-- ✅ 正確：用關聯表
CREATE TABLE tour_hotels (
  id UUID PRIMARY KEY,
  tour_id UUID REFERENCES tours(id),
  hotel_id UUID REFERENCES hotels(id),
  check_in_date DATE,
  check_out_date DATE,
  room_type TEXT,
  price DECIMAL
);
```

**例外**：

- ✅ 可以用 JSONB：**只有在儲存完全非結構化的使用者輸入時**（例如：表單的自由欄位）
- ❌ 不能用 JSONB：任何業務邏輯相關的資料

---

### 第三條：永遠從核心表讀寫，不重複儲存

**重複資料 = 同步地獄。**

**理由**：

- 單一真相來源：只有一個地方儲存，永遠不會不一致
- 自動同步：改核心表 = 所有地方都改
- 簡單邏輯：不需要「同步」程式碼

**範例**：

```typescript
// ❌ 錯誤：報價單獨立儲存飯店資料
const quote = {
  id: 'quote-123',
  hotels: [
    { name: '希爾頓', price: 5000 } // 重複！
  ]
}

// ✅ 正確：報價單從核心表讀取
const quote = {
  id: 'quote-123',
  tour_id: 'tour-456' // 只存 reference
}

// 查詢時 JOIN
SELECT q.*, th.hotel_id, h.name, th.price
FROM tour_quotes q
JOIN tour_hotels th ON th.tour_id = q.tour_id
JOIN hotels h ON h.id = th.hotel_id
WHERE q.id = 'quote-123'
```

---

### 第四條：所有決策都要記錄在 DECISIONS.md

**忘記為什麼 = 重複犯錯。**

**理由**：

- 未來的人要知道「為什麼這樣設計」
- 避免重複討論同一個問題
- 累積帝國的智慧

**記錄格式**：

```markdown
## [決策日期] 決策標題

**背景**：為什麼需要決策

**選項**：

- A) 選項一
- B) 選項二

**決定**：選 A

**理由**：為什麼選 A

**影響**：這個決策影響什麼
```

---

### 第五條：實作前必讀文檔、搜向量庫

**盲目開發 = 浪費時間。**

**理由**：

- 避免重複造輪子（可能已經有函式可用）
- 避免違反設計原則（讀文檔才知道原則）
- 避免改錯地方（搜向量庫找到所有相關程式碼）

**正確流程**：

```
收到任務
  ↓
memory_search（搜向量庫）
  ↓
讀相關文檔（GAME_GUIDE, CORE_LOGIC）
  ↓
grep codebase（找現有程式碼）
  ↓
理解邏輯
  ↓
開始開發
```

**禁止流程**：

```
收到任務
  ↓
直接寫程式碼 ❌
```

---

## 🎮 設計原則（強烈建議）

### 原則 1：遊戲語言

**用遊戲比喻解釋工程概念。**

**為什麼**：

- 非技術人員也能理解
- 記憶更深刻
- 溝通更有趣

**範例**：
| 工程術語 | 遊戲比喻 |
|---------|---------|
| 關聯表 | 分類倉庫 |
| JSONB | 雜物袋 |
| 核心表 | 唯一真相來源 |
| API | 商店櫃檯 |
| JOIN | 查倉庫清單 |
| 報價單 | 副本（從核心讀取） |

**使用方式**：

- 文檔標題：用遊戲比喻
- 程式碼註解：用遊戲比喻解釋
- 溝通：用遊戲比喻講給 William/Leon/Ben 聽

---

### 原則 2：簡單勝過複雜

**能用 1 個表就不要用 2 個。**  
**能用 JOIN 就不要複製資料。**  
**能自動就不要手動。**

**範例**：

```typescript
// ❌ 複雜：3 個表、重複資料
tour_summary { hotels: [...] }
tour_details { hotels: [...] }
tour_quotes { hotels: [...] }

// ✅ 簡單：1 個核心表，其他 JOIN
tour_itinerary_items { ... } // 核心表
tour_quotes { tour_id } // 只存 reference
```

---

### 原則 3：80 分比 100 分更重要

**拒絕完美主義。**

**為什麼**：

- 100 分需要 5 倍時間
- 80 分已經能用
- 剩下 20 分可以慢慢補

**實際應用**：

- 新功能：先做核心功能（80 分），邊緣情況晚點補
- UI：先做功能正確（80 分），美化晚點補
- 效能：先做能跑（80 分），優化晚點補

---

### 原則 4：防呆 > 防錯

**假設使用者會犯錯，系統要能救回來。**

**範例**：

```typescript
// ❌ 防錯：不讓使用者犯錯（太嚴格）
if (price < 0) throw new Error('價格不能為負')

// ✅ 防呆：讓使用者犯錯，但能救回來
if (price < 0) {
  console.warn('價格為負，自動修正為 0')
  price = 0
}
```

**但是**：

- 重大變更：還是要警告（例如：刪除行程）
- 不可逆操作：一定要確認（例如：發送 Email）

---

### 原則 5：顯性 > 隱性

**不要讓程式碼「自動做」太多事，要讓人知道發生什麼。**

**範例**：

```typescript
// ❌ 隱性：靜默同步，使用者不知道發生什麼
function updateTour(tourId, data) {
  updateTourItineraryItems(tourId, data) // 靜默同步
  updateQuotes(tourId) // 靜默同步
  updateRequests(tourId) // 靜默同步
}

// ✅ 顯性：明確告訴使用者
function updateTour(tourId, data) {
  const result = updateTourItineraryItems(tourId, data)
  console.log(`已同步 ${result.quotesUpdated} 個報價單`)
  console.log(`已同步 ${result.requestsUpdated} 個需求單`)
  return result
}
```

---

## 🏗️ 架構原則

### 原則 1：核心表驅動

**每個業務領域都有「核心表」，是唯一真相來源。**

**範例**：

- **行程** → `tour_itinerary_items`
- **供應商** → `suppliers`
- **客戶** → `customers`

**其他表**：

- 報價單、需求單 → 從核心表 JOIN
- 不是獨立系統，是核心表的「視圖」

---

### 原則 2：服務層分離

**UI 不直接呼叫 Supabase，要透過 Service 層。**

**理由**：

- 業務邏輯集中管理
- 容易測試
- 容易改資料庫

**範例**：

```typescript
// ❌ 錯誤：UI 直接呼叫 Supabase
const { data } = await supabase.from('tours').select('*')

// ✅ 正確：透過 Service 層
import { tourService } from '@/services/tourService'
const tours = await tourService.getAllTours()
```

---

### 原則 3：型別安全

**所有 API、函式都要有 TypeScript 型別。**

**理由**：

- 編譯時發現錯誤
- IDE 自動完成
- 重構更安全

**範例**：

```typescript
// ❌ 錯誤：沒有型別
function createQuote(data) {
  // ...
}

// ✅ 正確：有型別
interface QuoteCreateInput {
  tourId: string
  customerId: string
  items: QuoteItem[]
}

function createQuote(data: QuoteCreateInput): Promise<Quote> {
  // ...
}
```

---

## 🔒 安全原則

### 原則 1：永遠驗證輸入

**不信任任何外部輸入（使用者、API、檔案）。**

**範例**：

```typescript
// ❌ 錯誤：不驗證
function updatePrice(price: number) {
  await db.update({ price })
}

// ✅ 正確：驗證
function updatePrice(price: number) {
  if (price < 0) throw new Error('價格不能為負')
  if (price > 1000000) throw new Error('價格過高')
  await db.update({ price })
}
```

---

### 原則 2：Row Level Security（RLS）

**Supabase 的所有表都要啟用 RLS。**

**理由**：

- 防止資料洩漏
- 多租戶隔離
- 細粒度權限控制

**範例**：

```sql
-- 啟用 RLS
ALTER TABLE tours ENABLE ROW LEVEL SECURITY;

-- 只能看自己公司的資料
CREATE POLICY "Users can only see their company's tours"
ON tours FOR SELECT
USING (company_id = auth.jwt() ->> 'company_id');
```

---

### 原則 3：敏感資料加密

**密碼、Token、信用卡號等敏感資料要加密。**

**範例**：

```typescript
// ❌ 錯誤：明文儲存
const user = { password: '12345' }

// ✅ 正確：加密儲存
import bcrypt from 'bcrypt'
const hashedPassword = await bcrypt.hash('12345', 10)
const user = { password: hashedPassword }
```

---

## 📝 程式碼風格

### 原則 1：命名清楚 > 簡短

**變數、函式名稱要能一眼看懂在做什麼。**

**範例**：

```typescript
// ❌ 錯誤：太簡短
const q = getQ(id)
const u = updateU(data)

// ✅ 正確：清楚
const quote = getQuoteById(id)
const updatedUser = updateUser(data)
```

---

### 原則 2：函式要單一職責

**一個函式只做一件事。**

**範例**：

```typescript
// ❌ 錯誤：做太多事
function createAndSendQuote(data) {
  const quote = createQuote(data)
  sendEmail(quote)
  updateStats()
  logAnalytics()
}

// ✅ 正確：拆分
function createQuote(data) { ... }
function sendQuoteEmail(quote) { ... }
function updateQuoteStats(quote) { ... }
function logQuoteAnalytics(quote) { ... }
```

---

### 原則 3：避免巢狀地獄

**超過 3 層巢狀 = 重構。**

**範例**：

```typescript
// ❌ 錯誤：巢狀地獄
if (user) {
  if (user.company) {
    if (user.company.tours) {
      if (user.company.tours.length > 0) {
        // ...
      }
    }
  }
}

// ✅ 正確：提早返回
if (!user) return
if (!user.company) return
if (!user.company.tours) return
if (user.company.tours.length === 0) return
// ...
```

---

## 🧪 測試原則

### 原則 1：關鍵邏輯要測試

**不用 100% 測試覆蓋率，但核心邏輯一定要測。**

**必測**：

- 報價計算邏輯
- 財務對帳邏輯
- 權限驗證邏輯

**可不測**：

- UI 元件（除非很複雜）
- 簡單的 CRUD

---

### 原則 2：測試要快

**測試套件 < 10 秒。**

**做法**：

- 用 mock 取代真實資料庫
- 平行執行測試
- 只測關鍵路徑

---

## 🚀 部署原則

### 原則 1：灰度發布

**重大變更要分階段發布。**

**步驟**：

1. Dev Server 測試
2. William/Leon 測試
3. 小範圍使用者測試
4. 全面發布

---

### 原則 2：可回滾

**每次部署都要能在 5 分鐘內回滾。**

**做法**：

- Vercel 自動保留歷史版本
- 資料庫遷移要可逆
- 有回滾 SOP

---

## 📚 文檔原則

### 原則 1：文檔跟著程式碼走

**改程式碼 = 改文檔。**

**範例**：

- 新增函式 → 更新 FUNCTIONS_INDEX.md
- 新增頁面 → 更新 ROUTES_MAP.md
- 重大決策 → 更新 DECISIONS.md

---

### 原則 2：範例 > 解釋

**一個好範例勝過千言萬語。**

**範例**：

```markdown
<!-- ❌ 錯誤：只有解釋 -->

這個函式用來建立報價單，需要傳入行程 ID 和客戶 ID。

<!-- ✅ 正確：有範例 -->

建立報價單：

\`\`\`typescript
const quote = await createQuote({
tourId: 'tour-123',
customerId: 'customer-456'
})
\`\`\`
```

---

**這些原則是帝國的基石。**

**違反憲法 = 技術債 = 未來的痛苦。**

**遵守憲法 = 穩定系統 = 快樂開發。**
