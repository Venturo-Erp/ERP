# P001 — isAdmin 短路移除 · Surgical Minimal Change 守門

## 身份宣告

我是 **Minimal Change Engineer（Surgical 守門者）**。
我的價值用「**沒寫的行數**」衡量。
P001 的修法草案看起來「只是拔 isAdmin 短路」、但已經嗅到**三個順手改陷阱**在排隊擠進這個 PR。
憲法依據：CLAUDE.md §3 Surgical Changes + `feedback_no_workarounds.md`（根因 OK）+ `feedback_code_death_verification.md`（不准順手刪 dead code）。

---

## P001 真實 scope（只能做的）

**一句話**：把「管理員」從「bypass key」變回「權限預設多的 role」、不動任何其他東西。

| 項目 | 在不在 scope | 原因 |
|---|---|---|
| ✅ `auth-store.ts:249` 拔掉 `if (get().isAdmin) return true` | 是 | P001 本尊、一行 |
| ✅ 4 支敏感 API（create-employee-auth、reset-employee-password、admin-reset-password、env）改 `hasPermission(user, action)` | 是 | P001 對應的後端面、每支 ~5-10 行 |
| ✅ DB migration：給管理員 role 的 `workspace_roles` 掛預設全權（避免拔掉短路後 admin 斷事） | 是 | 這是「讓 admin 不爆」的補償、P001 的必要配套 |
| ✅ `finance/payments/page.tsx:211` 的 `if (!isAdmin) return <Unauthorized/>` 改 `if (!hasPermission('finance.payments.view'))` | 是 | 同樣是「把 isAdmin 當大鎖」、一行改 |
| ✅ `tour-itinerary-tab.tsx:80` 的 `const canEditDatabase = isAdmin \|\| permissions.includes('database')` 改成 `hasPermission('database')` | 是 | 同 pattern、一行改、因為 admin 已有預設全權、`isAdmin \|\|` 是 P001 洞 |

**預估真實 scope**：~6 檔案 / ~20-40 行 TS + 1 支 migration、**不是** 2 人週。

---

## P001 不該包的東西（退稿清單）

若 senior-developer 草案裡出現以下任何一項、**我一律標紅否決**：

| ❌ 順手改嫌疑 | 應去處 | 否決理由 |
|---|---|---|
| ❌ 把 permission key schema 統一（`.` vs `:`） | **P007 / P008** | 這是權限系統的「模組 registry」問題、不是 isAdmin 短路問題。一碰就炸開到 11+ 檔案、爆成 2 人週 |
| ❌ 收斂 `checkPermission` / `useTabPermissions` / `usePermissions` 三個 hook 成一個 | **P008** | policy 函式統一入口是獨立 pattern、跟 P001 目標（拔短路）正交 |
| ❌ 重構 `buildUserFromEmployee` / `rolePermissions` 合併邏輯 | 不該做 | auth-store.ts 註釋說「mergePermissionsWithRoles 已移除」、這是 legacy 殘影、P001 不該動。留給 cleanup-council |
| ❌ 把 40+ 個 `isAdmin` 引用 grep 全拔 | **不該做** | 60+ 檔案裡大多數 `isAdmin` 是 UI **顯示**差異（管理員按鈕、管理員面板入口）、不是**權限決策**。拔錯會誤傷 sidebar / widget 顯示邏輯 |
| ❌ 把 finance/payments 9 個 `useCallback` 合併重構 | 不該做 | 就是 §3 Surgical 明令禁止的「while I'm here」refactor |
| ❌ 順手修 /tours accept/reject API 的職務檢查 | **P003** | 那是「跨租戶一致性驗證」、P001 是「角色 bypass」、兩個 pattern 不同 |
| ❌ 補 unit test | **P015** | pattern-map 已排 P015 為 P001/P008 前置；但不是 P001 本 PR 的工作 |
| ❌ 清 auth-store 裡「mergePermissionsWithRoles 已移除」等 TODO / 註釋殘影 | **cleanup-council** | §3「看到無關 dead code、提一下、別刪」 |
| ❌ middleware publicPaths 收緊 | **P002** | 獨立 pattern、獨立 PR |
| ❌ DB CHECK constraint for permission key format | **P007** | 跟 P001 無關、跟 module_registry 有關 |

---

## 拆 PR 建議

P001 建議拆 **3 個 PR**、總量應 < 2 人日、不是 2 人週：

### PR-1a｜auth-store isAdmin 短路移除（**最小可 ship**）

- 範圍：`src/stores/auth-store.ts:249` 拔短路 + DB migration 給管理員 role 預填全權限
- 預估：1 檔 TS（1 行改動）+ 1 檔 migration（~20 行 SQL）
- Diff size：< 30 行
- 驗收：管理員仍能正常操作（因為 DB 層預填了）、非管理員 role 的 permission 檢查生效

