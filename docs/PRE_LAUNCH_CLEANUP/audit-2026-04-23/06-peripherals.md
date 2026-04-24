# 週邊工具（channel + calendar + todos + ai-bot + dashboard + visas + login）體檢報告

**掃描日期**：2026-04-23  
**範圍**：7 頁 + API + middleware + 對應 table  
**掃描者**：Explore agent (讀 only 模式)

---

## 一句話狀況

**登入、dashboard、calendar、channel 四大基礎設施狀態良好，pero 有 3 個隱患**：

- calendar 和 todos 有**零交叉引用**（features 目錄完全孤立，只有頁面引入）
- ai-bot 是 **80% 完成的半成品**（LINE Bot 集成完整，但 Meta / AI 知識庫只有 UI 架子）
- visas 是 **真實功能**（24 個檔案、完整 CRUD），但尚未驗證與 tours/orders 同步邏輯
- 登入有 **localStorage 持久化（「記住我」功能）實作了但 BACKLOG 列延後**

---

## 🔴 真問題（上線前處理）

### 1. **calendar 和 todos 零交叉引用 — 孤立的 features 目錄**

**位置**：

- `/src/features/calendar/` (12 個檔案)
- `/src/features/todos/` (6 個檔案)

**事實**：

```bash
grep -r "from '@/features/calendar'" src --include="*.ts" --include="*.tsx"
# 結果：0 hit（除了頁面本身）

grep -r "from '@/features/todos'" src --include="*.ts" --include="*.tsx"
# 結果：0 hit（除了頁面本身）
```

但 calendar 確實有使用：

- `/src/features/calendar/hooks/useCalendarEvents()` 被 `/src/features/calendar/hooks/useEventOperations()` 和 `/src/app/(main)/calendar/page.tsx` 引入
- 但 features/calendar 的 hooks 沒有被任何其他頁面引入

**問題**：calendar 和 todos 的 feature 邏輯是**孤島模式** — 只有各自的頁面檔引入，沒有被其他系統（如 orders、tours、dashboard）引用。如果 visas / orders 需要展示簽證檢驗日期在行事曆上、或待辦用於財務流程，現在的架構**無法共享**。

**上線風險**：

- 跨模組功能（如「團務產生 calendar event」自動同步）沒有接入點
- 複製 hook 邏輯會重複代碼
- 如果要擴展 calendar，需要重構引入鏈

**建議**：確認上線時是否需要：

- calendar 與 tours 同步（開團自動產生行事曆）？ → 若是，需接 orders / tours feature
- todos 與財務互動（收款單自動產生待辦）？ → 若是，已列 BACKLOG Wave 7

---

### 2. **todos table 有 4 個死欄位 / 未實作欄位**

**位置**：`/Users/williamchien/Projects/venturo-erp/supabase-migration.sql` line 中 todos 表定義

**死欄位**（DB 有、code 完全 0 引用）：

| 欄位                                 | 定義             | 檢查結果 | 用途             |
| ------------------------------------ | ---------------- | -------- | ---------------- |
| `type VARCHAR(50)`                   | 任務類型（待訂） | 0 hit    | 未實作功能       |
| `parent_id UUID`                     | 子任務關聯       | 0 hit    | UI 沒有層級支持  |
| `project_id UUID`                    | 專案關聯         | 0 hit    | 無指向表、無外鍵 |
| `needs_creator_notification BOOLEAN` | 建立者通知       | 0 hit    | 沒有通知系統使用 |

**證據**：

```
grep "parent_id\|project_id\|type\|needs_creator" src/hooks/useTodos.ts
# 無結果（page.tsx 也沒用）

grep "parent_id\|project_id" src/features/todos --include="*.tsx" -r
# 無結果
```

**上線風險**：這 4 個欄位佔 todos 表 4/21 欄位比例，遷移時會拖累資料庫備份 / 版本管理。

**建議**：確認上線時：

- 若這些功能 post-launch 才做 → **保留欄位，但在 API 層明確過濾掉**（不讓前端綁定）
- 若確定不用 → **删除欄位**（需 migration）

