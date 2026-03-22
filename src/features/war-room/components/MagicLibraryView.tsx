'use client'

/**
 * 魔法圖書館視圖 - 使用 EnhancedTable
 */

import { ExternalLink, Github } from 'lucide-react'
import { EnhancedTable } from '@/components/ui/enhanced-table'
import type { TableColumn } from '@/components/ui/enhanced-table'

type MagicItem = {
  id: string
  name: string
  category: string
  official_url: string | null
  github_url: string | null
  current_version: string | null
  latest_version: string | null
  update_status: 'latest' | 'update_available' | 'outdated' | 'unknown'
  last_checked_at: string | null
  description: string | null
}

interface MagicLibraryViewProps {
  items: MagicItem[]
  loading: boolean
}

const getStatusBadge = (status: string) => {
  const badges = {
    latest: { text: '最新', class: 'bg-green-100 text-green-700' },
    update_available: { text: '有更新', class: 'bg-amber-100 text-amber-700' },
    outdated: { text: '過時', class: 'bg-red-100 text-red-700' },
    unknown: { text: '未知', class: 'bg-morandi-container text-morandi-secondary' },
  }
  return badges[status as keyof typeof badges] || badges.unknown
}

export const MagicLibraryView: React.FC<MagicLibraryViewProps> = ({ items, loading }) => {
  const columns: TableColumn<MagicItem>[] = [
    {
      key: 'name',
      label: '名稱',
      width: '180px',
      render: (_value: unknown, row: MagicItem) => (
        <span className="font-medium text-morandi-primary">{row.name}</span>
      ),
    },
    {
      key: 'category',
      label: '分類',
      width: '100px',
      render: (_value: unknown, row: MagicItem) => (
        <span className="px-2 py-1 bg-morandi-container text-morandi-primary rounded text-xs">
          {row.category}
        </span>
      ),
    },
    {
      key: 'current_version',
      label: '當前版本',
      width: '100px',
      render: (_value: unknown, row: MagicItem) => (
        <span className="text-sm text-morandi-secondary">{row.current_version || '-'}</span>
      ),
    },
    {
      key: 'latest_version',
      label: '最新版本',
      width: '100px',
      render: (_value: unknown, row: MagicItem) => (
        <span className="text-sm text-morandi-secondary">{row.latest_version || '-'}</span>
      ),
    },
    {
      key: 'update_status',
      label: '狀態',
      width: '100px',
      render: (_value: unknown, row: MagicItem) => {
        const badge = getStatusBadge(row.update_status)
        return (
          <span className={`px-2 py-1 rounded text-xs font-medium ${badge.class}`}>
            {badge.text}
          </span>
        )
      },
    },
    {
      key: 'description',
      label: '說明',
      render: (_value: unknown, row: MagicItem) => (
        <span className="text-sm text-morandi-secondary truncate" title={row.description || ''}>
          {row.description || '-'}
        </span>
      ),
    },
    {
      key: 'links',
      label: '連結',
      width: '100px',
      align: 'center',
      render: (_value: unknown, row: MagicItem) => (
        <div className="flex items-center justify-center gap-2">
          {row.official_url && (
            <a
              href={row.official_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700"
              title="官網"
              onClick={e => e.stopPropagation()}
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          {row.github_url && (
            <a
              href={row.github_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700"
              title="GitHub"
              onClick={e => e.stopPropagation()}
            >
              <Github className="h-4 w-4" />
            </a>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="h-full">
      <EnhancedTable
        columns={columns}
        data={items}
        loading={loading}
        emptyMessage="暫無魔法項目"
        hoverable={true}
      />
    </div>
  )
}
