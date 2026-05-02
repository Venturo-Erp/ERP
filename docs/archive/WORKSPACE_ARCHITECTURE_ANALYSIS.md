# Workspace 工作空間架構深度分析報告

**分析日期**: 2025-11-01  
**範圍**: `src/stores/workspace/` (17 files, ~1733 lines) + `src/components/workspace/` (55 components, ~4167 lines)  
**專案**: Venturo - 旅遊團管理系統

---

## 1. 目前架構概況

### 1.1 Store 層次結構

```
src/stores/workspace/
├── 核心 Facade (混合 Zustand + createStore)
│   ├── workspace-store.ts (27 行) - createStore 基礎
│   ├── channels-store.ts (295 行) - Facade + UI 狀態 ⚠️ 超大
│   ├── chat-store.ts (249 行) - Facade + UI 狀態 ⚠️ 超大
│   ├── members-store.ts (115 行) - API 端點 + UI 狀態
│   ├── widgets-store.ts (246 行) - 整合 AdvanceList/SharedOrder ⚠️ 超大
│   ├── canvas-store.ts (121 行) - 整合 Canvas/Document
│   └── index.ts (137 行) - Unified Workspace Store Facade
│
├── 資料層 (createStore 包裝)
│   ├── channel-store.ts (30 行)
│   ├── message-store.ts (41 行) ⭐ 時間範圍快取
│   ├── channel-group-store.ts (30 行)
│   ├── channel-member-store.ts (44 行)
│   ├── advance-list-store.ts (37 行) ⭐ 時間範圍快取
│   ├── shared-order-list-store.ts (37 行)
│   ├── personal-canvas-store.ts (37 行)
│   ├── rich-document-store.ts (37 行)
│   └── utils.ts (75 行) - 資料正規化
│
└── 型別定義
    └── types.ts (175 行) - 所有接口定義
```

### 1.2 組件層次結構

```
src/components/workspace/
├── 大型組件 (200+ 行)
│   ├── RichTextEditor.tsx (396 行) ⚠️ 超大 + 複雜邏輯
│   ├── FinanceAlertDialog.tsx (325 行) ⚠️ 超大
│   ├── BulletinBoard.tsx (317 行) ⚠️ 超大
│   ├── workspace-task-list.tsx (310 行) ⚠️ 超大
│   ├── channel-view.tsx (293 行) ⚠️ 超大 + 過時
│   ├── ShareTodoDialog.tsx (282 行) ⚠️ 超大
│   ├── ShareOrdersDialog.tsx (277 行) ⚠️ 超大
│   ├── OrderListCard.tsx (233 行)
│   ├── ShareAdvanceDialog.tsx (229 行)
│   └── ... (更多大型組件)
│
├── 聊天系統
│   ├── channel-chat/
│   │   ├── useChannelChat.ts (270 行) - 5 個 useEffect
│   │   ├── ChatMessages.tsx - 消息列表
│   │   ├── ChatHeader.tsx - 頭部
│   │   └── DialogsContainer.tsx - 對話框容器
│   └── chat/
│       ├── hooks/useMessageOperations.ts (72 行) ✅ 清楚
│       └── ... (子組件)
│
├── 頻道系統
│   ├── channel-sidebar/
│   │   ├── useChannelSidebar.ts (54 行) ✅ 清楚
│   │   ├── ChannelSidebar.tsx - 側邊欄
│   │   └── ... (子組件)
│   └── channel-list.tsx (94 行)
│
└── 其他
    ├── Canvas (個人畫布系統)
    ├── Widgets (快速工具)
    └── Dialog 組件庫
```

### 1.3 核心資料流

```
使用者操作
    ↓
UI 層 (React 組件)
    ↓
Store Facade (channels-store, chat-store, etc.)
    ↓
createStore 資料層
    ├→ IndexedDB (快取層)
    └→ Supabase (雲端資料庫)
    ↓
Realtime Manager (即時同步)
```

---

## 2. 發現的問題清單（按嚴重程度排序）

### 🔴 嚴重問題（影響 10+ 檔案）

#### 1. **過度依賴 useWorkspaceStore Facade（破壞性耦合）**

