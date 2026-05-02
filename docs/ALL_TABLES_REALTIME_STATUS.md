# Venturo 所有資料表 Realtime 狀態分析

> **分析日期**: 2025-10-30
> **總表格數**: 50 個

---

## 📊 表格分類

### ✅ 已支援 Realtime（使用 createStore）- 20 個

#### 業務實體（13 個）

1. **tours** - 旅遊團 ✅
2. **orders** - 訂單 ✅
3. **quotes** - 報價單 ✅
4. **customers** - 客戶 ✅
5. **itineraries** - 行程表 ✅ (使用 useItineraryStore)
6. **payment_requests** - 請款單 ✅
7. **disbursement_orders** - 出納單 ✅
8. **receipt_orders** - 收款單 ✅
9. **visas** - 簽證 ✅
10. **suppliers** - 供應商 ✅
11. **regions** - 地區 ✅
12. **calendar_events** - 行事曆 ✅
13. **todos** - 待辦事項 ✅

#### 子實體（3 個）

14. **members** - 團員 ✅
15. **quote_items** - 報價項目 ✅
16. **tour_addons** - 加購項目 ✅

#### Workspace 系統（2 個）

17. **channels** - 頻道 ✅ (Phase 2)
18. **messages** - 訊息 ✅ (Phase 3)

#### 其他（2 個）

19. **employees** - 員工 ✅
20. **templates** - 範本 ✅

---

### ⚠️ 未支援 Realtime（未使用 createStore）- 30 個

#### Workspace 相關（5 個）

1. **workspaces** - 工作空間
2. **workspace_items** - 工作空間項目
3. **channel_groups** - 頻道群組
4. **channel_members** - 頻道成員
5. **bulletins** - 公告

#### 訂單 & 團員相關（3 個）

6. **order_members** - 訂單團員
7. **tour_members** - 旅遊團團員
8. **tour_refunds** - 旅遊團退款

#### 財務相關（10 個）

9. **payments** - 付款記錄
10. **receipts** - 收款記錄
11. **receipt_payment_items** - 收款項目
12. **disbursement_requests** - 支出請求
13. **payment_request_items** - 請款項目
14. **transactions** - 交易記錄
15. **accounting_entries** - 會計分錄
16. **accounts** - 會計科目
17. **budgets** - 預算
18. **categories** - 分類

#### 報價 & 價格相關（3 個）

19. **quote_versions** - 報價版本
20. **quote_categories** - 報價分類
21. **price_list_items** - 價目表

#### 預付款相關（2 個）

22. **advance_lists** - 預付款列表
23. **advance_items** - 預付款項目

#### 訂單分享（1 個）

24. **shared_order_lists** - 分享訂單列表

#### Timebox 相關（4 個）

25. **timebox_schedules** - Timebox 排程
26. **timebox_weeks** - Timebox 週
27. **timebox_boxes** - Timebox 盒子
28. **timebox_blocks** - Timebox 區塊

#### 其他（2 個）

29. **activities** - 活動
30. **rich_documents** - 富文本文檔
31. **personal_canvases** - 個人畫布
32. **syncqueue** - 同步佇列（系統用）

---

## 🎯 優先級分類

### 🔴 高優先級（需要立即支援 Realtime）- 10 個

**多人協作、經常變更的資料**：

1. **channel_members** - 頻道成員（多人加入/離開）
2. **bulletins** - 公告（需即時推送）
3. **order_members** - 訂單團員（多人編輯）
4. **tour_members** - 旅遊團團員（多人編輯）
5. **payments** - 付款記錄（財務即時更新）
6. **receipts** - 收款記錄（財務即時更新）
7. **advance_lists** - 預付款列表（多人查看）
8. **shared_order_lists** - 分享訂單列表（多人協作）
9. **activities** - 活動（行程規劃）
10. **workspaces** - 工作空間（團隊設定）

---

### 🟡 中優先級（建議支援 Realtime）- 12 個

**偶爾多人存取的資料**：