---

### 3. **todos column_id 欄位不在 DB schema — 但 code 硬性依賴**

**位置**：`/src/app/(main)/todos/page.tsx` line 147-169（看板邏輯）

**問題**：

```typescript
// todos/page.tsx 第 147-159 行
const todosByColumn = useMemo(() => {
  const map: Record<string, Todo[]> = {}
  columns.forEach(col => {
    map[col.id] = []
  })

  const defaultCol = columns.find(c => c.mapped_status === 'pending') || columns[0]

  visibleTodos.forEach(todo => {
    const colId = todo.column_id || defaultCol?.id  // ← 依賴 column_id
    if (colId && map[colId]) {
      map[colId].push(todo)
    }
  })
  ...
})
```

但 `todo.column_id` 在 DB 沒有、只在 `Todo` type 定義（`/src/types/base.types.ts`）：

```typescript
export interface Todo {
  // ...
  column_id?: string | null // 可選欄位
  // ...
}
```

**事實檢查**：

```bash
grep "column_id" supabase-migration.sql
# 0 hit

grep "column_id" src/types/database.types.ts
# 0 hit（Supabase 自動生成的 type 不含此欄位）
```

**上線風險**：

- 看板欄位頁面**完全無法正常運作**（todos 無 column_id 欄位，全部歸到 defaultCol）
- 卡片拖曳時 update 會失敗（API 拒收未知欄位）

**建議**：執行以下之一：

1. **添加 migration**：`ALTER TABLE todos ADD COLUMN column_id UUID REFERENCES todo_columns(id);`
2. **移除欄位**：刪除 page.tsx 第 147-169 行的看板邏輯，改用 `status` 分欄（但會改動 UX）

---

### 4. **ai-bot 是 UI 架子、不是功能**

**位置**：`/src/app/(main)/ai-bot/page.tsx` + `/src/app/(main)/ai-bot/components/` (9 個檔案)

**現狀調查**：

| 功能                 | 狀態       | 檔案數 | 評語                                                             |
| -------------------- | ---------- | ------ | ---------------------------------------------------------------- |
| **LINE Bot 設定**    | ✅ 完成    | 3      | LineSetupWizard / LineConnectionsTab 有完整邏輯                  |
| **Meta / Instagram** | 🟡 UI only | 1      | KnowledgeTab 只顯示文字、無實際連接                              |
| **AI Settings**      | 🟡 UI only | 1      | AISettingsTab 讀設定、無 train / fine-tune 邏輯                  |
| **Knowledge Tab**    | 🟡 UI only | 1      | 只有文件上傳 UI、無 embedding / RAG 後端                         |
| **Conversations**    | 🟡 UI only | 2      | RealConversations / SimpleConversations 只展示歷史、無新 AI 呼叫 |

**證據**：

```typescript
// ai-bot/page.tsx 第 319-329 行
{activeTab === 'ai' &&
  (isConnected ? (
    <AISettingsTab />  // ← 只是 UI 殼
  ) : (
    <Card>
      <CardContent className="py-12 text-center text-muted-foreground">
        <Bot className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p>請先在「平台連線」完成 LINE Bot 設定</p>  // ← 阻斷後續功能
      </CardContent>
    </Card>
  ))}
```

**API 層檢查**：

```bash
find src/app/api -name "*ai*" -type f
# /src/app/api/ai-settings/route.ts
# /src/app/api/ai-workflow/execute/route.ts
# /src/app/api/ai/generate-itinerary-copy/route.ts
# /src/app/api/ai/suggest-attraction/route.ts
# /src/app/api/ai/edit-image/route.ts

# 但沒有：
# /src/app/api/ai-bot/knowledge/upload   ← 知識庫上傳 API
# /src/app/api/ai-bot/fine-tune          ← AI fine-tune API
# /src/app/api/ai-bot/embeddings         ← embedding API
```

**上線風險**：**非常高** — 使用者進 ai-bot 頁面看到 5 個 tab，但只有 LINE 連線 tab 有功能、其他 4 個是假的。

**建議**：

