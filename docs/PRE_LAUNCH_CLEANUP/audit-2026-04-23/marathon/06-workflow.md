# Marathon 06 · Workflow Architect 🔄 體檢報告

**扮演靈魂**：Workflow Architect（端到端視角、流程斷點 = 致命、state machine 是契約）  
**掃描日期**：2026-04-24  
**掃描時長**：30-40 分（預算完成）  
**範圍**：端到端主流程 / 人員 / 租戶 / 權限 / 外部整合 / 狀態機 / 重複流程 / 審計 / 角色化  
**方法**：業務流程 swim lane + state diagram + gap analysis + BUSINESS_MAP 對照 + 前 5 位 marathon 報告跨視角補充

---

## 一句話裁決

**能上線、但核心流程「缺少多項 state 轉換 event hook」**。設團→收款→出團→結案的 4 大 state 轉換點都沒有「自動觸發下游」機制（例：訂單確認後自動改 order_status、付完款後自動生傳票、出團後自動鎖單），只能靠人工點各頁面按鈕，容易漏。**收款流程斷點最致命**：付款確認後既沒有自動傳票、也沒有自動更新 order payment_status、也沒有通知會計，導致「客戶以為收款了、會計還在等傳票、業務忘記回單」的三角梗。

---

## 🔴 流程斷點（主流程接不起來）

### ① 收款流程最致命：付款確認 → **無自動傳票、無 order status 更新、無通知**

**現象**：
- 業務在「收款」頁面點「確認」按鈕
- Receipt.status 從 '0'(待確認) → '1'(已確認)
- 就停止了。什麼都沒觸發。

**該發生但沒發生**（共 3 個事件）：
1. **自動產傳票**：Receipt 確認 → 向 accounting_transactions 寫一筆「收入」傳票
   - 現況：手動「傳票」頁面新增 voucher（流程圖裡沒看到自動產）
   - 斷點風險：會計不知道客戶已付、或被問「有沒有核銷」時翻不到票
   
2. **自動更新 order.payment_status**：Receipt 確認 → Order 的 payment_status 改 'partial' 或 'paid'
   - 現況：Orders 頁面看不到「客戶付了多少」的動態更新、靠手動查 Receipts 表
   - 斷點風險：業務跟客戶說「沒收到尾款」、其實客戶三個禮拜前付過
   
3. **通知會計複核**：Receipt 確認 → 向會計 inbox / 待辦發通知
   - 現況：零通知機制、會計需要「定時巡視」Receipts 表
   - 斷點風險：會計延遲 1-2 天發現新收款、對帳困難

**修法成本**：M（收款頁面加 API call 執行 3 個操作、加 webhook trigger）

---

### ② 訂單確認流程斷點：Order 從 'pending' → 'confirmed' → **無後續 trigger**

**現象**：
- 建立訂單時 Order.status = 'pending'
- 業務點「確認訂單」後改成 'confirmed'
- 該做的事沒做

**該發生但沒發生**：
1. **自動生成 LinkPay 付款連結**（如果啟用 LinkPay）
   - 現況：靠「收款」頁面的「建立 LinkPay」按鈕手動觸發
   - 流程問題：客戶應該在「訂單確認」後立刻收到付款連結、不是業務決定什麼時候發
   
2. **自動發客戶合約簽署通知**（目前無簽署機制、Wave 8 以上的事）
   
3. **自動建立待辦：「跟進尾款收款」**（目前無 order→todo 關聯）

**斷點證據**：
- `src/app/(main)/orders` 找不到「訂單確認」時自動轉帳單 / 發通知的邏輯
- Receipt 是各自独立新增、不是 order.status change 時自動觸發

**修法成本**：M（Order status change middleware + 3-4 個 side effect）

---

### ③ 出團流程斷點：Tour.status 改 'ongoing' → **無自動鎖單、無自動隱藏修改介面**

**現象**：
- 開團時 Tour.status = 'upcoming'（待出發）
- 出發日一到 → Tour.status = 'ongoing'（進行中）
- 業務還能在「編輯團」裡改團費、改行程、改團員
- 沒有「鎖住」