- **位置**: `src/stores/workspace/index.ts` (137 行)
- **問題**:
  - Workspace Store Facade 耦合 5 個子 stores（channels, chat, members, widgets, canvas）
  - 返回 120+ 個方法，導致 prop drilling 和過度重新渲染
  - 無法進行樹搖（Tree-shake）→ 打包體積大
  - 所有組件都依賴這個「超級 store」，修改任何一個 store 都會觸發全局重新渲染
- **影響組件**: 55 個組件全部使用
- **示例**:

```typescript
// 問題：返回 120+ 個屬性
export const useWorkspaceStore = () => {
  const channelsStore = useChannelsStore()
  const chatStore = useChatStore()
  const membersStore = useMembersStore()
  const widgetsStore = useWidgetsStore()
  const canvasStore = useCanvasStore()

  return {
    workspaces,
    channels,
    channelGroups,
    selectedChannel,
    messages,
    channelMessages,
    channelMembers,
    advanceLists,
    sharedOrderLists,
    personalCanvases,
    richDocuments, // ... 100+ 更多
  }
}
```

#### 2. **頻繁的過濾+排序操作（N²效能問題）**

- **位置**: 多個檔案（chat-store, channels-store, 組件內）
- **問題**:
  - `channelMessages = messageStore.items.filter(m => m.channel_id === channelId).sort(...)`
  - 每次訊息更新都重新計算（沒有 memoization）
  - 訊息列表有 1000+ 條時，每次都是 O(n log n)
- **出現位置**:
  - `chat-store.ts:101-103` (loadMessages 後)
  - `chat-store.ts:130-132` (sendMessage 後)
  - `chat-store.ts:163-165` (updateMessage 後)
  - `chat-store.ts:176-178` (deleteMessage 後)
  - `chat-store.ts:191-192` (softDeleteMessage 後)
- **影響組件**: ChatMessages, MessageList

#### 3. **Realtime 訂閱方法形同虛設（無實現）**

- **位置**: `chat-store.ts:236-242` 和 `channels-store.ts:277-283`
- **問題**:

```typescript
subscribeToMessages: (channelId: string) => {
  // createStore handles subscriptions automatically
},

unsubscribeFromMessages: () => {
  // createStore handles unsubscriptions automatically
},
```

- 這些方法實際上什麼都不做
- 如果 createStore 沒有正確實現，會無聲地失敗
- 缺乏錯誤處理和日誌

#### 4. **過度複雜的 UI 狀態管理（Facade 過度膨脹）**

- **位置**: `channels-store.ts:17-90` 和 `chat-store.ts:17-63`
- **問題**:
  - 每個 Facade 內部都有一個額外的 Zustand store（useChannelsUIStore, useChatUIStore）
  - 這些 UI 狀態應該留給組件管理，不應該在 Store 層面
  - 導致狀態分散，難以追蹤
  - 產生重複的 state 定義（bulletins, searchQuery, selectedChannel 等）

#### 5. **缺少按需載入策略（全量快取導致內存溢出風險）**

- **位置**: `widgets-store.ts:69-75` 和 `canvas-store.ts:69-75`
- **問題**:
  - `loadPersonalCanvases()` 和 `loadRichDocuments()` 無條件調用 `fetchAll()`
  - 沒有 workspace 或 channel 篩選
  - 如果使用者有 1000+ 個畫布/文檔，全部載入到內存中
- **示例**:

```typescript
loadPersonalCanvases: async (userId?: string, workspaceId?: string) => {
  // 忽略了 userId 和 workspaceId 參數！
  await canvasStore.fetchAll() // 全量載入
},
```

---

### 🟠 重要問題（影響 3-10 檔案）

#### 6. **useChannelChat Hook 的複雜度過高（5 個 useEffect）**

- **位置**: `src/components/workspace/channel-chat/useChannelChat.ts` (270 行)
- **useEffect 數量**: 5 個
- **問題**:
  - Effect 1: 載入頻道 (line 67-72)
  - Effect 2: 選擇默認頻道 (line 74-80)
  - Effect 3: 編輯頻道時設置表單 (line 82-87)
  - Effect 4: 載入訊息和相關資料 (line 89-102)
  - Effect 5: useChatRealtime (line 64)
  - 難以跟蹤副作用依賴
  - 風險：競爭條件、無窮循環、內存洩漏

