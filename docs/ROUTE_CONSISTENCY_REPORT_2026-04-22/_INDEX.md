# 驗證報告 2026-04-22

**本日執行的 skill 版本**：`venturo-route-context-verify` v2.0（首次帶 DB 真相 + API/middleware）

---

## 今日驗證

| 路由 | 類型 | 狀態 | raw 位置 |
|---|---|---|---|
| `/login` | v2.0 補驗（Agent F DB 真相 + Agent G API/middleware） | ✅ 完成 | `./login/raw/` |
| `/hr` | 首驗（Agent A-E） | ✅ 完成 | `./hr/raw/` |
| `/finance/payments` | v2.0 首驗（Agent A-F） | ✅ 完成 | `./finance_payments/raw/` |
| `/tours` | v2.0 首驗（Agent A-F、6 agent 並行）| ✅ 完成 | `./tours/raw/` |

---

## 本日新加進 _INDEX 的跨路由共通問題

（全部來自 /login v2.0 補驗）

- 🔴 Middleware 公開路由清單過寬
- 🔴 Cookie / JWT / rememberMe TTL 三層不一致
- 🔴 跨租戶操作缺 workspace 一致性驗證
- 🔴 FORCE RLS + service_role 衝突（28 張表）
- 🟡 RLS policy `USING: true`（完全無過濾）
- 🟡 Unauthenticated RLS bootstrap
- 🟡 欄位識別符多重定義

詳見 `../SITEMAP/_INDEX.md` 的「跨路由共通問題」章節。

---

## 本日新 flag 的「待重驗」路由

- `/hr`：可能中「欄位識別符多重」、「FORCE RLS + service_role」、「middleware 公開清單」三個新 pattern。下次驗證建議優先。
- `/finance/payments`：候選原則 8（快速入口 ≠ 獨立資料）拍板後、要回頭確認 payments 是不是訂單頁的延伸。
- `/login` + `/hr`：候選原則 6（聚合 vs 明細分離）在員工列表、客戶列表、訂單列表適用性待驗。

## /tours 驗證帶入的新候選原則（待 William 拍板）

- 候選原則 5：核心業務事件走一張真相表（一 row 走到底）
- 候選原則 6：聚合層 vs 明細層分離
- 候選原則 7：資源類型獨立生命週期（景點外掛模型）
- 候選原則 8：快速入口 ≠ 獨立資料

詳見 `../SITEMAP/_INDEX.md` 候選原則區塊。

## /tours 驗證帶入的新共通問題

- 🔴 Delete-then-insert 破下游聯繫
- 🔴 單表擴張超寬（tour_itinerary_items 81 欄）
- 🟡 UI/API interface 漏 DB 實際欄位
- 🟡 多 UI 主題並存無文檔
- DB trigger 黑盒新增命中：/tours 7 個 tours 表 trigger

---

## DB 真相檔快照

- 310 tables / 1044 RLS policies / 273 functions / 319 triggers
- 142 可疑項（啟發式抓的、非全數需處理）
- 來源：`docs/DB_TRUTH.md`（每次 skill 執行前自動重拍）
