# Module Registry — 唯一 SSOT、自動連動

> William 2026-05-02 拍板：所有模組設定都從 `src/lib/permissions/module-tabs.ts` 的 `MODULES` 自動展開、加新功能改一個地方就好。

---

## 概念

`MODULES` 是 ERP 唯一的「**功能註冊表**」。它定義：

- 系統有哪些**模組**（顧客、訂單、旅遊團、財務 ...）
- 每個模組有哪些**分頁**（例：旅遊團模組有「總覽」「訂單」「行程」「報價」...）
- 每個分頁是**一般功能**還是**下拉資格**還是**付費功能**（premium）

**改 MODULES 後跑 sync** → DB 自動同步：
- `role_capabilities` — HR 角色管理頁顯示對應勾選格
- `workspace_features` — 租戶管理頁顯示對應開關
- RLS policy（透過 capability-derivation 推算）
- API 守門（透過 endpoint-to-capability 推算）

---

## 加新功能流程（給未來開發者 / agent 用）

例：旅遊團要加一個「報價」分頁。

### Step 1：改 MODULES（一個地方）

```ts
// src/lib/permissions/module-tabs.ts
{
  code: 'tours',
  tabs: [
    // ...既有 tabs
    { code: 'quote', name: '報價', description: '報價計算、成本' },
  ],
}
```

### Step 2：跑 sync（一個指令）

```bash
npx tsx scripts/sync-capabilities.ts
```

Sync 會自動：
- 在 `role_capabilities` 加 `tours.quote.read` / `tours.quote.write`（admin role 自動掛）
- 在 `workspace_features` 加每個租戶的 `tours.quote` 開關（basic 預設開、premium 預設關）

### Step 3：寫 UI 跟 API（用既有 helper）

```tsx
// src/app/(main)/tours/[code]/quote/page.tsx
const { has } = useMyCapabilities()
if (!has('tours.quote.read')) return <NoPermission />
```

```ts
// src/app/api/tours/quote/route.ts
import { requireCapability } from '@/lib/auth/require-capability'

export async function GET(req: NextRequest) {
  const ctx = await requireCapability('tours.quote.read')
  if (!ctx.ok) return ctx.response
  // ...
}
```

### Step 4：寫 RLS（如果新增 DB 表）

新表的 RLS policy 用 `has_capability_for_workspace`：

```sql
CREATE POLICY "tenant_read" ON tour_quotes
  FOR SELECT TO authenticated
  USING (has_capability_for_workspace(workspace_id, 'tours.quote.read'));
```

---

## 鐵律

### ✅ 必做

- 加新模組 / 分頁 → **改 MODULES + 跑 sync**（不要直接動 DB capability codes）
- 寫 RLS → **必用 `has_capability_for_workspace`**（接 HR 顆粒度）
- 寫業務 API → **必用 `requireCapability` helper**

### ❌ 禁止

- ❌ 直接 INSERT 到 `role_capabilities` 或 `workspace_features`（繞過 sync）
- ❌ RLS policy 用 `is_admin = true` 寫死（不接 HR）
- ❌ API endpoint 用 `getServerAuth` 但漏掉 capability check（業務 endpoint 必擋）

---

## Capability code 命名規則

格式：`{module}.{tab?}.{action}`

| 例 | 意思 |
|---|---|
| `tours.read` | 旅遊團模組（任何 tab）讀 |
| `tours.quote.read` | 旅遊團模組「報價」分頁讀 |
| `tours.quote.write` | 旅遊團模組「報價」分頁改 |
| `database.customers.read` | 資料管理「顧客」讀 |
| `platform.tenants.write` | 平台「租戶管理」（漫途專用）|
| `platform.is_admin` | 平台管理員 flag（漫途專用）|

`action` 只有兩種：`read` / `write`（不細分 create/update/delete、避免太瑣碎）。

下拉資格 tab（`isEligibility=true`）只有 `.write`（勾寫入 = 出現在該下拉）。

---

## Sync script 行為

`scripts/sync-capabilities.ts`：

- **不刪 capability**（保留歷史、人工 review 後手動清）
- **不刪 workspace_features**（同上）
- **VENTURO 平台 admin** 只掛 `platform.*` capability
- **其他租戶 admin** 掛全套業務 capability（不含 `platform.*`）

跑完輸出新增了多少筆。

---

## 既有 capability 系統（Sync 接到這套）

ERP 既有：
- DB：`role_capabilities(role_id, capability_code, enabled)` — 哪個角色有哪些能力
- DB：`workspace_features(workspace_id, feature_code, enabled)` — 哪個租戶開哪些功能
- RPC：`has_capability_for_workspace(_workspace_id, _code)` — RLS / 後端用
- 前端：`useMyCapabilities().has(code)` — UI / sidebar 用

Sync 不重寫這套、只把 MODULES 變動 push 進去。

---

## 連動範圍（William 拍板的概念）

當你改 MODULES 加新分頁、自動展開：

```
你加 1 行：tours.tabs += { code: 'quote', name: '報價' }

自動連動：
  ├─ ① Sidebar：旅遊團 menu 多「報價」項目
  ├─ ② 租戶管理：每個租戶後台多「報價」開關
  ├─ ③ HR 角色管理：每個角色多「報價.讀 / 報價.寫」勾選
  ├─ ④ DB RLS：用 has_capability_for_workspace('tours.quote.read') 守
  └─ ⑤ API 守門：用 requireCapability('tours.quote.read') 守
```

加新功能成本：**1 行 MODULES + 1 個 sync 指令**。

---

## 守門

- pre-commit hook（待實作）會檢查「MODULES 改了但 sync 沒跑」
- `check-standards.sh` 會掃「RLS policy 用 is_admin = true 寫死」

---

## 歷史

- 2026-05-02：建立 MODULES + capability 系統三件套（sync script / capability-derivation / require-capability helper）
- 之前：散落手寫、沒自動連動、`workspace_features` / `role_capabilities` 跟 MODULES 不同步