#### 7. **Direct Store Access 導致過度重新渲染**

- **位置**: `channel-chat/useChannelChat.ts:30-48` 和其他組件
- **問題**:

```typescript
const store = useWorkspaceStore(); // 返回整個 Facade
const { channels, currentWorkspace, loading, ... } = store; // 解構 50+ 屬性
```

- Zustand 會在任何屬性變更時重新渲染
- 應該使用選擇器優化（selector）
- 目前沒有使用 shallow comparison 或 memoization

#### 8. **訊息附件處理的數據轉換冗餘**

- **位置**: `utils.ts:5-69` (ensureMessageAttachments 函數)
- **問題**:
  - 對每個附件進行 7 次類型檢查（path, fileName, mimeType, fileSize, publicUrl, id）
  - 支援多種舊版格式（name, url, size, type, fileType）
  - 每次訊息操作都會執行
  - 可以預計算或在資料進入時就正規化

#### 9. **Members Store 使用 API 端點而非 createStore**

- **位置**: `members-store.ts:65-110`
- **問題**:

```typescript
// 注意：實際使用時通常透過 API endpoint 查詢（包含 profile 資訊）
const members = await fetchChannelMembers(workspaceId, channelId)
```

- 與其他 store 的實現方式不一致
- 沒有 IndexedDB 快取，離線時無法使用
- API endpoint 響應速度比 createStore 的快取層慢
- 沒有 Realtime 訂閱支援

#### 10. **RichTextEditor 的 DOM 操作過時且危險**

- **位置**: `RichTextEditor.tsx:45-100`
- **問題**:
  - 使用 `document.execCommand()` (已棄用)
  - 直接操作 innerHTML (XSS 風險)
  - 沒有狀態管理（編輯內容不在 React state 中）
  - 編輯操作無法被 Realtime 同步
  - 無法與協作編輯集成

---

### 🟡 中等問題（影響 1-3 檔案）

#### 11. **Channel View 組件已過時且應該廢棄**

- **位置**: `src/components/workspace/channel-view.tsx` (293 行)
- **問題**:
  - 與 `channel-chat/` 下的聊天組件重複功能
  - 不使用 useChannelChat Hook（自己實現邏輯）
  - 沒有整合 Realtime
  - 沒有用到 widgets 和 canvas 功能
- **應該**:
  - 完全移除或轉為已棄用
  - 所有引用應該改用 `ChannelChat` 組件

#### 12. **ChannelGroup 型別定義包含可選字段過多**

- **位置**: `types.ts:45-56`
- **問題**:

```typescript
export interface ChannelGroup {
  id: string
  workspace_id: string
  name: string
  is_collapsed: boolean | null // 為什麼是 null？
  order: number | null // 為什麼是 null？
  created_at: string | null // 應該始終有值
  updated_at?: string | null // 太多可選性
  _deleted?: boolean | null // 標記應該不是可選的
  _needs_sync?: boolean | null // 重複定義
  _synced_at?: string | null // 重複定義
}
```

- 型別定義不清晰，導致 UI 層需要大量 null 檢查
- createStore 應該提供強制的非 null 保證

#### 13. **Bulletin 狀態完全存儲在前端 UI Store 中**

- **位置**: `channels-store.ts:20` 和 `types.ts:14-29`
- **問題**:

```typescript
bulletins: Bulletin[] // ⚠️ 這是前端 UI 狀態，不是從 Supabase 同步
```

- 沒有通過 createStore 同步
- Bulletin 列表在刷新頁面後消失
- 多裝置同步不可能
- 應該是一個真正的 Supabase 表格

#### 14. **消息軟刪除邏輯不一致**

- **位置**: `chat-store.ts:184-196`
- **問題**:

```typescript
softDeleteMessage: async (messageId: string) => {
  await messageStore.update(messageId, { _deleted: true })
  // 然後在多個地方過濾掉 _deleted 訊息
},

deleteMessage: async (messageId: string) => {
  await messageStore.delete(messageId) // 硬刪除
},
```

- 兩個刪除方法混淆了概念
- 前端有時使用軟刪除，有時使用硬刪除
- 沒有統一的政策

---

