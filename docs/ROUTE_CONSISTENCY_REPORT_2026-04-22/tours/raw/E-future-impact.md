# Agent E — /tours 未來影響預測

_由 Explore agent 產出（2026-04-22）、主 Claude 補寫檔案（原 agent 在 read-only mode、以回覆內容逐字貼回）_

---

## 1. 結帳未完 — 影響半徑

**現狀**：

- `tour_itinerary_items.actual_expense`、`expense_note`、`expense_at` 欄位存在且定義完整（已在 DB schema 確認）
- 寫入邏輯分散在 `tour-closing-tab.tsx` 和 `TourClosingTab` 元件中
- 目前讀取：`TourClosingTab` 行 160-163，彙總 `paymentRequests` 計算 `totalExpense`
- **寫入邏輯缺失**：無 API / hook 負責寫 `tour_itinerary_items.{actual_expense, expense_note, expense_at}`

**未來會怎樣咬回來**：

- 月結對帳：無法溯源「哪一項行程的實際支出是多少」（只有總額、無明細）
- 分潤計算（ProfitTab / BonusSettingTab）：依賴 `paymentRequests` 彙總、「實際 vs 預估」無法對帳
- 獎金設定（BonusSettingTab）：無法按行程項目計算個別獎金

**影響半徑**：ProfitTab / BonusSettingTab / tour-closing-tab、間接 finance/reports/accounting
**緊急度**：🔴 高（結帳完整性的 blocker）

---

## 2. 公司模板未完 — 影響半徑

**現狀**：

- `tour-features-section.tsx` 有 `TourControllerSection`（空 TODO 註解）、`TourAttributesSection`（團類型選單）
- 無「模板複製」「主管模板建立」「員工應用模板」的 UI 或流程
- `workspace.enabled_tour_categories` 能儲存團類型、但無模板版本管理
- 6 套展示主題獨立元件存在、但無「主管可自訂模板選擇」的 UI

**未來會怎樣咬回來**：

- 「主管做一份好行程、其他人複製」需求實現時要改：
  - `tours` 新增 `template_id` FK（指向某個已結團的行程作樣板）
  - `tour_itinerary_items` 支援批量複製（copy pricing / items / requirements）
  - `settings/company` 新增「行程模板庫」tab
- 若硬編「複製」流程、日後換需求就卡

**影響半徑**：`src/features/tours/components/` 全、`settings/company/`、可能新增 `tour_templates` 表
**緊急度**：🟡 中

---

## 3. syncToCore delete-then-insert 歷史債

**現狀**：

- `tour-itinerary-tab.tsx` ~290 行呼叫 `syncToCore({itinerary_id, tour_id, daily_itinerary})`
- 後端完全 DELETE + INSERT（迴圈刪舊 items、逐行重建）
- 匹配邏輯：`day_number + category` 聯合鍵（註解已提「carryOverPricing」）

**未來會怎樣咬回來**：

- **行程重新排序**：客人要求改順序（第 3 天改第 1 天）
  - 舊邏輯刪所有舊 items、重建時 `day_number` 變 3→1
  - 掉資料風險：`quote_item_id` / `request_id` / `confirmation_item_id` 的聯繫斷
  - 報價單指舊 item、新 item 成孤兒
- **AI 重排行程**（Venturo roadmap）：完全無法追蹤舊版本的 pricing / request
- **多地接協作**：地接甲發了需求單、現場改行程後 syncToCore 刪原始 item、request 成孤兒

**影響半徑**：tour-itinerary-tab / useSyncItineraryToCore / 下游全爆（tour-quote-tab、tour-requirements-tab、tour-confirmation-sheet、ProfitTab、BonusSettingTab）
**緊急度**：🔴 臨界（一旦 AI 重排或多地接上線、這套會崩）
**建議**：改成軟更新（UPDATE 而非 DELETE+INSERT）、或加 `version_id` + snapshot

---

## 4. 多主題展示行程 — 維護成本

**現狀**：

- 6+ 套主題元件並存（Luxury / Art / Dreamscape / Collage / Gemini / Nature / default）
- 展示行程分頁 `tour-display-itinerary-tab.tsx` 判 workspace theme → 載對應元件

**未來會怎樣咬回來**：

- 新增顯示欄位（「景點經緯度」「餐廳備註」）要改 6 個 section + 核心表查詢
- 測試 6 倍工作量
- 新主題上線：複製元件、改樣式、整合 switch/if
- 移除舊主題要先盤哪些 workspace 還在用

**影響半徑**：`sections/` 下所有 `TourFeatures*` + `TourHero*`、邏輯集中在 `tour-display-itinerary-tab.tsx`
**緊急度**：🟡 中
**建議**：統一元件結構、用 `theme` prop 控樣式、而非 6 個獨立元件

---

## 5. tour-quote-tab.tsx v1 vs v2 遺留

**現狀**：

- `tour-quote-tab.tsx`（v1）+ `tour-quote-tab-v2.tsx`（v2）並存
- `TourTabs.tsx` 67 行動態載入 **v2**：`<TourQuoteTabV2 tour={tour} />`
- 兩版都能建報價、都有 `QuoteDetailEmbed` 嵌入
- v2 新增「快速報價單列表」+ 版本選單

