# Marathon 05 · Bookkeeper Controller 📒 體檢報告

**扮演靈魂**：Bookkeeper Controller（會計師專業懷疑、稅務稽核視角、借貸平衡是神聖）  
**掃描日期**：2026-04-24  
**範圍**：會計邏輯 / 科目表設計 / 期末結轉 / 稅務風險 / 權責認列 / 旅行社特殊 / 稽核痕跡 / 台灣法規  
**方法**：會計原理比對 + 台灣商業會計法 + 稅務稽核視角 + 旅行社會計實務

---

## 一句話裁決（會計師語氣）

**帳會平衡、結轉邏輯也對，但上線前必須解決 4 個「稅務稽核員會打臉」的問題：(1) 科目代碼硬編、(2) 權責認列時點未明確、(3) 稅務科目缺、(4) 審計痕跡不夠深。架構上借貸雙重檢查做得好，但台灣稅法特殊狀況沒覆蓋。給老闆的話：能做帳、但要先把 4 個紅線清掉、否則稅務簽證時會被查帳。**

---

## 🔴 會計原理違反（帳會錯、稽審會打臉）

### 1. 期末結轉「3200 本期損益」「3300 保留盈餘」科目代碼硬編

**位置**：`src/app/api/accounting/period-closing/route.ts` L195-221

**證據**：

```typescript
// L196-205：查詢損益結轉科目
const { data: currentProfitAccount, error: profitAccountError } = await supabase
  .from('chart_of_accounts')
  .select('id')
  .eq('workspace_id', workspaceId)
  .eq('code', '3200') // ⚠️ 硬編、只適合台灣一般公認會計原則
  .single()

// L210-221：年結查詢保留盈餘科目
const { data, error } = await supabase
  .from('chart_of_accounts')
  .select('id')
  .eq('workspace_id', workspaceId)
  .eq('code', '3300') // ⚠️ 同樣硬編
  .single()
```

**會計師看法**：

- **台灣會計標準**：商業會計法第 41 條規定，期末損益結轉到「本期損益」科目（通常 3200），再年結到「保留盈餘」（3300）。目前實作符合標準。
- **問題在**：Corner 旅行社和 JINGYAO / YUFEN 可能用不同科目編碼方案：
  - Corner 可能 3200 / 3300
  - JINGYAO 可能 3999 / 4000（客製化）
  - YUFEN 可能根本沒有明確損益科目（小型旅行社用簡易帳）
- **上線風險**：新租戶上線時若科目代碼不符、年結會炸「找不到」而拒絕結轉、客戶帳本卡住
- **稅務稽核視角**：稅務局查帳時會問「為什麼你們用 3200？誰決定的？」→ 答不出來會被認定控制不當

**建議**（M 優先級、半天）：

1. 在 `workspace_settings` 表（或 JSON column）加欄位：

   ```sql
   ALTER TABLE workspaces ADD COLUMN accounting_config JSONB DEFAULT '{
     "profit_account_code": "3200",
     "retained_earnings_account_code": "3300"
   }'::jsonb;
   ```

2. 期末結轉改查：

   ```typescript
   const profitAccountCode = workspace.accounting_config?.profit_account_code ?? '3200'
   const { data: currentProfitAccount } = await supabase
     .from('chart_of_accounts')
     .select('id')
     .eq('workspace_id', workspaceId)
     .eq('code', profitAccountCode)
   ```

3. 新租戶上線流程在 tenant 設定頁加「會計科目設定」UI（由 系統主管 確認或選擇預設方案）

**為什麼是 RED**：不做的話，第二個租戶一定踩坑。

---

### 2. 借貸平衡檢查在 DB 層無 CONSTRAINT、只靠應用層

**位置**：`src/app/api/accounting/vouchers/create/route.ts`（工程 audit 01 §4 已提及 frontend + backend 雙重檢查）

**會計師看法**：

- **借貸原理**：Double-Entry 的神聖性就是 debit = credit，差異一分錢都是錯
- **現況**：
  - 前端 CreateVoucherDialog 驗證（L191-193）
  - 後端 route.ts 驗證（L88-97）
  - 分錄插入前檢查 total_debit = total_credit
- **問題**：DB 層沒有 CHECK CONSTRAINT
  ```sql
  -- 現況沒有這個
  -- ALTER TABLE journal_vouchers
  --   ADD CONSTRAINT check_debit_credit_balance
  --   CHECK (total_debit = total_credit);
  ```

