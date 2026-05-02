# 頻道系統規範

> **日期**: 2025-12-11
> **目的**: 定義頻道的可見性和存取權限規則

---

## 頻道類型

### 1. 私人頻道 (private)

**特性**:

- ❌ 不會出現在搜尋結果
- ✅ 只能透過邀請加入
- ✅ 只有成員能看到頻道存在
- ✅ 只限同分公司的人（除非是集團頻道）

**使用情境**:

- 專案團隊討論
- 小組內部溝通
- 敏感話題討論

### 2. 公開頻道 (public)

**特性**:

- ✅ 會出現在頻道搜尋結果
- ✅ 同分公司的人可以搜尋到並自行加入
- ✅ 所有同分公司的人都能看到頻道存在
- ❌ 其他分公司看不到（除非是集團頻道）

**使用情境**:

- 部門公告
- 興趣討論群
- 開放式協作

### 3. 集團頻道 (company_wide) - 只有超級管理員可建立

**特性**:

- ✅ 會出現在所有分公司的搜尋結果
- ✅ 所有員工都能看到（不限分公司）
- ✅ 可以邀請任何分公司的同事
- ✅ 超級管理員可以設定為 private 或 public

**使用情境**:

- 全公司公告
- 跨分公司專案
- 公司活動討論

---

## 資料庫結構

### channels 表格新增欄位

```sql
-- 頻道可見性類型
CREATE TYPE channel_visibility AS ENUM ('private', 'public', 'company_wide');

ALTER TABLE public.channels
ADD COLUMN IF NOT EXISTS visibility channel_visibility DEFAULT 'private';

ALTER TABLE public.channels
ADD COLUMN IF NOT EXISTS is_company_wide boolean DEFAULT false;

COMMENT ON COLUMN public.channels.visibility IS '
頻道可見性：
  private: 私人頻道，只能邀請
  public: 公開頻道，同分公司可搜尋並加入
  company_wide: 集團頻道，全公司可見（只有超級管理員可建立）
';

COMMENT ON COLUMN public.channels.is_company_wide IS '
是否為集團頻道（跨分公司）
  true: 可以邀請所有分公司的員工
  false: 只能邀請同分公司的員工
';
```

---

## 使用情境

### 情境 1：台北員工建立私人頻道

```typescript
// 台北員工 A 建立專案討論群
createChannel({
  name: '新產品開發',
  visibility: 'private',
  workspace_id: 'taipei',
  is_company_wide: false,
})

// 結果：
// ✅ 只有被邀請的人能看到
// ✅ 只能邀請台北分公司的同事
// ❌ 台中同事搜尋不到
```

### 情境 2：台北員工建立公開頻道

```typescript
// 台北員工 A 建立公開討論群
createChannel({
  name: '美食分享',
  visibility: 'public',
  workspace_id: 'taipei',
  is_company_wide: false,
})

// 結果：
// ✅ 所有台北員工都能搜尋到
// ✅ 台北員工可以自行加入
// ❌ 台中員工看不到
```

### 情境 3：超級管理員建立集團私人頻道

```typescript
// 超級管理員建立跨分公司專案群
createChannel({
  name: '新系統開發',
  visibility: 'private',
  workspace_id: null, // 或任何值
  is_company_wide: true,
})

// 結果：
// ✅ 只有被邀請的人能看到
// ✅ 可以邀請台北和台中的同事
// ❌ 一般員工建立不了這種頻道
```

### 情境 4：超級管理員建立集團公開頻道

```typescript
// 超級管理員建立全公司公告頻道
createChannel({
  name: '公司公告',
  visibility: 'public',
  workspace_id: null,
  is_company_wide: true,
})

// 結果：
// ✅ 所有員工（台北+台中）都能搜尋到
// ✅ 所有員工都能自行加入
// ✅ 適合全公司公告
```

---

## RLS Policies

### channels 表格

```sql
-- SELECT: 可以看到的頻道
CREATE POLICY "channels_select" ON public.channels FOR SELECT
USING (
  -- 情況 1: 我是成員 → 一定能看到
  EXISTS (
    SELECT 1 FROM public.channel_members
    WHERE channel_id = channels.id
    AND employee_id = get_current_employee_id()
  )
  OR
  -- 情況 2: 公開頻道 + 我的分公司 → 能看到
  (visibility = 'public' AND workspace_id = get_current_user_workspace())
  OR
  -- 情況 3: 集團公開頻道 → 所有人能看到
  (visibility = 'public' AND is_company_wide = true)
  OR
  -- 情況 4: 超級管理員 → 全部能看到
  is_super_admin()
);

-- INSERT: 建立頻道
CREATE POLICY "channels_insert" ON public.channels FOR INSERT
WITH CHECK (
  -- 一般員工：只能建立自己分公司的頻道（private/public）
  (
    visibility IN ('private', 'public')
    AND is_company_wide = false
    AND workspace_id = get_current_user_workspace()
  )
  OR
  -- 超級管理員：可以建立集團頻道
  (is_company_wide = true AND is_super_admin())
);
```

### channel_members 表格

```sql
-- 邀請成員時的檢查
CREATE POLICY "channel_members_insert" ON public.channel_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.channels c
    JOIN public.employees invited_emp ON invited_emp.id = channel_members.employee_id
    WHERE c.id = channel_members.channel_id
    AND (
      -- 情況 1: 集團頻道 → 可以邀請任何人
      c.is_company_wide = true
      OR
      -- 情況 2: 分公司頻道 → 只能邀請同分公司的人
      (c.is_company_wide = false AND invited_emp.workspace_id = c.workspace_id)
    )
    -- 且我是頻道建立者或管理員
    AND (c.created_by = auth.uid() OR is_super_admin())
  )
);
```

