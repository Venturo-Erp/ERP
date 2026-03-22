'use client'
/**
 * TourActionButtons - Simplified action menu (⋮) for tour operations
 * Only contains: Archive, Delete
 */

import { useCallback } from 'react'
import { MoreVertical, Archive, ArchiveRestore, Trash2, Edit } from 'lucide-react'
import { Tour, User } from '@/stores/types'
import { TOUR_ACTIONS } from '../constants'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TOURS_LABELS } from './constants/labels'

interface UseTourActionButtonsParams {
  quotes: unknown[]
  activeStatusTab: string
  user: User | null
  operations: {
    handleArchiveTour: (tour: Tour, reason?: string) => Promise<void>
  }
  onEditTour: (tour: Tour) => void
  setSelectedTour: (tour: Tour) => void
  setDeleteConfirm: (state: { isOpen: boolean; tour: Tour | null }) => void
  handleCreateChannel: (tour: Tour) => Promise<void>
  onOpenQuoteDialog?: (tour: Tour) => void
  onOpenItineraryDialog?: (tour: Tour) => void
  onOpenContractDialog?: (tour: Tour) => void
  onCloseTour?: (tour: Tour) => void
  onOpenArchiveDialog?: (tour: Tour) => void
  onOpenRequirementsDialog?: ((tour: Tour) => void) | undefined
}

export function useTourActionButtons(params: UseTourActionButtonsParams) {
  const { operations, onEditTour, setDeleteConfirm, onOpenArchiveDialog } = params

  const renderActions = useCallback(
    (row: unknown) => {
      const tour = row as Tour

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={e => e.stopPropagation()}
              className="p-1 rounded hover:bg-morandi-container/50 transition-colors"
            >
              <MoreVertical size={16} className="text-morandi-secondary" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
            <DropdownMenuItem onClick={() => onEditTour(tour)}>
              <Edit size={14} className="mr-2" />
              {TOURS_LABELS.EDIT}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                if (tour.archived) {
                  operations.handleArchiveTour(tour)
                } else if (onOpenArchiveDialog) {
                  onOpenArchiveDialog(tour)
                } else {
                  operations.handleArchiveTour(tour)
                }
              }}
            >
              {tour.archived ? (
                <>
                  <ArchiveRestore size={14} className="mr-2" />
                  {TOUR_ACTIONS.unarchive}
                </>
              ) : (
                <>
                  <Archive size={14} className="mr-2" />
                  {TOUR_ACTIONS.archive}
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setDeleteConfirm({ isOpen: true, tour })}
              className="text-morandi-red focus:text-morandi-red"
            >
              <Trash2 size={14} className="mr-2" />
              {TOUR_ACTIONS.delete}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
    [operations, onEditTour, setDeleteConfirm, onOpenArchiveDialog]
  )

  return {
    renderActions,
  }
}
