# 02 — Backend Architect / DB 架構師 診斷

## 身份宣告

我是 Backend Architect、專攻 schema、constraint、trigger、ACID。這份只談骨頭（表結構 / 約束 / 觸發 / 交易），不談前端 UX。四個設計原則（人 / 職務 / 租戶 / 狀態）裡、本次 focus 在 **原則 2（職務全系統統一）+ 原則 3（租戶一致性三層都守）**。

---

## Pattern 清單（含事實佐證）

### P1. SSOT 分裂：兩表互不知道彼此（critical）

- `workspace_features`（PK=id, UNIQUE=`(workspace_id, feature_code)`、FK → workspaces CASCADE、RLS 用 `get_current_user_workspace()` 過濾）
- `role_tab_permissions`（PK=id, UNIQUE=`(role_id, module_code, tab_code)`、FK → workspace_roles RESTRICT、**RLS policy USING `true`（完全開放）**）
- 兩表在 DB 層**沒有任何 FK / constraint / trigger 連接**
- 也沒有單一真實源（single source of truth）定義「某個 tab 屬於某個 module」
- 應用層兩本常數 `FEATURES` / `MODULES` 分別餵這兩張表、結構不同（MODULES 有 tabs hierarchy、FEATURES 是 flat routes 陣列）

### P2. UNIQUE constraint 有 NULL 漏洞（high）

- `role_tab_permissions.tab_code` nullable（模組級權限用 `null` 代表「整個 module」）
- Postgres UNIQUE 對 NULL 視為 distinct（ANSI 標準）→ 理論上可塞入兩筆 `(role_A, 'calendar', NULL)`
- 目前資料乾淨（我查過、無重覆），但這是**靠應用層 delete-then-insert 維持**、不是 DB 守門
- 根因：module-level 與 tab-level 權限混在同一張表、用 NULL 區分；這個選擇讓 UNIQUE 守不住

### P3. workspace_features 命名空間碰撞（high）

- 同一張表塞兩種語意：module 開關（`accounting`）+ tab 開關（`accounting.vouchers`）
- 用 `.` 分隔是 application-level convention、DB 不知道
- 真實資料已經如此：2035d43b... 這個 workspace 有 `accounting=false` 但 `accounting.reports=false`、`accounting.vouchers=false` 全部展開
- 沒有 CHECK constraint 禁止新增任意 `feature_code`、拼寫錯誤會安靜寫入

### P4. role_tab_permissions RLS 洞開（high）

- 4 個 policy 全部 `USING true` / `WITH CHECK true`
- 等於**沒有 RLS**：任何登入員工可讀任何租戶的權限表
- workspace_features RLS 有做對（用 `get_current_user_workspace()`）
- 同一個病、兩張表待遇不同、明顯是歷史債

### P5. 無 cascade、無 audit trail（high）

- 關 `workspace_features` 裡某個 feature 時、對應的 `role_tab_permissions` rows 不會自動清
- 重開這個 feature 時、舊的 role permission 仍然在 → 「舊職務幽靈復活」
- 沒有 `enabled_by` / `enabled_at` 以外的變更歷史（feature 表有、permission 表連這兩欄都沒有）
- `role_tab_permissions.role_id` FK ON DELETE **RESTRICT**、刪職務前必須先手動清權限（這是 over-engineered、soft-delete 系統用 CASCADE 更乾淨）

### P6. Seeding 分散三處、不收斂（medium）

- `POST /api/workspaces`（lines 137-197）：走 `getBasicFeatures()` + `MODULES` 直接展開
- `POST /api/tenants/create`（lines 489-553）：用 hardcoded `freeFeatures` 陣列 + `MODULES` 展開、**和 workspaces 路徑的邏輯不同**
- 登入 `validate-login`：從 `role_tab_permissions` 簽 JWT、假設資料已就位
- 三個入口無共用函式、新加 module / tab 要改三個地方（光這次 itinerary 清除就只改 FEATURES 忘改 MODULES）

### P7. 雙層檢查無交集（critical、架構層）

- 使用端：`isFeatureEnabled` 查 `workspace_features`（租戶級）+ JWT role permission（職務級）**做 AND**
- DB 層：兩表無關聯、只有應用層知道「關 feature 要不要同步關 permission」
- 後果：關掉 feature → UI 隱藏 → 但 API / JWT 仍然簽入 permission → 後端 RLS policy 若有 bug 就穿透
- 這是**四層防線漏第 4 層（DB trigger）**

---

## 演進建議（schema / constraint / trigger）

### 建議 A：不合表、但建立 SSOT 中介表（推薦）

**不建議**把兩表合成一張（不同生命週期、不同 actor：workspace owner 開 feature vs role 系統主管 設 permission）。

**建議**：新增一張 `module_registry` 當 SSOT、取代兩本常數檔：