1. **隱藏未完成功能**：用 feature flag 把 Meta / AI Settings / Knowledge / Conversations tab 都藏起來，只暴露 LINE 連線 tab
2. **或列為 post-launch**：在 BACKLOG 裡明確標注「ai-bot AI 功能 post-launch」，告知業務上線時沒有

---

### 5. **login 頁有 localStorage 記憶實作，但列 post-launch**

**位置**：`/src/app/(main)/login/page.tsx` line 12-30

**實作事實**：

```typescript
// login/page.tsx line 26-30
useEffect(() => {
  const lastCode = localStorage.getItem(LAST_CODE_KEY)
  const lastUsername = localStorage.getItem(LAST_USERNAME_KEY)
  if (lastCode) setCode(lastCode)
  if (lastUsername) setUsername(lastUsername)
}, [])

// line 62-63（登入時保存）
localStorage.setItem(LAST_CODE_KEY, trimmedCode)
localStorage.setItem(LAST_USERNAME_KEY, username.trim())
```

**BACKLOG 查詢**：

```
grep "記住我\|localStorage\|persist" docs/PRE_LAUNCH_CLEANUP/BACKLOG.md
# 結果：BACKLOG.md 「記住我」功能真實實作 (已列 post-launch 延後)
```

**上線風險**：**低** — 功能已實作，列延後純粹是需求決定。但 localStorage 會暴露帳號（未加密），上線前需評估安全性。

**建議**：若要上線這功能：

1. 登入後加 **token-based 驗證**（不只儲存明文帳號）
2. 或用 **加密 localStorage**（如 TweetNaCl.js）

---

## 🟡 小債（上線後）

### 6. **channel page 模組耦合 — channel.tsx 直查 store + import 內部 component**

**位置**：`/src/app/(main)/channel/page.tsx`

**問題**：

```typescript
// line 14-15
const { loadWorkspaces, loadChannelGroups, loadChannels, currentWorkspace } = useWorkspaceChannels() // ← workspace store 直接用

// line 38-40
const channelStore = await import('@/stores/workspace/channel-store')
const channels = channelStore.useChannelStore.getState().items // ← 動態引入 store
```

**上線風險**：**低** — 邏輯正確，但若 workspace store 變動會影響 channel 頁面。應該用 DAL layer（如 `/src/data/entities/`）隔離。

**建議**：考慮遷移到 `/src/data/entities/channels.ts` + `useChannels()` hook（對齊其他模組）。

---

### 7. **calendar 頁巨型檔案（275 行）+ 複雜 hook 邏輯**

**位置**：`/src/app/(main)/calendar/page.tsx`

**複雜度**：

- 1 個頁面檔 + 4 個 custom hooks（useCalendarEvents, useCalendarNavigation, useEventOperations, useMoreEventsDialog）
- 7 個 dialog 並存（AddEventDialog, EditEventDialog, EventDetailDialog, MoreEventsDialog, BirthdayListDialog）
- dynamic import CalendarGrid（含 FullCalendar.io 外套件）

**上線風險**：**中** — 單一檔案包含太多邏輯，難以維護。但 hooks 拆分清楚，邏輯本身正確。

**建議**：無須修改，但 post-launch 考慮拆成 `src/features/calendar/components/CalendarPageContainer.tsx`。

---

### 8. **todos page 巨型檔案（1099 行）+ 內嵌 memo component**

**位置**：`/src/app/(main)/todos/page.tsx`

**複雜度**：

- 1099 行單檔案（包含頁面 + 卡片 + form）
- 內嵌 `TodoCardMemo` + `AddTodoForm` 兩個 subcomponent
- 3 個並存 dialog（AddDialog, ConfirmDialog, ExpandedView）

**上線風險**：**中-高** — 行數長但邏輯清晰，但修改會影響拖曳、刪除、新增等多個流程。

**建議**：上線前通過完整 QA（拖曳、快速新增、列刪除、欄位排序）。post-launch 考慮拆成模組。

---

## 🟢 健康面向

### ✅ **middleware.ts 穩定**

