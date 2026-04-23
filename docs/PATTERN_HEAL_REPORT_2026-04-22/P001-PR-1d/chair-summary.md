---
pattern: P001 PR-1d
date: 2026-04-22
chair: 主 Claude（Opus 4.7）
agents: senior-developer / code-reviewer / minimal-change / security-engineer
status: 等 William 拍板（階段 1 vs 階段 2 vs DEFER）
---

# P001 PR-1d 主席彙整

## 一句話

**原本以為是 19 處短路直接刪、拔了才發現底下權限系統缺 3 塊基建；直接拔會讓 Corner 系統主管自己被系統擋在外面。建議 Plan C：先補底盤、再拔前端。**

## 4 幕僚立場整理

| 幕僚 | 核心判斷 | 激進 ↔ 保守 |
|---|---|---|
| Senior Dev | 預設修法可行、4 點有爭議（A2 空 if / A5 admin 是否有 manage_members / A11 保守版 / B8 不該套 canAccess） | 偏激進 |
| Code Reviewer | **3 致命落差** — F1 useRolePermissions 空殼、F2 useTabPermissions fetch 的 admin early return、F3 B8 降 granularity | 偏保守（否決多處） |
| Minimal-Change | 13 可改 / 3 小心 / 3 DEFER（A2 空 if、A11 hasPermissionForRoute、A6 ModuleGuard）；禁 FinanceGate 抽象；不准順手刪 isAdmin destructure | 最保守 |
| Security | **2 CRITICAL** — S1 settings.tenants/premium 沒 seed 會 系統主管白屏、S2 canEdit loading 放行 + 後端寫 API 無 role guard = TOCTOU 可提權 | 紅線最硬 |

## 合流：3 塊底盤缺失（拔前端之前必補）

### 1. admin 的 permission row 沒補齊（S1 CRITICAL）
- `20260422150000` backfill 漏 `settings.tenants` 與付費 module（ai_bot / workspace / customers 等）
- 拔 isAdmin 短路後、Corner 系統主管 進 `/tenants` 會被自己的 RBAC 擋
- **阻斷上線**、必修

### 2. `useRolePermissions` 是空殼（F1 CRITICAL）
- `src/lib/permissions/hooks.ts:241-271`：`permissions` 永遠 `[]`、`canRead/canWrite` 預設 `true`
- 等於 `canAccess()` 目前只檢 workspace_features、沒檢 user role
- B1-B7 改 canAccess 後、**會計職務可以進 `/finance/settings`（原本 admin-only）**
- 必須先把 useRolePermissions 接到真實 `role_tab_permissions` 查詢

### 3. useTabPermissions 的 admin early-return（F2 CRITICAL）
- `useTabPermissions.tsx:53-59`：若 `roleData.is_admin` 就 `setPermissions([])` early return
- 拔了 A7-A10 的 `if (isAdmin) return true` 後、admin 的 permissions 陣列是空的、canRead/canWrite 永遠 false
- **admin 全站白屏**
- 必須同 commit 改 fetch 邏輯（admin 也走正常 fetch 路徑）

## 次要問題（可階段 2 一起修）

- **B8 WorkspaceSwitcher 不是 RBAC、是平台管理資格 功能**（跨租戶切換）— 維持 `isAdmin` 檢查、detector 加例外；3 位幕僚一致
- **A2 sidebar:522 空 if 塊** — 改 `if (isTransport && !isAdmin)` 語意一致消 pattern，或直接 DEFER（minimal-change 傾向 DEFER）
- **5 個 finance page 不准抽 FinanceGate 共用元件**（Surgical）
- **不准順手刪 isAdmin destructure / import**（Surgical）
- **S5 pathname 污染** — B1/B2 layout 改 canAccess 時傳**硬編 route**、不傳 pathname
- **hasPermissionForRoute legacy 'admin'/'*' fallback** — 拔了 isAdmin 短路後變隱形提權、建議同 commit 刪（或保守版僅刪 if、留 legacy fallback 到 follow-up）

## 建議 3 條路（Plan A/B/C）

### Plan A — 全推（激進）
今天 1.5 人日同 commit 改：3 塊底盤 + 19 處前端短路。
- 風險：影響面大、regression 機率高、type-check 難一次過
- 不建議

### Plan B — 分段但半套（折衷但差）
今天只拔「純 UI 顯示層」短路：A1 mobile-sidebar, A3/A4 sidebar 3 處。
- 優點：0 風險
- 缺點：底盤問題未解、detector 還是 fail、B 全部不動、PR-1d 不完成
- 不建議（做半套不如不做）

### Plan C — 先底盤、後前端（**推薦**）
**階段 1（今天 3-4 小時）**：只補底盤、完全不碰 19 處前端短路
- 補 `settings.tenants` + premium module permission row（新 migration）
- `useRolePermissions` 實作：真查 `role_tab_permissions`
- `useTabPermissions` fetch 改：admin 也走正常 fetch 不 early return
- 新增測試：admin 能進 `/tenants` / 沒有系統主管資格 被正確擋

**階段 2（階段 1 驗收後、~1 人日）**：拔 19 處短路
- 11 處 hook 短路：A1, A3-A5, A6, A7-A10, A11（minimal-change 建議 A11 保守版僅刪 if）
- 7 處 layout/page 大鎖 → canAccess(硬編 route)
- B8 WorkspaceSwitcher 不動、detector 加例外
- A2 空 if 塊：合併到 sidebar 重構 follow-up issue

**階段 2 完成後 detector 才可 pass、pattern map 才升 🟢**。

## 主席判定

**推 Plan C**。理由：
- Plan A 踩 S1/F2 兩個 CRITICAL 地雷
- Plan B 不解底盤、滾雪球失效
- Plan C 兩階段清晰、每階段 type-check 可單獨驗、regression 可分段抓

若 William 同意 Plan C、**現在先做階段 1**、階段 2 等階段 1 驗收後**再開一次 heal session** 才動（確保 William 再點頭一次）。

## 對 pattern-map 的附註

本次 heal 發現 pattern-map 對 P001 的「統一修法」敘述太樂觀（以為「拔短路 + backfill 54 row」就結束），實際**還需接 useRolePermissions 空殼 + useTabPermissions admin early return 兩塊**。階段 1 / 2 完成後、pattern-map 回寫時應 append 此發現到「修法演進紀錄」。
