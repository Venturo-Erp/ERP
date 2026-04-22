# Agent D: 業務符合驗證 — /finance/payments

**日期**：2026-04-22 | **來源**：Agent D Explore + 主 Claude 過濾

---

## 1. 代碼是否符合業務意圖

| 業務步驟 | 代碼實況 | 符合 | 差異 |
|---|---|---|---|
| OP 建收款單 | page.tsx:211 整頁 `if (!isAdmin)`、OP 不是 admin 根本進不來 | ❌ | 整頁 role-gate |
| 選 5 種付款方式 | payment_method + receipt_type 雙寫 + 四處映射 | 🟡 | 功能在、但三套欄位並存 |
| 建單自動連動 | `recalculateReceiptStats` 回寫 `orders.payment_status` + tours 財務 | ⚠️ | William 明說 orders.payment_status 不該存 |
| 旅遊團認列 | `tours.total_revenue` + `profit` 被寫 | ✅ | 設計對、只是是回寫欄位、未來若走「聚合即時算」要改 view |
| 會計核准 / 異常 | 任何進頁者都能按、無細分權限 | ❌ | 沒對應「會計核准權」 |

---

## 2. 違反原則的具體位置 + 影響

### 違反原則 1（權限長在人身上）

1. `page.tsx:211` 整頁 admin gate
2. `auth-store.ts:249` checkPermission 短路（/login 驗證已發現、本頁繼承）
3. 4 個核心動作（建 / 核准 / 異常 / 刪）無 hasPermission 細分檢查

**後果**：
- 會計 / OP / 業務不是 admin → 連頁都進不來、整個「建單 → 核准」流程卡死
- William 在 /hr/roles 設定「公司收款」權限 → 代碼**不查這個 key**

### 違反候選原則 3（衍生狀態不存欄位）

- `orders.payment_status` 真存在（DB_TRUTH L7106 章節）
- `receipt-core.service.ts:73-81` 每次收款變動都回寫
- `usePaymentData.ts:40-44` 篩「可收款訂單」也用這欄位
- **真相分兩處**：receipts 聚合 vs orders 冗餘欄位
- 只要有地方讀 orders 但沒先重算 → 看到過期值

---

## 3. William 沒明說、建議追問

1. 「公司收款」權限 key 在 `role_tab_permissions` 表裡的 module / tab / action 命名建議？
   - 建議候選：`finance.payments.view` / `.create` / `.confirm` / `.approve_abnormal` / `.delete`
2. OP / 業務 / 會計 / 老闆這四角色、`workspace_roles` 有對應嗎？
3. 「批量收款」BatchReceiptDialog 的業務情境是什麼？誰會一次建多張收款？
4. LinkPay webhook 自動回寫 actual_amount、記帳人算「系統」還是「建單者」？
5. 跨租戶（Corner / JINGYAO / YUFEN）的收款單完全隔離、還是會計能跨租戶看？

---

## 4. 新原則候選（William 本次口述、建議 Step 2.5 收進 _INDEX）

**原則候選**：**衍生狀態（aggregate / derived）不存欄位、即時算出來**

- 訂單付款狀態 = sum(受款單 status='1') / 訂單總金額
- 團財務數字 = sum(團收款單)
- 客戶應付總額、供應商應付總額 同理

**業務價值**：
- SSOT 純淨：真相只在 receipts、不在 orders 冗餘欄位
- 實時性：收款一改、所有依賴立即正確
- 防不同步：不會有「兩邊版本不一樣」

**局限**：
- 跨表聚合成本（每次讀 orders 要 JOIN）→ 需要 cache / materialized view
- UI 層延遲 → 可能要前端 memo 緩解

**建議**：跟 William 確認適用範圍（全系統 or 財務模組 only）、再正式收進 _INDEX.md「跨路由設計原則」區塊。