- 精確公開路由白名單（已修正 Wave 3 P002）
- `/api/auth/validate-login` 放行（登入前調用）
- `/api/auth/sync-employee` 自帶 token 驗證（無 session 依賴）

**無技術債**。

---

### ✅ **login 頁面正常**

- LABELS 集中化（`/src/app/(main)/login/constants/labels.ts`）
- 錯誤訊息用 i18n string，非硬編
- 密碼欄位有 show/hide 切換
- form validation 完整（code / username / password 檢查）

**無技術債**。

---

### ✅ **dashboard 權限檢查**

- `isAdmin` 用於過濾 widget（line 72-73）
- widget 有 `requiredPermission` 欄位控制露出
- 拖曳邏輯與權限分離

**無技術債**。

---

### ✅ **calendar hooks 分工清楚**

- `useCalendarEvents()` → data fetch
- `useCalendarNavigation()` → 月份切換邏輯
- `useEventOperations()` → CRUD 操作
- `useMoreEventsDialog()` → 超額事件彈窗

**無技術債**。

---

### ✅ **todos hook 用 SWR + workspace isolation**

- workspace_id 隔離（每個 workspace 獨立快取）
- optimistic update（新增 / 刪除 / 更新立即反映）
- 無 realtime 訂閱（目前純樂觀，post-launch 再加）

**無技術債**。

---

### ✅ **visas 模組結構完整**

- 24 個檔案（vs calendar 12、todos 6）
- 8 個 hooks（data、filters、dialog、customer match、batch、create）
- 10 個 dialog components
- 清晰的責任分工

**無技術債**（但需驗證與 orders / tours 同步邏輯）。

---

### ✅ **todos labels 集中化**

- 所有文案放 `/src/features/todos/constants/labels.ts`
- 無硬編中文（所有文字走 LABELS）
- 欄位標籤 / 按鈕 / 訊息 / placeholder 全部納入

**無技術債**。

---

### ✅ **calendar labels 集中化**

- 99 個標籤集中在 `/src/features/calendar/constants/labels.ts`
- 無硬編中文
- 包括舊 legacy 欄位（SETTINGS_1131 等）

**無技術債**。

---

### ✅ **login labels 集中化**

- 所有登入頁文案集中 `/src/app/(main)/login/constants/labels.ts`
- 28 個標籤清晰分類

**無技術債**。

---

## 半成品 / 空殼警告

### 🚨 **ai-bot — 80% 完成的半成品**

**現狀**：

- ✅ LINE Bot 設定完整（LineSetupWizard、LineConnectionsTab）
- ✅ API 連接（`/api/line/*`）
- 🟡 Meta 平台只有 UI（無後端實現）
- 🟡 AI Settings 只有 UI（無 training / fine-tune）
- 🟡 Knowledge Tab 只有 UI（無 embedding / RAG）
- 🟡 Conversations 只有展示（無新對話 API）

**業務決策**：

- **若上線時需要 AI 功能** → **必須隱藏 Meta / AI / Knowledge tab**（改 feature flag 控制）
- **若上線時只需 LINE 客服** → **保持現狀**（LINE bot 可用）
- **若對業務關鍵** → **post-launch 列 Epic、不要上線時趕工**

**風險**：使用者進去看到 5 個 tab 按不動 4 個，體驗極差。

---

### 🟡 **visas — 真實功能但同步邏輯未驗證**

**現狀**：

- ✅ 完整 CRUD（24 個檔案、8 hooks、10 dialogs）
- ✅ 與 orders / tours 有交互（`useBatchVisa.ts`、`QuickVisaDialog`）
- ❓ **同步邏輯未測試**：簽證狀態變時，order/tour 的檢驗欄位是否同步？

**建議**：上線前執行 QA scenario：

1. 建立 order → 批次建簽證 → 簽證提交
2. 驗證 order 的 visa_status 是否更新
3. 驗證 tour 的 visa_count 是否遞增

---

### 🟡 **calendar — 架構正確但與 tours 未連結**

**現狀**：

