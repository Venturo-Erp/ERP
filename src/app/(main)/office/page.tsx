'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Edit2, Trash2, FileSpreadsheet, FileText, Presentation } from 'lucide-react'
import { ListPageLayout } from '@/components/layout/list-page-layout'
import { DateCell, ActionCell } from '@/components/table-cells'
import { confirm } from '@/lib/ui/alert-dialog'
import { NewDocumentDialog } from '@/features/office/components/NewDocumentDialog'
import { useOfficeDocument } from '@/features/office/hooks/useOfficeDocument'
import { useState } from 'react'
import type { Database } from '@/lib/supabase/types'
import { OFFICE_LABELS } from './constants/labels'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'

type OfficeDocument = Database['public']['Tables']['office_documents']['Row']
type DocumentType = 'spreadsheet' | 'document' | 'slides'

// 取得文件類型圖標
function getDocTypeIcon(type: string) {
  switch (type) {
    case 'spreadsheet':
      return <FileSpreadsheet className="w-5 h-5 text-morandi-green" />
    case 'document':
      return <FileText className="w-5 h-5 text-status-info" />
    case 'slides':
      return <Presentation className="w-5 h-5 text-status-warning" />
    default:
      return <FileText className="w-5 h-5 text-morandi-secondary" />
  }
}

export default function OfficePage() {
  const router = useRouter()
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false)

  const { documents, isLoading, fetchDocuments, deleteDocument } = useOfficeDocument()

  // 載入文件列表
  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const handleDelete = async (id: string) => {
    const confirmed = await confirm('確定要刪除此文件嗎？', {
      title: '刪除文件',
      type: 'warning',
    })
    if (confirmed) {
      await deleteDocument(id)
    }
  }

  const handleOpenEditor = (doc: OfficeDocument) => {
    router.push(`/office/editor?id=${doc.id}&name=${encodeURIComponent(doc.name)}&type=${doc.type}`)
  }

  const handleRename = async (doc: OfficeDocument) => {
    const newName = prompt('請輸入新檔名', doc.name)
    if (!newName || newName === doc.name) return

    try {
      const { error } = await supabase
        .from('office_documents')
        .update({ name: newName })
        .eq('id', doc.id)

      if (error) throw error

      toast.success('已更新檔名')
      fetchDocuments()
    } catch (error) {
      toast.error('更新失敗')
    }
  }

  const handleCreate = () => {
    setIsNewDialogOpen(true)
  }

  const columns = [
    {
      key: 'type',
      label: '類型',
      width: '60px',
      render: (_: unknown, row: OfficeDocument) => (
        <div className="flex items-center justify-center">{getDocTypeIcon(row.type)}</div>
      ),
    },
    {
      key: 'name',
      label: '檔名',
      render: (_: unknown, row: OfficeDocument) => (
        <button
          onClick={() => handleOpenEditor(row)}
          className="font-medium text-morandi-primary hover:underline text-left"
        >
          {row.name}
        </button>
      ),
    },
    {
      key: 'created_by',
      label: '作者',
      width: '120px',
      render: (_: unknown, row: OfficeDocument) => (
        <span className="text-morandi-text-secondary">{row.created_by || '-'}</span>
      ),
    },
    {
      key: 'updated_at',
      label: '更新時間',
      width: '180px',
      render: (_: unknown, row: OfficeDocument) => <DateCell date={row.updated_at} format="long" />,
    },
    {
      key: 'actions',
      label: '操作',
      width: '100px',
      render: (_: unknown, row: OfficeDocument) => (
        <ActionCell
          actions={[
            { icon: Edit2, label: '重新命名', onClick: () => handleRename(row) },
            { icon: FileText, label: '開啟編輯器', onClick: () => handleOpenEditor(row) },
            { icon: Trash2, label: '刪除', onClick: () => handleDelete(row.id), variant: 'danger' },
          ]}
        />
      ),
    },
  ]

  return (
    <>
      <ListPageLayout
        title={OFFICE_LABELS.MANAGE_2189}
        data={documents}
        columns={columns}
        searchable
        searchPlaceholder="搜尋檔名..."
        searchFields={['name']}
        loading={isLoading}
        headerActions={
          <button
            onClick={handleCreate}
            className="bg-morandi-gold hover:bg-morandi-gold-hover text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            {OFFICE_LABELS.ADD}
          </button>
        }
      />

      <NewDocumentDialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen} />
    </>
  )
}
