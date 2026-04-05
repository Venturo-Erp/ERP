/**
 * 新增頻道 Dialog
 */

import { useState, useEffect } from 'react'
import { Hash, Lock, Check, Globe, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useWorkspaceStore } from '@/stores'
import { useAuthStore } from '@/stores/auth-store'
import { useEmployeesSlim } from '@/data'
import { COMP_WORKSPACE_LABELS } from '../constants/labels'

interface CreateChannelDialogProps {
  isOpen: boolean
  channelName: string
  channelDescription: string
  channelType: 'public' | 'private'
  channelScope?: 'workspace' | 'company' // 新增：頻道範圍
  selectedMembers: string[] // 新增：選中的成員 ID
  isCreating?: boolean // 新增：是否正在建立中（防止重複點擊）
  onChannelNameChange: (name: string) => void
  onChannelDescriptionChange: (desc: string) => void
  onChannelTypeChange: (type: 'public' | 'private') => void
  onChannelScopeChange?: (scope: 'workspace' | 'company') => void // 新增：範圍變更回調
  onMembersChange: (members: string[]) => void // 新增：成員變更回調
  onClose: () => void
  onCreate: () => void
}

export function CreateChannelDialog({
  isOpen,
  channelName,
  channelDescription,
  channelType,
  channelScope = 'workspace',
  selectedMembers,
  isCreating = false,
  onChannelNameChange,
  onChannelDescriptionChange,
  onChannelTypeChange,
  onChannelScopeChange,
  onMembersChange,
  onClose,
  onCreate,
}: CreateChannelDialogProps) {
  const { user, isAdmin } = useAuthStore()
  const { items: employees } = useEmployeesSlim()
  const { workspaces, loadWorkspaces } = useWorkspaceStore()

  // 新系統：使用 isAdmin

  // 載入工作空間資料（employees 由 SWR 自動載入）
  useEffect(() => {
    if (isOpen && isAdmin && workspaces.length === 0) {
      loadWorkspaces()
    }
  }, [isOpen, isAdmin, workspaces.length, loadWorkspaces])

  // 根據範圍顯示員工列表
  const displayEmployees =
    channelScope === 'company'
      ? employees // 全集團：顯示所有員工
      : employees.filter(
          emp => (emp as unknown as { workspace_id?: string }).workspace_id === user?.workspace_id
        )

  // 取得員工所屬的 workspace 名稱
  const getWorkspaceName = (workspaceId: string | undefined) => {
    if (!workspaceId) return ''
    const ws = workspaces.find(w => w.id === workspaceId)
    return ws?.name || ''
  }

  // 切換成員選擇
  const toggleMember = (employeeId: string) => {
    // 建立者不可取消
    if (employeeId === user?.id) return

    if (selectedMembers.includes(employeeId)) {
      onMembersChange(selectedMembers.filter(id => id !== employeeId))
    } else {
      onMembersChange([...selectedMembers, employeeId])
    }
  }

  if (!isOpen) return null

  return (
   
    // eslint-disable-next-line venturo/no-custom-modal
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9100]">
      <div className="card-morandi-elevated w-96 max-h-[80vh] flex flex-col">
        <h3 className="font-semibold mb-4 text-morandi-primary">
          {COMP_WORKSPACE_LABELS.LABEL_3910}
        </h3>

        <div className="space-y-3 flex-1 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-morandi-primary mb-1">
              {COMP_WORKSPACE_LABELS.頻道名稱}
            </label>
            <input
              type="text"
              placeholder={COMP_WORKSPACE_LABELS.例如_專案討論}
              value={channelName}
              onChange={e => onChannelNameChange(e.target.value)}
              autoFocus
              className="input-morandi"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-morandi-primary mb-1">
              {COMP_WORKSPACE_LABELS.頻道描述_選填}
            </label>
            <textarea
              placeholder={COMP_WORKSPACE_LABELS.說明這個頻道的用途}
              value={channelDescription}
              onChange={e => onChannelDescriptionChange(e.target.value)}
              className="input-morandi resize-none"
              rows={2}
            />
          </div>

          {/* 頻道類型選擇 */}
          <div>
            <label className="block text-sm font-medium text-morandi-primary mb-2">
              {COMP_WORKSPACE_LABELS.LABEL_4886}
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onChannelTypeChange('public')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors',
                  channelType === 'public'
                    ? 'bg-morandi-gold/10 border-morandi-gold text-morandi-primary'
                    : 'border-morandi-gold/20 text-morandi-secondary hover:bg-morandi-secondary/5'
                )}
              >
                <Hash size={16} />
                <span className="text-sm">{COMP_WORKSPACE_LABELS.LABEL_1552}</span>
              </button>
              <button
                type="button"
                onClick={() => onChannelTypeChange('private')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors',
                  channelType === 'private'
                    ? 'bg-morandi-gold/10 border-morandi-gold text-morandi-primary'
                    : 'border-morandi-gold/20 text-morandi-secondary hover:bg-morandi-secondary/5'
                )}
              >
                <Lock size={16} />
                <span className="text-sm">{COMP_WORKSPACE_LABELS.LABEL_2721}</span>
              </button>
            </div>
            <p className="text-xs text-morandi-secondary mt-1">
              {channelType === 'public'
                ? COMP_WORKSPACE_LABELS.所有成員都可以看到並加入
                : COMP_WORKSPACE_LABELS.只有被邀請的成員可以看到}
            </p>
          </div>

          {/* 超級管理員專用：頻道範圍選擇 */}
          {isAdmin && onChannelScopeChange && (
            <div>
              <label className="block text-sm font-medium text-morandi-primary mb-2">
                {COMP_WORKSPACE_LABELS.LABEL_6196}
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onChannelScopeChange('workspace')
                    // 切換範圍時清空已選成員（除了自己）
                    onMembersChange([user?.id || ''])
                  }}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors',
                    channelScope === 'workspace'
                      ? 'bg-morandi-blue/10 border-morandi-blue text-morandi-primary'
                      : 'border-morandi-blue/20 text-morandi-secondary hover:bg-morandi-secondary/5'
                  )}
                >
                  <Building2 size={16} />
                  <span className="text-sm">{COMP_WORKSPACE_LABELS.LABEL_7525}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChannelScopeChange('company')
                    // 切換範圍時清空已選成員（除了自己）
                    onMembersChange([user?.id || ''])
                  }}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors',
                    channelScope === 'company'
                      ? 'bg-morandi-blue/10 border-morandi-blue text-morandi-primary'
                      : 'border-morandi-blue/20 text-morandi-secondary hover:bg-morandi-secondary/5'
                  )}
                >
                  <Globe size={16} />
                  <span className="text-sm">{COMP_WORKSPACE_LABELS.LABEL_8650}</span>
                </button>
              </div>
              <p className="text-xs text-morandi-secondary mt-1">
                {channelScope === 'workspace'
                  ? COMP_WORKSPACE_LABELS.只能邀請同分公司的成員
                  : COMP_WORKSPACE_LABELS.可以邀請所有分公司的成員}
              </p>
            </div>
          )}

          {/* 成員選擇 */}
          <div>
            <label className="block text-sm font-medium text-morandi-primary mb-2">
              {COMP_WORKSPACE_LABELS.LABEL_8349}
              {channelScope === 'company' && (
                <span className="ml-2 text-xs text-morandi-blue">(全集團)</span>
              )}
            </label>
            <div className="space-y-1 max-h-48 overflow-y-auto border border-morandi-gold/20 rounded-lg p-2">
              {displayEmployees.map(employee => {
                const isCreator = employee.id === user?.id
                const isSelected = selectedMembers.includes(employee.id)
                const empWorkspaceId = (employee as unknown as { workspace_id?: string })
                  .workspace_id
                const workspaceName =
                  channelScope === 'company' ? getWorkspaceName(empWorkspaceId) : ''

                return (
                  <button
                    key={employee.id}
                    type="button"
                    onClick={() => toggleMember(employee.id)}
                    disabled={isCreator}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left',
                      isSelected
                        ? 'bg-morandi-gold/10 text-morandi-primary'
                        : 'hover:bg-morandi-secondary/5 text-morandi-secondary',
                      isCreator && 'opacity-60 cursor-not-allowed'
                    )}
                  >
                    <div
                      className={cn(
                        'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0',
                        isSelected
                          ? 'bg-morandi-gold border-morandi-gold'
                          : 'border-morandi-gold/30'
                      )}
                    >
                      {isSelected && <Check size={12} className="text-white" />}
                    </div>
                    <span className="flex-1">
                      {employee.chinese_name || employee.display_name || employee.email}
                      {isCreator && <span className="text-xs ml-2">(建立者)</span>}
                      {workspaceName && (
                        <span className="text-xs ml-2 text-morandi-blue">({workspaceName})</span>
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-morandi-secondary mt-1">
              已選擇 {selectedMembers.length} 位成員
            </p>
          </div>
        </div>

        <div className="flex gap-2 mt-4 justify-end border-t border-morandi-gold/10 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isCreating}
          >
            {COMP_WORKSPACE_LABELS.CANCEL}
          </Button>
          <Button
            size="sm"
            onClick={onCreate}
            disabled={!channelName.trim() || selectedMembers.length === 0 || isCreating}
          >
            {isCreating ? COMP_WORKSPACE_LABELS.建立中 : COMP_WORKSPACE_LABELS.建立}
          </Button>
        </div>
      </div>
    </div>
  )
}
