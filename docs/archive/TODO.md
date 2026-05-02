# Venturo 專案待辦清單

> **最後更新**: 2025-11-09 (兩台電腦同步版本)
> **同步方式**: Git - 請在離開前執行 `git push`

---

## 🔴 緊急任務（需立即處理）

### 1. 重設所有 API 密鑰（安全性問題）

- [ ] 重設 Supabase Personal Access Token
- [ ] 更新 `.claude/CLAUDE.md` 中的新 Token
- [ ] 更新 `~/.claude/CLAUDE.md` 中的新 Token
- [ ] 測試 Migration 執行是否正常
- **原因**: Token 已暴露在文檔中

### 2. 啟用 Timebox Mode（箱型時間）

- [ ] 修復 `timebox-store.ts` 的 TypeScript 錯誤
- [ ] 測試計時器功能
- [ ] 測試任務切換功能
- [ ] 測試統計資料顯示
- **位置**: `src/stores/timebox-store.ts`

---

## 🟡 重要任務（本週完成）

### 3. 代碼清理

- [ ] 刪除重複的 `create-store.ts`（保留 `create-store-new.ts`）
- [ ] 移除 188 個 `as any` / `as unknown` 型別斷言
- [ ] 清理未使用的 imports（使用 ESLint）

### 4. 拆分超大檔案（23 個 >500 行）

- [ ] `src/features/workspace/workspace-store.ts` (1,234 行)
- [ ] `src/features/clients/client-store.ts` (892 行)
- [ ] `src/features/itinerary/itinerary-store.ts` (756 行)
- **目標**: 每個檔案 < 300 行

### 5. Service Layer 補強

- [ ] 建立 `client-service.ts`
- [ ] 建立 `quote-service.ts`
- [ ] 建立 `contract-service.ts`
- [ ] 建立 `itinerary-service.ts`
- **目標**: 從 5 個增加到 12-15 個 services

---

## 🟢 功能開發（未來兩週）

### 6. 箱型時間 PWA 化

- [ ] 新增 Service Worker
- [ ] 新增離線快取策略
- [ ] 新增桌面通知（計時器提醒）
- [ ] 新增 manifest.json

### 7. 測試覆蓋率

- [ ] 設定 Vitest 環境
- [ ] 為 Store 工廠函數寫測試
- [ ] 為 Realtime Manager 寫測試
- **目標**: 核心功能 > 70% 覆蓋率

---

## ✅ 已完成

### 2025-11-09

- [x] 系統健檢（100% 正常）
- [x] Realtime 即時同步測試
- [x] 權限系統驗證
- [x] 雙電腦同步設定

### 2025-10-30

- [x] Phase 1-2: 可重用組件系統（-215 行代碼）
- [x] Phase 3-4: Realtime 即時同步系統
- [x] 修正所有 stores 的 setTimeout 問題
- [x] 離線優先策略 + 衝突解決

---

## 📝 筆記

### 當前工作模式

```bash
# 公司電腦（離開前）
git add TODO.md
git commit -m "chore: 更新待辦進度"
git push

# 家裡電腦（開始前）
git pull
cat TODO.md
```

### 關鍵資訊

- 專案路徑: `/Users/william/Projects/venturo-new`
- 開發端口: `3000`
- 資料庫: Supabase (pfqvdacxowpgfamuvnsn)

---

**提示**: 修改此檔案後記得提交到 Git！