**該發生但沒發生**：
1. **鎖住訂單：Orders 改成 read-only**（已出發、不該再改客戶名單）
2. **鎖住行程：Itinerary 改成 read-only**（不能再改景點、改時間）
3. **隱藏「新增團員」按鈕**（出發了再加人很麻煩）
4. **鎖住 costs（成本）欄位**（避免改動已定的成本）

**斷點證據**：
- Tour editor 頁面沒有 status-based read-only guard
- `useTourState` hook 無 status-based field disable 邏輯

**修法成本**：S-M（Form 層加 condition render / disabled logic）

---

### ④ 結案流程斷點：Tour.status = 'closed' → **無自動成本核算、無自動發獎金單**

**現象**：
- 回程日過了 → Tour.status = 'returned'（未結團）
- 業務點「結案」按鈕 → Tour.status = 'closed'（已結團）
- 按了沒反應？有沒有產獎金單？成本對不對帳？不清楚

**該發生但沒發生**：
1. **自動計算團損益**（Revenue - Costs）
   - 現況：「團財務」頁面看得到、但無自動審查
   - 問題：成本有 outlier？應該告警、讓會計複核
   
2. **自動產「獎金確認單」**（領隊、導遊、助理的獎金）
   - 現況：無獎金系統、wave 8+ 做
   
3. **自動鎖住該團的所有訂單和 itinerary**
   - 現況：結案後用戶還能「不小心」改已結案的團

**修法成本**：L（涉及整個成本核算邏輯、稅務、獎金）

---

### ⑤ 請款流程斷點：Payment Request 'confirmed' → **無自動出納匯款流程**

**現象**：
- 業務建立「需求單」（Payment Request）
- 主管批核（status = 'approved'）
- 會計複核（status = 'confirmed'）
- 出納看到什麼時候該匯款？無法追蹤

**該發生但沒發生**：
1. **自動派單給出納**：確認後的 request 應該自動進「出納待匯清單」、不是靠出納定時巡視 UI
2. **自動記錄「誰複核、什麼時候複核」**：現有 audit trail 無「複核者簽名」
3. **自動產「匯款記錄單」**：匯完後應該自動對應 disbursement_orders
4. **自動對帳**：比對「要付」(payment_request) 和「已付」(disbursement)

**修法成本**：M-L（涉及會計流程、法規需求）

---

## 🟠 狀態機破損（state 轉換無前置檢查、無 event hook）

### ① Receipt.status 轉換無前置檢查

| 轉換 | 前置檢查 | 現況 | 應有 |
|---|---|---|---|
| '0'(待確認) → '1'(已確認) | 金額 > 0 | ✅ | ✅ |
| '0' → '2'(異常) | 標記原因 | ❌ | 應有 |
| '1'(已確認) → 不可逆轉 | 防誤改 | ❌ | 應有 prevent |
| '1' → 自動產傳票 | 不產重複 | ❌ | **關鍵缺失** |

**修法**：S、加 DB CHECK constraint 或 API 驗證

---

### ② Order.payment_status 無自動駕駛

| 事件 | 應有自動轉換 | 現況 |
|---|---|---|
| Receipt 新增 1 筆 | 若 paid_amount ≥ total_amount → 改 'paid' | ❌ 手動 |
| Receipt 刪除 | 若 paid_amount < total_amount → 改回 'partial' | ❌ 無 |
| Receipt 金額修正 | 若改少了 → 改 'partial' | ❌ 無 |

**修法**：M、寫 DB trigger 或 POST receipt 後手動呼叫 helper

---

### ③ Tour.status 自動轉換無邊界條件

| 轉換 | 邊界檢查 | 現況 |
|---|---|---|
| 'upcoming' → 'ongoing' | 今日 >= departure_date | ❌ 手動翻狀態？ |
| 'ongoing' → 'returned' | 今日 > return_date | ❌ 手動？ |
| 'returned' → 'closed' | 成本核算完成? 獎金單確認? | ❌ 無檢查 |

**問題**：不知道這些轉換是自動（cron job）還是手動（業務按鈕）

