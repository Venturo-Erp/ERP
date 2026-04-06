'use client'

/**
 * 機器人管理中心視圖 - 使用 EnhancedTable
 */

import { EnhancedTable } from '@/components/ui/enhanced-table'
import type { TableColumn } from '@/components/ui/enhanced-table'

type Bot = {
  id: string
  bot_name: string
  bot_username: string | null
  platform: string
  status: string
  webhook_url: string | null
  groups: BotGroup[]
}

type BotGroup = {
  id: string
  group_id: string
  group_name: string | null
  is_new: boolean
  joined_at: string
  member_count: number | null
}

interface BotManagementViewProps {
  bots: Bot[]
  loading: boolean
}

export const BotManagementView: React.FC<BotManagementViewProps> = ({ bots, loading }) => {
  const columns: TableColumn<Bot>[] = [
    {
      key: 'bot_name',
      label: '機器人名稱',
      width: '180px',
      render: (_value: unknown, row: Bot) => (
        <span className="font-medium text-morandi-primary">{row.bot_name}</span>
      ),
    },
    {
      key: 'platform',
      label: '平台',
      width: '100px',
      render: (_value: unknown, row: Bot) => (
        <span className="px-2 py-1 bg-morandi-container text-morandi-primary rounded text-xs">
          {row.platform.toUpperCase()}
        </span>
      ),
    },
    {
      key: 'status',
      label: '狀態',
      width: '100px',
      render: (_value: unknown, row: Bot) => (
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            row.status === 'active'
              ? 'bg-morandi-green/10 text-morandi-green'
              : 'bg-morandi-red/10 text-morandi-red'
          }`}
        >
          {row.status === 'active' ? '運行中' : '離線'}
        </span>
      ),
    },
    {
      key: 'bot_username',
      label: '帳號',
      width: '120px',
      render: (_value: unknown, row: Bot) => (
        <span className="text-sm text-morandi-secondary">
          {row.bot_username ? `@${row.bot_username}` : '-'}
        </span>
      ),
    },
    {
      key: 'groups',
      label: '群組數',
      width: '100px',
      align: 'center',
      render: (_value: unknown, row: Bot) => {
        const newGroupsCount = row.groups?.filter((g: BotGroup) => g.is_new).length || 0
        return (
          <div className="flex items-center justify-center gap-1">
            <span className="font-medium">{row.groups?.length || 0}</span>
            {newGroupsCount > 0 && (
              <span className="px-1.5 py-0.5 bg-morandi-gold/100 text-white rounded text-xs">
                +{newGroupsCount}
              </span>
            )}
          </div>
        )
      },
    },
    {
      key: 'webhook_url',
      label: 'Webhook URL',
      render: (_value: unknown, row: Bot) => (
        <span
          className="text-xs text-morandi-secondary font-mono truncate"
          title={row.webhook_url || ''}
        >
          {row.webhook_url || '-'}
        </span>
      ),
    },
  ]

  return (
    <div className="h-full">
      <EnhancedTable
        columns={columns}
        data={bots}
        loading={loading}
        emptyMessage="暫無機器人"
        hoverable={true}
      />
    </div>
  )
}