---

## 前端 UI 設計

### 1. 建立頻道對話框

```typescript
// src/app/channels/create-channel-dialog.tsx
export function CreateChannelDialog() {
  const { user } = useAuthStore();

  return (
    <Dialog>
      <DialogContent>
        <Form onSubmit={createChannel}>
          <Input name="name" label="頻道名稱" required />
          <Textarea name="description" label="頻道說明" />

          {/* 可見性選擇 */}
          <Select name="visibility" label="頻道類型" required>
            <Option value="private">
              🔒 私人頻道（只能邀請）
            </Option>
            <Option value="public">
              🌍 公開頻道（同事可搜尋並加入）
            </Option>
          </Select>

          {/* 超級管理員額外選項 */}
          {user.isSuperAdmin && (
            <Checkbox name="is_company_wide">
              🏢 集團頻道（可邀請所有分公司同事）
            </Checkbox>
          )}

          <Button type="submit">建立頻道</Button>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

### 2. 頻道搜尋

```typescript
// src/app/channels/channel-browser.tsx
export function ChannelBrowser() {
  const { user } = useAuthStore();
  const [channels, setChannels] = useState([]);

  const searchChannels = async (keyword: string) => {
    // RLS 會自動過濾：
    // - 一般員工：只看到自己分公司的 public 頻道
    // - 超級管理員：看到所有 public 頻道
    const { data } = await supabase
      .from('channels')
      .select('*')
      .eq('visibility', 'public')
      .ilike('name', `%${keyword}%`);

    setChannels(data);
  };

  return (
    <div>
      <SearchInput onChange={searchChannels} />
      <ChannelList>
        {channels.map(channel => (
          <ChannelCard key={channel.id}>
            <h3>{channel.name}</h3>
            {channel.is_company_wide && (
              <Badge>集團頻道</Badge>
            )}
            <Button onClick={() => joinChannel(channel.id)}>
              加入頻道
            </Button>
          </ChannelCard>
        ))}
      </ChannelList>
    </div>
  );
}
```

### 3. 邀請成員對話框

```typescript
// src/app/channels/[id]/invite-members-dialog.tsx
export function InviteMembersDialog({ channel }: Props) {
  const { user } = useAuthStore();
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    const fetchEmployees = async () => {
      let query = supabase.from('employees').select('*');

      // 如果不是集團頻道，只顯示同分公司的員工
      if (!channel.is_company_wide) {
        query = query.eq('workspace_id', user.workspace_id);
      }

      const { data } = await query;
      setEmployees(data);
    };

    fetchEmployees();
  }, [channel]);

  return (
    <Dialog>
      <DialogContent>
        <h2>邀請成員</h2>
        {channel.is_company_wide && (
          <Alert>
            這是集團頻道，可以邀請所有分公司的同事
          </Alert>
        )}
        <EmployeeList
          employees={employees}
          onInvite={handleInvite}
        />
      </DialogContent>
    </Dialog>
  );
}
```

---

## 頻道列表顯示邏輯

### 左側欄頻道分組

```typescript
// src/components/channel-sidebar.tsx
export function ChannelSidebar() {
  const { user } = useAuthStore();
  const channels = useChannelStore(state => state.items);

  // 分組顯示
  const myChannels = channels.filter(c =>
    c.members.includes(user.employee.id)
  );

  const companyChannels = myChannels.filter(c => c.is_company_wide);
  const workspaceChannels = myChannels.filter(c => !c.is_company_wide);

  return (
    <Sidebar>
      {/* 集團頻道 */}
      {companyChannels.length > 0 && (
        <ChannelGroup title="集團頻道 🏢">
          {companyChannels.map(channel => (
            <ChannelItem key={channel.id} channel={channel} />
          ))}
        </ChannelGroup>
      )}

      {/* 分公司頻道 */}
      <ChannelGroup title={`${user.workspace.name} 頻道`}>
        {workspaceChannels.map(channel => (
          <ChannelItem key={channel.id} channel={channel} />
        ))}
      </ChannelGroup>

      {/* 瀏覽公開頻道按鈕 */}
      <Button onClick={openChannelBrowser}>
        + 瀏覽公開頻道
      </Button>
    </Sidebar>
  );
}
```

---

## 總結

### 權限矩陣

| 操作                   | 一般員工        | 超級管理員      |
| ---------------------- | --------------- | --------------- |
| 建立私人頻道（分公司） | ✅              | ✅              |
| 建立公開頻道（分公司） | ✅              | ✅              |
| 建立集團頻道           | ❌              | ✅              |
| 搜尋分公司公開頻道     | ✅ 僅自己分公司 | ✅ 全部         |
| 搜尋集團公開頻道       | ✅              | ✅              |
| 邀請同分公司成員       | ✅              | ✅              |
| 邀請其他分公司成員     | ❌              | ✅ (限集團頻道) |

### 頻道類型組合

| visibility | is_company_wide | 誰能看到 | 誰能加入             | 誰能建立   |
| ---------- | --------------- | -------- | -------------------- | ---------- |
| private    | false           | 成員     | 邀請（同分公司）     | 所有員工   |
| public     | false           | 同分公司 | 自行加入（同分公司） | 所有員工   |
| private    | true            | 成員     | 邀請（全公司）       | 超級管理員 |
| public     | true            | 全公司   | 自行加入（全公司）   | 超級管理員 |

---

**下一步**: 更新 Migration SQL 加入頻道可見性欄位和 policies