### 🔵 UX/UI 可改善的地方

#### 15. **頻道搜尋和篩選未優化**

- **位置**: `channels-store.ts:269-272`
- **問題**:
  - 每次搜尋都重新計算過濾列表
  - 沒有分頁或虛擬滾動
  - 如果有 100+ 個頻道，會有卡頓

#### 16. **消息列表無虛擬滾動（超過 100 條消息性能下降）**

- **位置**: `src/components/workspace/chat/MessageList.tsx`
- **問題**:
  - 如果一個頻道有 1000+ 條消息，全部渲染會很慢
  - 應該實現虛擬滾動（windowing）
  - 可以使用 react-window 或類似庫

#### 17. **Channel 切換延遲過長（UI_DELAYS.FAST_FEEDBACK）**

- **位置**: `useChannelChat.ts:143-153`
- **問題**:

```typescript
handleChannelSwitch: channel => {
  setIsSwitching(true)
  setTimeout(() => {
    selectChannel(channel)
    setTimeout(() => setIsSwitching(false), UI_DELAYS.FAST_FEEDBACK)
  }, CHANNEL_SWITCH_DELAY)
}
```

- 不必要的雙 setTimeout
- 應該使用 useTransition（React 18+）

---

## 3. 具體的優化建議（可行性優先）

### 第一優先級：立即修復（1-2 小時）

#### 1. **修復 Realtime 訂閱空實現**

```typescript
// chat-store.ts
subscribeToMessages: (channelId: string) => {
  if (!channelId) return
  // 實際連接到 Realtime Manager
  messageStore.items$ // 訂閱資料流
    .pipe(
      filter(msg => msg.channel_id === channelId),
      distinctUntilChanged()
    )
    .subscribe(/* ... */)
},

unsubscribeFromMessages: () => {
  // 清理訂閱
  subscription?.unsubscribe()
},
```

#### 2. **優化頻繁的過濾+排序**

```typescript
// chat-store.ts
// 使用 Selector 減少重新計算
const getChannelMessages = (channelId: string) => {
  const cache = new Map()
  return (messages: Message[]) => {
    const key = `${channelId}-${messages.length}`
    if (cache.has(key)) return cache.get(key)

    const result = messages
      .filter(m => m.channel_id === channelId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

    cache.set(key, result)
    return result
  }
}
```

#### 3. **移除過時的 channel-view.tsx**

```bash
# 檔案已過時，應該刪除
rm src/components/workspace/channel-view.tsx

# 更新導入
# 搜索所有引用並改用 ChannelChat
grep -r "channel-view" src --include="*.tsx" --include="*.ts"
```

#### 4. **分離 UI 狀態和資料狀態**

```typescript
// 建立新的 useWorkspaceUI hook
export const useWorkspaceUI = () => {
  const uiStore = useChannelsUIStore() // bulletins, searchQuery, selectedChannel

  return {
    bulletins: uiStore.bulletins,
    searchQuery: uiStore.searchQuery,
    selectedChannel: uiStore.selectedChannel,
    // ...
  }
}

// Store 只返回資料
export const useWorkspaceData = () => {
  const channelsStore = useChannelsStore()
  const chatStore = useChatStore()

  return {
    workspaces: channelsStore.workspaces,
    channels: channelsStore.channels,
    messages: chatStore.messages,
    // ... (只有資料，沒有 UI 狀態)
  }
}
```

---

### 第二優先級：重構（2-4 小時）

#### 5. **實現 Members Store 的 createStore 支援**

```typescript
// members-store.ts
import { useChannelMemberStore } from './channel-member-store'

export const useMembersStore = () => {
  const memberStore = useChannelMemberStore()

  return {
    // 使用 createStore 的快取
    channelMembers: memberStore.items,

    loadChannelMembers: async (workspaceId: string, channelId: string) => {
      // 先從 IndexedDB 載入（快）
      const cached = await memberStore.fetchAll()

      // 再從 API 載入完整資料（包含 profile）
      const full = await fetchChannelMembers(workspaceId, channelId)

      // 合併結果
      return enrichMembersWithProfiles(full, cached)
    },
  }
}
```

#### 6. **為 Bulletin 實現資料庫同步**

