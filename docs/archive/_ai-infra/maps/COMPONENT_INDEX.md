# Component Index

> 各 feature module 的元件數量與結構概覽

---

## Feature Modules (by size)

| Module               | Components | 說明                                        |
| -------------------- | ---------- | ------------------------------------------- |
| tours                | 112        | ⚠️ 最大模組。團管理、團員、行程、需求、確認 |
| quotes               | 42         | 報價單、版本、項目、PDF                     |
| designer             | 34         | 手冊設計器（16 元件 × 2 風格）              |
| orders               | 25         | 訂單 CRUD、成員、護照                       |
| proposals            | 19         | 提案、轉團                                  |
| hr                   | 19         | 人事、出勤、請假、薪資                      |
| finance              | 18         | 收款、請款、報表                            |
| dashboard            | 13         | 儀表板 widget                               |
| tour-confirmation    | 12         | 團確單                                      |
| todos                | 12         | 待辦事項                                    |
| attractions          | 12         | 景點資料庫                                  |
| visas                | 11         | 簽證管理                                    |
| disbursement         | 10         | 出納                                        |
| calendar             | 9          | 日曆                                        |
| office               | 8          | 辦公室                                      |
| transportation-rates | 6          | 交通費率                                    |
| files                | 6          | 檔案管理                                    |
| contracts            | 6          | 合約                                        |
| scheduling           | 5          | 排程                                        |
| itinerary            | 5          | 行程（主要邏輯在 tours 裡）                 |

**Total: 261 components across 35 features**

---

## ⚠️ 巨獸警告

### tours（112 元件）

這是系統最大最複雜的模組。改動前務必：

1. 讀 DOMAIN_RULES.md 的「出團」章節
2. 確認影響範圍（grep 所有 import）
3. 注意 tours 表沒有 sales_rep / op 欄位

### quotes（42 元件）

報價邏輯複雜（成人/兒童/嬰兒定價、版本管理）。
改定價邏輯前必讀 DOMAIN_RULES.md「報價」章節。
