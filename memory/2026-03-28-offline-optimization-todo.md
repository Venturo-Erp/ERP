# 離線優化待辦事項

**建立日期**：2026-03-28  
**狀態**：待執行  
**優先級**：中（功能完善後執行）

---

## 核心決策

| 項目 | 決定 |
|------|------|
| 離線模式 | **只讀**（不支援離線寫入）|
| 離線時編輯 | **禁用按鈕**（不是存檔時報錯）|
| 快取儲存 | **IndexedDB**（持久化）|
| 同步策略 | **SWR**（Stale-While-Revalidate）|

---

## Phase 1：減少請求量（2-3 小時）

- [ ] Entity Hook 加 `defaultLimit: 100`
- [ ] 大表改搜尋模式：
  - [ ] `attractions`（2500+）→ 預載 20 筆 + 搜尋
  - [ ] `customers`（會成長）→ 預載 50 筆 + 搜尋
  - [ ] `hotels`（成長中）→ 預載 20 筆 + 搜尋
  - [ ] `restaurants`（成長中）→ 預載 20 筆 + 搜尋
- [ ] 資源面板已完成 ✅（2026-03-28）

---

## Phase 2：靜態資料長快取（1-2 小時）

- [ ] `countries` → TTL 24h, staleTime 1h
- [ ] `cities` → TTL 24h, staleTime 1h
- [ ] `regions` → TTL 24h, staleTime 1h
- [ ] `airports` → TTL 24h, staleTime 1h
- [ ] 修改 `createEntityHook` 支援 cache config

---

## Phase 3：IndexedDB 持久化（4-6 小時）

- [ ] 安裝 `idb-keyval`
- [ ] 建立 `usePersistedSWR` hook：
  ```tsx
  // 概念
  const { data } = useSWR(key, fetcher, {
    fallbackData: await idbGet(key),  // 先讀本地
    onSuccess: (data) => idbSet(key, data),  // 成功後存本地
  })
  ```
- [ ] 改造 Entity Hook 使用 `usePersistedSWR`
- [ ] 測試：重新整理後不閃白

---

## Phase 4：離線狀態 UI（2-3 小時）

- [ ] 建立 `useOnlineStatus` hook
- [ ] 建立 `OfflineBanner` 組件（頂部黃色提示條）
- [ ] 離線時禁用的按鈕：
  - [ ] 所有「新增」按鈕
  - [ ] 所有「編輯」按鈕
  - [ ] 所有「刪除」按鈕
  - [ ] 所有「儲存」按鈕
- [ ] 禁用時顯示 tooltip：「離線中，無法執行此操作」

---

## Phase 5：監控與優化（1-2 小時）

- [ ] 設定 Supabase usage 監控
- [ ] 追蹤 metrics：
  - 每日讀取量
  - 快取命中率
  - IndexedDB 大小
- [ ] 建立告警：讀取量 > 100k/天

---

## 預估總工時

| Phase | 工時 | 依賴 |
|-------|------|------|
| Phase 1 | 2-3h | 無 |
| Phase 2 | 1-2h | 無 |
| Phase 3 | 4-6h | 無 |
| Phase 4 | 2-3h | Phase 3 |
| Phase 5 | 1-2h | Phase 3 |
| **總計** | **10-16h** | |

---

## 不做的事項（已排除）

- ❌ 離線寫入（衝突處理太複雜）
- ❌ Supabase Realtime 訂閱（暫時不需要）
- ❌ Service Worker 完整 PWA（過度設計）

---

## 參考文件

- `docs/DATA_LOADING_ARCHITECTURE.md`
- Apollo Client Normalized Cache
- SWR Best Practices

---

**下次執行時**：從 Phase 1 開始，逐步推進