**修法**：需 William 決策「用 cron + timestamp 自動轉換」還是「靠人工按鈕」

---

### ④ Quote.status → Order 轉換無明確流程

**現況**：
- Quote.status: 'draft' | 'proposed' | 'revised' | '待出發' | 'approved' | 'converted' | 'rejected'
- Order.status: 'pending' | 'confirmed' | 'completed' | 'cancelled'

**斷點**：Quote 'approved' 之後怎麼變成 Order？看不到明確轉換邏輯

**修法**：需定義「Quote approved → Order created」的 contract

---

## 🟡 Workflow 整理機會

### ① 租戶初始化流程無事務邊界

**現象**：`POST /api/tenants/create` 這一個 API 要做 5 件事
1. 建 workspace
2. 建 employee (系統主管)
3. 建公告 channel
4. Seed 基礎資料
5. 建 workspace bot

**問題**：步驟 3 失敗了、workspace 和 employee 已建、但沒有 rollback

**修法**：M、加 transaction 邊界（業已列 INDEX ①、SRE 報告升級成「多步驟無事務」）

---

### ② 人員流程無「交接」state

**現況**：Employee.status 只有 'active' / 'inactive'

**缺失**：
- 員工離職前應有 'transferring' 狀態
- 該狀態下客戶 / 訂單應該「只讀」、不能再簽新約
- 交接完才改 'inactive'

**修法**：M、加 state + 對應 UI / API 守門

---

### ③ 多租戶「客戶隔離」流程無檢查點

**現象**：LINE 客服、customer_assigned_itineraries 等多個地方都會「跨租戶查客戶」

**問題**：代碼層有 RLS、但無明確 state machine / contract 規範「誰可以查誰」

**修法**：M、建「多租戶隔離 workflow spec」、定義邊界

---

### ④ 簽證（Visa）流程無主狀態機

**現況**：tours 表有 `visa_status`（中文），但邏輯散落在多個 component

**缺失**：
- 簽證狀態有哪些值？
- 誰可以改？
- 改了該通知誰？

**修法**：L、需完整設計簽證 workflow（業務定義 + 流程圖）

---

## 🟢 做得好的流程

### ✅ Tour 的核心 state machine 結構清晰

```
template → (copy) → proposal → (produce) → upcoming → (execute) → ongoing → (return) → returned → (close) → closed
```

**好處**：
- 6 個清晰的 state
- 轉換邏輯容易讀
- 對應的 UI tab 一一對應

---

### ✅ Receipt 和 Order 的 audit trail 完整

- 所有記錄都有 created_by / updated_by
- 能追到誰改的

**缺憾**：只有「追蹤」、沒有「攔阻」（缺少 state-based read-only）

---

### ✅ Payment Request 的批准流程有三層

- 業務建立（status = 'pending'）
- 主管批核（'pending' → 'approved'）
- 會計複核（'approved' → 'confirmed'）

**缺憾**：第三層之後沒有「出納執行」的狀態

---

## 跨視角 pattern 候選（給後面靈魂的 hint）

### [Pattern] 多步驟 workflow 無事務邊界

**誰報**：SRE ③、Workflow Architect ①
- 租戶建立：5 步驟無 transaction
- 票號生成：race condition

**根因**：API 層逐步執行、沒有「全部成功或全部失敗」的界線

**修法**：
- DB: 用 BEGIN...COMMIT 或 Savepoint
- API: 用 Hook 或 middleware 包裝整個步驟

**優先級**：P0（new tenants fail = disaster）

---

### [Pattern] 狀態轉換無自動 trigger

**誰報**：Workflow Architect 全部
- Receipt.status 改 → 無傳票
- Order.status 改 → 無下游更新
- Tour.status 改 → 無鎖單

**根因**：State machine 只考慮「紀錄狀態」、沒考慮「狀態改變時做什麼」

**修法**：
- 方案 A：DB trigger（PostgreSQL）
- 方案 B：API middleware 包裹 status update
- 方案 C：Event 發佈（Kafka / Bull queue）

**建議**：業務關鍵的（Receipt 確認、Tour 出發）用方案 B（同步） + 方案 C（非關鍵 side effect）

