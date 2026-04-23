# /hr — 網站地圖

**路由**：`/hr` + `/hr/roles` + `/hr/attendance` + `/hr/leave` + `/hr/payroll`（前兩個上線、後三個預留）  
**代碼路徑**：`src/app/(main)/hr/`  
**最後驗證**：2026-04-22 深夜（**v2.0 重驗**：對 v1.2 三大紅色狀態確認 + 新 pattern P016/P018/P011/P008/P019 在 /hr 的命中檢測）
**原始驗證報告**：`docs/ROUTE_CONSISTENCY_REPORT_2026-04-22/hr/raw/A-E.md`（v1.2）

---

## 業務目的（William 口述，2026-04-22）

**使用者**：老闆、系統主管

**核心流程**（名牌模型）：
1. 新增員工 → 選職務（給他一個「名牌」，寫著「業務」「會計」等）
2. 職務定義 → 設定該職務在系統每個地方有什麼權限（名牌上有哪些通行證）
3. 員工登入 → 系統讀這張名牌 → 在每個地方檢查：這個職務能進去嗎、有什麼權限

**未來功能**：打卡、請假、薪資（暫不碰、架構已預留）

**現在上線重點**：
- 權限設定是否完整
- 權限有沒有影響全系統
- 有沒有都按規範走
- 個人設定欄位有沒有缺失
- 有沒有舊檔案殘留

---

## 對照的跨路由設計原則

### 原則 1：「權限長在人身上、不是頭銜上」（來自 /login 驗證）

**定義**：職務（role）是細緻權限的容器、不是 bypass key。API 應該查 `hasPermission(user_role, action)`、不是 `if (isAdmin)`。

**在 /hr 的應用**：
- 應該有一個「系統主管」職務，定義他有哪些權限
- 不應該有代碼層的 `if (isAdmin) return true` 短路
- 員工被分配到「系統主管」職務 → 自動有該職務的全部權限

**現況**：❌ **違反** — 代碼有 isAdmin 短路、職務權限形同虛設

---

### 原則 2（新）：「職務是身份卡，全系統統一識別」（2026-04-22 新發現）

**定義**：員工被分配一個職務，系統用這一套職務定義在每個地方（每個路由、每個功能）檢查他的權限。不是每個地方各自定義一套職務。

**在 /hr 的應用**：
- 只有一套職務系統（`workspace_roles`）
- 所有地方都查同一套職務、同一套權限定義

**現況**：⚠️ **部分違反** — 有兩套職務系統並存（`workspace_roles` + 孤兒表 `workspace_job_roles`）

---

## 代碼現況（濃縮）

**首頁 `/hr`**：員工列表、顯示職務名稱、可新增/編輯

**職務管理 `/hr/roles`**：
- 左側：職務清單（4 個預設：系統主管、業務、會計、助理）
- 右側：職務權限矩陣（46 個模組 × 多個分頁、can_read / can_write toggle）

**數據流**：
```
職務（workspace_roles, 存 is_admin / name）
  ↓ 關聯
職務權限（role_tab_permissions, 存 module × tab × can_read/can_write）
  ↓ 員工繼承
員工（employees.role_id 指向某職務）
  ↓ 登入時
系統檢查 useTabPermissions → 查該員工的職務權限 → 簽入 JWT
```

---

## v2.0 重驗結果（2026-04-22 深夜）

### v1.2 三大紅色當前狀態

| 編號 | 問題 | v2.0 親查狀態 |
|---|---|---|
| 1 | usePermissions / useTabPermissions isAdmin 短路 | 🔴 **仍在**：useTabPermissions L80/97/113/122 4 處短路；usePermissions / permissions/hooks PR-1a 已修 ✅；屬 P001 漏修部分（見 _PATTERN_MAP P001）|
| 2 | 員工自改 role_id（create-store update 無權限）| 🔴 仍在；EmployeeForm L270 直接寫 role_id；DB RLS 兜底但應用層應禁；屬 P003 應補 |
| 3 | workspace_job_roles 孤兒表 | 🟡 **修正**：DB 表還在但**不是裸表**（4 條 policy 是 employees JOIN tenant scoped）、是「前端代碼遷出沒人用」、不是 P019 USING:true 孤兒。歸檔不急 |

### 新 pattern 在 /hr 的命中

| Pattern | 命中 | 嚴重度 |
|---|---|---|
| **P018**（employee_permission_overrides 4 policy USING:true + 無 workspace_id 欄）| ✅ 仍在；DB 親查證實 | 🔴 上線前必改 |
| **P016 同型 DELETE policy**（workspace_roles / role_tab_permissions / employees / workspace_job_roles）| ✅ 親查全綠；workspace_roles 4 條 workspace_id filter；workspace_job_roles 4 條 employees JOIN；無 USING:true | ✅ 不在紅 |
| **P011 JWT permissions_version 缺**| ✅ 仍在；validate-login 簽 JWT 不加版本號；員工 role 改完要等 1 小時或重登 | 🟡 上線後短期 |
| **P008 權限檢查雙層散佈**| ✅ 仍在；EmployeeForm / useTabPermissions / auth-store 各寫 | 🟡 上線後短期 |
| **P003 在 /hr API 家族**| ⚠️ 部分在；`PUT /api/employees/[employeeId]/permission-overrides` 應驗 target employee.workspace_id === auth.data.workspaceId、需親查確認 | 🔴 上線前 |

