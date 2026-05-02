# 用戶數據跨裝置同步 Migration

## 概述

這個 migration 創建了三個新表格，用於實現用戶數據的跨裝置同步功能：

1. **user_preferences** - 用戶偏好設定（如小工具順序、主題等）
2. **notes** - 便條紙內容
3. **manifestation_records** - 顯化魔法練習記錄

## 如何應用 Migration

### 方式 1：使用 Supabase Dashboard（推薦）

1. 登入 Supabase Dashboard: https://app.supabase.com
2. 選擇你的專案：wzvwmawpkapcmkfmkvav
3. 進入左側選單的 **SQL Editor**
4. 點擊 **New Query**
5. 複製 `20251026040000_create_user_data_tables.sql` 的完整內容並貼上
6. 點擊 **Run** 執行

### 方式 2：使用 Supabase CLI（如果有安裝）

```bash
# 確保 Supabase CLI 已連接到遠端專案
supabase link --project-ref wzvwmawpkapcmkfmkvav

# 應用 migration
supabase db push
```

### 方式 3：手動執行（測試用）

如果你想先在本地測試，可以使用以下步驟：

```bash
# 啟動本地 Supabase（如果有安裝）
supabase start

# 應用 migration
supabase migration up
```

## Migration 內容詳解

### user_preferences 表格

用於儲存用戶的個人偏好設定：

```sql
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  preference_key TEXT NOT NULL,           -- 偏好設定的 key（如 'homepage-widgets-order'）
  preference_value JSONB NOT NULL,        -- 偏好設定的值（JSON 格式）
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, preference_key)         -- 確保每個用戶的每個 key 只有一條記錄
);
```

**用途：**

- 儲存首頁小工具的順序和啟用狀態
- 可擴展儲存其他用戶偏好（如主題、語言等）

### notes 表格

用於儲存便條紙的內容：

```sql
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  tab_id TEXT NOT NULL,                   -- 分頁 ID
  tab_name TEXT NOT NULL DEFAULT '筆記',  -- 分頁名稱
  content TEXT NOT NULL DEFAULT '',       -- 筆記內容
  tab_order INTEGER NOT NULL DEFAULT 0,   -- 分頁順序
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tab_id)                 -- 確保每個用戶的每個分頁 ID 只有一條記錄
);
```

**用途：**

- 儲存便條紙小工具的所有分頁和內容
- 支援多個分頁，每個分頁可以有自己的名稱和內容

### manifestation_records 表格

用於儲存顯化魔法的練習記錄：

```sql
CREATE TABLE manifestation_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  record_date DATE NOT NULL,              -- 練習日期
  content TEXT,                           -- 練習內容（可選）
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, record_date)            -- 確保每個用戶每天只有一條記錄
);
```

**用途：**

- 記錄用戶每天的顯化練習
- 用於計算連續練習天數（streak）
- 用於顯示每週的練習曲線

## 安全性（RLS Policies）

所有表格都啟用了 Row Level Security (RLS)，確保：

- ✅ 用戶只能查看自己的資料
- ✅ 用戶只能插入自己的資料
- ✅ 用戶只能更新自己的資料
- ✅ 用戶只能刪除自己的資料

RLS 政策使用 `auth.uid()` 和 `employees.id` 來驗證用戶身份。

## 索引

為了提升查詢效能，創建了以下索引：

```sql
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_manifestation_records_user_id ON manifestation_records(user_id);
CREATE INDEX idx_manifestation_records_date ON manifestation_records(record_date);
```

## 前端整合

Migration 應用後，以下功能會自動啟用跨裝置同步：

### 1. 小工具順序同步

- **檔案**: `src/features/dashboard/hooks/use-widgets.ts`
- **功能**: 首頁小工具的啟用狀態和順序會同步到所有裝置

### 2. 便條紙同步

- **檔案**: `src/features/dashboard/hooks/use-notes.ts`
- **功能**: 便條紙的所有分頁和內容會同步到所有裝置

### 3. 顯化魔法記錄同步

- **檔案**: `src/lib/manifestation/reminder.ts`
- **功能**: 顯化練習記錄、連續天數會同步到所有裝置

## 降級策略

所有功能都實作了降級策略：

1. **優先使用 Supabase** - 如果用戶已登入且資料庫可用
2. **降級使用 localStorage** - 如果 Supabase 不可用或發生錯誤
3. **雙向備份** - 從 Supabase 載入的資料會同步到 localStorage 作為備份

這確保即使 Supabase 暫時不可用，用戶仍然可以正常使用功能。

## 測試

Migration 應用後，可以透過以下步驟測試：

1. 登入系統
2. 在首頁調整小工具順序或寫便條紙
3. 登出
4. 在另一個裝置或瀏覽器登入同一帳號
5. 確認小工具順序和便條紙內容已同步

## 回滾

如果需要回滾這個 migration：

```sql
DROP TABLE IF EXISTS manifestation_records CASCADE;
DROP TABLE IF EXISTS notes CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;
```

⚠️ **警告**: 回滾會刪除所有用戶的同步資料，請謹慎操作！

## 問題排查

### Q: Migration 執行失敗，提示 employees 表格不存在

A: 確保之前的 migration 已經成功執行，特別是創建 employees 表格的 migration。

### Q: RLS 政策無法正常工作

A: 確認：

1. Supabase Auth 設定正確
2. 用戶的 `auth.uid()` 與 `employees.id` 一致
3. 檢查 Supabase Dashboard 的 Authentication > Users

### Q: 資料沒有同步

A: 檢查：

1. 瀏覽器 Console 是否有錯誤訊息
2. Supabase Dashboard > Table Editor 檢查資料是否已儲存
3. 確認用戶已登入（useAuthStore 的 user.id 存在）

## 後續優化

可以考慮的優化方向：

1. **實時同步**: 使用 Supabase Realtime 訂閱，實現多裝置即時同步
2. **衝突解決**: 如果同時在多個裝置修改，需要衝突解決策略
3. **離線支援**: 實作更完善的離線快取和同步佇列
4. **批次更新**: 減少不必要的資料庫寫入次數

## 聯絡資訊

如有問題，請聯絡技術團隊。
