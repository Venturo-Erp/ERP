# 頁面設計說明書 · `/dashboard` 儀表板

> 版本：v2.0 · 2026-04-28（全面重寫，同步實際狀態）
> v1.0 是 2026-04-18 cron auto-gen，已大量過時

---

## 1. 存在理由

登入後的預設頁。顯示可自訂的小工具牆，讓員工快速存取常用功能。

---

## 2. 目前小工具清單（2026-04-28 確認）

| 小工具 | 用途 | 誰可以用 |
|--------|------|---------|
| 打卡 | 上下班打卡 | 所有人 |
| 計算機 | 計算 | 所有人 |
| 便條紙 | 個人備忘 | 所有人 |
| Amadeus 驗證碼 | Amadeus 系統 OTP | 所有人（自行選用）|

**注意**：舊版 blueprint 說 12 個 widget，清理後只剩 4 個。

---

## 3. 資料契約（2026-04-28 DB 驗證）

| 來源 | 用途 |
|------|------|
| `user_preferences` 表 | 儲存已選 widget + 排序（主要來源）|
| localStorage | 備份 / 未登入時的備援 |
| `notes` 表 | 便條紙 widget 的讀寫 |
| `ref_airports` | 航班搜尋（注意：屬於 tours 功能，flight-actions.ts 放錯了位置）|
| `ref_airlines` | 同上 |

**無 DB 寫入（此頁本身）**：widget 設定透過 `user_preferences` 表存，不是直接在 dashboard page 寫。

---

## 4. 設計決策

| 決策 | 說明 |
|------|------|
| Widget 設定存 DB | 用 `user_preferences` 表，登入才同步（舊版只存 localStorage）|
| localStorage 保留 | 未登入或 DB 失敗時的備援 |
| 拖曳排序 | dnd-kit，長按 500ms 觸發（避免誤觸）|
| isAdmin 過濾已移除 | 舊版有個只有 admin 才看的特殊 widget，已砍。現在 4 個 widget 所有人都能用 |

---

## 5. 架構注意事項

**flight-actions.ts 位置問題（低優先）**：
- 現在放在 `features/dashboard/actions/flight-actions.ts`
- 但實際上被 tour form 的航班搜尋功能使用
- 應該移到 `features/tours/` 或 `lib/`，但不緊急，功能正常

---

## 6. 技術債（2026-04-28）

| # | 問題 | 嚴重度 |
|---|------|--------|
| 1 | flight-actions.ts 放在 dashboard 但實際是 tours 的功能 | 🟢 低（功能正常，只是位置怪）|
| 2 | selectedStats 在 use-stats-data.ts 定義但無人讀取 | 🟢 低（dead code，待清除）|
| 3 | Amadeus 驗證碼 widget 目前所有人都看得到，考慮是否需要限制 | 🟡 待 William 決定 |

---

## 完成清單

- ✅ Widget 設定從 localStorage 升級到 `user_preferences` DB 存儲
- ✅ isAdmin 過濾 dead code 移除（2026-04-28）
- ✅ 只剩 4 個有效 widget（清理後）

---

> 下一個路由：`/tours`
