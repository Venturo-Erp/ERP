# VENTURO BLUEPRINT · 路由藍圖總索引

> **維護者**: William
> **最後更新**: 2026-04-18
> **用途**: 每個路由的「存在理由 + 資料契約 + 權限 + ADR + 反模式 + 擴展點」，避免未來走錯路。

---

## 🎯 Blueprint 是什麼

**不是**：API doc、schema dump、README、audit 報告

**是**：每個路由一份「設計憲法」：

1. **存在理由**（Purpose）— 這頁給誰用、解決什麼、**不**解決什麼
2. **業務流程**（Workflow）— 合法狀態轉移、典型情境
3. **資料契約**（Data Contract）🛑 — 讀寫哪些表、誰是 source of truth、幽靈欄位
4. **權限矩陣**（Permissions）— 角色 × 動作 × 條件
5. **依賴圖**（Dependencies）— 上游、下游、外部 API
6. **設計決策 ADR** — 為什麼選這個 pattern、拒絕什麼方案
7. **反模式 / 紅線** — 絕對不能做什麼
8. **擴展點** — 未來加新功能從哪接、不要再開新路由

---

## 📋 進度總表

> 狀態說明：🟢 完成、🟡 骨架有、待業務訪談補完、⚪ 未開始

| # | 路由 | 狀態 | 檔案 | Audit |
|--|--|--|--|--|
| 01 | `/login` | ⚪ | — | ✅ 有 |
| 02 | `/dashboard` | ⚪ | — | ✅ 有 |
| 03 | `/tools` | ⚪ | — | ✅ 有 |
| 04 | `/quotes` 列表 | ⚪ | — | ✅ 有 |
| 05 | `/quotes/[id]` | ⚪ | — | ✅ 有 |
| **06** | **`/quotes/quick/[id]`** | **🟡** | [06-quotes-quick.md](blueprints/06-quotes-quick.md) | ✅ |
| 07 | `/tours` 列表 | ⚪ | — | ✅ 有 |
| 08 | `/tours/[code]` | ⚪ | — | ✅ 有 |
| 09 | `/finance/requests` | ⚪ | — | ✅ 有 |
| 10 | `/finance/payments` | ⚪ | — | ✅ 有 |
| 11 | `/finance/travel-invoice` | ⚪ | — | ✅ 有 |
| 12 | `/orders` | ⚪ | — | ✅ 有 |
| 13 | `/customers` | ⚪ | — | ✅ 有 |
| 14 | `/calendar` | ⚪ | — | ✅ 有 |
| 15 | `/channel` | ⚪ | — | ✅ 有 |

---

## 🔄 寫 Blueprint 的 SOP

一份 Blueprint = 一次深挖 + 一次業務訪談：

```
1. 讀 Audit 報告             → 拿技術診斷
2. 讀 code（page + hook + component）
3. Grep 全 codebase         → 相關 pattern 還有哪在用
4. Git blame 追歷史         → 為什麼當初這樣寫
5. Supabase 讀資料          → 實際資料長怎樣
6. 寫骨架（8 節），📋 標業務問題
7. 跟 William 過業務答案     → 補 📋
8. 產出 migration / code diff → 同步修技術債
9. 新 ADR 追加進 ARCHITECTURE_DECISIONS.md
```

單份時間成本：**半天到一天**（含業務訪談 + 真修復）。

---

## 🔗 配套文件（Blueprint 會引用這些）

- [`CODE_MAP.md`](CODE_MAP.md) — 路由 → 檔案字典
- [`BUSINESS_MAP.md`](BUSINESS_MAP.md) — 業務規則索引（🚧 半成品）
- [`DB_SCHEMA.md`](DB_SCHEMA.md) — DB 表結構
- [`ARCHITECTURE_DECISIONS.md`](ARCHITECTURE_DECISIONS.md) — ADR 總表（🚧 只有 2 條）
- [`PERMISSION_MATRIX.md`](PERMISSION_MATRIX.md) — 角色權限
- [`FIELD_NAMING_STANDARDS.md`](FIELD_NAMING_STANDARDS.md) — 欄位命名
- [`../VENTURO_ROUTE_AUDIT/`](../../../VENTURO_ROUTE_AUDIT/) — Audit 原始報告（15 份）

---

## 🛑 紅線（寫 Blueprint 時 / 採納 Blueprint 時）

1. **Supabase 有資料的表、row、欄位絕對不動**
2. **migration 只寫不跑**，需 William 明確點頭才執行
3. **📋 標記的問題必須業務訪談後補齊**，不要自己猜
4. **ADR 寫了就進 ARCHITECTURE_DECISIONS.md**、不要散落在個別 Blueprint

---

## 📐 範本結構參考

看 [06-quotes-quick.md](blueprints/06-quotes-quick.md) —— 這是第一份、當範本。

格式正確後、12 路由逐一產出。