```sql
-- 建立 bulletins 表格
CREATE TABLE public.bulletins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  title text NOT NULL,
  content text NOT NULL,
  type text NOT NULL,
  priority integer DEFAULT 0,
  is_pinned boolean DEFAULT false,
  author_id uuid NOT NULL,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- 禁用 RLS
ALTER TABLE public.bulletins DISABLE ROW LEVEL SECURITY;
```

#### 7. **實現消息分頁（而非全量載入）**

```typescript
// message-store.ts
export const useMessageStore = createStore<MessageEntity>('messages', {
  cacheStrategy: 'time_range',
  cacheConfig: {
    limit: 100, // 改為 100（初始載入）
    sortBy: 'created_at',
    order: 'desc',
  },
  enableRealtime: true,
})

// chat-store.ts
loadMessages: async (channelId: string, limit: number = 100, offset: number = 0) => {
  // 使用分頁參數
  const messages = await supabase
    .from('messages')
    .select()
    .eq('channel_id', channelId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  return messages
}
```

#### 8. **替換過時的 RichTextEditor**

```typescript
// 建議：使用 TipTap, Slate 或 Quill
// 或改用簡單的 Markdown 編輯器
import { MDXEditor } from '@mdxeditor/editor'

export function RichTextEditor({ initialContent, onSave }) {
  return (
    <MDXEditor
      markdown={initialContent}
      onChange={content => onSave(content)}
    />
  )
}
```

---

### 第三優先級：效能優化（4-8 小時）

#### 9. **實現虛擬滾動**

```typescript
import { FixedSizeList as List } from 'react-window'

function MessageList({ messages, channelId }) {
  return (
    <List
      height={600}
      itemCount={messages.length}
      itemSize={100}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <MessageItem message={messages[index]} />
        </div>
      )}
    </List>
  )
}
```

#### 10. **使用 Zustand 選擇器減少重新渲染**

```typescript
// ❌ 舊方式：監聽整個 store
const store = useWorkspaceStore()
const { channels, messages, selectedChannel } = store

// ✅ 新方式：只監聽需要的狀態
const channels = useWorkspaceStore(state => state.channels)
const messages = useWorkspaceStore(state => state.messages)
const selectedChannel = useWorkspaceStore(state => state.selectedChannel)

// 或使用自定義選擇器
const useChannelMessages = (channelId: string) =>
  useWorkspaceStore(state => state.messages.filter(m => m.channel_id === channelId))
```

#### 11. **使用 useTransition 優化頻道切換**

```typescript
import { useTransition } from 'react'

function ChannelSwitcher({ channels }) {
  const [isPending, startTransition] = useTransition()

  const handleSwitch = (channel) => {
    startTransition(() => {
      selectChannel(channel)
    })
  }

  return (
    <div>
      {isPending && <LoadingSpinner />}
      {/* ... */}
    </div>
  )
}
```

---

## 4. 架構改善建議（長期）

### 4.1 重構 Store Facade

**目前**:

```
useWorkspaceStore() 返回 120+ 個屬性
  ├─ channels (來自 useChannelsStore)
  ├─ messages (來自 useChatStore)
  ├─ members (來自 useMembersStore)
  └─ ... (更多混合)
```

**建議**:

```
分離為多個專用 Store：

  useChannelStore()
  ├─ channels: Channel[]
  ├─ channelGroups: ChannelGroup[]
  ├─ loadChannels()
  └─ ...

  useMessageStore()
  ├─ messages: Message[]
  ├─ currentChannelMessages: Map<channelId, Message[]>
  ├─ loadMessages()
  └─ ...

  useChannelMemberStore()
  ├─ members: ChannelMember[]
  ├─ loadMembers()
  └─ ...

  // UI 層 Hook（保留給組件）
  useChannelUI()
  ├─ selectedChannel
  ├─ searchQuery
  ├─ isLoading
  └─ ...
```

### 4.2 統一資料層實現

- **Members Store**: 改用 createStore（已有 channel-member-store.ts）
- **Bulletins**: 改用 Supabase 表格 + createStore
- **所有表格**: 統一使用 createStore + IndexedDB + Realtime

### 4.3 改進 Realtime 訂閱管理

