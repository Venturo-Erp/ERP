/**
 * Shared canvas state management hook
 */

import { useState, useCallback } from 'react'
import { ViewMode, EditMode, DocumentFilter, EditorState } from './types'

function useCanvasState() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [editMode, setEditMode] = useState<EditMode>('view')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTag, setSelectedTag] = useState<string>('')

  const resetFilters = useCallback(() => {
    setSearchTerm('')
    setSelectedTag('')
  }, [])

  const filter: DocumentFilter = {
    searchTerm,
    selectedTag,
  }

  return {
    viewMode,
    setViewMode,
    editMode,
    setEditMode,
    searchTerm,
    setSearchTerm,
    selectedTag,
    setSelectedTag,
    filter,
    resetFilters,
  }
}

export function useEditorState() {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)

  const resetUploadProgress = useCallback(() => {
    setUploadProgress(null)
  }, [])

  const state: EditorState = {
    isDragging,
    uploadProgress,
  }

  return {
    isDragging,
    setIsDragging,
    uploadProgress,
    setUploadProgress,
    resetUploadProgress,
    state,
  }
}
