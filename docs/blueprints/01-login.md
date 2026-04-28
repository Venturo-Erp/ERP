# Blueprint · `/login` 登入頁

> 版本：v2.0 · 2026-04-28（全面重寫，同步實際狀態）
> v1.0 是 2026-04-18 cron auto-gen，已過時，舊報告移至 archive

---

## 1. 存在理由

員工進入 Venturo ERP 的唯一入口。公司代號 + 員工編號 + 密碼三欄位驗證。

**不解決**：SSO、手機 2FA、個人自行註冊、忘記密碼自助重設。

---

## 2. 業務流程

```
輸入公司代號 + 員工編號 + 密碼
  ↓
POST /api/auth/validate-login
  ├── 查 workspace（代號找 ID）
  ├── 查 employee（員工編號 + workspace_id）
  ├── 拒絕：is_bot=true
  ├── 拒絕：status=terminated
  ├── 拒絕：login_locked_until 還沒到期
  ├── Supabase Auth 驗密碼（signInWithPassword）
  └── 回傳 mustChangePassword + permissions

登入成功後：
  ├── mustChangePassword=true → /change-password?reason=first_login
  └── mustChangePassword=false → /dashboard（或 redirect param）
```

---

## 3. 資料契約（2026-04-28 DB 驗證）

| Table | 用途 | SELECT 欄位 |
|-------|------|-------------|
| `workspaces` | 代號找 workspace_id | id, code, name, type |
| `employees` | 驗員工身份 | id, employee_number, status, supabase_user_id, workspace_id, role_id, is_bot, must_change_password, login_failed_count, login_locked_until |
| `workspace_roles` | 查是否為管理員資格 | is_admin |
| `role_tab_permissions` | 取得功能權限清單 | module_code, tab_code, can_read, can_write |
| `auth.users` | Supabase Auth 驗密碼 | email |

---

## 4. 安全狀態（2026-04-28 DB 親查）

| 項目 | 狀態 |
|------|------|
| workspaces DELETE policy | ✅ service_role only（任何員工都不能刪公司） |
| _migrations RLS | ✅ 已開啟，service_role only |
| rate_limits RLS | ✅ 已開啟，service_role only |
| Middleware 白名單 | ✅ 精確白名單（29 EXACT + 8 PREFIX） |
| isAdmin 短路 | ✅ 全部拔掉（2026-04-22 修） |
| Bot 帳號 | ✅ 封鎖登入（2026-04-28 加） |

---

## 5. 設計決策

- **失敗訊息統一**：三種失敗（代號/帳號/密碼錯）回同一句話，防止攻擊者列舉
- **Bot 用 is_bot 判斷**：不能用角色判，bot 可能有任何角色
- **mustChangePassword 跳頁不做 Modal**：Modal 可關掉，跳頁才能強制
- **公司代號先查再驗員工**：多租戶第一層隔離

---

## 6. 技術債（2026-04-28）

| # | 問題 | 嚴重度 |
|---|------|--------|
| 1 | `/change-password` 頁面 UI 未建（API 已有） | 🟡 中 |
| 2 | HR 建帳號流程沒有自動設 must_change_password=true | 🟡 中 |
| 3 | employee_permission_overrides 無 workspace 隔離 | 🟡 中 |

---

## 完成清單

- ✅ 帳號鎖定（5 失敗鎖 15 分鐘）— 2026-04-17
- ✅ isAdmin 短路全部拔掉 — 2026-04-22
- ✅ Middleware 精確白名單 — 2026-04-22
- ✅ Bot 帳號封鎖 — 2026-04-28
- ✅ 強制改密碼流程（API+store+跳轉） — 2026-04-28
- ✅ _migrations / rate_limits RLS — 2026-04-28
- ✅ workspaces DELETE 確認安全 — 2026-04-28

---

> 下一個路由：`/dashboard`
