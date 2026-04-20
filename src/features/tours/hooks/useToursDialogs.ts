'use client'

import { useState, useCallback } from 'react'
import { Tour } from '@/stores/types'
import { ArchiveReason } from '../components/ArchiveReasonDialog'

interface DialogState<T = Tour | null> {
  isOpen: boolean
  tour: T
}

interface ContractDialogState {
  isOpen: boolean
  tour: Tour | null
  mode: 'create' | 'edit'
}

export interface UseToursDialogsReturn {
  // Itinerary Dialog (for design)
  itineraryDialogTour: Tour | null
  openItineraryDialog: (tour: Tour) => void
  closeItineraryDialog: () => void

  // Tour Itinerary Dialog (for selecting itinerary type)
  tourItineraryDialogTour: Tour | null
  openTourItineraryDialog: (tour: Tour) => void
  closeTourItineraryDialog: () => void

  // Contract Dialog
  contractDialogState: ContractDialogState
  openContractDialog: (tour: Tour) => void
  closeContractDialog: () => void

  // Archive Dialog
  archiveDialogTour: Tour | null
  openArchiveDialog: (tour: Tour) => void
  closeArchiveDialog: () => void
  confirmArchive: (
    reason: ArchiveReason,
    onArchive: (tour: Tour, reason: ArchiveReason) => void
  ) => void

  // Confirmation Wizard
  confirmWizardTour: Tour | null
  openConfirmWizard: (tour: Tour) => void
  closeConfirmWizard: () => void

  // Unlock Dialog
  unlockDialogTour: Tour | null
  openUnlockDialog: (tour: Tour) => void
  closeUnlockDialog: () => void

  // Closing Dialog
  closingDialogTour: Tour | null
  openClosingDialog: (tour: Tour) => void
  closeClosingDialog: () => void

  // Delete Confirm Dialog
  deleteConfirm: DialogState
  openDeleteDialog: (tour: Tour) => void
  closeDeleteDialog: () => void
}

export function useToursDialogs(): UseToursDialogsReturn {
  // Itinerary Dialog (for design)
  const [itineraryDialogTour, setItineraryDialogTour] = useState<Tour | null>(null)

  // Tour Itinerary Dialog (for selecting itinerary type)
  const [tourItineraryDialogTour, setTourItineraryDialogTour] = useState<Tour | null>(null)

  // Contract Dialog
  const [contractDialogState, setContractDialogState] = useState<ContractDialogState>({
    isOpen: false,
    tour: null,
    mode: 'edit',
  })

  // Archive Dialog
  const [archiveDialogTour, setArchiveDialogTour] = useState<Tour | null>(null)

  // Confirmation Wizard
  const [confirmWizardTour, setConfirmWizardTour] = useState<Tour | null>(null)

  // Unlock Dialog
  const [unlockDialogTour, setUnlockDialogTour] = useState<Tour | null>(null)

  // Closing Dialog
  const [closingDialogTour, setClosingDialogTour] = useState<Tour | null>(null)

  // Delete Confirm Dialog
  const [deleteConfirm, setDeleteConfirm] = useState<DialogState>({
    isOpen: false,
    tour: null,
  })

  // Handlers
  const openItineraryDialog = useCallback((tour: Tour) => setItineraryDialogTour(tour), [])
  const closeItineraryDialog = useCallback(() => setItineraryDialogTour(null), [])

  const openTourItineraryDialog = useCallback((tour: Tour) => setTourItineraryDialogTour(tour), [])
  const closeTourItineraryDialog = useCallback(() => setTourItineraryDialogTour(null), [])

  const openContractDialog = useCallback((tour: Tour) => {
    const mode = tour.contract_template ? 'edit' : 'create'
    setContractDialogState({ isOpen: true, tour, mode })
  }, [])
  const closeContractDialog = useCallback(
    () => setContractDialogState({ isOpen: false, tour: null, mode: 'edit' }),
    []
  )

  const openArchiveDialog = useCallback((tour: Tour) => setArchiveDialogTour(tour), [])
  const closeArchiveDialog = useCallback(() => setArchiveDialogTour(null), [])
  const confirmArchive = useCallback(
    (reason: ArchiveReason, onArchive: (tour: Tour, reason: ArchiveReason) => void) => {
      if (archiveDialogTour) {
        onArchive(archiveDialogTour, reason)
        setArchiveDialogTour(null)
      }
    },
    [archiveDialogTour]
  )

  const openConfirmWizard = useCallback((tour: Tour) => setConfirmWizardTour(tour), [])
  const closeConfirmWizard = useCallback(() => setConfirmWizardTour(null), [])

  const openUnlockDialog = useCallback((tour: Tour) => setUnlockDialogTour(tour), [])
  const closeUnlockDialog = useCallback(() => setUnlockDialogTour(null), [])

  const openClosingDialog = useCallback((tour: Tour) => setClosingDialogTour(tour), [])
  const closeClosingDialog = useCallback(() => setClosingDialogTour(null), [])

  const openDeleteDialog = useCallback((tour: Tour) => {
    setDeleteConfirm({ isOpen: true, tour })
  }, [])
  const closeDeleteDialog = useCallback(() => {
    setDeleteConfirm({ isOpen: false, tour: null })
  }, [])

  return {
    itineraryDialogTour,
    openItineraryDialog,
    closeItineraryDialog,
    tourItineraryDialogTour,
    openTourItineraryDialog,
    closeTourItineraryDialog,
    contractDialogState,
    openContractDialog,
    closeContractDialog,
    archiveDialogTour,
    openArchiveDialog,
    closeArchiveDialog,
    confirmArchive,
    confirmWizardTour,
    openConfirmWizard,
    closeConfirmWizard,
    unlockDialogTour,
    openUnlockDialog,
    closeUnlockDialog,
    closingDialogTour,
    openClosingDialog,
    closeClosingDialog,
    deleteConfirm,
    openDeleteDialog,
    closeDeleteDialog,
  }
}