**未來會怎樣咬回來**：

- 改報價邏輯只改 v2、若有 hardcode import v1 → 邏輯分歧
- 新人改報價會懷疑「到底用哪版」

**緊急度**：🟡 低→中
**建議**：確認 v1 無人用 → 直接刪除、或明確文件標「v1 廢棄」

---

## 6. 一 row 走到底的 SSOT 設計 — 擴張風險

**現狀**：

- `tour_itinerary_items` 已有 **81 列**（id 到 workspace_id）
- 跨 7 個業務維度（報價 / 需求 / 確認 / 結帳 / 定價 / 預訂 / 供應商回覆）

**未來會怎樣咬回來**：

- 新欄位爆炸（supplier_reply_image_urls / customer_custom_note / leader_field_note）
- 100 列時 INSERT/UPDATE 效能下滑、可讀性崩
- 查詢複雜度：報價邏輯只需 `quote_*` 欄、卻讀整個 81 列 row
- 權限管理困難：地接看 itinerary items 但不該看內部成本、RLS 無法按欄位粒度隱藏

**緊急度**：🔴 高（100 列是轉折點）
**建議**：目前 81 列還在控制範圍、設 hard limit 最多 95 列（預留 15 欄給未來 2 年）、超過強制拆表

---

## 7. 跨模組耦合度 — Hub 化風險

**現狀**：

- `/tours/[code]` 依賴 10+ features：tours / orders / members / quotes / requirements / confirmations / payments / costs / checkin / closing / contracts
- `TourTabContent` 按 `activeTab` 動態載對應分頁元件
- 每個分頁獨立管資料 / permission / dialog state

**未來會怎樣咬回來**：

- 新功能簽核 / 發票開立都要加進 TOUR_TABS + useVisibleModuleTabs + TourTabContent switch
- 單頁責任爆炸（15+ feature 的狀態）
- 跨頁面協調：「改報價 → 同步更新結帳金額」邏輯散落各處、出現幽靈資料
- 角色級存取控制：目前 `useVisibleModuleTabs` 按 workspace feature 過濾、無法按 tab 粒度給不同角色（Agent / Loco / 司機）

**緊急度**：🟡 中→高
**建議**：設 tab 上限（最多 12）、超過用分組；考慮 feature flag + plugin 機制（新 tab 以 plugin 載入、不硬編）

---

## 8. 行動版（m/tours）+ PC 版（tours）並存

**現狀**：

- `/tours/[code]` PC 版詳情
- `/m/tours/[id]` 行動版詳情
- 兩版 share 相同 hook（useTourDetails、資料層）
- UI 佈局不同、邏輯共用

**未來會怎樣咬回來**：

- 新功能只在行動版（CheckinQRCode）— PC 版要同步？雙份維護
- 行動版專有狀態（離線草稿）切回 PC 版消失 → user 困惑

**緊急度**：🟡 低
**建議**：定期同步檢查兩版功能差異；共用 feature 加 platform 判定（`useIsMobile()`）

---

## 9. SaaS 擴張 — 多角色內容過濾

**現狀**：

- 假設「一個 workspace = 一個旅行社」
- `useVisibleModuleTabs('tours', TOUR_TABS)` 只按 workspace feature 過濾
- **無角色級存取控制**：Loco / 司機 / Agent 看到的內容相同

**未來會怎樣咬回來**：

- Loco 看到的 itinerary items 應該是子集（只看自己負責、不該看成本/利潤/獎金）
- 目前 `tour_itinerary_items` 無法按 `assignee_id` 粗篩（RLS 做不到）
- 多地接協作：Corner 外包給 Thai Loco、Loco 該看全部還是只泰國段？目前代碼無過濾

**緊急度**：🔴 高（SaaS 擴張會卡住）
**建議**：預留 `tour_itinerary_items.visibility_scope` 欄（JSON 定義誰看得到）、或新增 `itinerary_item_viewers` 表

---

## 總結

| #   | 項目                          | 緊急度   | 建議行動                         |
| --- | ----------------------------- | -------- | -------------------------------- |
| 1   | 結帳未完                      | 🔴 高    | 立即實作 actual_expense 寫入邏輯 |
| 2   | 公司模板                      | 🟡 中    | Roadmap 排期時確認複製流程       |
| 3   | syncToCore delete-then-insert | 🔴 臨界  | AI 重排上線前必改成軟更新        |
| 4   | 多主題展示                    | 🟡 中    | 統一元件結構 + theme prop        |
| 5   | quote v1 vs v2                | 🟡 低    | 刪除 v1                          |
| 6   | SSOT 81 列                    | 🔴 高    | 設 95 列 hard limit              |
| 7   | Hub 化                        | 🟡 中→高 | tab 上限 / plugin 機制           |
| 8   | m/ 版並存                     | 🟡 低    | 定期同步檢查                     |
| 9   | 多角色過濾                    | 🔴 高    | Loco 功能上線前預留欄位          |
