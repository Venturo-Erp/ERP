'use client'
/**
 * CompanyAssetsPage - 公司資源管理頁面
 *
 * 列表模式 — 簡潔的檔案清單
 */

import { logger } from '@/lib/utils/logger'
import React, { useState, useCallback, useEffect } from 'react'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { FolderArchive } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CompanyAssetsList } from './CompanyAssetsList'
import { CompanyAssetsDialog } from './CompanyAssetsDialog'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores'
import { confirm, alert } from '@/lib/ui/alert-dialog'
import type { CompanyAsset, CompanyAssetType } from '@/types/company-asset.types'
import { COMPANY_ASSETS_LABELS } from '../constants/labels'

export const CompanyAssetsPage: React.FC = () => {
  const user = useAuthStore(state => state.user)
  const [searchQuery, setSearchQuery] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingAsset, setEditingAsset] = useState<CompanyAsset | null>(null)
  const [assets, setAssets] = useState<CompanyAsset[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [previewAsset, setPreviewAsset] = useState<CompanyAsset | null>(null)

  // 表單狀態
  const [formData, setFormData] = useState({
    name: '',
    asset_type: 'image' as CompanyAssetType,
    file: null as File | null,
    restricted: false,
  })

  // 判斷是否為管理者或會計
  // 管理員或有 accounting 權限的可以存取
  const isAdminOrAccountant =
    user?.permissions?.includes('admin') ||
    user?.permissions?.includes('*') ||
    user?.permissions?.includes('accounting')

  // 載入資料
  const fetchAssets = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('company_assets')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500)

      if (error) throw error

      // 過濾受限資源（非管理者/會計看不到）
      const filteredData = (data || []).filter(asset => {
        const assetWithRestricted = asset as typeof asset & { restricted?: boolean }
        if (!assetWithRestricted.restricted) return true
        return isAdminOrAccountant
      })

      setAssets(filteredData as unknown as CompanyAsset[])
    } catch (error) {
      logger.error(COMPANY_ASSETS_LABELS.載入公司資源失敗, error)
    }
  }, [isAdminOrAccountant])

  useEffect(() => {
    fetchAssets()
  }, [fetchAssets])

  // 過濾資源
  const filteredAssets = assets.filter(asset =>
    searchQuery ? asset.name?.toLowerCase().includes(searchQuery.toLowerCase()) : true
  )

  const handleOpenAddDialog = useCallback(() => {
    setIsEditMode(false)
    setEditingAsset(null)
    setFormData({ name: '', asset_type: 'image', file: null, restricted: false })
    setIsDialogOpen(true)
  }, [])

  const handleEdit = useCallback((asset: CompanyAsset) => {
    setIsEditMode(true)
    setEditingAsset(asset)
    setFormData({
      name: asset.name || '',
      asset_type: asset.asset_type || 'image',
      file: null,
      restricted: asset.restricted || false,
    })
    setIsDialogOpen(true)
  }, [])

  const handleDelete = useCallback(
    async (asset: CompanyAsset) => {
      const confirmed = await confirm(`確定要刪除「${asset.name}」嗎？`, {
        title: COMPANY_ASSETS_LABELS.刪除資源,
        type: 'warning',
      })
      if (!confirmed) return

      try {
        const response = await fetch(
          `/api/storage/upload?bucket=company-assets&path=${encodeURIComponent(asset.file_path)}`,
          { method: 'DELETE' }
        )
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || COMPANY_ASSETS_LABELS.刪除失敗)
        }

        const { error } = await supabase.from('company_assets').delete().eq('id', asset.id)
        if (error) throw error

        await alert(COMPANY_ASSETS_LABELS.刪除成功, 'success')
        fetchAssets()
      } catch (error) {
        logger.error(COMPANY_ASSETS_LABELS.刪除失敗, error)
        await alert(COMPANY_ASSETS_LABELS.刪除失敗, 'error')
      }
    },
    [fetchAssets]
  )

  const handlePreview = useCallback((asset: CompanyAsset) => {
    setPreviewAsset(asset)
  }, [])

  const handleDownload = useCallback((asset: CompanyAsset) => {
    const { data } = supabase.storage.from('company-assets').getPublicUrl(asset.file_path)
    const link = document.createElement('a')
    link.href = data.publicUrl
    link.download = asset.name
    link.target = '_blank'
    link.click()
  }, [])

  const handleCloseDialog = useCallback(() => {
    setIsDialogOpen(false)
    setIsEditMode(false)
    setEditingAsset(null)
    setIsLoading(false)
    setFormData({ name: '', asset_type: 'image', file: null, restricted: false })
  }, [])

  const handleFormFieldChange = useCallback(
    <K extends keyof typeof formData>(field: K, value: (typeof formData)[K]) => {
      setFormData(prev => ({ ...prev, [field]: value }))
    },
    []
  )

  const uploadFile = async (file: File, filePath: string): Promise<void> => {
    const formDataToSend = new FormData()
    formDataToSend.append('file', file)
    formDataToSend.append('bucket', 'company-assets')
    formDataToSend.append('path', filePath)

    const response = await fetch('/api/storage/upload', {
      method: 'POST',
      body: formDataToSend,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || COMPANY_ASSETS_LABELS.上傳失敗)
    }
  }

  const deleteFile = async (filePath: string): Promise<void> => {
    const response = await fetch(
      `/api/storage/upload?bucket=company-assets&path=${encodeURIComponent(filePath)}`,
      { method: 'DELETE' }
    )

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || COMPANY_ASSETS_LABELS.刪除失敗)
    }
  }

  const handleSubmit = useCallback(async () => {
    if (!formData.name.trim()) {
      await alert(COMPANY_ASSETS_LABELS.請輸入資料名稱, 'warning')
      return
    }

    if (!isEditMode && !formData.file) {
      await alert(COMPANY_ASSETS_LABELS.請選擇檔案, 'warning')
      return
    }

    setIsLoading(true)
    try {
      if (isEditMode && editingAsset) {
        const updateData: Record<string, unknown> = {
          name: formData.name,
          asset_type: formData.asset_type,
          restricted: formData.restricted,
        }

        if (formData.file) {
          await deleteFile(editingAsset.file_path)

          const fileExt = formData.file.name.split('.').pop()
          const safeFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`
          const filePath = `assets/${safeFileName}`

          await uploadFile(formData.file, filePath)

          updateData.file_path = filePath
          updateData.file_size = formData.file.size
          updateData.mime_type = formData.file.type
        }

        const { error } = await supabase
          .from('company_assets')
          .update(updateData)
          .eq('id', editingAsset.id)

        if (error) throw error
        await alert(COMPANY_ASSETS_LABELS.更新成功, 'success')
      } else {
        const file = formData.file!
        const fileExt = file.name.split('.').pop()
        const safeFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`
        const filePath = `assets/${safeFileName}`

        await uploadFile(file, filePath)

        const userName =
          user?.display_name || user?.chinese_name || user?.personal_info?.email || 'Unknown'

        const { error: dbError } = await supabase.from('company_assets').insert({
          name: formData.name,
          asset_type: formData.asset_type,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: user?.id || null,
          uploaded_by_name: userName,
          description: formData.restricted ? COMPANY_ASSETS_LABELS.受限資源 : null,
          restricted: formData.restricted,
          workspace_id: user?.workspace_id ?? null,
        })

        if (dbError) throw dbError
        await alert(COMPANY_ASSETS_LABELS.新增成功, 'success')
      }

      handleCloseDialog()
      fetchAssets()
    } catch (error) {
      logger.error(COMPANY_ASSETS_LABELS.儲存失敗, error)
      await alert(
        `儲存失敗: ${error instanceof Error ? error.message : COMPANY_ASSETS_LABELS.未知錯誤}`,
        'error'
      )
    } finally {
      setIsLoading(false)
    }
  }, [formData, isEditMode, editingAsset, user, handleCloseDialog, fetchAssets])

  return (
    <ContentPageLayout
      title={COMPANY_ASSETS_LABELS.公司資源管理}
      icon={FolderArchive}
      breadcrumb={[
        { label: COMPANY_ASSETS_LABELS.首頁, href: '/dashboard' },
        { label: COMPANY_ASSETS_LABELS.資料庫管理, href: '/database' },
        { label: COMPANY_ASSETS_LABELS.公司資源管理, href: '/database/company-assets' },
      ]}
      showSearch
      searchTerm={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder={COMPANY_ASSETS_LABELS.搜尋檔案名稱}
      onAdd={handleOpenAddDialog}
      addLabel={COMPANY_ASSETS_LABELS.上傳檔案}
    >
      <div className="flex-1 overflow-auto">
        <CompanyAssetsList
          assets={filteredAssets}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onPreview={handlePreview}
          onDownload={handleDownload}
          onThumbnailClick={handlePreview}
        />
      </div>

      <CompanyAssetsDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        isEditMode={isEditMode}
        formData={formData}
        onFormFieldChange={handleFormFieldChange}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />

      {/* 預覽彈窗 */}
      <Dialog open={!!previewAsset} onOpenChange={open => !open && setPreviewAsset(null)}>
        <DialogContent level={1} className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-morandi-primary truncate">
              {previewAsset?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center justify-center bg-morandi-container/20 min-h-[300px] max-h-[60vh] rounded-lg">
            {previewAsset?.asset_type === 'image' ? (
              <img
                src={
                  supabase.storage.from('company-assets').getPublicUrl(previewAsset.file_path).data
                    .publicUrl
                }
                alt={previewAsset.name}
                className="max-w-full max-h-[55vh] object-contain"
              />
            ) : previewAsset?.asset_type === 'video' ? (
              <video
                src={
                  supabase.storage.from('company-assets').getPublicUrl(previewAsset.file_path).data
                    .publicUrl
                }
                controls
                className="max-w-full max-h-[55vh]"
              />
            ) : previewAsset ? (
              <iframe
                src={
                  supabase.storage.from('company-assets').getPublicUrl(previewAsset.file_path).data
                    .publicUrl
                }
                className="w-full h-[55vh] bg-card"
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </ContentPageLayout>
  )
}