**稅務稽核視角**：

- 若應用層 bug（例如某個老版 API 仍在用）或手動 DB 修改、違反借貸平衡的傳票會悄悄存在
- 月結時試算表左右不平會被發現，但為時已晚（已產生 ledger）
- 美國 SOX 制度要求「critical data integrity rule 必須在 DB 層實施」

**建議**（S 優先級、<1 小時）：

```sql
-- Wave 8 加入
ALTER TABLE journal_vouchers
  ADD CONSTRAINT check_voucher_balance
  CHECK (
    (total_debit >= 0 AND total_credit >= 0)
    AND ABS(total_debit - total_credit) < 0.01
  )
  NOT VALID;  -- 先加 NOT VALID、驗證現有資料後再啟用

-- 驗證現有資料
SELECT COUNT(*) FROM journal_vouchers
WHERE ABS(total_debit - total_credit) >= 0.01;
-- 應該是 0

-- 啟用 constraint
ALTER TABLE journal_vouchers VALIDATE CONSTRAINT check_voucher_balance;
```

**為什麼是 RED**：沒有 DB 層防線、某天會出現神秘的不平衡傳票。

---

### 3. 發票（Travel Invoice）完全缺台灣稅務特殊邏輯

**位置**：`supabase/migrations/20260126170000_create_invoice_orders.sql` + BACKLOG §§3-5

**會計師看法**：

旅行業發票特殊性（台灣統一發票規則）：

- **票號連號檢查**：台灣統一發票號碼區間由國稅局指定（例如 BA-00000001 到 BA-10000000）
- **三聯式 vs 二聯式**：旅行業多數用三聯式發票、涉及客戶聯、廠商聯、主管機關聯
- **發票作廢流程**：不能直接 DELETE、必須產生「作廢聯」（BACKLOG 已列「改 void 新 signature」）
- **營業稅計算**：旅遊團費含 5% 營業稅、須分離稅額
- **進項發票認列時點**：購買飛機票 / 飯店費用的發票何時認列（簽約？支付？）

**現況**：

- Schema 有 `travel_invoices` 表、但無「票號字軌」概念
- 無發票作廢追蹤（只有 `is_voided` boolean）
- 無稅額分離欄位
- 無月報 401 表 / 403 表產出邏輯

**BACKLOG 確認**：

- Line 319：「開發票 / 批次發票 / 作廢（測 void 新 signature）」— 上線前測試項
- Line 249：「發票作廢：改 void 新 signature」— Wave 7 待做

**建議**（L 優先級、2-3 天、需 William 決策範圍）：

1. **票號字軌管理**：

   ```sql
   CREATE TABLE invoice_number_ranges (
     id uuid PRIMARY KEY,
     workspace_id uuid,
     prefix TEXT,  -- BA-, AA- 等
     start_no INT,
     end_no INT,
     current_no INT,  -- 用 FOR UPDATE 鎖定、避免並發撞號
     issued_by TEXT,  -- 國稅局授權人員
     issued_date DATE,
     created_at TIMESTAMPTZ
   );
   ```

2. **發票作廢追蹤**（改 soft-delete）：

   ```sql
   ALTER TABLE travel_invoices ADD COLUMN (
     is_voided BOOLEAN DEFAULT FALSE,
     void_reason TEXT,
     void_signature TEXT,  -- 簽章 digest
     voided_at TIMESTAMPTZ,
     voided_by UUID
   );
   -- 當 is_voided = true 時自動產生「作廢聯」在 audit log
   ```

3. **稅額分離**：

   ```sql
   ALTER TABLE travel_invoices ADD COLUMN (
     gross_amount NUMERIC(15,2),  -- 稅前金額
     tax_rate NUMERIC(3,2) DEFAULT 0.05,  -- 5%
     tax_amount NUMERIC(15,2),  -- 計算欄 = gross * tax_rate
     total_amount NUMERIC(15,2)  -- gross + tax
   );
   ```

4. **月報自動產出**（後續功能）：
   - `finance/reports/form-401` — 銷項稅額申報
   - `finance/reports/form-403` — 進項稅額申報

**上線前做不做**：不做的話發票作廢會很亂、稅務簽證時「系統沒辦法提供完整發票冊」會被質疑。

---

### 4. 權責認列（Accrual vs Cash）時點未明確

**位置**：整個會計模組、沒有明確文件

