# 下一步操作指南

## 📊 當前狀態

✅ **95% 完成** - 16/17 個表格已準備好 RLS

### 已完成的表格（7 個有資料）

- tours (3 筆)
- orders (2 筆)
- todos (22 筆)
- quotes (2 筆)
- calendar_events (8 筆)
- channel_groups (1 筆)
- employees (5 筆)

### 空白表格（9 個）

這些表格目前沒有資料，所以不需要處理：

- itineraries, customers, payments, payment_requests
- disbursement_orders, channels, channel_members
- personal_canvases, rich_documents

## ⚠️ 需要手動處理

### messages 表格（9 筆資料）

由於 Supabase CLI 連線問題，請在 **Supabase Dashboard → SQL Editor** 執行以下 SQL：

```sql
BEGIN;

-- 新增 updated_at 欄位（修復觸發器問題）
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 填充 workspace_id
UPDATE public.messages
SET workspace_id = (
  SELECT id FROM public.workspaces
  ORDER BY created_at LIMIT 1
),
updated_at = COALESCE(
  edited_at::timestamptz,
  created_at::timestamptz,
  now()
)
WHERE workspace_id IS NULL;

COMMIT;
```

### 驗證方式

執行完畢後，可以用以下指令驗證：

```bash
node verify-final-status.js
```

應該會看到：

```
messages: READY (9 rows, all have workspace_id)
...
Ready for RLS: 8 tables  # 從 7 變成 8
Need fixing: 0 tables     # 從 1 變成 0
```

## 📋 完成後的步驟

1. **確認所有表格都有 workspace_id** ✅
2. **建立 RLS 策略** ⏳ (下一步)
3. **測試權限隔離** ⏳
4. **測試跨公司權限** ⏳

## 🔧 可用的工具腳本

- `node verify-final-status.js` - 檢查所有表格狀態
- `node execute-rls.js` - 詳細狀態報告
- `node check-rls-status.js` - 簡易狀態檢查

## 📂 相關檔案

- Migration 檔案: `supabase/migrations/20251109210205_fix_messages_table_complete.sql`
- 狀態報告: `RLS_PREPARATION_STATUS.md`
- 工具腳本: `fix-messages-*.js`
