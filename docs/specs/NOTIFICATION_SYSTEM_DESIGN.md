# Venturo 通知系統設計規格

> 參考來源：Novu（github.com/novuhq/novu, 35k+ stars）
> 設計日期：2026-04-10
> 狀態：規劃中

---

## 設計原則

1. **用 Supabase 搞定** — Realtime 做即時推送，不需額外 server
2. **漸進式** — 先做 In-App，再加 Email、LINE
3. **SaaS 友善** — workspace 隔離，每家公司獨立
4. **不過度設計** — 先做 80% 場景，不做 digest/排程

---

## 階段規劃

| 階段 | 功能 | 依賴 |
|------|------|------|
| **Phase 1** | In-App 通知（鈴鐺 + 通知列表 + 已讀） | Supabase Realtime |
| **Phase 2** | Email 通知 | Resend / SendGrid |
| **Phase 3** | LINE 通知 | 現有 LINE Bot |
| **Phase 4** | 使用者偏好設定 | Phase 1 |
| **Phase 5** | Digest（合併通知）| Phase 2 |

---

## Phase 1：In-App 通知

### DB Schema

```sql
-- 通知表
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id TEXT NOT NULL,
  
  -- 收件人
  recipient_id UUID NOT NULL,          -- employee.id（收到通知的人）
  
  -- 發送人（可選）
  actor_id UUID,                       -- 觸發通知的人
  actor_name TEXT,                     -- 快照（避免 join）
  actor_avatar TEXT,
  
  -- 內容
  type TEXT NOT NULL,                  -- 通知類型（見下方列表）
  title TEXT NOT NULL,                 -- 標題
  body TEXT,                           -- 內容
  
  -- 關聯（可選，點擊跳轉用）
  resource_type TEXT,                  -- 'tour' | 'order' | 'receipt' | 'request' | 'todo' | 'channel'
  resource_id TEXT,                    -- 關聯 ID
  resource_url TEXT,                   -- 點擊後跳轉的 URL
  
  -- 狀態
  is_read BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  
  -- 時間
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- RLS
  CONSTRAINT fk_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);

-- 索引
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_workspace ON notifications(workspace_id);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notifications_select ON notifications 
  FOR SELECT USING (workspace_id = get_current_user_workspace());
CREATE POLICY notifications_insert ON notifications 
  FOR INSERT WITH CHECK (true);
CREATE POLICY notifications_update ON notifications 
  FOR UPDATE USING (recipient_id = auth.uid() OR workspace_id = get_current_user_workspace());
```

### 通知類型

| type | 標題範例 | 觸發時機 |
|------|---------|---------|
| `receipt_confirmed` | 收款單 R01 已確認 | 會計確認收款 |
| `request_billed` | 請款單 I01 已出帳 | 出納出帳 |
| `todo_assigned` | William 指派了一個任務給你 | 待辦指派 |
| `todo_completed` | 任務「訂機票」已完成 | 待辦完成 |
| `tour_updated` | 團 NGO261017A 出發日期已變更 | 團務變更 |
| `channel_mention` | William 在 #團務討論 提到了你 | @提及 |
| `channel_message` | 新訊息在 #NGO261017A | 團頻道新訊息 |
| `request_reply` | 供應商回覆了需求單 | 廠商回覆 |
| `member_joined` | 新團員加入 NGO261017A | 團員變動 |
| `deadline_reminder` | 任務「訂機票」明天到期 | 到期提醒 |

### API

```
GET    /api/notifications              — 取得通知列表（分頁）
GET    /api/notifications/unread-count — 取得未讀數量
PATCH  /api/notifications/:id/read     — 標記已讀
PATCH  /api/notifications/read-all     — 全部標記已讀
DELETE /api/notifications/:id          — 刪除（或 archive）
POST   /api/notifications/send         — 發送通知（內部用）
```

### 前端元件

```
src/components/notifications/
├── NotificationBell.tsx          — 鈴鐺 icon + 未讀紅點（放在 header）
├── NotificationPanel.tsx         — 下拉通知列表
├── NotificationItem.tsx          — 單條通知
├── useNotifications.ts           — SWR hook + Supabase Realtime 訂閱
└── notification-helpers.ts       — 類型 → icon/顏色 對照
```