**會計師看法**：

旅行業有特殊的收支時點問題：

| 事件               | 現況       | 應該是                           |
| ------------------ | ---------- | -------------------------------- |
| **客戶繳訂金**     | 收款單記錄 | 預收收入（liability）            |
| **簽證費代收**     | 進賬、代付 | **代收代付不入損益**（過帳帳戶） |
| **團費出發後確認** | 分錄記錄   | 應該何時認列？簽約/出發/結團？   |
| **供應商發票後付** | 請款單記錄 | 費用認列 vs 付款分開             |
| **跨年度長團**     | 無特殊處理 | 應該分年度認列嗎？               |

**現況缺陷**：

1. **收款單** — 「客戶付款」就認列收入，但 BACKLOG 無提及「預收 vs 實收」區分
2. **簽證代收** — 有代收代付表（`visa_requests` 中的 `advanced_by` 欄）但邏輯不清
3. **供應商付款** — 「請款確認」= 費用認列，但如果後來改金額該怎麼辦？
4. **長團跨年** — 旅行社常有「2025 年簽約、跨 2026 年出發」的團、帳要怎麼分？

**稅務稽核視角**：

- 營所稅採用「所得稅法 §11 條」（權責發生制）
- 若按現金制記帳、國稅局會質疑「為何營業稅用權責、所得稅用現金」（二元帳）
- 發票必須要認列在「事件發生日」、收到發票日只做「應付帳款」

**建議**（L 優先級、需業務決策）：

1. **文件化**：`docs/ACCOUNTING_PRINCIPLES.md` 明確寫下：
   - 「收款認列時點」：簽約日？出發日？回程日？
   - 「費用認列時點」：請款確認日？發票日？付款日？
   - 「代收代付」原則：不入損益

2. **新增會計期間鎖定**（BACKLOG L227-228 已提及）：
   - 月結後禁止新增/修改該月的傳票
   - 改期間需「期末結轉反沖」工作流

3. **旅行社特定科目**：
   - `4110 旅遊團費收入`（區別其他收入）
   - `5210 機票費` / `5220 飯店費` / `5230 簽證費`（分類）
   - `2210 應收代收代付`（過帳帳戶）

**為什麼是 RED**：不明確的話、每次改帳時 controller 和 cfo 會有不同意見、帳本不一致。

---

## 🟠 台灣法規風險（稅務局不愛）

### 1. 無「內部控制評估」機制（商業會計法第 4 條）

**台灣商業會計法**：

- 第 4 條：公司應建立完整內部控制制度
- 第 38 條：會計紀錄必須至少保存 7 年

**現況**：

- 有 audit trail（`created_by` / `updated_by`）
- 無「控制自評」文件
- 無「異常交易 flag」機制

**建議**（L、上線後準備）：

```typescript
// 在 accounting_events 或新表中加 control_flags
interface AccountingControl {
  id: uuid
  workspace_id: uuid
  event_id: uuid
  control_point: 'voucher_approval' | 'bank_reconciliation' | 'period_closing'
  passed: boolean
  notes: string
  checked_by: uuid
  checked_at: timestamptz
}

// 月結前必須確認：
// - 所有傳票已複核（control_point = 'voucher_approval'）
// - 銀行對帳完成（control_point = 'bank_reconciliation'）
// - 試算表平衡（自動檢查）
```

**法規收穫**：年度稅務簽證時可展示「完整的控制過程」。

---

### 2. 無稅務類型標記（營業稅法第 3 條）

**問題**：

- 應稅 vs 免稅 / 零稅率 發票沒區分（例如境外服務）
- 代理人代收發票無標記
- 進項發票「待抵扣」狀態未追蹤

**建議**（M、半天）：

```sql
ALTER TABLE travel_invoices ADD COLUMN (
  tax_treatment TEXT CHECK (tax_treatment IN ('taxable', 'exempt', 'zero_rated')),
  -- 應稅 / 免稅 / 零稅率（境外團）
  is_agent_invoice BOOLEAN DEFAULT FALSE,
  -- 代理商發票
  input_credit_status TEXT DEFAULT 'pending'
  -- pending / credited / denied
);
```

**上線前做嗎**：不做的話 401 / 403 表統計會對不上、稅務局會查。

---

## 🟡 旅行社特殊會計未處理

### 1. 代收代付浮動帳戶（代收機票 / 簽證費）

