'use client'

import useSWR from 'swr'
import { supabase } from '@/lib/supabase/client'
import { useWorkspaceId } from '@/lib/workspace-context'
import { logger } from '@/lib/utils/logger'
import type { Design, DesignType } from '../types'
import { LABELS } from '../constants/labels'

const DESIGNS_KEY = 'designs'

/**
 * 設計資料 Hook
 */
export function useDesigns() {
  const workspaceId = useWorkspaceId()

  const { data, error, isLoading, mutate } = useSWR(
    workspaceId ? [DESIGNS_KEY, workspaceId] : null,
    async () => {
      // 先取得所有設計文件
      const { data: docs, error: docsError } = await supabase
        .from('brochure_documents')
        .select(
          'id, name, tour_id, tour_name, tour_code, type, design_type, status, workspace_id, created_at, updated_at'
        )
        .eq('workspace_id', workspaceId!)
        .order('created_at', { ascending: false })
        .limit(200)

      if (docsError) throw docsError

      // 取得有 tour_id 的文件的團資料
      const tourIds = (docs || []).map(d => d.tour_id).filter((id): id is string => !!id)

      let tourMap: Record<string, { name: string | null; code: string | null }> = {}

      if (tourIds.length > 0) {
        const { data: tours } = await supabase
          .from('tours')
          .select('id, name, code')
          .in('id', tourIds)

        if (tours) {
          tourMap = Object.fromEntries(tours.map(t => [t.id, { name: t.name, code: t.code }]))
        }
      }

      // 合併資料
      return (docs || []).map(doc => ({
        ...doc,
        tour_name: (doc.tour_id && tourMap[doc.tour_id]?.name) || doc.tour_name,
        tour_code: (doc.tour_id && tourMap[doc.tour_id]?.code) || doc.tour_code,
        // 如果 design_type 為空，默認 brochure_a5
        design_type: doc.design_type || 'brochure_a5',
      })) as Design[]
    }
  )

  const createDesign = async (params: {
    design_type: DesignType
    tour_id?: string
    tour_code?: string
    tour_name?: string
    itinerary_id?: string
    itinerary_name?: string
    name?: string
  }) => {
    if (!workspaceId) throw new Error('No workspace')

    const { data, error } = await supabase
      .from('brochure_documents')
      .insert({
        design_type: params.design_type,
        tour_id: params.tour_id || null,
        tour_code: params.tour_code || null,
        tour_name: params.tour_name || null,
        itinerary_id: params.itinerary_id || null,
        itinerary_name: params.itinerary_name || null,
        name: params.name || LABELS.untitledDesign,
        status: 'draft',
        type: 'full',
      })
      .select()
      .single()

    if (error) throw error

    // 樂觀更新
    await mutate(current => [data as Design, ...(current || [])], false)

    return data as Design
  }

  const updateDesign = async (id: string, updates: Partial<Design>) => {
    const { error } = await supabase.from('brochure_documents').update(updates).eq('id', id)

    if (error) throw error

    // 樂觀更新
    await mutate(current => current?.map(d => (d.id === id ? { ...d, ...updates } : d)), false)
  }

  const deleteDesign = async (id: string) => {
    if (!workspaceId) throw new Error('No workspace')

    // 1. 取得所有版本資料，找出使用的圖片
    const { data: versions, error: versionsError } = await supabase
      .from('brochure_versions')
      .select('data')
      .eq('document_id', id)

    if (versionsError) {
      // 版本查詢失敗，繼續嘗試刪除文件
      logger.warn('Failed to fetch versions for cleanup:', versionsError)
    }

    // 2. 從版本資料中解析出所有圖片 URL
    const imageUrls: string[] = []
    if (versions) {
      for (const version of versions) {
        const versionData = version.data as Record<string, unknown>
        if (versionData?.pages && Array.isArray(versionData.pages)) {
          for (const page of versionData.pages as Array<{ fabricData?: Record<string, unknown> }>) {
            if (page.fabricData?.objects && Array.isArray(page.fabricData.objects)) {
              for (const obj of page.fabricData.objects as Array<{ type?: string; src?: string }>) {
                if (obj.type === 'image' && obj.src && obj.src.includes('brochure-images')) {
                  imageUrls.push(obj.src)
                }
              }
            }
          }
        }
        // 也檢查 templateData 中的封面圖片
        const templateData = versionData?.templateData as Record<string, unknown> | undefined
        if (
          templateData?.coverImage &&
          typeof templateData.coverImage === 'string' &&
          templateData.coverImage.includes('brochure-images')
        ) {
          imageUrls.push(templateData.coverImage)
        }
      }
    }

    // 3. 刪除 Storage 中的圖片（失敗不阻止刪除流程）
    if (imageUrls.length > 0) {
      // 從 URL 中提取檔案路徑
      const filePaths = imageUrls
        .map(url => {
          // URL 格式: https://xxx.supabase.co/storage/v1/object/public/brochure-images/path/to/file.jpg
          const match = url.match(/brochure-images\/(.+)$/)
          return match ? match[1] : null
        })
        .filter((path): path is string => !!path)
        // 去除重複
        .filter((path, index, self) => self.indexOf(path) === index)

      if (filePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('brochure-images')
          .remove(filePaths)
        if (storageError) {
          logger.warn('Failed to delete storage images:', storageError)
        }
      }
    }

    // 4. 刪除版本記錄（cascade 會自動處理，但明確刪除更安全）
    const { error: deleteVersionsError } = await supabase
      .from('brochure_versions')
      .delete()
      .eq('document_id', id)

    if (deleteVersionsError) {
      logger.warn('Failed to delete versions:', deleteVersionsError)
      // 繼續嘗試刪除文件，可能會因為 cascade 規則而成功
    }

    // 5. 刪除文件記錄
    logger.log('Deleting brochure_documents:', { id, workspaceId })
    const { error, data: deletedData } = await supabase
      .from('brochure_documents')
      .delete()
      .eq('id', id)
      .select()
      .single()

    logger.log('Delete result:', { error, deletedData })

    if (error) {
      // PGRST116 表示沒有找到記錄（可能已被刪除或 RLS 阻止）
      if (error.code === 'PGRST116') {
        logger.warn('Document not found or already deleted:', id)
      } else {
        logger.error('Delete brochure_documents failed:', error)
        throw error
      }
    }

    // 樂觀更新
    await mutate(current => current?.filter(d => d.id !== id), false)
    logger.log('Design deleted successfully:', id)
  }

  const duplicateDesign = async (design: Design) => {
    if (!workspaceId) throw new Error('No workspace')

    // 1. 複製文件記錄
    const { data: newDoc, error: docError } = await supabase
      .from('brochure_documents')
      .insert({
        design_type: design.design_type,
        tour_id: design.tour_id || null,
        tour_code: design.tour_code || null,
        tour_name: design.tour_name || null,
        itinerary_id: design.itinerary_id || null,
        itinerary_name: design.itinerary_name || null,
        name: `${design.name} (副本)`,
        status: 'draft',
        type: 'full',
        // Note: thumbnail_url does not exist on brochure_documents table
      })
      .select()
      .single()

    if (docError) throw docError

    // 2. 複製最新版本
    const { data: latestVersion } = await supabase
      .from('brochure_versions')
      .select('id, document_id, version_number, data, thumbnail_url, created_at')
      .eq('document_id', design.id)
      .order('version_number', { ascending: false })
      .limit(1)
      .single()

    if (latestVersion) {
      await supabase.from('brochure_versions').insert({
        document_id: newDoc.id,
        version_number: 1,
        data: latestVersion.data,
        thumbnail_url: latestVersion.thumbnail_url,
      })
    }

    await mutate()
    return newDoc as Design
  }

  return {
    designs: data || [],
    isLoading,
    error,
    createDesign,
    updateDesign,
    deleteDesign,
    duplicateDesign,
    refresh: mutate,
  }
}
