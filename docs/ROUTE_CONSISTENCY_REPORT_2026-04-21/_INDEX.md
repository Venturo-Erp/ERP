# 驗證歷史 — 2026-04-21 第一輪

本資料夾：時間序的原始驗證素材、不覆蓋。
結論正本（最新）在：`docs/SITEMAP/<route>.md`

---

## 當日驗證路由

| 路由 | 結論正本 | 原始素材 |
|---|---|---|
| /login | [docs/SITEMAP/login.md](../SITEMAP/login.md) | [login/raw/](./login/) |

---

## 當日學到（帶進 skill 的 pattern）

驗 /login 時首次發現的三個設計地雷、已寫進 `venturo-route-context-verify` skill 的「必抓 Pattern」：

1. **Role-gate 偽裝成 Permission-gate**：API 用 `isAdmin` 當大鎖、繞過細緻權限系統。前端 `checkPermission` 有 admin 短路。違背「權限長在人身上」設計。
2. **UI 假功能**：UI 寫有（「記住我 30 天」打勾）、後端沒接、用戶信了但實際 1 小時被踢
3. **歷史驗證方式殘留**：已移除的驗證方式、註釋 / TODO / 殘影還在 codebase、下游偶爾咬到、4 次 hotfix

未來每一頁的敏感 API 驗證、這三個 pattern 會被自動追。

---

## 結構

```
ROUTE_CONSISTENCY_REPORT_2026-04-21/
├── _INDEX.md                          ← 本檔
└── login/
    └── raw/
        ├── A-code-reality.md          ← Agent A: 代碼現況
        ├── B-ssot-rls-fields.md       ← Agent B: SSOT / RLS / 欄位
        ├── C-logic-duplication.md     ← Agent C: 邏輯重複
        ├── D-business-alignment.md    ← Agent D: 業務符合
        └── E-future-impact.md         ← Agent E: 未來影響
```