#### NotificationBell 行為
- 顯示在 header 右上角
- 紅色圓點顯示未讀數量
- 點擊打開 NotificationPanel（下拉面板）
- 用 Supabase Realtime 監聽新通知

#### NotificationPanel 行為
- 顯示最近 20 條通知
- 未讀的有淡色背景
- 點擊通知 → 標記已讀 + 跳轉到 resource_url
- 頂部有「全部標記已讀」按鈕
- 底部有「查看全部」連結

#### Supabase Realtime 訂閱
```typescript
// useNotifications.ts
supabase
  .channel('notifications')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `recipient_id=eq.${userId}`,
  }, (payload) => {
    // 更新未讀數 + 顯示 toast
    mutate() // SWR revalidate
    toast.info(payload.new.title)
  })
  .subscribe()
```

### 發送通知的 Helper

```typescript
// src/lib/notifications/send.ts

interface SendNotificationParams {
  workspaceId: string
  recipientId: string      // 收件人 employee.id
  type: NotificationType
  title: string
  body?: string
  actorId?: string         // 發送人
  actorName?: string
  resourceType?: string    // 'tour' | 'order' | ...
  resourceId?: string
  resourceUrl?: string     // 點擊跳轉
}

async function sendNotification(params: SendNotificationParams) {
  const { error } = await supabase
    .from('notifications')
    .insert(params)
  
  if (error) logger.error('Send notification failed:', error)
}

// 批量發送（通知多人）
async function sendNotifications(
  workspaceId: string,
  recipientIds: string[],
  notification: Omit<SendNotificationParams, 'workspaceId' | 'recipientId'>
) {
  const rows = recipientIds.map(id => ({
    workspace_id: workspaceId,
    recipient_id: id,
    ...notification,
  }))
  
  await supabase.from('notifications').insert(rows)
}
```

### 在哪裡觸發通知

| 觸發點 | 檔案位置 | 通知誰 |
|--------|---------|--------|
| 收款確認 | `AddReceiptDialog.tsx` 確認按鈕 | 業務 |
| 請款出帳 | `CreateDisbursementDialog.tsx` | 請款人 |
| 待辦指派 | `TodoDialog.tsx` 指派 | 被指派人 |
| 待辦完成 | `TodoItem.tsx` 勾選完成 | 建立人 |
| 團務變更 | `useTourEdit.ts` 更新 | 團控 + 業務 |
| @提及 | `ChannelChat.tsx` 發訊息 | 被提及人 |
| 供應商回覆 | `/api/public/request/[token]` | 需求單建立人 |
| 成本轉移 | `CostTransferDialog.tsx` | 目標團的團控 |

---

## Phase 2：Email 通知（未來）

- 用 Resend（$0 起，3000 封/月免費）或 SendGrid
- 每種通知類型有「是否發 Email」的設定
- Email 模板用 React Email 或 MJML
- 發送邏輯：`sendNotification()` 同時寫 DB + 呼叫 Email API

## Phase 3：LINE 通知（未來）

- 用現有 LINE Bot API
- 需要 LINE userId 跟 employee 的綁定
- 發送邏輯同上，多一個 LINE push 管道

## Phase 4：使用者偏好（未來）

```sql
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  notification_type TEXT NOT NULL,     -- 'receipt_confirmed' 等
  channel_in_app BOOLEAN DEFAULT true,
  channel_email BOOLEAN DEFAULT false,
  channel_line BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, notification_type)
);
```

---

## 跟現有系統的整合點

### Header（NotificationBell）
- 檔案：`src/components/layout/responsive-header.tsx`
- 位置：右上角，在使用者頭像旁邊

### 待辦事項（Trello 看板）
- 現有 `todos` 表已有 `assignee`、`status`、`priority`
- 只需要加看板 UI 視圖（用 @dnd-kit 拖拉）
- 指派時觸發 `todo_assigned` 通知

### 頻道（Slack）
- 現有 `channels` + `messages` 表
- 訊息裡有 @提及 → 解析提及 → 觸發 `channel_mention` 通知

---

## 不做的（避免過度設計）

- ❌ Digest/合併通知（Phase 5 再做）
- ❌ 排程通知（用現有 Vercel Cron）
- ❌ 通知模板系統（直接在程式碼裡寫）
- ❌ Webhook 通知管道（不需要）
- ❌ 獨立通知 server（用 Supabase）