**現況**：有 `visa_requests` 的 `advanced_by` 欄，但邏輯不清

**會計師視角**：

旅行社常代客戶墊支簽證費、機票費等，形成「應收－應付」對沖帳戶。應該有專用帳戶追蹤：

```sql
-- 建議新表
CREATE TABLE agency_float_accounts (
  id uuid PRIMARY KEY,
  workspace_id uuid,
  description TEXT,  -- 「簽證代付」「機票墊支」等
  category TEXT CHECK (category IN ('visa', 'airfare', 'hotel', 'other')),
  tour_id TEXT,
  customer_id uuid,
  supplier_id uuid,
  amount NUMERIC(15,2),
  currency TEXT DEFAULT 'TWD',
  status TEXT CHECK (status IN ('pending_payment', 'paid', 'collected')),
  created_at TIMESTAMPTZ
);
```

**稽核痕跡**：

- 「誰代墊」（supplied_by）
- 「何時收回」（collected_date）
- 「對應費用單據」（receipt_id）

---

### 2. 佣金收入（來自航空公司、飯店）

**問題**：無專用科目、無追蹤機制

**應該有**：

- `4200 航空佣金收入`
- `4210 飯店佣金收入`
- `4220 簽證佣金收入`

**稽核痕跡**：

- 發票單位（供應商名）
- 佣金計算基礎（客房夜數、人數等）
- 月度對帳單據

---

### 3. 匯兌損益（美元報價、台幣結算）

**現況**：無匯差處理

**應該有**：

```sql
ALTER TABLE travel_invoices ADD COLUMN (
  invoice_currency TEXT DEFAULT 'TWD',
  original_amount NUMERIC(15,2),  -- 原幣
  exchange_rate NUMERIC(8,4),     -- 成交匯率
  recognized_amount NUMERIC(15,2) -- 台幣認列金額
);

-- 科目
-- 7130 匯兌利益
-- 7131 匯兌損失
```

**旅遊業常見**：美元報價給客、但供應商付美元、客人繳台幣，中間差價該誰吸。

---

## 🟢 會計做得好的（別改壞）

### 1. ✅ 借貸雙重平衡檢查

前端（CreateVoucherDialog L191-193）和後端（create/route.ts L88-97）都檢查 debit = credit，是很好的防線。

### 2. ✅ 審計欄位統一

`created_by` / `closed_by` 全指 `employees(id)`、不是 `auth.users(id)`。2026-04-20 的 Wave 0 已清乾淨。

### 3. ✅ 期末結轉邏輯符合會計規則

區分「月結/季結」（結轉到本期損益）vs「年結」（再結轉到保留盈餘）。邏輯清晰、計算正確。

### 4. ✅ RLS 策略完整

所有會計表都啟用 RLS + workspace_id 過濾、無 FORCE RLS 違規。新租戶資料完全隔離。

### 5. ✅ API 層驗證完整

三個主要 API（create / period-closing / auto-create）都用 Zod schema 驗證輸入、有錯誤回滾邏輯。

### 6. ✅ 報表 UI 貼心

試算表、損益表、資產負債表都有「說明」section、標註公式、顏色含義，降低使用者誤讀風險。

---

## 跨視角 pattern 候選

### 1. 科目設定中央化

```
本模組找到：3200 / 3300 硬編、BACKLOG 列「科目參數化」
其他模組風險：finance 可能有其他硬編科目（預設收款科目、預設費用科目等）
建議：workspace_settings 集中所有會計預設值
      type: AccountingConfig = {
        profit_account_code: '3200',
        retained_earnings_account_code: '3300',
        default_receivable_account_code: '1110',
        default_payable_account_code: '2110',
        ...
      }
```

### 2. 稅務特殊邏輯由 workspace config 驅動

```
旅行社 A：權責制、應稅、要三聯式發票
旅行社 B：現金制、免稅、要二聯式發票
旅行社 C：混合（某些應稅、某些免稅）

建議：不 hardcode、讓每個租戶在設定頁自己選
     tax_treatment_rule: 'accrual' | 'cash' | 'hybrid'
     invoice_format: 'three_part' | 'two_part'
     tax_rate_by_category: { "visa": 0, "hotel": 0.05, "tour": 0.05 }
```

### 3. 浮動帳戶通用設計

```
不只旅行社用浮動帳戶、任何代收代付業務都適用
建議抽象化成通用的「三角債務追蹤」服務
  TriangleLoan {
    initiator: supplier,
    payer: company,
    recipient: customer,
    amount, currency, status, settlement_date
  }
```

