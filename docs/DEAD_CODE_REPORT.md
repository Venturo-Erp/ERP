# 死代碼清理報告

**生成日期**：2026-04-01
**工具**：ts-prune + GitNexus

---

## 📊 概覽

| 類別                  | 數量  | 嚴重性 |
| --------------------- | ----- | ------ |
| 未使用的 exports      | 3,482 | 🟡 中  |
| 完全未使用的 features | 3     | 🔴 高  |
| 備份檔案 (.bak)       | 3     | 🟡 中  |
| 重複的 feature 目錄   | 1 組  | 🟡 中  |

---

## 🔴 優先處理：完全未使用的 Features

這些目錄沒有任何外部引用：

### 1. `src/features/adventurer-guild/`

- **內容**：ARCHITECTURE.md, components, hooks, types, utils
- **判斷**：可能是規劃中但未實作的功能
- **建議**：確認是否需要，否則刪除

### 2. `src/features/members/`

- **內容**：components, hooks, utils
- **判斷**：可能被其他 feature 取代
- **建議**：確認是否需要，否則刪除

### 3. `src/features/proposals/`

- **內容**：空的 components 目錄
- **判斷**：剛建立但未使用
- **建議**：如果不需要就刪除

---

## 🟡 備份檔案（應刪除）

```
src/features/disbursement/components/PrintDisbursementPreview.tsx.bak
src/features/tour-leaders/components/LeaderAvailabilityDialog.tsx.bak
src/lib/pdf/disbursement-pdf.ts.bak
```

**建議**：直接刪除，Git 有歷史記錄

---

## 🟡 重複的 Feature 目錄

| 目錄                      | 引用數 | 建議          |
| ------------------------- | ------ | ------------- |
| `src/features/supplier/`  | 5      | ✅ 保留       |
| `src/features/suppliers/` | 1      | ❓ 合併或刪除 |

---

## 🟡 未使用 Exports 最多的檔案

| 檔案                         | 未使用數 | 說明                      |
| ---------------------------- | -------- | ------------------------- |
| `src/data/entities/index.ts` | 486      | barrel export，很多沒用到 |
| `src/lib/constants/index.ts` | 106      | 常數定義                  |
| `src/stores/types/index.ts`  | 71       | 型別定義                  |
| `src/services/pnr/index.ts`  | 50       | PNR 服務                  |
| `src/types/index.ts`         | 47       | 型別定義                  |

**建議**：這些是 barrel exports，可以逐步清理但不緊急

---

## 🟢 標記為 @deprecated 的檔案

需要檢查是否還在使用：

```
src/types/finance.types.ts
src/types/tour.types.ts
src/features/quotes/components/printable/shared/ (多個檔案)
src/components/ui/dialog.tsx
src/lib/permissions/hooks.ts
src/lib/tenant.ts
```

---

## 📋 清理步驟建議

### Phase 1：快速清理（5 分鐘）

1. ✅ 刪除 3 個 .bak 檔案
2. ✅ 刪除 `src/features/proposals/`（空目錄）

### Phase 2：確認後刪除（需 William 確認）

1. ❓ `src/features/adventurer-guild/` — 確認是否需要
2. ❓ `src/features/members/` — 確認是否需要
3. ❓ `src/features/suppliers/` — 確認是否與 supplier 合併

### Phase 3：逐步清理（低優先）

1. 清理 barrel exports 中未使用的項目
2. 移除 @deprecated 標記的程式碼

---

## 執行指令

```bash
# Phase 1：快速清理
rm src/features/disbursement/components/PrintDisbursementPreview.tsx.bak
rm src/features/tour-leaders/components/LeaderAvailabilityDialog.tsx.bak
rm src/lib/pdf/disbursement-pdf.ts.bak
rm -rf src/features/proposals/

# Phase 2：確認後執行
# rm -rf src/features/adventurer-guild/
# rm -rf src/features/members/
# rm -rf src/features/suppliers/
```
