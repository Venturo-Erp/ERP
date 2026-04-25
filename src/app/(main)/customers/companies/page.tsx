'use client'
/**
 * 企業客戶管理頁面
 *
 * 功能：
 * 1. 企業客戶列表
 * 2. 新增/編輯企業客戶
 * 3. 查看企業詳情（含聯絡人）
 * 4. VIP 等級管理
 * 5. 付款條件設定
 */

import { logger } from '@/lib/utils/logger'
import { useState, useCallback } from 'react'
import { ListPageLayout } from '@/components/layout/list-page-layout'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useAuthStore, type Company } from '@/stores'
import { useCompanies, createCompany, updateCompany, deleteCompany } from '@/data'
import { useCompanyColumns } from './components/CompanyTableColumns'
import { CompanyFormDialog } from './components/CompanyFormDialog'
import { CompanyDetailDialog } from './components/CompanyDetailDialog'
import type { CreateCompanyData } from '@/types/company.types'
import { alert, confirm } from '@/lib/ui/alert-dialog'
import { supabase } from '@/lib/supabase/client'
import { COMPANY_LABELS as L } from './constants/labels'

export default function CompaniesPage() {
  const { items: companies } = useCompanies()
  const { user } = useAuthStore()
  const workspaceId = user?.workspace_id || ''

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Company | undefined>(undefined)
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const handleViewDetail = useCallback((company: Company) => {
    setSelectedCompany(company)
    setIsDetailOpen(true)
  }, [])

  const handleUpdateFromDetail = useCallback(
    async (data: CreateCompanyData) => {
      if (!selectedCompany) return

      try {
        await updateCompany(selectedCompany.id, data)
        setSelectedCompany({ ...selectedCompany, ...data } as Company)
        await alert(L.UPDATE_SUCCESS, 'success')
      } catch (error) {
        logger.error('Failed to update company:', error)
        await alert(L.UPDATE_FAILED, 'error')
      }
    },
    [selectedCompany]
  )

  const handleCreate = useCallback(async (data: CreateCompanyData) => {
    try {
      await createCompany(data as Parameters<typeof createCompany>[0])
      setIsDialogOpen(false)
      await alert(L.CREATE_SUCCESS, 'success')
    } catch (error) {
      logger.error('Failed to create company:', error)
      await alert(L.CREATE_FAILED, 'error')
    }
  }, [])

  const handleEdit = useCallback(
    async (data: CreateCompanyData) => {
      if (!editingCompany) return

      try {
        await updateCompany(editingCompany.id, data)
        setEditingCompany(undefined)
        setIsDialogOpen(false)
        await alert(L.UPDATE_SUCCESS, 'success')
      } catch (error) {
        logger.error('Failed to update company:', error)
        await alert(L.UPDATE_FAILED, 'error')
      }
    },
    [editingCompany]
  )

  const handleOpenCreateDialog = useCallback(() => {
    setEditingCompany(undefined)
    setIsDialogOpen(true)
  }, [])

  const handleOpenEditDialog = useCallback((company: Company) => {
    setEditingCompany(company)
    setIsDialogOpen(true)
  }, [])

  const handleDeleteCompany = useCallback(async (company: Company) => {
    try {
      const { data: contacts, error: contactsError } = await supabase
        .from('company_contacts')
        .select('id, name')
        .eq('company_id', company.id)
        .limit(5)

      if (contactsError) {
        logger.error('Error checking contacts:', contactsError)
      }

      let confirmMsg: string
      if (contacts && contacts.length > 0) {
        const contactNames = contacts.map(c => c.name).join('、')
        const contactInfo =
          contacts.length > 5 ? L.CONTACTS_OVERFLOW(contactNames, contacts.length) : contactNames
        confirmMsg = L.DELETE_WITH_CONTACTS(contacts.length, contactInfo, company.company_name)
      } else {
        confirmMsg = L.DELETE_SIMPLE(company.company_name)
      }

      const confirmed = await confirm(confirmMsg, {
        title: L.DELETE_TITLE,
        type: 'warning',
        confirmText: L.DELETE_CONFIRM,
        cancelText: L.DELETE_CANCEL,
      })

      if (!confirmed) return

      await deleteCompany(company.id)
      await alert(L.DELETE_SUCCESS, 'success')
    } catch (error) {
      logger.error('Failed to delete company:', error)
      await alert(L.DELETE_FAILED, 'error')
    }
  }, [])

  const columns = useCompanyColumns({
    onView: handleViewDetail,
    onEdit: handleOpenEditDialog,
    onDelete: handleDeleteCompany,
  })

  return (
    <>
      <ListPageLayout
        title={L.PAGE_TITLE}
        data={companies}
        columns={columns}
        searchFields={['company_name', 'tax_id'] as (keyof Company)[]}
        searchPlaceholder={L.SEARCH_PLACEHOLDER}
        onRowClick={handleViewDetail}
        headerActions={
          <Button
            onClick={handleOpenCreateDialog}
            className="bg-morandi-gold/15 text-morandi-primary border border-morandi-gold/30 hover:bg-morandi-gold/25 hover:border-morandi-gold/50 transition-colors"
          >
            <Plus size={16} className="mr-2" />
            {L.ADD_COMPANY}
          </Button>
        }
        defaultSort={{ key: 'created_at', direction: 'desc' }}
      />

      <CompanyFormDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false)
          setEditingCompany(undefined)
        }}
        onSubmit={editingCompany ? handleEdit : handleCreate}
        workspaceId={workspaceId}
        company={editingCompany}
      />

      <CompanyDetailDialog
        company={selectedCompany}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onUpdate={handleUpdateFromDetail}
      />
    </>
  )
}
