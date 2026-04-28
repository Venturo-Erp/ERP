# /dashboard — 儀表板

> 最後驗證：2026-04-28（DB 查詢 + code 閱讀）

Route：`/dashboard`
Code：`src/app/(main)/dashboard/page.tsx`（5 行，delegate 到 DashboardClient）
Feature：`src/features/dashboard/`

---

## 業務目的

登入後的預設頁。每個員工自己可以選要看哪些小工具、拖曳排序。沒有 KPI 報表、沒有跨租戶比較，就是個個人化的快速入口。

---

## 現有小工具（2026-04-28 確認）

| 小工具 | 用途 |
|--------|------|
| 打卡 | 上下班打卡記錄 |
| 計算機 | 簡易計算 |
| 便條紙 | 個人備忘，存在 `notes` 表 |
| Amadeus 驗證碼 | Amadeus 系統 OTP，員工自行決定是否開啟 |

---

## 資料來源

| 來源 | 用途 |
|------|------|
| `user_preferences` 表 | 儲存選了哪些 widget + 排序 |
| localStorage | 未登入 / DB 失敗時的備援 |
| `notes` 表 | 便條紙 widget 的讀寫 |
| `ref_airports` / `ref_airlines` | 航班搜尋用（flight-actions.ts，位置在 dashboard 但實際屬 tours）|

---

## 目前狀態

✅ 正常運作
✅ isAdmin widget 過濾 dead code 已移除（2026-04-28）
✅ useStatsData dead code 已移除（2026-04-28）

🟡 技術債（低優先）
- `flight-actions.ts` 放在 `features/dashboard/` 但實際被 tour form 使用，位置不對

---

## 下次改動前

- Amadeus 驗證碼 widget 是否要加權限限制？（目前所有人都可選用）
