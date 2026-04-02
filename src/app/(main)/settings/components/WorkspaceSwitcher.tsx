import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building2, Eye, Check } from 'lucide-react'
import { useWorkspaceChannels } from '@/stores/workspace'
import { useAuthStore } from '@/stores/auth-store'
import { useState, useEffect } from 'react'
import { WORKSPACE_SWITCHER_LABELS } from '../constants/labels'

export function WorkspaceSwitcher() {
  const { workspaces, loadWorkspaces } = useWorkspaceChannels()
  const { user, isAdmin } = useAuthStore()
  const [currentWorkspace, setCurrentWorkspace] = useState<string | null>(null)

  // ⚠️ useEffect 必須在 return 之前（React Hooks 規則）
  useEffect(() => {
    if (!isAdmin) return

    // 載入 workspaces 資料
    loadWorkspaces()

    // 從 localStorage 讀取當前選擇的 workspace
    const saved = localStorage.getItem('current_workspace_filter')
    setCurrentWorkspace(saved)
  }, [isAdmin])

  // 如果不是 admin，不顯示切換器
  if (!isAdmin) {
    return null
  }

  const handleSwitchWorkspace = (workspaceId: string | null) => {
    setCurrentWorkspace(workspaceId)

    if (workspaceId) {
      localStorage.setItem('current_workspace_filter', workspaceId)
    } else {
      localStorage.removeItem('current_workspace_filter')
    }

    // 重新載入頁面以套用篩選
    window.location.reload()
  }

  return (
    <Card className="rounded-xl shadow-lg border border-border p-8">
      <div className="flex items-center gap-3 mb-6">
        <Building2 className="h-6 w-6 text-morandi-blue" />
        <h2 className="text-xl font-semibold">{WORKSPACE_SWITCHER_LABELS.TITLE}</h2>
      </div>

      <p className="text-sm text-morandi-secondary mb-6">{WORKSPACE_SWITCHER_LABELS.LABEL_795}</p>

      <div className="space-y-3">
        {/* 查看全部 */}
        <Button
          variant={currentWorkspace === null ? 'default' : 'outline'}
          className="w-full justify-between"
          onClick={() => handleSwitchWorkspace(null)}
        >
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            <span>{WORKSPACE_SWITCHER_LABELS.VIEW_ALL}</span>
          </div>
          {currentWorkspace === null && <Check className="h-4 w-4" />}
        </Button>

        {/* 各個 workspace */}
        {workspaces?.map(workspace => (
          <Button
            key={workspace.id}
            variant={currentWorkspace === workspace.id ? 'default' : 'outline'}
            className="w-full justify-between"
            onClick={() => handleSwitchWorkspace(workspace.id)}
          >
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span>{workspace.name}</span>
            </div>
            {currentWorkspace === workspace.id && <Check className="h-4 w-4" />}
          </Button>
        ))}
      </div>

      {/* 提示訊息 */}
      <div className="mt-6 p-4 bg-morandi-container/20 rounded-lg text-xs text-morandi-muted">
        <p>{WORKSPACE_SWITCHER_LABELS.SWITCH_HINT}</p>
      </div>
    </Card>
  )
}
