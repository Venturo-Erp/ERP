/**
 * Shared types for canvas components
 */

export type ViewMode = 'grid' | 'list'
export type EditMode = 'view' | 'create' | 'edit'

export interface CanvasEditorProps {
  channelId: string
  canvasId?: string
}

interface PersonalCanvasProps {
  canvasId?: string
}

export interface DocumentFilter {
  searchTerm: string
  selectedTag: string
}

export interface EditorState {
  isDragging: boolean
  uploadProgress: number | null
}