- ✅ 完整行事曆 UI（月週日切換、事件 CRUD）
- ✅ hooks 清晰
- ❓ **與 tours 無動態連結**：tours 表的 `departure_date / return_date` 是否自動產生 calendar event？

**代碼檢查**：

```bash
grep -r "tour.*departure_date\|departure_date.*calendar" src
# 0 hit（未找到自動同步邏輯）
```

**建議**：

1. 若需要上線 → 確認**不需要** tour → calendar 自動同步
2. 若業務要求 → post-launch 列需求（需新增 trigger / API）

---

### 🟡 **todos — 看板功能不可用（column_id 缺欄）**

**現狀**：

- ✅ 卡片 CRUD 可用
- ✅ 優先級切換可用
- ❌ **看板欄位功能完全不可用**（column_id 欄位缺失）

**業務決策**：

1. **若需要看板** → **必須先補 migration 加 column_id**
2. **若只需待辦清單** → **移除看板邏輯、改用 status 簡化**

上線前選一個方案執行。

---

## 跨模組 pattern 候選

### Pattern A：**特性模組孤立 vs. 共享層分離**

目前：

- calendar / todos / visas 是 isolated features（各自 hooks、各自頁面）
- 沒有「共享 calendar」給其他模組用的接口

未來：

- 若 orders / tours 需要展示 calendar 小 widget → 需要萃取 `useCalendarWidget()` hook
- 若 finance 需要待辦清單掛鉤 → 需要萃取 `useTodoReference()` hook

**建議**：post-launch 考慮建立 `/src/features/shared-widgets/` 存放跨模組 component。

---

### Pattern B：**模組間的資料同步**

目前無：

- calendar ↔ tours（tour 日期改時、calendar 事件不動）
- todos ↔ orders（訂單建立、不自動產待辦）
- visas ↔ orders（簽證狀態改、order 不同步）

**建議**：確認 MVP scope。若需要同步，設計 pub/sub 或 webhook 系統。

---

## 清單

### 🔴 Critical（上線前必處理）

- [ ] **todos column_id 欄位**：補 migration 或移除看板邏輯
- [ ] **ai-bot UI 架子**：feature flag 隱藏未完成 tab 或列 post-launch
- [ ] **todos / calendar 孤立**：確認跨模組需求（calendar ↔ tours、todos ↔ finance）

### 🟡 Important（上線 OK 但 post-launch 優先）

- [ ] **todos 死欄位**：`type / parent_id / project_id / needs_creator_notification` — DB 清理或 API 過濾
- [ ] **visas 同步驗證**：QA 測試 visa status → order 更新
- [ ] **calendar 與 tours 連結**：設計同步邏輯（若需要）

### 🟢 Nice-to-have

- [ ] todos page 拆模組化（post-launch）
- [ ] channel page 改用 DAL layer
- [ ] login localStorage 加密

---

## 結論

| 模組          | 狀態        | 上線適配  | 備註                             |
| ------------- | ----------- | --------- | -------------------------------- |
| **login**     | ✅ 完成     | ✅ Ready  | 無技術債                         |
| **dashboard** | ✅ 完成     | ✅ Ready  | widget 系統穩定                  |
| **channel**   | ✅ 完成     | ✅ Ready  | LINE 集成完整                    |
| **calendar**  | ✅ UI 完成  | ⚠️ 有條件 | 需確認 tours 同步需求            |
| **todos**     | 🟡 部分完成 | ❌ 需修   | column_id 欄位缺失、4 個死欄位   |
| **ai-bot**    | 🟡 50% 完成 | ❌ 需隱藏 | 只有 LINE 有功能，其他是 UI 架子 |
| **visas**     | ✅ 完成     | ⚠️ 有條件 | 需驗證 orders/tours 同步邏輯     |

**最後警告**：

- **todos 看板功能現在無法用**（column_id 缺欄）— 上線前必改
- **ai-bot 有 4 個虛功能** — 用 feature flag 隱藏或列 post-launch
- **確認 MVP scope** — calendar ↔ tours、todos ↔ finance、visas ↔ orders 的同步需求
