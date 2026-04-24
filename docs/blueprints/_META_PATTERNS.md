# VENTURO Meta Patterns · 跨路由 📋 問題聚合

> **用途**: 每 6 wake cron 強制停一次、抽「重複 3+ 次的 📋 業務問題」變成 pattern 清單給 William。
> **why**: 150 零散問題 William 決策不完、10 個 pattern 問題一次決完套到多路由。
> **節奏**: 每 6 wake（約 3h）觸發一次、若無新 pattern 則寫「no new patterns」跳過。
> **狀態**: 待第一輪 cron 跑滿 6 輪後自動產出。

---

## 📋 Pattern 格式

```
### Pattern: <一句話標題>
- **出現路由**: /route-a, /route-b, /route-c (≥ 3 才算 pattern)
- **問題核心**: <抽象化的業務問題、不是技術細節>
- **決策選項**:
  - A: ...
  - B: ...
  - C: ...
- **William 決策**: <空 → 待填>
- **決策日期**: <空>
- **套用後動作**: <批次套用到哪些路由、由誰執行>
```

---

## 🔮 預測（基於現有 15 份 Audit、cron 跑之前我先預測）

這些**很可能**會被 cron 第 6 輪抽出：

### Pattern 預測 1: 權限矩陣（誰能看 / 改 / 刪）

**預估出現路由**: /finance/_, /customers, /orders, /tours, /quotes, /hr/_（≥ 10）
**問題核心**：每個路由都需要「角色 × 動作」的權限規則。
**決策選項**:

- A: 每路由獨立定（靈活但多頭馬車）
- B: 全局 permissions.ts + 路由 map（集中）
- C: DB 驅動（roles 表 + permissions 表、後台可編）
  **影響**: 直接決定 INV-A01 的範圍、以及 cron Stage C 補什麼 guard。

### Pattern 預測 2: 幽靈欄位統一策略（type 有 / DB 無）

**預估出現路由**: /quotes\*, /customers, /finance/requests（≥ 5）
**問題核心**：TypeScript interface 加了欄位、DB 沒對應、spread 寫入靜默丟。
**決策選項**:

- A: 以 DB 為準、刪 type 多餘欄位
- B: 以 type 為準、補 DB migration
- C: 區分「將來要加」vs「該刪」逐條決定
  **影響**: INV-D01 的 enforcement 需要 type ↔ DB 對齊表、影響多輪修復。

### Pattern 預測 3: Dead dialog 四選一策略

**預估出現路由**: /orders, /finance/payments (×2), /customers, /quotes/[id]（≥ 5）
**問題核心**：Dialog 寫好沒按鈕觸發、不知道該接上還是刪。
**決策選項**:

- A: 全刪（以 knip + git blame 追、確認 dead）
- B: 全接（補按鈕到適當位置）
- C: 逐個業務判斷
  **影響**: Stage C 能一次清完、省後續反覆跑。

### Pattern 預測 4: CASCADE 策略統一

**預估出現路由**: quotes, payment_requests, channels, orders 對 tours 的 FK（≥ 4）
**問題核心**：刪 tour 連帶刪什麼？各頁不一致。
**決策選項**:

- A: 全 CASCADE（刪 tour 全毀、簡單但危險）
- B: 全 SET NULL（保留關聯記錄、但孤兒）
- C: 全 RESTRICT（不准刪有關聯的 tour、業務層確認）
- D: 業務層 soft delete（不真刪、is_deleted flag）
  **影響**: DB migration 集中、紅線下只能寫 SQL 到 \_pending_review/。

### Pattern 預測 5: 狀態值中英文統一

**預估出現路由**: tours, quotes, orders, payment_requests（≥ 4）
**問題核心**：enum 中英混用、無 CHECK constraint、嚴格比對靜默失敗。
**決策選項**:

- A: 全英文（新規慣例）+ migration backfill
- B: 全中文（符合現況）
- C: 兩邊都存（DB 雙欄位）
  **影響**: migration + 前端 labels 對照表、大工程。

### Pattern 預測 6: 5 個人數欄位策略

**預估出現路由**: orders, tours（兩個 table 同問題）
**問題核心**：adult_count + child_count + infant_count + member_count + total_people 各自寫。
**決策選項**:

- A: trigger 同步（DB 層）
- B: 只留 member_count + 拆 breakdown 到子表
- C: 保留現狀、前端每次寫全 5 個
  **影響**: 結算金額正確性。

### Pattern 預測 7: Data fetching 一派統一

**預估出現路由**: /finance/travel-invoice, /finance/payments（Zustand）vs 其他（SWR）
**問題核心**：兩派並存、新人選一個。
**決策選項**:

- A: 全倒 SWR、retire Zustand server state
- B: 全倒 Zustand、retire SWR
- C: 兩者共存分工（SWR for list、Zustand for detail state）
  **影響**: 架構演進方向、大量 refactor。

### Pattern 預測 8: Dialog 肥大處理

**預估出現路由**: AddRequestDialog 1512、TravelInvoiceDetailDialog 369 等（≥ 3）
**問題核心**：超 500 行 dialog 該怎麼拆。
**決策選項**:

- A: 分 step/tab
- B: 抽 sub-component（每個 section 獨立）
- C: 拆 hook + component（logic / UI 分離）
  **影響**: INV-U01 的 enforcement 策略。

---

## 📝 Round 1 實際產出（由 cron 寫入）

_（待第 6 wake 後 cron 寫入）_

---

## 決策追蹤

| Pattern        | Status  | Decided |
| -------------- | ------- | ------- |
| P1 權限矩陣    | pending | —       |
| P2 幽靈欄位    | pending | —       |
| P3 Dead dialog | pending | —       |
| P4 CASCADE     | pending | —       |
| P5 狀態中英    | pending | —       |
| P6 人數欄位    | pending | —       |
| P7 Fetch 派別  | pending | —       |
| P8 Dialog 肥大 | pending | —       |