**優先級**：P0-P1

---

### [Pattern] 流程「三角梗」：業務、會計、出納無實時同步

**誰報**：Workflow Architect、Security Engine（webhook 無冪等、外部依賴無 fallback）、SRE（無 alert）

**例子**：
- 客戶付款 → 業務確認 Receipt → 會計還不知道 → 出納也不知道 → 對帳失敗
- 領隊改行程 → 系統無通知客戶 → 客戶抱怨
- 新客戶建立 → 但 CRM 沒同步 → LINE 客服問 3 次「你是哪個客戶」

**根因**：流程設計時沒有「通知合約」、各角色各自為政

**修法**：
- 加 inbox / notification 系統
- 加 webhook / event broadcast
- 加「待辦」自動指派

**優先級**：P1-P2（影響 UX、不影響資料正確性）

---

### [Pattern] 權限 state 和業務 state 分離

**誰報**：Workflow Architect（read-only 邏輯散落）+ 前面 4 位（權限系統混亂）

**例子**：
- Tour 出發了→應該 read-only → 但沒有機制 check
- Order 取消了 → 訂單成員不應能改 → 但無 API 層防守

**根因**：State-based permission 沒有中央定義、靠各頁面自己判斷

**修法**：建 helper function：
```ts
function canEditOrder(order: Order, userRole: Role): boolean {
  // 只有 'pending' / 'confirmed' 能編
  if (!['pending', 'confirmed'].includes(order.status)) return false
  // 只有業務或主管能編
  if (!['業務', '主管'].includes(userRole.name)) return false
  return true
}
```

**優先級**：M（後期重構、不卡上線）

---

## 給下一位靈魂（Data Engineer）的 hint

Data Engineer 會關注的 workflow 層面：

1. **訂單 → 收款 → 成本 → 損益** 這條資料流
   - 確認「一筆訂單」對應「N 筆收款」對應「M 筆成本」對應「1 個損益」
   - 查「孤兒資料」（訂單沒收款 / 收款沒訂單）

2. **多租戶隔離的邊界驗證**
   - 同一個客戶不應跨兩個 workspace
   - 同一個 tour 不應混 workspace

3. **Audit trail 的完整性**
   - 所有狀態改動都該有 audit 記錄
   - 檢查哪些表沒有 created_by / updated_by

4. **軟刪除 vs 硬刪除** 的一致性
   - customers / receipts / payment_requests 用軟刪除（`is_deleted` + `deleted_at`）
   - 確認沒有「硬刪」導致孤兒資料

---

## 建議執行順序（給 William）

### 上線前（必做）
1. **流程斷點 ① 收款確認 → 自動傳票**
   - 成本：M
   - 優先級：🔴 Critical（會計流程）
   
2. **狀態機檢查點補齊**（Receipt 'confirmed' 不可逆等）
   - 成本：S
   - 優先級：🔴

### 上線後 1 週（Quick wins）
3. **Order 改 read-only when Tour = 'ongoing'**
   - 成本：S
   - 優先級：🟠
   
4. **Payment Request → Disbursement 串接**
   - 成本：M

### 上線後 1 個月（架構重構）
5. **統一的「多步驟 API 事務邊界」pattern**
   - 成本：L（影響多個 API）
   - 優先級：🟡

6. **Event/Notification 系統建立**
   - 成本：L（新系統）

---

## 跨視角 pattern 累積（1-6 位合計）

| # | Pattern | 誰發現 | 修法成本 | 優先級 |
|---|---|---|---|---|
| 1 | 外部輸入信任邊界未統一 | Security | 中 | P0 |
| 2 | 資料密集功能全 client 算 | DBA | 中 | P0 |
| 3 | 編號 race condition 跨模組 | DBA/SRE | 中 | P0 |
| 4 | HTML 安全 × 列印 × 無障礙 | Security | 中 | P1 |
| 5 | 效能 vs 正確性政策缺失 | DBA | 高 | P1 |
| 6 | 外部依賴無防禦 | SRE | 中 | P0 |
| 7 | 冪等性缺席 | SRE | 中 | P0 |
| 8 | 觀察性近零 | SRE | 高 | P1 |
| 9 | 跨域引用繞層級 | Architect | 高 | M |
| 10 | god component 吞噬分層 | Architect | 高 | L |
| **11** | **多步驟 workflow 無事務邊界** | **Workflow** | **中** | **P0** |
| **12** | **狀態轉換無自動 trigger** | **Workflow** | **中** | **P0-P1** |
| **13** | **流程「三角梗」無實時同步** | **Workflow** | **高** | **P1** |
| **14** | **權限 state 和業務 state 分離** | **Workflow** | **高** | **M** |

