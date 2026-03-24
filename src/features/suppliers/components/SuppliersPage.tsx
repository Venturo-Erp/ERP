'use client'
/**
 * SuppliersPage - 供應商管理頁面（僅基本資訊）
 */

import { logger } from '@/lib/utils/logger'
import React, { useState, useCallback } from 'react'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Button } from '@/components/ui/button'
import { Building2, FileSpreadsheet } from 'lucide-react'
import { SuppliersList } from './SuppliersList'
import { SuppliersDialog } from './SuppliersDialog'
import { ImportSuppliersDialog } from './ImportSuppliersDialog'
import {
  useSuppliersSlim,
  createSupplier,
  updateSupplier,
  deleteSupplier as deleteSupplierApi,
} from '@/data'
import type { Supplier } from '@/types/supplier.types'
import { confirm, alert } from '@/lib/ui/alert-dialog'
import { LABELS, SUPPLIERS_PAGE_LABELS, SUPPLIER_IMPORT_LABELS } from '../constants/labels'

export const SuppliersPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)

  const { items: suppliers } = useSuppliersSlim()

  // 完整的表單狀態
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    english_name: '',
    tax_id: '',
    bank_name: '',
    bank_branch: '',
    bank_code_legacy: '',
    bank_account_name: '',
    bank_account: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  })

  // 過濾供應商
  const filteredSuppliers = suppliers.filter(supplier =>
    searchQuery
      ? supplier.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.bank_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.bank_account?.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  )

  const handleOpenAddDialog = useCallback(() => {
    setIsEditMode(false)
    setEditingSupplier(null)
    setIsAddDialogOpen(true)
  }, [])

  const handleEdit = useCallback((supplier: Supplier) => {
    setIsEditMode(true)
    setEditingSupplier(supplier)
    setFormData({
      name: supplier.name || '',
      code: supplier.code || '',
      english_name: supplier.english_name || '',
      tax_id: supplier.tax_id || '',
      bank_name: supplier.bank_name || '',
      bank_branch: supplier.bank_branch || '',
      bank_code_legacy: supplier.bank_code_legacy || '',
      bank_account_name: supplier.bank_account_name || '',
      bank_account: supplier.bank_account || '',
      contact_person: supplier.contact_person || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      notes: supplier.notes || '',
    })
    setIsAddDialogOpen(true)
  }, [])

  const handleDelete = useCallback(async (supplier: Supplier) => {
    const confirmed = await confirm(SUPPLIERS_PAGE_LABELS.DELETE_CONFIRM(supplier.name), {
      title: LABELS.deleteSupplier,
      type: 'warning',
    })
    if (!confirmed) return

    try {
      await deleteSupplierApi(supplier.id)
      await alert(SUPPLIERS_PAGE_LABELS.DELETE_SUCCESS, 'success')
    } catch (error) {
      logger.error('❌ Delete Supplier Error:', error)
      await alert(SUPPLIERS_PAGE_LABELS.DELETE_FAILED, 'error')
    }
  }, [])

  const handleCloseDialog = useCallback(() => {
    setIsAddDialogOpen(false)
    setIsEditMode(false)
    setEditingSupplier(null)
    setFormData({
      name: '',
      code: '',
      english_name: '',
      tax_id: '',
      bank_name: '',
      bank_branch: '',
      bank_code_legacy: '',
      bank_account_name: '',
      bank_account: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      notes: '',
    })
  }, [])

  const handleFormFieldChange = useCallback(
    <K extends keyof typeof formData>(field: K, value: (typeof formData)[K]) => {
      setFormData(prev => ({ ...prev, [field]: value }))
    },
    []
  )

  const handleSubmit = useCallback(async () => {
    try {
      if (isEditMode && editingSupplier) {
        // 更新模式
        await updateSupplier(editingSupplier.id, {
          name: formData.name,
          code: formData.code || null,
          english_name: formData.english_name || null,
          tax_id: formData.tax_id || null,
          bank_name: formData.bank_name || null,
          bank_branch: formData.bank_branch || null,
          bank_code_legacy: formData.bank_code_legacy || null,
          bank_account_name: formData.bank_account_name || null,
          bank_account: formData.bank_account || null,
          contact_person: formData.contact_person || null,
          phone: formData.phone || null,
          email: formData.email || null,
          address: formData.address || null,
          notes: formData.notes || null,
        })
        await alert(SUPPLIERS_PAGE_LABELS.UPDATE_SUCCESS, 'success')
      } else {
        // 新增模式
        await createSupplier({
          name: formData.name,
          code: formData.code || undefined,
          english_name: formData.english_name || undefined,
          tax_id: formData.tax_id || undefined,
          bank_name: formData.bank_name || undefined,
          bank_branch: formData.bank_branch || undefined,
          bank_code_legacy: formData.bank_code_legacy || undefined,
          bank_account_name: formData.bank_account_name || undefined,
          bank_account: formData.bank_account || undefined,
          contact_person: formData.contact_person || undefined,
          phone: formData.phone || undefined,
          email: formData.email || undefined,
          address: formData.address || undefined,
          notes: formData.notes || undefined,
          type: 'other', // 預設類別
        })
        await alert(SUPPLIERS_PAGE_LABELS.CREATE_SUCCESS, 'success')
      }
      handleCloseDialog()
    } catch (error) {
      logger.error('❌ Save Supplier Error:', error)
      await alert(SUPPLIERS_PAGE_LABELS.SAVE_FAILED, 'error')
    }
  }, [formData, isEditMode, editingSupplier, handleCloseDialog])

  return (
    <ContentPageLayout
      title={LABELS.supplierManagement}
      icon={Building2}
      breadcrumb={[
        { label: LABELS.home, href: '/dashboard' },
        { label: LABELS.databaseManagement, href: '/database' },
        { label: LABELS.supplierManagement, href: '/database/suppliers' },
      ]}
      showSearch
      searchTerm={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder={LABELS.searchPlaceholder}
      onAdd={handleOpenAddDialog}
      addLabel={LABELS.addSupplier}
      headerActions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsImportDialogOpen(true)}
          className="gap-2"
        >
          <FileSpreadsheet size={16} />
          <span className="hidden sm:inline">{SUPPLIER_IMPORT_LABELS.btn_select_file}</span>
        </Button>
      }
    >
      <SuppliersList suppliers={filteredSuppliers} onEdit={handleEdit} onDelete={handleDelete} />

      {/* 新增/編輯供應商對話框 */}
      <SuppliersDialog
        isOpen={isAddDialogOpen}
        onClose={handleCloseDialog}
        formData={formData}
        onFormFieldChange={handleFormFieldChange}
        onSubmit={handleSubmit}
        isEditMode={isEditMode}
      />

      {/* 批次匯入對話框 */}
      <ImportSuppliersDialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen} />
    </ContentPageLayout>
  )
}