```sql
CREATE TABLE public.module_registry (
  code TEXT PRIMARY KEY,
  parent_code TEXT REFERENCES module_registry(code) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('module', 'tab', 'eligibility')),
  category TEXT NOT NULL DEFAULT 'basic' CHECK (category IN ('basic', 'premium', 'enterprise')),
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 把 feature_code / module_code / tab_code 都指向這裡
ALTER TABLE workspace_features
  ADD CONSTRAINT workspace_features_feature_code_fkey
  FOREIGN KEY (feature_code) REFERENCES module_registry(code) ON DELETE RESTRICT;

ALTER TABLE role_tab_permissions
  ADD CONSTRAINT role_tab_permissions_module_code_fkey
  FOREIGN KEY (module_code) REFERENCES module_registry(code) ON DELETE RESTRICT;
-- tab_code 建議拆成獨立 nullable FK 指 module_registry（kind='tab'）
```

Payoff：拼錯 feature_code 寫不進去、`module_registry` 新增 row 即是「新模組上線」、seeding 邏輯退化成「讀 registry 拉出全部 code」一行。

### 建議 B：Cascade trigger（解 P5）

```sql
CREATE OR REPLACE FUNCTION sync_role_perms_on_feature_disable()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.enabled = false AND OLD.enabled = true THEN
    -- 把該 workspace 底下所有 role 在此 feature 的 permission 關掉（保留 row 做審計）
    UPDATE role_tab_permissions p
    SET can_read = false, can_write = false, updated_at = now()
    FROM workspace_roles r
    WHERE p.role_id = r.id
      AND r.workspace_id = NEW.workspace_id
      AND (
        p.module_code = NEW.feature_code  -- module-level
        OR p.module_code = split_part(NEW.feature_code, '.', 1)  -- tab-level
           AND p.tab_code = split_part(NEW.feature_code, '.', 2)
      );
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_workspace_features_sync_perms
AFTER UPDATE OF enabled ON workspace_features
FOR EACH ROW EXECUTE FUNCTION sync_role_perms_on_feature_disable();
```

**Race condition 處理**：

- 用 `AFTER UPDATE` + `SECURITY DEFINER` bypass RLS（trigger 是系統級操作）
- 同一 transaction 內看得到變更、自動 ACID
- 新 workspace seeding 在自己的 tx 內跑、看不到其他 workspace 的 trigger、無衝突
- William 要「關 feature 不自動恢復」= 關掉時改 permission、重開時 **不** 自動恢復（trigger 只在 false 時動）、人工重新 grant

### 建議 C：權限表 RLS 補齊（解 P4）

`role_tab_permissions` 沒有 `workspace_id` 欄位、但可透過 role 聯查：

```sql
DROP POLICY role_tab_permissions_select ON role_tab_permissions;
CREATE POLICY role_tab_permissions_select ON role_tab_permissions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspace_roles r
    WHERE r.id = role_tab_permissions.role_id
      AND r.workspace_id::text = get_current_user_workspace()::text
  ) OR is_super_admin()
);
-- INSERT / UPDATE / DELETE 同理
```

### 建議 D：API contract 向後相容

現有 `/api/permissions/features`、`/api/roles/[roleId]/tab-permissions` response shape **不變**。
內部實作改成「寫入前驗 module_registry 存在」、「PUT features 時 trigger 自動同步 permissions」。
前端 isFeatureEnabled/isTabEnabled 呼叫不變、但根本上「關 feature 後 JWT 重簽就會少那個 permission」= 解 P7。

### 建議 E：Seeding 收斂

新函式 `seedWorkspaceDefaults(workspaceId, tierCodes[])`、同時被 `/api/workspaces` 與 `/api/tenants/create` 呼叫、從 `module_registry` 展開、seed 兩張表。從此「加一個新模組」= 「insert 一 row 到 module_registry」、seeding 自動涵蓋。

### 建議 F：UNIQUE constraint 修掉 NULL 漏洞

把 `tab_code NULL` 改成哨兵值 `'*'`（代表整個 module）、或拆成兩表（`role_module_permissions` + `role_tab_permissions`）、讓 UNIQUE 完全守得住。

---

## < 200 字摘要

workspace_features 與 role_tab_permissions 在 DB 層完全脫鉤：無 FK、無 trigger、後者 RLS 形同虛設（USING true）。tab_code NULL 讓 UNIQUE 有漏洞、feature_code 命名空間混裝 module/tab。建議不合表、但以新表 module_registry 當 SSOT 鎖住 feature_code / module_code 拼寫、建 AFTER UPDATE trigger 在 feature 關閉時聯動清 permission、補齊 role_tab_permissions RLS（透過 workspace_roles 聯查）、把 seeding 收斂成單一 function 共用於 workspaces/tenants 兩條建立路徑。API contract 外觀不變、內部靠 DB constraint + trigger 守門；符合原則 2 與 3。
