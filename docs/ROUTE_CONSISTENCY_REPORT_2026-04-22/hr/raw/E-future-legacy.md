# Agent E：HR 未來影響 + 舊檔案清理

**驗證日期**：2026-04-22

---

## 未來擴展性評估

### 1. 打卡/請假/薪資能進來嗎？✅ 已預留空間

**證據**：

- `/lib/permissions/module-tabs.ts` MODULES 陣列已明確列出：
  - `{ code: 'hr', tabs: […, 'attendance', 'leave', 'payroll', …] }`
- `/features.ts` 已預定義 `/hr/attendance`、`/hr/leave`、`/hr/payroll` 路由
- `workspace_features` 表已預留對應的 feature_code
- 新租戶 seed 時已自動建立這些 tab 對應的 feature rows

**判定**：✅ 架構就緒、無障礙。新功能進來只需在 MODULES tab 配置權限。

---

### 2. 新 Partner 進入能擴展嗎？✅ 支持

**理由**：

- 權限系統採「模組 + tab」細粒度設計
- 新增 Partner 只需：
  1. MODULES 新增 tab
  2. features.ts 新增路由
  3. 建立 API endpoint
- 無硬編碼限制、無架構障礙

**判定**：✅ 多租戶擴展設計完整。

---

## 員工透明度缺口 ⚠️

### 3. 「我的職務」不可見

**位置**：`/m/profile/page.tsx`（員工自助頁）

**現象**：

- 只顯示「系統主管」標籤（if isAdmin）
- 一般員工看不到自己的角色名稱

**影響**：

- 員工無法自助確認職務
- 新員工入職後不知道自己被分配到哪個職務

**建議**：加「我的職務」欄位顯示

---

### 4. 「我的權限」無可視化

**現象**：

- 員工無任何介面查看「我有哪些模組讀寫權限」
- 只有 系統主管 在 `/hr/roles` 才能看完整矩陣

**建議**：新增 `/settings/my-permissions` 員工自助查權限頁面

---

### 5. 部門關係孤立

**現象**：

- `departments` 表存在（premium 功能）
- 但 `employees` 表無 `department_id` FK
- 員工在 settings 無法修改「我的部門」

**判定**：

- 部門系統與職務權限完全分離
- 職務用於權限、部門用於組織結構
- 需確認是否真的需要部門、還是用職務替代

**建議**：與 William 確認「部門」的商業用途

---

## 舊檔案 / 技術債掃描

### 6. TODO / FIXME / DEPRECATED 掃描 — 結果：✅ 乾淨

**掃描範圍**：

- `/src/app/(main)/hr/`
- `/src/features/hr/`
- `/src/lib/permissions/`

**發現**：

- ❌ 零 TODO / FIXME / deprecated / legacy / v1 標記
- ✅ HR 模組代碼相對乾淨

---

### 7. 孤兒表 / 欄位遺留

**workspace_job_roles** — 孤兒表、沒人呼叫  
狀態：無 TODO 標記、但應清理

**建議**：後續整理時歸檔或刪除

---

## 規範一致性檢查（CLAUDE.md 四大原則）

| 原則                 | 評分 | 說明                                                             |
| -------------------- | ---- | ---------------------------------------------------------------- |
| **Simplicity First** | 8/10 | 權限用 MODULES 陣列驅動、清晰。但員工自助功能有缺漏。            |
| **Surgical Changes** | 9/10 | 最近改動都精準（20260420 補齊 /hr 子路由清單），無順便改進。     |
| **Scalability**      | 9/10 | 模組 + tab 設計、已預留 premium category、打卡/請假/薪資能進來。 |
| **No Overdesign**    | 7/10 | 整體可、但部門系統獨立存在有輕微過度設計感。                     |

---

## 濃縮結論

**✓ 架構健康**：權限系統採模組 + tab 架構，已預留未來功能空間，新 Partner 平滑擴展。

**✗ 員工透明度缺口**：

- 員工看不到自己的職務
- 員工看不到自己的權限
- 違反「員工應能自助查詢自己的權限」原則

**~ 部門孤立**：departments 表獨立存在、未與 employees 建 FK，與職務權限體系各自為政。

**✓ 技術債輕**：HR 模組無 TODO/FIXME，代碼相對乾淨。workspace_job_roles 孤兒表後續整理。

---

## 改善優先序

| P      | 項目                                              | 為什麼        |
| ------ | ------------------------------------------------- | ------------- |
| **P1** | 員工自助頁加「職務名稱」顯示                      | 透明度        |
| **P2** | 新增 `/settings/my-permissions` 查權限頁          | 透明度 + 自助 |
| **P2** | 確認部門需求、評估是否需要與職務整合              | 避免重複概念  |
| **P3** | 歸檔 workspace_job_roles 表和 /api/job-roles 端點 | 清理孤兒      |