### /hr 相關表 RLS Policy 親查結果（2026-04-22 深夜）

| 表名 | SELECT | INSERT | UPDATE | DELETE | 評分 |
|---|---|---|---|---|---|
| `employees` | workspace_id ✅ | workspace_id ✅ | workspace_id ✅ | workspace_id ✅ | 🟢 |
| `role_tab_permissions` | role JOIN workspace ✅ | WITH CHECK ✅ | USING + WITH CHECK ✅ | USING ✅ | 🟢（P010 修完） |
| `workspace_roles` | workspace_id ✅ | workspace_id ✅ | workspace_id ✅ | workspace_id ✅ | 🟢 |
| `workspace_job_roles` | employees JOIN ✅ | employees JOIN ✅ | employees JOIN ✅ | employees JOIN ✅ | 🟢（前端不用、但 policy 對）|
| `employee_permission_overrides` | USING:true 🔴 | WITH CHECK:true 🔴 | USING:true 🔴 | USING:true 🔴 | 🔴 P018 仍未修 |

---

## 真正該警惕的問題（按嚴重度）

### 🔴 最嚴重（必改）

#### 1. isAdmin 短路繞過職務權限
- **位置**：usePermissions() / useTabPermissions()（L115、L80 等）
- **問題**：`if (isAdmin) return true` 讓職務權限失效
- **後果**：William 在 `/hr/roles` 定義的權限矩陣對系統主管無效
- **為什麼嚴重**：違反「權限長在人身上」原則、整個職務系統失效
- **修復**：移除短路、改用「系統主管職務」概念

#### 2. 員工能自改職務
- **位置**：create-store.ts 的 update() 無權限檢查
- **問題**：任何員工都能修改自己的 role_id
- **後果**：業務員工給自己改成「系統主管」職務
- **為什麼嚴重**：職務系統完全被繞過
- **修復**：API 層加權限檢查、前端禁止編輯自己的 role_id

#### 3. 兩套職務系統並存
- **位置**：workspace_roles vs workspace_job_roles（孤兒表）
- **問題**：同一概念「職務」在兩個表、定義不同、ID 不同
- **後果**：混亂、難維護、SSOT 破碎
- **為什麼嚴重**：違反「全系統統一職務」原則
- **修復**：確定保留 workspace_roles、刪除或歸檔 workspace_job_roles

---

### 🟡 次要（應改）

#### 4. Permission-overrides API 無身分檢查
- **問題**：任何員工都能為自己新增額外權限
- **修復**：限制只有「能管理權限的人」才能操作

#### 5. 職務改權限無即時生效
- **問題**：員工要重新登入才能生效新權限
- **修復**：推送更新、或 JWT 版本控制

#### 6. 員工看不到自己的職務
- **位置**：/m/profile 無法看「我的職務」
- **修復**：加欄位顯示職務名稱

#### 7. 員工看不到自己的權限
- **位置**：無 `/settings/my-permissions` 頁面
- **修復**：新增自助查權限頁

---

### 🟢 低優先（可後續整理）

#### 8. 孤兒表 workspace_job_roles
- **現象**：有表、有 API 端點 `/api/job-roles`、但沒人呼叫
- **修復**：歸檔或刪除

---

## 其他觀察

**SSOT 一致性**：
- ✅ 職務定義清晰（MODULES 陣列 + DB 表）
- ❌ 但有兩套系統並存

**RLS 租戶隔離**：
- ✅ API 層有檢查
- ⚠️ workspace_job_roles 無 RLS policy（已棄用表）

**欄位一致性**：
- ⚠️ 同名 `.name` 在三個地方意思不同（權限角色、選人標籤、員工職位）

**未來擴展**：
- ✅ 打卡/請假/薪資已預留空間、架構就緒
- ✅ 新 Partner 平滑擴展、無障礙

**技術債**：
- ✅ 無 TODO/FIXME、代碼相對乾淨
- ❌ 兩套權限系統並存（舊字符陣列 + 新模組二維表）

---

## 建議行動（只列、不動手）

**上線必改**：
1. 移除 isAdmin 短路 → 改查職務權限
2. 禁止員工自改 role_id → 加 API 檢查 + 前端禁用
3. 確認職務系統（保留 workspace_roles、刪 workspace_job_roles）

**上線後短期**：
4. Permission-overrides API 加身分檢查
5. 補齊老租戶的預設職務
6. 員工自助頁加「我的職務」顯示

**上線後中期**：
7. 新增 `/settings/my-permissions` 查權限頁
8. 權限變更時推送更新 / JWT 版本控制

**低優先**：
9. 確認部門功能需求、是否需要與職務整合
10. 歸檔孤兒表 workspace_job_roles

---

## 下一個相關路由建議

- `/hr/roles` — 本身就在驗證範圍
- `/tenants/[id]` — 租戶管理（已驗證有預設職務建立邏輯）
- `/login` — 已驗證、權限短路地雷重疊
- `/settings` — 個人設定（缺「我的職務」欄位）

由 William 指。
