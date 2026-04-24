# G3 — 需求 / 團確單 / 合約 Tab 深挖

_Agent 在 read-only、主 Claude 補寫檔案（逐字貼回）_

---

## 1. 需求 Tab（requirements）

**業務目的推斷**：從行程（tour_itinerary_items）衍生需求單、發給供應商報價。團務樞紐：行程 → 需求 → 供應商報價 → 確認成交 → 團確單。純業務狀態、不涉財務。

**完成度 %**：約 85%。核心轉換邏輯 (`core-items-to-quote-items.ts`) 完善、住宿續住合併邏輯存在。但新舊雙軌並存（`tour_requests` 舊表 + `tour_itinerary_items.request_status` 新欄位）、無遷移計畫。

**DB 表依賴**：

- `tour_itinerary_items`（核心）：category / title / day_number / show_on_quote / request_status / request_sent_at / request_reply_at
- `tour_requests`（舊、仍活躍）：id / tour_id / workspace_id / supplier_name / category / status / accepted_at / rejected_at / package_status
- `tour_request_items`（協作細項）：request_id / item_name / item_category / source_item_id / local_status / handled_by

**核心 hooks / services**：

- `useTourRequests()` — 讀舊 `tour_requests`（SWR entity hook）
- `useTourItineraryItemsByTour(tourId)` — 讀核心表
- `coreItemsToQuoteItems(items, calculateDate)` — 純轉換（住宿連續同酒店合併、日期範圍）
- API `/api/tours/[tourId]/requests/[requestId]/{accept,reject}` — 更新 `tour_requests` 狀態、產生 `tour_request_items`

**SSOT 有沒有斷**：❌ **斷了**。`tour_requests`（舊）和 `tour_itinerary_items.request_status`（新）雙軌、缺同步機制。accept/reject 只動 `tour_requests`、沒回寫 core 表 `request_status`、導致 core 表無法反映需求狀態。

**對照 8 條原則**：

- 原則 1：✅ RLS 過濾（`tour_requests.workspace_id`）
- 原則 2：⚠️ 「發送 / 接受 / 拒絕」無職務分工（業務 / 助理都能操作）
- 原則 3：✅ workspace_id 嚴格檢查
- 原則 4：❌ **雙軌並存**（見上）
- 原則 5：✅ core → QuoteItem → TourRequest → 成交走同條線
- 原則 6：⚠️ RequirementsList 聚合住宿（連續同酒店）、core 仍多筆、update 易漏
- 原則 7：✅ 需求單 delete 無 FK 污染
- 原則 8：✅ 需求 Tab 是需求單快速入口、無獨立資料

**紅旗（5 條）**：

1. `tour_requests` 表 vs `request_status` 欄位並存、同步斷
2. 已接受需求**還能重複 accept**（API 沒檢查 `accepted_at` 或 `status='已確認'`）
3. 住宿合併邏輯（`stripContinueStay`）前綴硬編「續住 (...)」、命名改就斷
4. `tour_request_items.source='auto_generated'` 之後編輯追蹤不全（誰改、改什麼）
5. 已發送需求單還能改 quoteItems、無警告

**特別發現**：

- `useAccommodationSegments` 在本 Tab 沒被呼叫、合併邏輯內建在 `coreItemsToQuoteItems`
- accept/reject API 沒防重複 accept 的 guard
- core 表 `request_status` 欄位**目前無人維護**

---

## 2. 團確單 Tab（confirmation-sheet）

**業務目的推斷**：**對內工作流**出團確認表（類似 Excel 出團報表）、供應商 / 領隊交接用。對客戶端的確認單在其他頁面（可能是 Online 系統、此架構未見）。

**完成度 %**：約 60%。簡版 `ConfirmationSheet` 只讀渲染、完整版 `TourConfirmationSheetPage`（在 `features/tour-confirmation/`）支援編輯、多貨幣、結算、但與需求 Tab 集成度低。

**DB 表依賴**：

- `tours` / `tour_itinerary_items` / `tour_members` / `tour_rooms`
- `tour_confirmation_sheets`（舊表、TourConfirmationSheetPage 用）
- `tour_confirmation_items`（舊表、儲存確認單細項）

**核心 hooks / services**：

- `useTourItineraryItemsByTour(tourId)`、`ConfirmationSheet`（簡版）
- `TourConfirmationSheetPage`（完整版、可編輯、多貨幣、結算）
- `usePaymentStatus()` / `useWorkspaceSettings()`

**SSOT 有沒有斷**：❌ **嚴重斷裂**。`tour_confirmation_sheets` / `tour_confirmation_items` 是 TourConfirmationSheetPage 的獨立系統、但需求 Tab（RequirementsList）完全不用這些表、直接從 core + `tour_requests` 算。**兩套系統數據不同步**。

**對照 8 條原則**：

- 原則 1：✅ workspace_id 檢查
- 原則 2：⚠️ 編輯權限無限制（任何登入者能改）
- 原則 3：✅ workspace_id 檢查（舊表 RLS 待驗）
- 原則 4：❌ 雙系統（需求 Tab vs 團確單 Tab）無主奴關係
- 原則 5：❌ 確認單獨立編輯 / 結算、與需求流程脫離
- 原則 6：⚠️ 可行內新增項目（InlineAddRow）、破壞「從行程衍生」聚合視圖
- 原則 7：⚠️ 有 tour_id FK、刪團會污染確認單（ON DELETE 定義待驗）
- 原則 8：❌ TourConfirmationSheetPage 是獨立編輯系統、非快速入口