```typescript
// 新的 useRealtimeSubscription Hook
export function useRealtimeSubscription(tableName: string, filters?: Record<string, unknown>) {
  const store = useStore(tableName)

  useEffect(() => {
    // 自動訂閱進入視口的資料
    const subscription = realtimeManager.subscribe({
      table: tableName,
      filter: filters,
      onChange: data => store.updateItems(data),
    })

    return () => subscription.unsubscribe()
  }, [tableName, filters])
}

// 使用
function ChannelChat({ channelId }) {
  useRealtimeSubscription('messages', { channel_id: channelId })
  // 自動同步該頻道的消息
}
```

---

## 5. 檔案大小總結

| 類別              | 檔案數 | 總行數    | 平均行數 | 說明                        |
| ----------------- | ------ | --------- | -------- | --------------------------- |
| Store Facades     | 5      | ~1200     | 240      | ⚠️ 過大，應拆分             |
| Store 資料層      | 9      | ~300      | 33       | ✅ 合理（都用 createStore） |
| 組件 (200+ 行)    | 8      | ~2400     | 300      | ⚠️ 超大，應拆分             |
| 組件 (100-200 行) | 25     | ~1500     | 120      | ✅ 可接受                   |
| 組件 (< 100 行)   | 22     | ~900      | 41       | ✅ 良好                     |
| **總計**          | **55** | **~4167** | **76**   | 需要重構                    |

---

## 6. 執行計劃建議

### Week 1: 緊急修復

- [ ] 修復 Realtime 訂閱空實現 (2h)
- [ ] 移除過時的 channel-view.tsx (0.5h)
- [ ] 創建 Bulletins 表格 + migration (1h)

### Week 2: Store 重構

- [ ] 分離 useWorkspaceUI() 和 useWorkspaceData() (3h)
- [ ] 實現 Members Store createStore 支援 (2h)
- [ ] 優化訊息過濾+排序邏輯 (1.5h)

### Week 3: 效能優化

- [ ] 實現消息虛擬滾動 (3h)
- [ ] 轉換 Zustand 選擇器模式 (2h)
- [ ] 替換 RichTextEditor (3h)

### Week 4: 測試 + 驗證

- [ ] 端到端測試
- [ ] 效能測試（消息加載時間、重新渲染次數）
- [ ] Realtime 同步驗證

---

## 7. 快速檢查清單

### Store 層

- [ ] 所有表格都使用 createStore 實現？
- [ ] Realtime 訂閱有實現（不是空方法）？
- [ ] 沒有過度的 Facade 膨脹（返回 50+ 屬性）？
- [ ] UI 狀態與資料狀態分離？

### 組件層

- [ ] 沒有超過 300 行的組件？
- [ ] useEffect 數量不超過 3 個？
- [ ] 使用了 Zustand 選擇器？
- [ ] 沒有不必要的 DOM 操作（innerHTML、execCommand）？

### 效能

- [ ] 列表有虛擬滾動？
- [ ] 沒有 N²的過濾/排序操作？
- [ ] 沒有每秒觸發的 useEffect？

### 型別安全

- [ ] 沒有 `as any` 或 `as unknown`？
- [ ] 所有型別都明確定義？
- [ ] Null 檢查完整？

---

## 結論

Workspace 架構目前已經實現了基本的 Realtime 同步和離線支援（通過 createStore），但存在以下核心問題：

1. **過度的 Facade 耦合** - useWorkspaceStore 返回 120+ 個屬性，導致無法優化重新渲染
2. **重複的狀態管理** - UI 狀態混在 Store 層中，應該留給組件處理
3. **效能瓶頸** - 沒有虛擬滾動、選擇器優化、memoization
4. **數據不一致** - Members 用 API，Bulletins 用前端狀態，其他用 createStore
5. **過時的組件** - channel-view.tsx、RichTextEditor 已棄用的 API

**優先順序**:

1. 立即修復 Realtime 訂閱 + 移除過時組件 (2-3 小時)
2. 分離 UI/資料狀態 + 標準化資料層 (4-6 小時)
3. 效能優化（虛擬滾動、選擇器、memoization）(8-10 小時)

實施這些改進後，應該可以減少 ~30% 的重新渲染，改善 ~50% 的列表載入性能。
