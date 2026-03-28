# DATA_LOADING_ARCHITECTURE.md

**建立日期**：2026-03-28  
**版本**：v1.0  
**參考來源**：
- Apollo Client Normalized Cache
- SWR / TanStack Query Best Practices
- Enterprise ERP Canonical Data Model
- Offline-First Architecture Patterns

---

## 核心理念

### 1. Stale-While-Revalidate (SWR) 策略
```
用戶請求 → 立即顯示快取（可能過期）→ 背景更新 → 無縫替換
```

**好處**：
- 用戶永遠不等待（除了第一次）
- 資料最終一致
- 減少感知延遲

### 2. Normalized Cache（正規化快取）

**傳統做法**（每個 API 回應獨立快取）：
```
GET /tours/123         → 快取為 "tours:123"
GET /tours?status=open → 快取為 "tours:list:open"
// 更新 tour 123 後，列表快取還是舊的
```

**正規化做法**（拆解成實體）：
```
GET /tours/123 → 儲存到 entities.tours["123"]
GET /tours?status=open → 只儲存 ID 列表 ["123", "456"]
// 更新 tour 123 後，所有引用它的地方自動更新
```

**我們目前的 Entity Layer 已經有這個概念，但需要強化**。

---

## 資料分類與快取策略

| 分類 | 範例 | 載入時機 | 快取時間 | 更新策略 |
|------|------|---------|---------|---------|
| **靜態基礎** | countries, cities, regions | 登入時載入一次 | 24h+ | 極少變動，可長快取 |
| **準靜態** | suppliers, employees, hotels | 登入時載入一次 | 1h | 變動時 invalidate |
| **動態列表** | tours, orders, customers | 按需載入（分頁/搜尋） | 5min | SWR + 背景更新 |
| **即時資料** | 聊天、通知 | 訂閱 | 不快取 | Realtime |
| **關聯子表** | tour_itinerary_items, order_items | 父層展開時載入 | 跟隨父層 | 隨父層 invalidate |

---

## 載入模式設計

### Pattern 1：Shell Loading（殼載入）

**問題**：旅遊團詳情頁有 10 個 tab，一次全載入太慢。

**解法**：
```tsx
// ✅ 好：只載入當前需要的
function TourDetailPage({ tourId }) {
  // 先載入基本資料（殼）
  const { data: tour } = useTour(tourId)
  
  // 各 tab 按需載入
  const [activeTab, setActiveTab] = useState('itinerary')
  
  return (
    <Shell tour={tour}>
      {activeTab === 'itinerary' && <ItineraryTab tourId={tourId} />}
      {activeTab === 'orders' && <OrdersTab tourId={tourId} />}
      {/* 其他 tab 不渲染 = 不載入 */}
    </Shell>
  )
}
```

### Pattern 2：Search-First（搜尋優先）

**問題**：景點 2500+，全載入浪費。

**解法**：
```tsx
// ✅ 好：預載少量 + 搜尋時查資料庫
function AttractionPicker({ countryId }) {
  const [searchQuery, setSearchQuery] = useState('')
  
  // 預載前 20 筆（立即可用）
  const { data: preloaded } = useAttractions({ 
    countryId, 
    limit: 20 
  })
  
  // 有搜尋時查資料庫
  const { data: searched } = useAttractionSearch({
    query: searchQuery,
    countryId,
    enabled: searchQuery.length >= 2  // 至少 2 字才搜
  })
  
  const attractions = searchQuery ? searched : preloaded
  return <AttractionList items={attractions} />
}
```

### Pattern 3：Cascade Loading（級聯載入）

**問題**：旅遊團 → 報價單 → 需求單，每次都重新載入？

**解法**：
```tsx
// 旅遊團層級已載入核心資料
const tour = {
  id: '123',
  itinerary_items: [...],  // 包含景點、飯店等
  quotes: [{ id: 'q1', ... }]
}

// 報價單 tab 不需要重新載入景點
function QuoteTab({ tourId }) {
  const { data: tour } = useTour(tourId)  // 從快取取，不發請求
  // tour.itinerary_items 已經有了
}

// 需求單 tab 也不需要
function RequirementsTab({ tourId }) {
  const { data: tour } = useTour(tourId)  // 同樣從快取
}
```

**關鍵**：正規化快取讓不同頁面/組件共享同一份資料。

---

## 實作改進計畫

### Phase 1：Entity Hook 加 Default Limit（今天）

