# Wave 2.5：RLS FORCE 體檢分析

**產出時間**：2026-04-21 00:30
**狀態**：分析完成、**等 William 授權執行**

---

## 發現

28 張 public schema 的表設定 `FORCE ROW LEVEL SECURITY`（等同 2026-04-20 workspaces 登入 bug 的同類問題）。

### Bug 機制

當 FORCE RLS 且 policy `roles={public}`：
- `service_role` 也受 RLS policy 管
- Policy 內用 `get_current_user_workspace()` 取 auth.uid() 的 workspace
- Service role **沒有** auth.uid() → 函式回傳 NULL
- 所有 `workspace_id = NULL` 都是 false → **全擋**
- API route 用 admin client 查 → 空結果 → 看起來像資料遺失

### 28 張中槍表（優先度）

**🔴 高（API 常用、會爆）**：
```
tour_itinerary_items      — 行程核心表、每個團務頁都讀
confirmations             — 確認單
files / folders           — 附件系統
visas                     — 簽證
```

**🟡 中（可能爆、看 API 寫法）**：
```
accounting_accounts / accounting_entries / accounting_subjects
attractions / attraction_licenses
company_assets / companies
channel_members
esims
```

**🟢 低（admin 操作為主）**：
```
michelin_restaurants / premium_experiences
payment_request_items
selector_field_roles / supplier_categories
tour_confirmation_items / tour_confirmation_sheets
tour_itinerary_days
tour_leaders / tour_role_assignments / tour_room_assignments / tour_rooms
workspace_modules / workspace_selector_fields
```

---

## Policy 驗證（前 5 張抽檢）

所有 policy 都是 `roles={public}` + `qual=(workspace_id = get_current_user_workspace())`。
**沒有 service_role 例外**。

例（`confirmations`）：
```sql
POLICY confirmations_select: public, SELECT
  USING (workspace_id = get_current_user_workspace())
```

→ Service role 查這張會空結果（和 workspaces 舊 bug 一模一樣）。

---

## 建議修法

### 方案 A：全 28 張 `NO FORCE`（推薦）

```sql
ALTER TABLE public.accounting_accounts NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_entries NO FORCE ROW LEVEL SECURITY;
-- ... 28 條
```

**好處**：
- 和 4-20 修 workspaces bug 同策略（`workspaces` 也是 NO FORCE）
- Supabase 官方建議：**不要** FORCE RLS
- 一般 user 還是被 RLS 管（policy 還在）
- service_role 恢復繞過（這就是它本來該有的行為）

**風險**：**零資料動作**、只改表 metadata。

### 方案 B：保留 FORCE、每條 policy 加 service_role 例外

```sql
ALTER POLICY confirmations_select ON public.confirmations
  USING ((workspace_id = get_current_user_workspace()) OR (auth.role() = 'service_role'));
-- ... × 每條 policy × 28 張 = 約 100+ 條修改
```

**好處**：語意更明確
**壞處**：修改量 28 倍、容易漏、還是會有 admin client 路徑上遇到 bug

### 方案 C：只修優先 5 張

先修 🔴 5 張（tour_itinerary_items / confirmations / files / folders / visas）、其他保留觀察。

**好處**：最小改動、逐步驗證
**壞處**：剩 23 張還是定時炸彈、上線後遇到 bug 才修

---

## 我的建議

**方案 A（全 28 張 NO FORCE）**、原因：
1. 和 workspaces 修復策略一致（連貫）
2. 動作極小（28 條 ALTER、純 metadata）
3. 零資料影響
4. 一次解決 28 個潛在 bug、不用以後一個一個踩雷
5. Supabase 官方就推薦這樣

## 執行需 William 授權

動作：
```sql
-- 會在一個 migration 或 API batch 跑
ALTER TABLE public.accounting_accounts NO FORCE ROW LEVEL SECURITY;
... × 28
```

**等你說「全跑」或「只修 5 張」或「今天不動」**。
