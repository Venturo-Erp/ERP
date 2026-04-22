import { Todo } from '@/stores/types'

export interface TodoExpandedViewProps {
  todo: Todo
  onUpdate: (updates: Partial<Todo>) => void
  onClose: () => void
}

export type QuickActionTab = 'receipt' | 'invoice' | 'share'

export interface QuickActionTabConfig {
  key: QuickActionTab
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
}

export interface NotesSectionProps {
  todo: Todo
  onUpdate: (updates: Partial<Todo>) => void
}

export interface AssignmentSectionProps {
  todo: Todo
  onUpdate: (updates: Partial<Todo>) => void
  readOnly?: boolean
}

export interface QuickActionsSectionProps {
  activeTab: QuickActionTab
  onTabChange: (tab: QuickActionTab) => void
}

export interface QuickActionContentProps {
  activeTab: QuickActionTab
  todo: Todo
  onUpdate?: (updates: Partial<Todo>) => void
  onClose?: () => void
}
