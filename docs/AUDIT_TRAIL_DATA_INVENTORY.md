# 審計欄位資料盤點（2026-04-20）

**Scope**：`REFACTOR_PLAN_AUDIT_TRAIL_FK.md` 列出的 17 表、30 欄位
**查詢時間**：2026-04-20，prod `wzvwmawpkapcmkfmkvav`
**映射規則**：employees.user_id OR employees.supabase_user_id = col 值 → 取 employees.id

---

## 總結

- **79 row 有 `created_by / updated_by / performed_by / uploaded_by / locked_by` 值**
- **100% 可 map 到 employees**
- **0 unmappable** → 不需人工處理、Q1 決策失效
- **24 個欄位**實際是空的（沒 row 或 FK 欄位全 NULL），純 FK 約束，直接換 FK 即可

---

## 逐欄位明細

| 表 | 欄位 | total | non_null | mappable | 動作 |
|---|---|---:|---:|---:|---|
| assigned_itineraries | created_by | 0 | 0 | 0 | 只換 FK |
| confirmations | created_by | 12 | 12 | 12 | UPDATE + 換 FK |
| confirmations | updated_by | 12 | 12 | 12 | UPDATE + 換 FK |
| cost_templates | created_by | 0 | 0 | 0 | 只換 FK |
| cost_templates | updated_by | 0 | 0 | 0 | 只換 FK |
| emails | created_by | 0 | 0 | 0 | 只換 FK |
| emails | updated_by | 0 | 0 | 0 | 只換 FK |
| file_audit_logs | performed_by | 0 | 0 | 0 | 只換 FK |
| files | created_by | 1 | 0 | 0 | 只換 FK |
| files | updated_by | 1 | 0 | 0 | 只換 FK |
| image_library | created_by | 0 | 0 | 0 | 只換 FK |
| **itineraries** | **created_by** | **19** | **19** | **19** | **UPDATE + 換 FK** |
| itineraries | created_by_legacy_user_id | 19 | 0 | 0 | DROP COLUMN（Q4=A） |
| itineraries | creator_user_id | 19 | 0 | 0 | DROP COLUMN（Q4=A） |
| linkpay_logs | created_by | 0 | 0 | 0 | 只換 FK |
| linkpay_logs | updated_by | 0 | 0 | 0 | 只換 FK |
| michelin_restaurants | created_by | 26 | 0 | 0 | 只換 FK |
| michelin_restaurants | updated_by | 26 | 0 | 0 | 只換 FK |
| payment_requests | updated_by | 10 | 7 | 7 | UPDATE + 換 FK |
| premium_experiences | created_by | 80 | 0 | 0 | 只換 FK |
| premium_experiences | updated_by | 80 | 0 | 0 | 只換 FK |
| suppliers | created_by | 13 | 13 | 13 | UPDATE + 換 FK |
| suppliers | updated_by | 13 | 13 | 13 | UPDATE + 換 FK |
| todos | created_by | 5 | 2 | 2 | UPDATE + 換 FK |
| todos | updated_by | 5 | 1 | 1 | UPDATE + 換 FK |
| tour_control_forms | created_by | 0 | 0 | 0 | 只換 FK |
| tour_control_forms | updated_by | 0 | 0 | 0 | 只換 FK |
| tour_documents | uploaded_by | 3 | 0 | 0 | 只換 FK |
| tours | last_unlocked_by | 43 | 0 | 0 | 只換 FK |
| tours | locked_by | 43 | 0 | 0 | 只換 FK |

---

## 分批重估（依「最不重要先」— Q2 決策）

原計畫 Batch A–D，現依「實際資料筆數」+「業務影響」重排：

| Batch | 表 | 要改 row | 業務影響 |
|---|---|---:|---|
| **B1（最安全）** | linkpay_logs, cost_templates, emails, assigned_itineraries, tour_control_forms, file_audit_logs, image_library | 0 | 全空表，壞了也不會發現 |
| **B2** | files, tour_documents, michelin_restaurants, premium_experiences | 0 非空值 | 表有資料但 FK 欄位都 NULL |
| **B3** | tours（43/0）、todos（5 row，3 non-null） | 3 | 日常功能但 FK 欄位少用 |
| **B4** | payment_requests（7）, suppliers（26）, confirmations（24） | 57 | 財務/採購相關 |
| **B5（救火）** | **itineraries（19）** | 19 | 已爆出事、使用者直接踩到 |

Q2 要求「從最不重要先改」→ B1 → B2 → B3 → B4 → B5。
但 B5 是當下爆掉的 → 須在 B1 之前跑（救火優先於實驗）。

**修正排序**：B5 → B1 → B2 → B3 → B4（救火先、再從最低風險往高走驗證流程）

---

## 衍生決策（需 William 確認）

1. Q1（unmappable 人工查）失效 — 零 unmappable → 跳過
2. Q2（分批順序）— 建議依上表 **B5 → B1 → B2 → B3 → B4**（救火先）
3. Q4（DROP 兩個零值欄位）— Phase 2 順手做
4. 新增：**`premium_experiences` 80 row / `michelin_restaurants` 26 row 兩張表 FK 欄位全 NULL**，懷疑是 seed data 沒填作者 — 是否也要順手把這兩張表的 `created_by/updated_by` 從 FK 改為 `NOT NULL`？建議**不要**，維持 nullable 彈性