**紅旗（5 條）**：

1. **`features/confirmations` + `features/tour-confirmation` 雙資料夾**：ConfirmationSheet（簡版、只讀）在 confirmations、TourConfirmationSheetPage（完整、可編輯）在 tour-confirmation — **職責重疊**
2. 團確單獨立編輯打破 SSOT：InlineAddRow 可產「確認單有、行程沒有」的幽靈項目
3. 無版本追蹤：編輯無 changelog / 無 created_by 記錄
4. 多貨幣邏輯只在 TourConfirmationSheetPage（需求 Tab 沒有）
5. 結算（SettlementSection）在團確單、不在財務模組 → 應收 / 應付邏輯散落

**特別發現**：

- 對客 vs 對內不清楚：ConfirmationSheet 對內、TourConfirmationSheetPage 也對內、**沒有真正對客戶的確認**
- 兩資料夾關係：confirmations = 「報價衍生的確認單」（需求視角）、tour-confirmation = 「出團確認表」（交接視角）、上下游關係未定義

---

## 3. 合約 Tab（contract）

**業務目的推斷**：付費功能。生成 / 管理 / 簽署旅遊定型化契約。客戶端簽署（無需登入、公開 UUID 安全）。合約類型：國內 / 國外 / 個別旅遊。簽署後記錄簽名 / 時戳 / IP / User-Agent。

**完成度 %**：約 75%。合約生成、簽署 API 完整、但簽署後流程（歸檔、重簽、版本管理）不清楚、無簽署狀態推送。

**DB 表依賴**：

- `contracts`：id / code / tour_id / template / status（draft / sent / signed）/ signer_name / signer_type / signed_at / signature / signing_ip / signing_user_agent
- `orders` / `order_members`（讀團員 / 個別簽署）
- `workspaces`（讀 workspace_features 驗 'contracts' 付費）

**核心 hooks / services**：

- `useVisibleModuleTabs('tours', TOUR_TABS)` — feature gate
- `TourContractTab` — 新建 / 檢視 / 發送 / 簽署流程
- API `/api/contracts/create` — server-side 產 PDF
- API `/api/contracts/sign` — **公開 API、service_role client（繞過 RLS）、UUID 認證**
- API `/api/contracts/list`、`/members`

**SSOT 有沒有斷**：⚠️ **部分**。`contracts` 對合約本身是 SSOT、但與團務流程銜接鬆散（無「需求→成交→簽署」的狀態流、合約是事後產物）。

**對照 8 條原則**：

- 原則 1：✅ 付費 feature flag 檢查；API 公開但用 UUID 認證
- 原則 2：⚠️ 只有「新建 / 發送 / 簽署」、無核簽 / 對帳
- 原則 3：✅ workspace_id 檢查、但公開簽署 API 繞過 RLS（intentional）
- 原則 4：⚠️ contracts.status = [draft / sent / signed]、無「簽署中」「待補填」
- 原則 5：❌ 合約與團務脫離（新建時無自動衍生自需求）
- 原則 6：❌ 合約清單無聚合檢視（簽署率 / 未簽清單）
- 原則 7：⚠️ 依賴 tour_id（刪團孤立合約、ON DELETE 定義待驗）
- 原則 8：✅ 合約 Tab 是獨立系統（符合獨立資料）

**紅旗（5 條）**：

1. 付費 feature gate 不完整：`useVisibleModuleTabs` 檢查 'contracts'、但 API 層（/api/contracts/sign 公開）**無一致檢查**
2. 簽署 API 繞過 RLS（service_role）、**仰賴 UUID 秘密性**；若 contractId 洩露任何人可簽
3. 簽署後無版本管理：status='signed' 後不可重簽 / 改、也無歷史版本
4. 合約類型選擇無驗證：前端可自由選其他樣板（應驗證 tour_type 與樣板匹配）
5. 簽署狀態推送缺失：業務端需手動重整看到 signed

**特別發現**：

- UUID 認證是 intentional trade-off（客戶無需登入）、但缺：過期時間、簽署嘗試限流、OTP / 簽名驗證
- 合約與需求單無自動聯動（應在「成交確認」後自動生成初稿）

---

## 關鍵交叉問題

| 問題       | 需求                                      | 團確單                                    | 合約                            |
| ---------- | ----------------------------------------- | ----------------------------------------- | ------------------------------- |
| SSOT 斷    | tour_requests (舊) vs request_status (新) | confirmations vs tour-confirmation 雙系統 | contracts 孤立                  |
| 狀態流銜接 | accept/reject 不回寫 request_status       | 確認單無與需求同步                        | 簽署不回寫 tour.contract_status |
| 權限檢查   | RLS ✅                                    | tour-confirmation RLS 待驗                | feature flag ✅ API 層 ❌       |
| 編輯追蹤   | 無 changelog                              | 無 created_by/updated_by                  | 簽署記 IP/UA ✅                 |
| 資料一致性 | 行內合併、core 雙份                       | 可行內新增 → 幽靈項目                     | 無版本控制                      |

## 建議優先級

**P0（阻斷）**：

1. `tour_requests` vs `request_status` 雙軌：選一方為 SSOT、遷移、廢棄另一方
2. `tour-confirmation` RLS 未驗：補 policy、驗證 workspace_id

**P1（高影響）**：

1. accept/reject API 加 idempotent guard（防重複 accept）
2. 團確單行內編輯打破流程：移到專頁、強制回需求重報價

**P2（體驗）**：

1. 簽署後推送通知
2. 合約樣板類型驗證
3. 確認單版本追蹤（changelog）