11. **workspace_items** - 工作空間項目
12. **channel_groups** - 頻道群組
13. **tour_refunds** - 旅遊團退款
14. **disbursement_requests** - 支出請求
15. **payment_request_items** - 請款項目
16. **receipt_payment_items** - 收款項目
17. **transactions** - 交易記錄
18. **quote_versions** - 報價版本
19. **quote_categories** - 報價分類
20. **price_list_items** - 價目表
21. **advance_items** - 預付款項目
22. **timebox_schedules** - Timebox 排程

---

### 🟢 低優先級（可選）- 8 個

**系統用或個人專用資料**：

23. **accounting_entries** - 會計分錄（個人記帳）
24. **accounts** - 會計科目（設定類）
25. **budgets** - 預算（設定類）
26. **categories** - 分類（設定類）
27. **timebox_weeks** - Timebox 週
28. **timebox_boxes** - Timebox 盒子
29. **timebox_blocks** - Timebox 區塊
30. **rich_documents** - 富文本文檔
31. **personal_canvases** - 個人畫布
32. **syncqueue** - 同步佇列（系統用，不需要）

---

## 📈 統計

| 分類                  | 數量   | 百分比   |
| --------------------- | ------ | -------- |
| ✅ 已支援 Realtime    | 20     | 40%      |
| 🔴 高優先級（需支援） | 10     | 20%      |
| 🟡 中優先級（建議）   | 12     | 24%      |
| 🟢 低優先級（可選）   | 8      | 16%      |
| **總計**              | **50** | **100%** |

---

## 🚀 建議行動

### Phase 5: 高優先級表格（10 個）

建議優先改造這 10 個表格：

```typescript
// 在 src/stores/index.ts 加入：

// Workspace 系統
export const useWorkspaceItemStore = createStore<WorkspaceItem>('workspace_items')
export const useChannelMemberStore = createStore<ChannelMember>('channel_members')
export const useChannelGroupStore = createStore<ChannelGroup>('channel_groups')
export const useBulletinStore = createStore<Bulletin>('bulletins')

// 團員管理
export const useOrderMemberStore = createStore<OrderMember>('order_members')
export const useTourMemberStore = createStore<TourMember>('tour_members')

// 財務即時
export const usePaymentStore = createStore<Payment>('payments')
export const useReceiptStore = createStore<Receipt>('receipts')

// 協作功能
export const useAdvanceListStore = createStore<AdvanceList>('advance_lists')
export const useSharedOrderListStore = createStore<SharedOrderList>('shared_order_lists')
export const useActivityStore = createStore<Activity>('activities')
```

**預估工作量**: 2-3 小時
**影響**: +10 個表格支援 Realtime
**完成後覆蓋率**: 60% (30/50)

---

## 💡 實作方式

### 選項 A：使用 createStore（推薦）✅

**優點**：

- 自動獲得 Realtime
- 零額外代碼
- 統一架構

**實作**：

```typescript
export const useChannelMemberStore = createStore<ChannelMember>('channel_members')
```

### 選項 B：手動加入 Realtime

**適用於**：有複雜邏輯的 store（如 manifestation-store）

**實作**：

```typescript
// 在現有 store 中加入
useEffect(() => {
  realtimeManager.subscribe({
    table: 'table_name',
    handlers: { ... }
  });
}, []);
```

---

## ⚠️ 注意事項

### Realtime 連線數限制

```
目前: 18 個表格 × 40 使用者 = 720 個連線
免費上限: 200 個連線

如果全部 50 個表格:
50 × 40 = 2000 個連線 ⚠️ 超標 10 倍
```

### 建議策略

1. **按需訂閱** - 只訂閱當前頁面使用的表格
2. **優先級訂閱** - 重要表格永遠訂閱，次要表格按需
3. **延遲訂閱** - 頁面載入後才訂閱
4. **取消訂閱** - 離開頁面時取消

---

## 🎯 結論

你說得對！不只 18 個表格，而是 **50 個表格**。

目前狀態：

- ✅ **20 個表格**已支援 Realtime（40%）
- ⚠️ **30 個表格**尚未支援（60%）

建議：

1. 優先完成 **10 個高優先級表格**（Phase 5）
2. 逐步加入 **12 個中優先級表格**（Phase 6）
3. 低優先級表格可以暫緩

**準備開始 Phase 5 嗎？** 🚀
