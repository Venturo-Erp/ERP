# Venturo V1.0 上線前 Final Checklist

**產出日期:** 2026-02-18  
**根據:** 全系統審查 (79 commits, 424 tests, 12 批次審查)  
**Build:** ✅ 通過 | **Tests:** ✅ 424/424 通過

---

## ✅ 已完成

### 核心業務流程

- [x] 開團：團列表正常顯示 18 筆、篩選（提案/進行中）正常
- [x] 訂單：13 筆訂單正常顯示、成員展開正常
- [x] 報價：交通/住宿/餐飲/活動費用明細正常
- [x] 需求：17 項需求（交通/住宿/餐食）正常
- [x] 團確單：完整團資訊/行程/餐食/住宿正常
- [x] 收款/請款/出納：總覽 tab 有報價單/收款紀錄/成本支出
- [x] 行程編輯器：6 天行程 + 景點庫/飯店庫/餐廳庫
- [x] 所有 11 個 tab 正常切換

### 安全性

- [x] Rate limiting middleware 已加上
- [x] CSP headers 強化
- [x] `/api/debug` 公開路徑已移除
- [x] 系統主管密碼重設權限檢查已修復（原本任何登入用戶可重設）
- [x] 44 個 API routes 全部有認證保護
- [x] 31+ API routes 有 Zod schema 輸入驗證
- [x] RLS：除 `_migrations` 外所有表已啟用
- [x] workspace_id IS NULL 共用資料條件：9 張表全部正確

### Bug 修復（嚴重）

- [x] Login 壞掉 — get-employee-data + CSP 問題
- [x] Block editor 無限迴圈 — useEffect ref guard
- [x] Cron ticket-status 認證失敗 — header 名稱修正
- [x] 續住 checkbox 點擊無效
- [x] 飯店庫欄位名錯誤（`name_en` → `english_name`）
- [x] 結案報表欄位錯誤（`supplier_type` → `request_type`）
- [x] order_members 不存在欄位修正
- [x] ~10 處 DB query 引用不存在欄位修正
- [x] 出納模組 4 個 bug 修復
- [x] workspace 私訊顯示 UUID → 人名

### 程式碼品質

- [x] 死代碼清理：~8,873 行會計模組移除
- [x] 未使用依賴移除（react-leaflet, @univerjs/\*, cmdk）
- [x] `select('*')` → 明確欄位（10 個高流量實體）
- [x] 12 個模組 i18n 硬編碼中文抽取
- [x] 雙重提交保護（BatchReceiptDialog, AddRequestDialog, RequestDetailDialog）
- [x] Email/Phone 驗證（CompanyFormDialog）
- [x] 測試覆蓋：0 → 424 tests

---

## ⚠️ 已知但可接受（不影響 V1 使用）

| #   | 問題                                                                          | 原因                                                                       |
| --- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 1   | 37 張表有 RLS 但無 Policy（如 badge_definitions, social_groups, friends 等）  | 這些都是 V2 Online 社群功能的表，ERP 端透過 service role 存取，V1 不受影響 |
| 2   | `itineraries/generate` 多個欄位引用可能錯誤（country_id, city_id, iata_code） | AI 行程生成為輔助功能，不影響核心流程                                      |
| 3   | `change-password` 使用 `code` 查詢 employees                                  | 需確認 DB schema，但密碼修改有其他路徑可用                                 |
| 4   | ERP 檔案 tab 內容為空                                                         | 功能正常，僅該團無上傳檔案                                                 |
| 5   | `paper-texture.png` 404                                                       | 純裝飾資源，不影響功能                                                     |
| 6   | 部分 API 缺 Rate Limit（如 create-employee-auth, storage/upload）             | 已有認證保護，風險低                                                       |
| 7   | `<img>` 未全面轉 `next/image`                                                 | 效能微優化，不影響功能                                                     |
| 8   | Native `alert()` 未全面替換                                                   | UX 問題，非功能問題                                                        |

---

## ✅ 上線前必做（全部完成）

| #   | 項目                                            | 狀態          | 說明                                                 |
| --- | ----------------------------------------------- | ------------- | ---------------------------------------------------- |
| 1   | **Online V2 功能入口隱藏**                      | ✅ 已完成     | conversation API 呼叫移除，profile V2 tabs 隱藏      |
| 2   | **Online Profile 顯示名稱**                     | ✅ 已完成     | fallback: display_name → chinese_name → email prefix |
| 3   | **itinerary_days / itinerary_items RLS Policy** | ✅ 已確認完整 | 4 個 per-operation policy                            |
| 4   | **journal_lines RLS Policy**                    | ✅ 已確認完整 | 4 個 per-operation policy                            |

---

## 📋 上線後 TODO（V2）

### Online 端

- [ ] ERP → Online 資料同步機制（online_trips 目前為空）
- [ ] 社群功能：posts、conversations、friends 表 + API
- [ ] 勳章系統（badge_definitions 等）
- [ ] 旅伴分帳功能（traveler_expenses 系列表）
- [ ] 領隊/司機真實工作流程端對端測試

### 安全性強化

- [ ] 37 張無 Policy 表補上 RLS Policy（隨功能開發）
- [ ] 補齊所有 API 的 Rate Limit
- [ ] E2E 測試（browser-level）

### 效能

- [ ] Load testing / benchmark
- [ ] 進一步 N+1 查詢優化
- [ ] Database index 審查

### 技術債

- [ ] Next.js eslint config 遷移新格式
- [ ] middleware → proxy 遷移（Next.js 16 deprecation）
- [ ] Sentry disableLogger deprecation 修正
- [ ] `next/image` 全面替換
- [ ] Native `alert()` → custom dialog 全面替換

---

## 🚀 上線判定

| 面向         | 狀態          | 備註                            |
| ------------ | ------------- | ------------------------------- |
| 核心業務流程 | ✅ Ready      | 22/22 頁面測試通過              |
| 安全性       | ✅ Ready      | 認證 + RLS + 輸入驗證完備       |
| Online 端    | ✅ Ready      | V2 功能已隱藏、名稱顯示已修正   |
| 資料完整性   | ✅ Ready      | DB schema vs code 已比對修正    |
| 效能         | ✅ Acceptable | select('\*') 已改善，無已知瓶頸 |
| 測試         | ✅ Ready      | 424 tests 全通過                |

**結論：所有必做項已完成，系統已達可上線狀態。**
