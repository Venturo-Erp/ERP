# /login — 登入頁

> 最後驗證：2026-04-28（雙向驗證：DB 查詢 + code 閱讀）
> 舊版報告已移至 `docs/archive/route-audits-2026-04/login-v1/v2/v3`

Route：`/login`
Code：`src/app/(main)/login/page.tsx`
API：`src/app/api/auth/validate-login/route.ts`（及其他 auth/* 9 支）
Middleware：`src/middleware.ts`（精確白名單模式）

---

## 業務目的

員工登入 Venturo ERP 的唯一入口。輸入**公司代號 + 員工編號 + 密碼**。

- 每家公司有獨立的 workspace code
- 員工由 HR 建立，不能自行註冊
- 忘記密碼由系統主管協助重設

---

## 目前真實狀態（2026-04-28 驗證）

### ✅ 正常運作

| 項目 | 驗證方式 |
|------|---------|
| 三欄位登入（代號/帳號/密碼） | UI 確認 |
| 5 次失敗鎖定 15 分鐘 | code 確認 |
| JWT session | Supabase Auth 確認 |
| 多租戶隔離（workspace code 先查） | code 確認 |
| Rate limiting（10 次/分鐘） | code 確認 |
| isAdmin 短路已全部拔掉 | 2026-04-22 修、code 確認 |
| workspaces DELETE policy | DB 確認：service_role only（安全） |
| _migrations RLS | DB 確認：2026-04-28 今晚開啟 |
| rate_limits RLS | DB 確認：2026-04-28 今晚開啟 |
| Bot 帳號封鎖 | 2026-04-28 今晚加進 validate-login |
| 強制改密碼流程（API + store + 跳轉） | 2026-04-28 今晚加 |
| Middleware 精確白名單 | 2026-04-22 修、code 確認 |

### ⏳ 待建

| 項目 | 說明 |
|------|------|
| `/change-password` 頁面（UI） | API 已在（change-password/route.ts），前端還沒建 |
| HR 建帳號時設 `must_change_password=true` | 需加進 create-employee 流程 |

### ❌ 已確認不存在（舊文件說有，實際查過沒有）

| 舊文件說 | 實際狀況 |
|---------|---------|
| 「記住我 30 天」checkbox | UI 根本沒有這個按鈕 |
| workspaces_delete USING:true 安全漏洞 | DB 查：已是 service_role only，安全 |

### 🟡 已知待修（暫不處理）

| 項目 | 說明 |
|------|------|
| `employee_permission_overrides` 無 workspace 隔離 | 中等風險，待排期修 |
| getServerAuth() .or() 查詢邏輯不精確 | 有二次驗兜住，暫可接受 |

---

## UI 結構（2026-04-28 確認）

```
登入卡片
  ├── 公司代號（大寫自動轉換）
  ├── 員工編號
  └── 密碼（可切換顯示）
  └── 登入按鈕
```

無「記住我」、無「忘記密碼」自助、無社群登入。

---

## 下次改動此頁前必確認

1. HR 建帳號流程：是否要同步設 `must_change_password = true`？（目前手動設定才有效）
2. `/change-password` 頁面 UI 什麼時候建？
3. `employee_permission_overrides` 排進哪個 sprint 修？
