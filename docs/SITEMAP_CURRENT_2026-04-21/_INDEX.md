# Venturo ERP 現況地圖（2026-04-21）

7 個平行 subagent 掃完全站 ~127 頁、每頁一行摘要、各模組概念段、每頁紅旗清單。
目的：給 William 逐頁討論的錨點、取代過時的 VENTURO_SITEMAP_FULL。

---

## 七大模組速覽

| # | 模組 | 頁數 | 核心概念 | 主要紅旗 |
|---|---|---|---|---|
| 01 | [會計 + 財務](./01-accounting-finance.md) | 24 | 會計 = 傳票記帳；財務 = 請款收款；金流雙軌但**同步機制不明** | 未完成功能多（checks 空陣列、vouchers 反沖函數空）；傳票 vs 收付款單同步邏輯模糊 |
| 02 | [人資](./02-hr.md) | 16 | my-* 員工自助 vs 非 my-* 管理後台、權限分離乾淨 | payslip / roles 欄位並存過渡期（2026-04-18 未完）；missed-clock / overtime 管理員判斷複製貼上 |
| 03 | [業務核心](./03-biz-core.md) | 10 | inquiries（詢價）→ customized-tours（客製模板）→ tours（成行）→ orders（訂單） | 客製景點庫無 useMemo；tab 參數未驗證；PNR 匯入邏輯未抽 hook |
| 04 | [供應商 + 客戶 + 資料庫](./04-suppliers-customers-db.md) | 19 | database/* = 主檔黃頁、supplier/* = 工作檯；customers/companies = B2B 客戶、workspaces = 多租戶帳號 | attractions 曾崩潰硬限 100 筆；archive 級聯刪除複雜；transportation-rates 硬編 500 筆 |
| 05 | [基礎建設](./05-infra-settings.md) | 20 | settings / tools / design 三套分工**有疊層**；design 實際已廢棄重導 | receipt-test 硬編樣本上線；flight-itinerary / hotel-voucher 是設計驗證工具不是生產頁；tools/reset-db 危險但無二次驗證；settings/company 一頁塞太多職能 |
| 06 | [週邊](./06-misc.md) | 13 | 加值（AI / 行銷 / 監控 / war-room）+ 操作（簽證 / esim / 檔案）+ 資料定義（brochure / channel）+ 租戶管理 | brochure vs brochures 並存；monitoring iframe + 統計全硬編；war-room untyped；tenants/[id] 密碼明文警告框（安全） |
| 07 | [對外 + Mobile](./07-public-mobile.md) | 25 | 三軌道：(public)/p/* 新 C 端售票、public/* 舊工具問卷、m/* 行動版 | /m/* 資料夾存在但內容不明、定位未定；landing vs / 入口兩份 |

**總計：約 127 頁**

---

## 跨模組共通問題（放一起看才看得出來）

### A. 「未完成功能」散落各處
- checks 查詢空陣列（會計）
- vouchers 反沖函數為空（會計）
- Meta 機器人佈局完整但實裝未見（ai-bot）
- monitoring iframe + 統計全硬編（週邊）
- war-room 表 untyped（週邊）
- tools 裡多個測試工具混在生產環境（基礎建設）
- m/* 定位不明（對外）

**模式**：有路由、有 UI 骨架、沒實裝。產品看起來比實際完成度高。

### B. 「並存過渡期」未收尾
- brochure（redirect）vs brochures（新）並存
- payslip allowance_details vs meal_allowance 並存
- roles role_id 新舊版並存（標註 2026-04-18 統一過渡期）
- settings / tools / design 三套設定入口分工不清

**模式**：改版寫了新的、沒下架舊的。技術債在欄位、命名、路由三個層次都有。

### C. 「跨模組同步機制」口說無憑
- 收款單 → 傳票：settings 可綁科目、但自動產生邏輯未體現
- customized-tours → tours：有「升級成行」概念、但轉換點不明
- inquiries → customized-tours：有引用欄位、實際流程不清
- visas → orders / tours：審核狀態機存在、跨模組觸發點不明

**模式**：業務流串連處、都靠「看得到但說不出」的約定。缺乏資料契約。

### D. 「安全與硬編」
- tenants/[id] 密碼明文警告框
- tools/reset-db 有 isAdmin 但無二次驗證
- attractions 硬限 100 筆
- transportation-rates 硬限 500 筆
- monitoring 硬編 localhost:19000 / :3100

**模式**：防護用 config 做的多、用 schema/driver 做的少。

### E. 「程式碼重複」
- missed-clock / overtime 兩個檔都手刻「找管理員」查詢
- settings/company 一頁含基本資料 + 部門 + 團控 + 旅行屬性
- ImageUploadField 在多頁重複實作

**模式**：沒建立共用層、每頁自己 copy。

---

## 建議逐頁走訪順序（和 William 一起討論用）

> **不是建議修復順序、只是討論順序**。QC 不做修、討論完 William 決定哪些開 cleanup-council。

**第一輪（業務流骨幹、最影響信任感）**：
1. `/inquiries` — 詢價入口、整個業務流起點
2. `/customized-tours` + `/customized-tours/[id]` — 客製報價
3. `/tours` + `/tours/[code]` — 成行團主檔
4. `/orders` — 訂單
5. `/confirmations` + `/confirmations/[id]` — PNR 確認單

**第二輪（金流、會計財務交界）**：
6. `/finance/requests` + `/finance/payments` — 請款 / 收款
7. `/accounting/vouchers` — 傳票
8. `/accounting/period-closing` — 結帳
9. `/finance/travel-invoice/*` — 旅行社發票

**第三輪（主檔類）**：
10. `/customers` + `/customers/companies` — 客戶
11. `/database/suppliers` vs `/supplier/*` — 供應商兩套？
12. `/database/workspaces` vs `/tenants/[id]` — 租戶兩套？

**第四輪（對外、客戶觸點）**：
13. `/(public)/p/*` — 新 C 端入口
14. `/public/*` — 舊工具 / 報價問卷
15. `/m/*` — 行動版定位

**第五輪（基礎建設 / 雜項、可延後）**：
16. `/settings/*` vs `/tools/*` — 三套設定
17. `/war-room` + `/monitoring` — 管理儀表板疊層
18. `/hr/*` — 人資（獨立、模組內部乾淨）

---

## 不在這張地圖裡的東西

- **API route handlers** — 這次只掃 page.tsx、未掃 src/app/api/
- **Server actions / DB triggers** — 未掃 supabase/migrations
- **Background jobs / cron** — 未掃
- **共用 components** — 未掃 src/components/
- **hooks / stores** — 未掃 src/hooks、src/store

**如果要更深的地圖**：逐頁走訪時、哪頁覺得有疑問、那頁再深挖（走 `venturo-page-qc` skill）。
