# P010 Security 評估報告

## 身份宣告

我是 **Security Engineer**。用威脅模型 + least privilege + defense in depth 三把尺審 P010（`role_tab_permissions` 4 條 policy 從全 `USING: true` 改為 `EXISTS(workspace_roles.workspace_id = get_current_user_workspace())`）。不動代碼、不動 DB、只評風險與 scope。

結論：**威脅模型上強烈支持本次修法**；原狀是 critical（任何登入員工跨租戶讀寫權限矩陣），修後降到可接受。但本修法**只修了三層防禦中的一層（DB RLS）**，API 層仍赤裸。

---

## 6 個安全面評估

### 1. Defense in depth 加強還是削弱？→ **加強、但仍單層**

原狀：`/api/roles/[roleId]/tab-permissions` GET/PUT（`src/app/api/roles/[roleId]/tab-permissions/route.ts`）**整支沒有任何 auth / workspace / role check**，沒驗 session、沒驗 `roleId` 屬於哪個 workspace、沒驗呼叫者擁有管理員資格。100% 依賴 RLS。而 RLS 又全開（`USING: true`）→ **零層防禦、全世界可讀寫**。

修後：DB 層嚴（EXISTS 聯查）、API 層仍 0 檢查。這是**單層 RLS**，不是 defense in depth。但至少從「0 層」升到「1 層」。修法本身**加強**、沒削弱。

建議（不在本次 scope）：P003（API 層租戶驗證）是真正的第二層，必須另案做。

### 2. Service role 使用的安全審計 → **5 處 admin client、3 處有隱憂**

本次 RLS 強化**完全繞不過** service_role（Supabase 設計）。5 個 service_role 寫/讀 `role_tab_permissions` 的點：

| 檔案                              | 行  | 動作                                      | 有無 API 層 workspace/角色驗證                                        |
| --------------------------------- | --- | ----------------------------------------- | --------------------------------------------------------------------- |
| `validate-login/route.ts`         | 161 | SELECT（讀自己登入帳號的權限）            | ✅ 透過 employee_number + password 驗身分、workspace 綁在 employee 上 |
| `tenants/create/route.ts`         | 79  | SELECT（驗 can_write settings/tenants）   | ✅ 先驗 session、讀當前 user 的 role_id、再查 → 邏輯對                |
| `tenants/create/route.ts`         | 483 | INSERT（新建租戶 seed 系統主管職務 權限） | ✅ 新 workspace、新 role_id、不污染其他租戶                           |
| `workspaces/route.ts`             | 197 | INSERT（建租戶 seed 系統主管職務）        | ⚠️ 需確認呼叫者身分檢查（未逐行讀）、但輸入同樣綁新 workspaceId       |
| `tenants/seed-base-data/route.ts` | ~31 | SELECT                                    | ⚠️ 需逐行驗                                                           |

**本次 P010 不改 service_role 使用邏輯、也不需要**。修完 RLS 後 service_role 仍可繞、但這 5 處的上游都有 workspace 綁定或建立時自決 workspaceId，**不構成跨租戶洩漏新風險**。

**警告（out of scope）**：P003（敏感 API 無租戶驗證）必須把這 5 個 service_role 點全部補一層「呼叫者的 session → workspace 一致性」檢查。本次只列警告、不改。

### 3. JWT 時間差窗口 → **是共通問題、不是 P010 獨有、out of scope**

`get_current_user_workspace()` 從 JWT claims 讀 workspace_id。員工被踢出 workspace 後、JWT 最長 1 小時仍有效、期間：

- 他仍能 SELECT / UPDATE 自己原 workspace 的 `role_tab_permissions`（新 RLS 不擋、因 JWT 還回舊 workspace）。
- 但他**不能跨到別 workspace**（新 RLS 本來就擋）。

這是**所有 workspace-based RLS 共通問題**（workspace_roles / workspace_features / 17+ 表都一樣）、不是 P010 獨有。reviewer 已指出相同點。

**明確**：這是 **P011（JWT permissions_version）** scope、不是 P010。P010 migration 不處理、不解決、不順手改 `get_current_user_workspace()` 定義。本次 PR 只接受「在報告明記此風險已知、指向 P011」這個動作。

### 4. 惡意 UPDATE 的攻擊面 → **新 RLS 擋跨租戶、但擋不住「本租戶內越權」**

情境：User A（workspace X、role=業務）呼叫 `PUT /api/roles/[A 自己 role_id]/tab-permissions`，送入 body 把自己 role 的 `settings/tenants` 設為 `can_write: true`（原本沒給）。

- 新 RLS 擋得住嗎？**擋不住**。因為 `roleId` 確實屬於 X、EXISTS 回 true、UPDATE 通過。
- 為什麼擋不住？因為 API 層沒檢查「呼叫者是否為 系統主管 / 是否有權改自己 role 的權限矩陣」。

這是 **P001（系統主管萬能）+ P003（API 無角色驗證）+ P015（無測試）複合病**、不是 P010 獨有。**P010 做完只修了「跨租戶讀寫」、沒修「租戶內越權」**。

**Out of scope、但必須在 pattern-map 註記**：修完 P010 後、`/api/roles/[roleId]/tab-permissions` 仍有 **privilege escalation via self-edit** 漏洞、風險等級 High、必須 P003 補 API 層 `canManageRoles` 檢查。

