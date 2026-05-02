# 工作空間性能優化方案

## 問題總結

1. **當機感覺**：載入時同時執行多個異步操作，沒有適當的 loading 狀態
2. **新增旅遊團不出現**：`useAutoCreateTourChannels` 被註解停用

## 解決方案

### 方案 A：重新啟用自動建立（簡單）

**優點**：不用改代碼，直接解除註解
**缺點**：可能還是會有性能問題

```typescript
// src/components/workspace/ChannelChat.tsx
export function ChannelChat() {
  // ✅ 重新啟用
  useAutoCreateTourChannels()

  // ...
}
```

### 方案 B：優化載入流程（推薦）

**優點**：根本解決性能問題
**缺點**：需要修改代碼

#### 1. 優化 workspace 頁面載入

```typescript
// src/app/workspace/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { ResponsiveHeader } from '@/components/layout/responsive-header'
import { ChannelChat } from '@/components/workspace/ChannelChat'
import { useWorkspaceChannels } from '@/stores/workspace-store'

export default function WorkspacePage() {
  const { loadWorkspaces, loadChannelGroups, loadChannels, currentWorkspace } = useWorkspaceChannels()
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    const init = async () => {
      try {
        // Step 1: 載入 workspaces（快）
        await loadWorkspaces()
        setIsInitialized(true)
      } catch (error) {
        console.error('Failed to load workspaces:', error)
      }
    }

    init()
  }, [loadWorkspaces])

  // Step 2: 當 workspace 載入後，延遲載入頻道（避免阻塞 UI）
  useEffect(() => {
    if (currentWorkspace && isInitialized) {
      // 使用 setTimeout 延遲載入，讓 UI 先渲染
      const timer = setTimeout(async () => {
        try {
          await Promise.all([
            loadChannelGroups(currentWorkspace.id),
            loadChannels(currentWorkspace.id),
          ])
        } catch (error) {
          console.error('Failed to load channels:', error)
        }
      }, 100) // 延遲 100ms

      return () => clearTimeout(timer)
    }
  }, [currentWorkspace?.id, isInitialized, loadChannelGroups, loadChannels])

  // 顯示 loading 狀態
  if (!isInitialized) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-morandi-gold border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-morandi-secondary">載入工作空間...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <ResponsiveHeader
        title="工作空間"
        breadcrumb={[
          { label: '首頁', href: '/' },
          { label: '工作空間', href: '/workspace' },
        ]}
      />

      <div className="flex-1 overflow-hidden">
        <ChannelChat />
      </div>
    </div>
  )
}
```

#### 2. 重新啟用自動建立頻道（但優化觸發時機）

```typescript
// src/components/workspace/ChannelChat.tsx
import { useAutoCreateTourChannels } from '@/hooks/use-auto-create-tour-channels'

export function ChannelChat() {
  // ...

  // ✅ 重新啟用自動建立頻道
  useAutoCreateTourChannels()

  // ...
}
```

#### 3. 優化 useAutoCreateTourChannels Hook

```typescript
// src/hooks/use-auto-create-tour-channels.ts
export function useAutoCreateTourChannels() {
  const { items: tours } = useTourStore()
  const { channels, createChannel, currentWorkspace } = useWorkspaceChannels()
  const { user } = useAuthStore()
  const isProcessingRef = useRef(false)
  const processedToursRef = useRef(new Set<string>()) // ← 新增：記錄已處理的旅遊團

  useEffect(() => {
    // 防止並發執行
    if (isProcessingRef.current) {
      return
    }

    // 資料未就緒時靜默返回
    if (!currentWorkspace || tours.length === 0) {
      return
    }

    // 檢查每個旅遊團是否有對應的頻道
    const createMissingChannels = async () => {
      isProcessingRef.current = true

      try {
        for (const tour of tours) {
          // ✅ 跳過已處理的旅遊團
          if (processedToursRef.current.has(tour.id)) {
            continue
          }

          // 跳過資料不完整的旅遊團
          if (!tour.code || !tour.name || !tour.id) {
            continue
          }

          // 跳過已封存的旅遊團
          if (tour.archived) {
            continue
          }

          // 檢查頻道是否存在
          const existingChannel = channels.find(ch => ch.tour_id === tour.id)

          // 如果已經有頻道，標記為已處理
          if (existingChannel) {
            processedToursRef.current.add(tour.id)
            continue
          }

          // 自動建立頻道
          try {
            const newChannel = await createChannel({
              workspace_id: currentWorkspace.id,
              name: `${tour.code} ${tour.name}`,
              description: `${tour.name} 的工作頻道`,
              type: 'public',
              tour_id: tour.id,
            })

            // 標記為已處理
            processedToursRef.current.add(tour.id)

            // 如果有旅遊團的創建者資訊，將創建者加入頻道
            if (newChannel && tour.created_by && user?.id) {
              try {
                const creatorEmployeeId = tour.created_by === user.id ? user.id : tour.created_by
                if (creatorEmployeeId) {
                  await addChannelMembers(
                    currentWorkspace.id,
                    newChannel.id,
                    [creatorEmployeeId],
                    'owner'
                  )
                }
              } catch (error) {
                // Silently fail - creator may already be added
              }
            }
          } catch (error) {
            // Silently fail - channel may already exist
            console.error('Failed to create channel for tour:', tour.code, error)
          }
        }
      } finally {
        isProcessingRef.current = false
      }
    }

    // ✅ 使用 debounce 延遲執行（避免頻繁觸發）
    const timer = setTimeout(() => {
      createMissingChannels()
    }, 500)

    return () => clearTimeout(timer)
  }, [tours.length, channels.length, currentWorkspace?.id])
}
```

### 方案 C：手動建立按鈕（最佳性能）

在側邊欄加入「同步旅遊團頻道」按鈕，手動觸發建立。

## 建議執行順序

1. **立即執行**：方案 B 的步驟 1（優化載入）
2. **測試**：確認當機感覺是否改善
3. **再執行**：方案 B 的步驟 2-3（重新啟用自動建立）
4. **測試**：確認新增旅遊團是否出現

## 檢查清單

- [ ] 優化 workspace 頁面載入流程
- [ ] 重新啟用 useAutoCreateTourChannels
- [ ] 優化 useAutoCreateTourChannels Hook
- [ ] 測試：進入工作空間是否還會當機
- [ ] 測試：新增旅遊團是否自動建立頻道