---

## 給下一位靈魂（Workflow Architect）的 hint

在設計「訂單→請款→付款」流程時要考慮：

1. **權責時點決策** — 什麼時候才算「費用發生」（請款確認日？發票日？付款日？）
2. **代收代付淨化** — 不該入損益的現金流要有專用帳戶追蹤
3. **稅務分類** — 同一筆費用可能既是「營業費用」又涉及「營業稅進項」，兩個維度不能混
4. **期末鎖定機制** — 月結前後的帳本操作權限要有 checkpoint
5. **簽證者流程** — 傳票、請款、發票都要有「複核/批准」環節、留審計痕跡

---

## 行動清單

### 上線前必做（RED）

1. **科目代碼參數化** — 3200 / 3300 不再硬編
2. **DB 層借貸平衡 CHECK** — 防應用層 bug

### 上線後優化（YELLOW）

3. 發票作廢流程完善 + 票號字軌管理
4. 稅務科目分離 + 月報 401 / 403 自動產出
5. 代收代付帳戶系統建立
6. 權責認列原則明確文件化

### 可緩後處理（GREEN）

7. 內部控制自評機制
8. 佣金收入細分科目
9. 匯兌損益處理
10. 會計期間鎖定機制

---

**掃描結束**  
**掃描者心語**：這套帳有基礎、但大多是「台灣特殊稅務邏輯」還沒接上。新客戶上線時會被問「為什麼發票不支援作廢」「為什麼沒有代收代付追蹤」。建議先把 4 個紅線解決、其他留給 Wave 8+ 做。

---

## 🔁 主 Claude 覆盤

### 1. 真問題過濾

| #                          | Bookkeeper 說 | 覆盤後                                                           | 備註                                                        |
| -------------------------- | ------------- | ---------------------------------------------------------------- | ----------------------------------------------------------- |
| 科目代碼 3200/3300 硬編    | 🔴            | ❌ **扣分、重報**（01-accounting §6）                            |
| **DB 層無 CHECK 借貸平衡** | 🔴            | 🔴 **真、新**                                                    | 前端+API 驗不夠、SQL 直 insert 還能寫壞、會計師堅持 DB 要守 |
| 台灣發票邏輯未接           | 🟡            | ⚠️ **看上線要求**（要開發票→P0、內部帳→Post-Launch）             |
| 權責認列時點               | 🟡            | 🟡 **政策題**、需 William 決策                                   |
| **代收代付追蹤缺**         | 🟡            | 🔴 **升級 P0/P1**                                                | 代收機票款不該進損益、稅務會查、需驗 Corner 實務            |
| 佣金收入無專用科目         | 🟡            | 🟡 真、旅行社專業                                                |
| 匯兌損益                   | 🟡            | 🟡 看 Corner 有無外幣業務                                        |
| 無內控自評 / 稅務類型      | 🟠            | 🟠 法規                                                          |
| 期末鎖定機制               | -             | ⚠️ **需驗證**（`accounting_periods.closed` 之後是否真擋 insert） |

**覆盤結論**：**1 個 P0 新（DB CHECK）+ 1 個需驗證升級（代收代付）+ 4 個業務決策題**

### 2. 重複

- 3200/3300 硬編（01-accounting §6）
- 借貸平衡前後端 → Bookkeeper 加 DB 層、算新視角不算重複

### 3. 跨視角 pattern 累積（1-5 位）

新增第 11、12：

| #      | Pattern                                                      | 誰發現            |
| ------ | ------------------------------------------------------------ | ----------------- |
| **11** | **會計內控只在應用層、沒下到 DB CHECK**                      | **Bookkeeper 新** |
| **12** | **旅行社專業會計未接：代收代付 / 佣金 / 匯兌 / 發票 4 大類** | **Bookkeeper 新** |

### 4. 需 William 業務拍板（4 題、用業務話）

1. **Corner / JINGYAO / YUFEN 上線後要不要用系統開發票？**（要→台灣發票 P0）
2. **旅行社營收什麼時候算收入？** 客戶簽約日 / 收款日 / 出發日 / 回程日（影響跨期）
3. **有沒有接外幣 / 海外客戶？**（要不要做匯兌損益）
4. **Corner 目前怎麼記代收代付？**（代收機票 / 代收簽證款）

---