### 5. RLS performance / DoS 面 → **可接受、不需加索引**

查詢結果：

- `role_tab_permissions`：**259 rows**（全公司）、極小。
- `role_tab_permissions_role_id_module_code_tab_code_key` 是 UNIQUE index、已覆蓋 `role_id` 前綴、`.eq('role_id', ...)` 走 index scan。
- `workspace_roles.id` = PK（unique index）、EXISTS 子查詢走 PK lookup、O(1)。
- `idx_workspace_roles_workspace_id` 已存在。

EXISTS 每次 SELECT 多一次 PK lookup、對 259 rows × 幾個 User 並發的規模、**效能成本可忽略**。**不需加索引**、不需在本次 PR 動。未來成長到 10k+ rows 再評。

DoS 面：此 API 本來就非公開、只 session 後可達、rate limit 不是 P010 急迫事項。

### 6. Compliance / Audit 面 → **現狀無 audit、本次不補、列警告**

事後查「誰在 X 時間改了 role_tab_permissions」—— 目前**完全查不到**（DB_TRUTH 確認 `role_tab_permissions` 無 trigger、無 audit_logs）。修完 P010 後仍查不到。

這是 **P009（audit log）** scope、不是 P010。本次 PR 只接受：migration 開頭 / 結尾的 `SELECT ... FROM pg_policies` 輸出到 migration log 當一次性「policy 變更 snapshot」（reviewer 已提、我支持）。**不順手加 trigger**。

上線前 compliance 最低門檻（out of scope）：P009 audit log 必須涵蓋 `role_tab_permissions` 所有 INSERT/UPDATE/DELETE。

---

## 本次 PR 可順便做的項目（Security 認可）

**只有一項**、且是文件化性質、不增 blast radius：

1. Migration 結尾加 `SELECT policyname, cmd, roles, qual, with_check FROM pg_policies WHERE tablename='role_tab_permissions'` dump 到 log。既是 reviewer 的 assertion 要求、也是我的 compliance 一次性快照。

其他的全部拒絕順便做。

---

## 不能做、要另開 PR 的項目

| 項目                                                             | 對應 pattern              | 原因                                     |
| ---------------------------------------------------------------- | ------------------------- | ---------------------------------------- |
| `/api/roles/[roleId]/tab-permissions` 加 session / 系統主管 檢查 | P003                      | 是 TS code 改動、P010 scope 是 DB only   |
| `employee_permission_overrides` 同類 RLS 修復                    | P022（下次 pattern-heal） | 同病不同表、獨立 migration、獨立回歸測試 |
| JWT permissions_version / 短 TTL / session invalidation          | P011                      | 影響所有 workspace RLS、架構級改動       |
| 5 個 service_role 點加「呼叫者 workspace 一致性」驗證            | P003                      | 每個 API 都要逐行改、blast radius 大     |
| Audit log trigger on `role_tab_permissions`                      | P009                      | 獨立設計決策、trigger schema 要先定      |
| RLS integration test / privilege escalation test                 | P015                      | 測試基礎建設獨立事                       |
| 租戶內「沒有系統主管資格 不能改自己 role 權限」API 層檢查        | P001 + P003               | 需先定義 `canManageRoles` 授權模型       |

---

## 上線前前置依賴（Security 視角）

修完 P010 後、上線前**必須**完成以下才算「role_tab_permissions 這條路安全」：

1. **P003** — `/api/roles/[roleId]/tab-permissions` 加 session 驗 + `canManageRoles` API 層檢查（擋租戶內越權）。**Must-have**、單層 RLS 不夠。
2. **P022** — `employee_permission_overrides` 同樣修 RLS。**Must-have**、否則從 overrides 繞回來一樣爛。
3. **P011** — JWT 時間差緩解（短 TTL 或 version bump）。**Should-have**、可延到 GA 後第一個月。
4. **P015** — 至少一支 Playwright e2e：User A 登入、嘗試 GET/PUT workspace Y 的 role_tab_permissions、必須拿到空 / 403。**Must-have**、不然沒有 regression 保護。
5. **P009** — audit log 覆蓋權限矩陣變更。**Should-have**、合規。

順序建議：P010 → P022（同類一起）→ P003（API 層補強）→ P015（測試定型）→ P011 + P009（架構層）。

---

## 回傳摘要（< 200 字）

P010 威脅模型上**強烈支持、必須做**（從 0 層防禦升到 1 層 RLS、擋住任何登入員工跨租戶讀寫權限矩陣的 critical 漏洞）。但 scope 必須**嚴格鎖死**：只動 DB policy、不動 API code、不順手修 `employee_permission_overrides` / JWT / audit log / API 驗證。修完**仍有三個殘留風險**、都 out of scope 但必須 pattern-map 記錄：(1) 租戶內越權（User 改自己 role 權限、須 P003 補 API 層 系統主管 check）；(2) 5 個 service_role 點無呼叫者 workspace 驗證（須 P003）；(3) JWT 時間差（須 P011）。上線前 P010 + P022 + P003 + P015 四個缺一不可、P011 + P009 上線後一個月內補齊。本次 PR security 面 approve、僅加一條 `pg_policies` snapshot dump 到 migration log、其他不順手做。
