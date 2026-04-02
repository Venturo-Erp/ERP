'use client'

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { logger } from '@/lib/utils/logger'
import type { Database } from '@/lib/supabase/types'
import { OFFICE_LABELS } from '../constants/labels'

type OfficeDocument = Database['public']['Tables']['office_documents']['Row']
type DocumentType = 'spreadsheet' | 'document' | 'slides'

interface CreateDocumentOptions {
  name: string
  type: DocumentType
  data?: unknown
  tourId?: string | null
}

interface UseOfficeDocumentReturn {
  // 狀態
  documents: OfficeDocument[]
  isLoading: boolean
  isSaving: boolean
  error: string | null

  // 操作
  fetchDocuments: () => Promise<void>
  fetchDocumentsByTour: (tourId: string) => Promise<OfficeDocument[]>
  fetchDocument: (id: string) => Promise<OfficeDocument | null>
  createDocument: (options: CreateDocumentOptions) => Promise<OfficeDocument | null>
  saveDocument: (id: string, data: unknown, name?: string) => Promise<boolean>
  saveAsDocument: (
    originalId: string,
    newName: string,
    data: unknown,
    tourId?: string | null
  ) => Promise<OfficeDocument | null>
  saveToTour: (id: string, tourId: string) => Promise<boolean>
  deleteDocument: (id: string) => Promise<boolean>
}

export function useOfficeDocument(): UseOfficeDocumentReturn {
  const [documents, setDocuments] = useState<OfficeDocument[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { user } = useAuthStore()
  const workspaceId = user?.workspace_id

  // 取得我的文件（私人，tour_id IS NULL）
  const fetchDocuments = useCallback(async () => {
    if (!workspaceId) {
      setError(OFFICE_LABELS.無法取得工作區資訊)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('office_documents')
        .select('id, name, data, type, tour_id, workspace_id, created_at, created_by, updated_at, updated_by')
        .is('tour_id', null)
        .order('updated_at', { ascending: false })
        .limit(500)

      if (fetchError) throw fetchError

      setDocuments(data || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : OFFICE_LABELS.載入文件失敗
      setError(message)
      logger.error('fetchDocuments failed', { error: err })
    } finally {
      setIsLoading(false)
    }
  }, [workspaceId])

  // 取得某個旅遊團的文件
  const fetchDocumentsByTour = useCallback(async (tourId: string): Promise<OfficeDocument[]> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('office_documents')
        .select('id, name, data, type, tour_id, workspace_id, created_at, created_by, updated_at, updated_by')
        .eq('tour_id', tourId)
        .order('updated_at', { ascending: false })
        .limit(500)

      if (fetchError) throw fetchError

      return data || []
    } catch (err) {
      logger.error('fetchDocumentsByTour failed', { tourId, error: err })
      return []
    }
  }, [])

  // 取得單一文件
  const fetchDocument = useCallback(async (id: string): Promise<OfficeDocument | null> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('office_documents')
        .select('id, name, data, type, tour_id, workspace_id, created_at, created_by, updated_at, updated_by')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError

      return data
    } catch (err) {
      logger.error('fetchDocument failed', { id, error: err })
      return null
    }
  }, [])

  // 建立新文件
  const createDocument = useCallback(
    async (options: CreateDocumentOptions): Promise<OfficeDocument | null> => {
      if (!workspaceId) {
        setError(OFFICE_LABELS.無法取得工作區資訊)
        return null
      }

      const { name, type, data, tourId } = options

      setIsSaving(true)
      setError(null)

      try {
        const { data: newDoc, error: insertError } = await supabase
          .from('office_documents')
          .insert({
            name,
            type,
            data: (data ||
              {}) as Database['public']['Tables']['office_documents']['Insert']['data'],
            tour_id: tourId || null,
            created_by: user?.employee_number || null,
            updated_by: user?.employee_number || null,
          })
          .select()
          .single()

        if (insertError) throw insertError

        // 只有私人文件才更新本地列表
        if (!tourId) {
          setDocuments(prev => [newDoc, ...prev])
        }

        return newDoc
      } catch (err) {
        const message = err instanceof Error ? err.message : OFFICE_LABELS.建立文件失敗
        setError(message)
        logger.error('createDocument failed', { name, type, error: err })
        return null
      } finally {
        setIsSaving(false)
      }
    },
    [workspaceId, user]
  )

  // 儲存文件
  const saveDocument = useCallback(
    async (id: string, data: unknown, name?: string): Promise<boolean> => {
      setIsSaving(true)
      setError(null)

      try {
        const updateData: Record<string, unknown> = {
          data,
          updated_by: user?.employee_number || null,
        }

        if (name) {
          updateData.name = name
        }

        const { error: updateError } = await supabase
          .from('office_documents')
          .update(updateData)
          .eq('id', id)

        if (updateError) throw updateError

        // 更新本地列表
        setDocuments(prev =>
          prev.map(doc =>
            doc.id === id
              ? {
                  ...doc,
                  data: data as OfficeDocument['data'],
                  name: name || doc.name,
                  updated_at: new Date().toISOString(),
                }
              : doc
          )
        )

        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : OFFICE_LABELS.儲存文件失敗
        setError(message)
        logger.error('saveDocument failed', { id, error: err })
        return false
      } finally {
        setIsSaving(false)
      }
    },
    [user]
  )

  // 另存新檔（可指定旅遊團）
  const saveAsDocument = useCallback(
    async (
      originalId: string,
      newName: string,
      data: unknown,
      tourId?: string | null
    ): Promise<OfficeDocument | null> => {
      // 先取得原始文件的類型
      const original = documents.find(d => d.id === originalId)
      if (!original) {
        const fetched = await fetchDocument(originalId)
        if (!fetched) {
          setError(OFFICE_LABELS.找不到原始文件)
          return null
        }
        return createDocument({
          name: newName,
          type: fetched.type as DocumentType,
          data,
          tourId,
        })
      }

      return createDocument({
        name: newName,
        type: original.type as DocumentType,
        data,
        tourId,
      })
    },
    [documents, fetchDocument, createDocument]
  )

  // 把文件存到旅遊團（從私人變成團的）
  const saveToTour = useCallback(
    async (id: string, tourId: string): Promise<boolean> => {
      setIsSaving(true)
      setError(null)

      try {
        const { error: updateError } = await supabase
          .from('office_documents')
          .update({
            tour_id: tourId,
            updated_by: user?.employee_number || null,
          })
          .eq('id', id)

        if (updateError) throw updateError

        // 從私人列表移除
        setDocuments(prev => prev.filter(doc => doc.id !== id))

        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : OFFICE_LABELS.存到旅遊團失敗
        setError(message)
        logger.error('saveToTour failed', { id, tourId, error: err })
        return false
      } finally {
        setIsSaving(false)
      }
    },
    [user]
  )

  // 刪除文件
  const deleteDocument = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase.from('office_documents').delete().eq('id', id)

      if (deleteError) throw deleteError

      // 更新本地列表
      setDocuments(prev => prev.filter(doc => doc.id !== id))

      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : OFFICE_LABELS.刪除文件失敗
      setError(message)
      logger.error('deleteDocument failed', { id, error: err })
      return false
    }
  }, [])

  return {
    documents,
    isLoading,
    isSaving,
    error,
    fetchDocuments,
    fetchDocumentsByTour,
    fetchDocument,
    createDocument,
    saveDocument,
    saveAsDocument,
    saveToTour,
    deleteDocument,
  }
}