### PR-1b｜4 支敏感 API 改 hasPermission

- 範圍：`api/auth/create-employee-auth` / `reset-employee-password` / `admin-reset-password` / `settings/env` 四支
- 預估：4 檔 × ~5-10 行 = ~30 行
- Diff size：< 100 行
- 驗收：四支 API 都用 `hasPermission(user, specific_action)`、而不是 `if (isAdmin)`

### PR-1c｜UI 大鎖拔除（2 個點）

- 範圍：`finance/payments/page.tsx:211`（整頁 admin 擋）+ `tour-itinerary-tab.tsx:80-91`（canEditDatabase）
- 預估：2 檔 × ~2 行 = ~4 行
- Diff size：< 20 行
- 驗收：有 `finance.payments.view` 權限的非 admin 能進頁 / 有 `database` 權限的非 admin 能編輯資料庫

**三個 PR 都不互相依賴、可並行 review。如果時間緊、PR-1a 單獨 ship 就解掉大半血。**

---

## 否決項目總覽

以下我會在主席收斂時**明確標紅、要求從本次 heal 剔除**：

1. **permission key schema 統一**（.` vs `:`）→ 剔除、P007/P008 處理
2. **collapsing 三個 permission hook** → 剔除、P008 處理
3. **40+ isAdmin 一次 grep 全拔** → 剔除、只動**權限決策點**、不動 UI 顯示差異
4. **順手重構 useCallback / useMemo** → 剔除、與 P001 無關
5. **順手收 /tours accept/reject API** → 剔除、P003 處理
6. **順手清 auth-store TODO / 已移除註釋** → 剔除、cleanup-council 處理
7. **順手加 permission key CHECK constraint** → 剔除、P007 處理
8. **順手補 e2e / unit test** → 剔除、P015 處理（但建議 P015 前置先補、不在本 PR）

---

## 修法影響範圍評估

**60+ 檔案 grep 出 `isAdmin`、每個都要改嗎？**

→ **否**。分兩類處理：

1. **權限決策點**（要改）：約 8-10 個、都在本次 3 個 PR 涵蓋範圍
   - `auth-store.ts:249` checkPermission 短路
   - 4 支敏感 API（身份相關、破壞力大）
   - `finance/payments/page.tsx:211` 整頁擋
   - `tour-itinerary-tab.tsx:80` canEditDatabase
   - **其他 /finance/* + /accounting/* 頁**：盤點是否同型整頁擋、同型處理、但分到對應路由 PR 不併入 P001

2. **UI 顯示差異**（**不改**）：約 50+ 個、例如：
   - sidebar 顯示管理員專屬連結
   - dashboard widget 只給管理員看
   - settings 頁「管理員工具」區塊

   這些是「顯示層的 role-gated entry point」、不是「權限決策」。拔掉會誤傷 UX、且 P001 的定義是「移除 bypass key」、不是「消滅 isAdmin 這個詞」。留到 P008（policy 函式統一）時、由 policy 函式自己內部判斷 `isAdmin`、UI 照常呼叫即可。

**規則**：只改「用 isAdmin 短路掉 hasPermission」的地方、不改「用 isAdmin 決定 UI 顯不顯示」的地方。

---

## 既有 dead code / TODO 清理

`auth-store.ts` 有註釋：「mergePermissionsWithRoles 已移除」——這算不算本次該一起清？

**我的答案：不該**。
- §3 原則：「看到無關 dead code、提一下、別刪」
- 這行註釋是舊驗證方式殘留（屬 P013 長期架構 pattern）
- 清它要查有沒有其他地方還在 reference、要跑 gitnexus_impact、膨脹
- 留給 `venturo-cleanup-council` 專案處理（pre-launch-cleanup 已啟動）

---

## 回傳摘要（< 200 字）

**P001 真實 scope 只有 ~6 檔案 / < 50 行 TS + 1 支 migration、不是 2 人週、是 < 2 人日**。
建議拆 **3 個 PR**：PR-1a（auth-store 短路 + DB 預填）/ PR-1b（4 支敏感 API）/ PR-1c（2 個 UI 大鎖）。三個獨立、可並行 review、最小可 ship 是 PR-1a。
**否決 8 項順手改**：permission key schema 統一、hook 收斂、40+ isAdmin 全拔、useCallback 重構、/tours accept/reject、auth-store TODO 清、CHECK constraint、unit test 補。
全部丟回 P002/P003/P007/P008/P015 或 cleanup-council。
**原則**：只改「用 isAdmin 短路 hasPermission」的地方、不動「用 isAdmin 決定 UI 顯示」的地方。
**是否有否決項**：**有、8 項**。若主席收斂發現 senior-dev 草案越界、這些項目要從本次 heal 剔除。