```ts
// src/data/core/createEntityHook.ts
function useList(options?: { 
  enabled?: boolean;
  limit?: number;  // 新增
}): ListResult<T> {
  const limit = options?.limit ?? config.list?.defaultLimit ?? 100
  
  let query = supabase.from(tableName).select(selectFields)
  query = query.limit(limit)  // 預設最多 100 筆
  // ...
}
```

**影響的大表**：
- `attractions` (2500+)
- `customers` (會成長)
- `tours` (會成長)
- `orders` (會成長)

### Phase 2：靜態資料長快取（本週）

```ts
// 國家、城市等幾乎不變的資料
const countryEntity = createEntityHook<Country>('countries', {
  list: { 
    select: 'id, name, code',
    orderBy: { column: 'name', ascending: true }
  },
  cache: {
    ttl: 24 * 60 * 60 * 1000,  // 24 小時
    staleTime: 60 * 60 * 1000,  // 1 小時內不重新驗證
  }
})
```

### Phase 3：IndexedDB 持久化（下週）

```ts
// 目前：SWR 只存記憶體，重新整理就沒了
// 改進：用 IndexedDB 持久化

const { data } = useSWR(key, fetcher, {
  // 先從 IndexedDB 讀取
  fallbackData: await idbGet(key),
  // 更新後寫回 IndexedDB
  onSuccess: (data) => idbSet(key, data),
})
```

**好處**：
- 離線可看（上次載入的資料）
- 重新整理不閃白
- 多 tab 共享

### Phase 4：離線優先架構（未來）

```
┌─────────────────────────────────────────────────┐
│                   UI Layer                       │
└─────────────────────────────────────────────────┘
                      ↓ 讀寫
┌─────────────────────────────────────────────────┐
│              Local Database (IndexedDB)          │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐         │
│  │  tours  │  │ orders  │  │customers│  ...    │
│  └─────────┘  └─────────┘  └─────────┘         │
└─────────────────────────────────────────────────┘
                      ↓ 背景同步
┌─────────────────────────────────────────────────┐
│              Sync Engine                         │
│  - 偵測變更（本地 vs 遠端）                      │
│  - 衝突解決（last-write-wins / merge）          │
│  - 重試機制                                      │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│              Supabase (Remote)                   │
└─────────────────────────────────────────────────┘
```

---

## 多租戶 / 多裝置考量

### 問題：一個租戶 5 台裝置，每台都載入全部資料？

**解法**：

1. **登入時載入必要資料**
   - 靜態基礎（countries, cities）：5 台都載入 ✓（資料小）
   - 租戶特定（suppliers, employees）：5 台都載入 ✓（通常 < 100 筆）

2. **動態資料按需載入**
   - 旅遊團：只載入「進行中」的（而不是全部歷史）
   - 訂單：只載入「本月」的（而不是全部歷史）

3. **分頁 / 無限捲動**
   - 大列表不一次全載，每次載入 20-50 筆

4. **搜尋走資料庫**
   - 搜尋框輸入 → debounce 300ms → 查 Supabase → 顯示結果

---

## 監控指標

### 應該追蹤的 Metrics

| 指標 | 目標 | 警告 |
|------|------|------|
| 首次載入時間 (FCP) | < 2s | > 5s |
| 每日 Supabase 讀取 | < 100k rows | > 500k rows |
| 每用戶 session 請求數 | < 50 | > 200 |
| 快取命中率 | > 80% | < 50% |
| IndexedDB 大小 | < 50MB | > 200MB |

---

## 決策記錄

### ADR-001：為什麼不用 GraphQL + Apollo?

**決定**：繼續用 REST + SWR

**原因**：
- Supabase 原生是 REST/PostgREST
- 團隊熟悉度
- SWR 已經夠用
- 避免額外複雜度

**Trade-off**：
- 放棄 Apollo 的自動正規化（我們用 Entity Layer 實現）
- 放棄 GraphQL 的 partial loading（我們用 select 欄位實現）

### ADR-002：為什麼用 IndexedDB 而不是 localStorage?

**決定**：用 IndexedDB（透過 idb-keyval）

**原因**：
- localStorage 限制 5MB
- localStorage 同步阻塞
- IndexedDB 支援結構化資料
- IndexedDB 異步不阻塞 UI

---

## 下一步行動

- [ ] Phase 1：Entity Hook 加 defaultLimit: 100
- [ ] Phase 1：大表改成搜尋模式（attractions, customers）
- [ ] Phase 2：靜態資料加長 TTL
- [ ] Phase 3：IndexedDB 持久化 POC
- [ ] 設定 Supabase usage 監控告警

---

**更新日期**：2026-03-28
