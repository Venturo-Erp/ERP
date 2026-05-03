'use client'

/**
 * 漫途 CIS 工作流 — 客戶列表頁
 *
 * 規範：
 *   - 多租戶：workspace_features('cis') + role_capabilities('cis.clients.*') 雙保險
 *   - 預設 15 筆分頁（root CLAUDE.md 五大方向 #5）
 *   - server-side search（公司名 / 聯絡人 / 電話）
 *   - 防連點：所有寫入按鈕 disabled={loading}
 */

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Edit, Trash2, Palette } from 'lucide-react'
import { toast } from 'sonner'

import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Button } from '@/components/ui/button'
import { EnhancedTable, TableColumn } from '@/components/ui/enhanced-table'
import { confirm } from '@/lib/ui/alert-dialog'
import { DateCell } from '@/components/table-cells'

import {
  useCisClientsPaginated,
  createCisClient,
  updateCisClient,
  deleteCisClient,
} from '@/data'
import type { CisClient, CisClientStatus } from '@/types/cis.types'
import { CIS_CLIENT_STATUS_OPTIONS } from '@/types/cis.types'

import { CisClientDialog } from './components/CisClientDialog'
import { CIS_PAGE_LABELS as L } from './constants/labels'

const PAGE_SIZE = 15

const STATUS_LABEL_MAP: Record<CisClientStatus, string> = {
  lead: L.status_lead,
  active: L.status_active,
  closed: L.status_closed,
}

const STATUS_CLASS_MAP: Record<CisClientStatus, string> = {
  lead: 'text-morandi-gold bg-status-warning-bg',
  active: 'text-status-success bg-status-success-bg',
  closed: 'text-morandi-secondary bg-morandi-muted/20',
}

export default function CisListPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)

  const {
    items: clients,
    totalCount,
    refresh,
  } = useCisClientsPaginated({
    page,
    pageSize: PAGE_SIZE,
    search: searchQuery.trim() || undefined,
    searchFields: ['company_name', 'contact_name', 'phone'],
    sortBy: 'created_at',
    sortOrder: 'desc',
  })

  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [editingClient, setEditingClient] = useState<CisClient | null>(null)

  const openCreateDialog = useCallback(() => {
    setEditingClient(null)
    setDialogMode('create')
    setDialogOpen(true)
  }, [])

  const openEditDialog = useCallback((client: CisClient) => {
    setEditingClient(client)
    setDialogMode('edit')
    setDialogOpen(true)
  }, [])

  const handleDelete = useCallback(
    async (client: CisClient) => {
      const ok = await confirm(L.confirm_delete(client.company_name), {
        title: L.confirm_delete_title,
        type: 'warning',
        confirmText: L.btn_delete,
        cancelText: L.btn_cancel,
      })
      if (!ok) return
      try {
        await deleteCisClient(client.id)
        toast.success('已刪除客戶')
        await refresh()
      } catch (e) {
        toast.error(`刪除失敗：${(e as Error).message}`)
      }
    },
    [refresh]
  )

  const handleRowClick = useCallback(
    (client: CisClient) => {
      router.push(`/cis/${client.id}`)
    },
    [router]
  )

  const columns: TableColumn<CisClient>[] = useMemo(
    () => [
      {
        key: 'code',
        label: L.col_code,
        sortable: true,
        render: (_v, c) => (
          <span className="text-xs text-morandi-secondary font-mono">{c.code}</span>
        ),
      },
      {
        key: 'company_name',
        label: L.col_company,
        sortable: true,
        render: (_v, c) => (
          <div className="text-sm font-medium text-morandi-primary">{c.company_name}</div>
        ),
      },
      {
        key: 'contact_name',
        label: L.col_contact,
        render: (_v, c) => (
          <div className="text-xs text-morandi-primary">{c.contact_name || '-'}</div>
        ),
      },
      {
        key: 'phone',
        label: L.col_phone,
        render: (_v, c) => (
          <div className="text-xs text-morandi-primary">{c.phone || '-'}</div>
        ),
      },
      {
        key: 'travel_types',
        label: L.col_travel_types,
        render: (_v, c) => (
          <div className="flex flex-wrap gap-1">
            {c.travel_types?.length ? (
              c.travel_types.slice(0, 3).map(t => (
                <span
                  key={t}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-morandi-muted/20 text-morandi-secondary"
                >
                  {t}
                </span>
              ))
            ) : (
              <span className="text-xs text-morandi-secondary">-</span>
            )}
            {c.travel_types?.length > 3 && (
              <span className="text-[10px] text-morandi-secondary">+{c.travel_types.length - 3}</span>
            )}
          </div>
        ),
      },
      {
        key: 'status',
        label: L.col_status,
        sortable: true,
        render: (_v, c) => (
          <span
            className={`text-[11px] font-medium px-2 py-0.5 rounded ${STATUS_CLASS_MAP[c.status]}`}
          >
            {STATUS_LABEL_MAP[c.status]}
          </span>
        ),
      },
      {
        key: 'updated_at',
        label: L.col_updated,
        sortable: true,
        render: (_v, c) => (
          <DateCell
            date={c.updated_at}
            showIcon={false}
            className="text-xs text-morandi-secondary"
          />
        ),
      },
    ],
    []
  )

  return (
    <ContentPageLayout
      title={L.page_title}
      icon={Palette}
      showSearch
      searchTerm={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder={L.search_placeholder}
      primaryAction={{
        label: L.btn_add_client,
        icon: Plus,
        onClick: openCreateDialog,
      }}
    >
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0">
          <EnhancedTable
            columns={columns}
            data={clients}
            serverPagination={{
              currentPage: page,
              pageSize: PAGE_SIZE,
              totalCount,
              onPageChange: setPage,
            }}
            onRowClick={handleRowClick}
            emptyMessage={L.empty_state}
            actions={(client: CisClient) => (
              <div className="flex items-center gap-1">
                <button
                  className="p-1 text-morandi-secondary hover:text-morandi-gold hover:bg-morandi-gold/10 rounded transition-colors"
                  title={L.title_edit}
                  onClick={e => {
                    e.stopPropagation()
                    openEditDialog(client)
                  }}
                >
                  <Edit size={14} />
                </button>
                <button
                  className="p-1 text-morandi-secondary hover:text-status-danger hover:bg-status-danger-bg rounded transition-colors"
                  title={L.title_delete}
                  onClick={e => {
                    e.stopPropagation()
                    handleDelete(client)
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          />
        </div>
      </div>

      <CisClientDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        initialClient={editingClient}
        statusOptions={CIS_CLIENT_STATUS_OPTIONS}
        onSubmit={async data => {
          if (dialogMode === 'create') {
            await createCisClient(data)
          } else if (editingClient) {
            await updateCisClient(editingClient.id, data)
          }
          await refresh()
        }}
      />
    </ContentPageLayout>
  )
}