**共 14 種跨視角 pattern**、後面 4 位（Data / UX / DevOps / Onboarding）會繼續補充。

---

## 附錄：Workflow Architect 掃描足跡

**掃過**：
- 6 張核心表的 state definition（Tour / Order / Quote / Receipt / Payment Request / Employee）
- 租戶建立 API 流程（5 步驟）
- 前 5 位 marathon 報告跨視角補充（發現 14 種 pattern）
- BUSINESS_MAP.md 業務定義（向下相容）

**未檢查**（需授權或後期）：
- 實際運行軌跡（需 staging 環境測試）
- Cron job 是否真的觸發自動轉換（需 logs）
- 多租戶隔離的實際 IDOR 路徑（需安全審計）

---

_**Workflow Architect 簽名**：這份代碼不是「架構爆炸」、而是「flow 脈絡不清」。流程設計時沒有考慮「一個 state 改變會引發的下游事件」，導致大量「人工補救」環節。上線能用、但每次有新需求都要問「這個狀態改變要觸發什麼」，會越來越痛。建議上線後第一個月就投入「事件驅動」架構設計，未來會省很多工。_

---

## 🔁 主 Claude 覆盤

### 1. 真問題過濾

Workflow 特別：**大部分發現不是 bug、是「這流程要不要做」的業務決策題**。

| # | Workflow 說 | 覆盤後 | 備註 |
|---|---|---|---|
| 收款確認→無自動傳票 | 🔴 | ⚠️ **業務決策** | 會計是否全自動 vs review 後產 |
| 訂單確認→無自動 LinkPay | 🔴 | 🟡 UX 決策 |
| **出團→無自動鎖單** | 🔴 | 🔴 **真 P0、data integrity** | 出團當天還能改團員 |
| 結案→無自動成本核算 | 🔴 | 🟡 業務決策 |
| 請款確認→無出納派單 | 🔴 | 🟡 流程題 |
| **Receipt 'confirmed' 不可逆** | 🟠 | 🟠 **真 P1、狀態契約** |
| **Order.payment_status 無自動更新** | 🟠 | 🟠 **真 P1、狀態同步** |
| Tour.status cron vs 手動 | 🟠 | 🟡 政策 |
| Quote→Order 無 contract | 🟠 | 🟡 政策 |

**覆盤結論**：**1 個 P0、2 個 P1、6 個業務決策**

### 2. 重複

- 多步驟無事務 = 已有（INDEX ① + SRE）
- 幾乎無重複、Workflow 維度跟前 5 位互補

### 3. 跨視角 pattern 累積

| # | Pattern | 狀態 |
|---|---|---|
| 1-12 | 前累計 | 繼承 |
| **13** | **State 轉換無自動下游 event hook** | **Workflow 新** |

Workflow 自提 4 個、其他 3 個整併進既有 pattern。**累計 13**。

### 4. 需 William 業務拍板（合 Bookkeeper 共 8 題）

| 題 | 來源 |
|---|---|
| 會計傳票自動產（收款 / 付款 / 結案）？ | Workflow |
| LinkPay 自動發給客戶？ | Workflow |
| 出團日要不要鎖單？（建議做）| Workflow |
| Receipt confirmed 不可逆？（建議做）| Workflow |
| 用系統開發票？ | Bookkeeper |
| 營收認列時點？ | Bookkeeper |
| 外幣業務範圍？ | Bookkeeper |
| Corner 代收代付現況？ | Bookkeeper |

---

