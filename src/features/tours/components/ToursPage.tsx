'use client'
/**
 * ToursPage - Main tours list page component
 * 支援三種開團方式：正式開團 / 提案 / 模板
 */

import React, { useCallback, useEffect, useState, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { useQuotesListSlim, useOrdersListSlim } from '@/hooks/useListSlim'
import { useItineraries } from '@/data'
import { useTourOperations } from '../hooks/useTourOperations'
import { useTourChannelOperations, TourStoreActions } from './TourChannelOperations'
import { useTourActionButtons } from './TourActionButtons'
import { useToursPage } from '../hooks/useToursPage'
import { useToursDialogs } from '../hooks/useToursDialogs'
import type { Tour } from '@/stores/types'
import { useToursForm } from '../hooks/useToursForm'
import { TourFilters } from './TourFilters'
import { TourTable } from './TourTable'
import { TourFormShell } from './TourFormShell'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'
import { ArchiveReasonDialog } from './ArchiveReasonDialog'
import { LinkItineraryToTourDialog } from './LinkItineraryToTourDialog'
import { TourItineraryDialog } from './TourItineraryDialog'
import { ContractDialog } from '@/features/contracts/components/ContractDialog'
import { TourClosingDialog } from './TourClosingDialog'
import { ConvertToTourDialog } from './ConvertToTourDialog'
import { TourEditDialog } from '@/features/tours/components/tour-edit-dialog'
import { alert } from '@/lib/ui/alert-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AddOrderForm, OrderFormData } from '@/features/orders/components/add-order-form'
import { createOrder } from '@/data/entities/orders'
import { toast } from 'sonner'

import { supabase } from '@/lib/supabase/client'

export const ToursPage: React.FC = () => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuthStore()

  // 判斷是否為 Local/DMC
  const isLocal = user?.workspace_type === 'dmc' || user?.workspace_type === 'guide_supplier'

  // 收到的委託數量（Local 專用）
  const [receivedCount, setReceivedCount] = useState(0)

  // Edit dialog state (using TourEditDialog instead of TourForm for edit mode)
  const [editDialogTour, setEditDialogTour] = useState<Tour | null>(null)

  // Convert dialog state (提案/模板轉正式團)
  const [convertDialogTour, setConvertDialogTour] = useState<Tour | null>(null)

  // Add order dialog state (報名訂單)
  const [addOrderDialogTour, setAddOrderDialogTour] = useState<Tour | null>(null)

  // 🔧 優化：只保留 quotes（TourActionButtons 需要），其他由 useTourOperations 內部處理
  const { items: quotes } = useQuotesListSlim()
  const { items: allOrders } = useOrdersListSlim()
  const { items: itineraries } = useItineraries()

  // Build a map of tour_id → first order's sales_person/assistant for display in tour table
  const ordersByTourId = useMemo(() => {
    const map = new Map<string, { sales_person: string | null; assistant: string | null }>()
    for (const order of allOrders) {
      if (order.tour_id && !map.has(order.tour_id)) {
        map.set(order.tour_id, {
          sales_person: order.sales_person ?? null,
          assistant: order.assistant ?? null,
        })
      }
    }
    return map
  }, [allOrders])

  // 🔧 對話框狀態（替代 deprecated useDialog）
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean
    type: string | null
    data: Tour | null
  }>({ isOpen: false, type: null, data: null })

  const openDialog = useCallback((type: string, data?: unknown) => {
    setDialogState({ isOpen: true, type, data: (data as Tour) || null })
  }, [])

  const closeDialog = useCallback(() => {
    setDialogState({ isOpen: false, type: null, data: null })
  }, [])

  const {
    filteredTours,
    loading,
    setCurrentPage,
    activeStatusTab,
    setActiveStatusTab,
    searchQuery,
    setSearchQuery,
    state,
    actions,
    handleSortChange,
  } = useToursPage()

  // Local/DMC：查詢收到的委託數量
  useEffect(() => {
    if (!isLocal || !user?.workspace_id) return

    const fetchReceivedCount = async () => {
      const { count } = await supabase
        .from('tour_requests')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_workspace_id', user.workspace_id as string)
        .eq('status', 'sent')

      setReceivedCount(count || 0)
    }

    fetchReceivedCount()
  }, [isLocal, user?.workspace_id])

  const {
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
    closingDialogTour,
    openClosingDialog,
    closeClosingDialog,
    deleteConfirm,
    openDeleteDialog,
    closeDeleteDialog,
  } = useToursDialogs()

  const {
    submitting,
    setSubmitting,
    formError,
    setFormError,
    newTour,
    setNewTour,
    newOrder,
    setNewOrder,
    getStatusColor,
    setSelectedTour,
  } = state

  const { handleOpenCreateDialog, resetForm, handleNavigationEffect } = useToursForm({
    state,
    openDialog,
  })

  // Handler for opening edit dialog (now uses TourEditDialog instead of TourForm)
  const handleOpenEditDialog = useCallback((tour: Tour) => {
    setEditDialogTour(tour)
  }, [])

  // Handler for closing edit dialog
  const handleCloseEditDialog = useCallback(() => {
    setEditDialogTour(null)
  }, [])

  // 🔧 優化：useTourOperations 不再需要外部傳入 quotes/itineraries/addOrder 等
  const operations = useTourOperations({
    actions,
    resetForm,
    closeDialog,
    setSubmitting,
    setFormError,
    workspaceId: user?.workspace_id,
  })

  const handleAddTour = useCallback(async () => {
    const fromQuoteId = searchParams.get('fromQuote')
    operations.handleAddTour(newTour, newOrder, fromQuoteId ?? undefined)
  }, [operations, newTour, newOrder, searchParams])

  const handleDeleteTour = useCallback(async () => {
    const result = await operations.handleDeleteTour(deleteConfirm.tour)
    closeDeleteDialog()
    if (result.success) {
      actions.refresh()
    } else if (result.error) {
      await alert(result.error, 'error')
    }
  }, [operations, deleteConfirm.tour, closeDeleteDialog, actions])

  // 處理報名（建立訂單）
  const handleAddOrder = useCallback(
    async (orderData: OrderFormData) => {
      try {
        const tour = addOrderDialogTour
        if (!tour) return

        // 產生訂單編號（格式：{團號}-O{兩位流水號}、與 /orders 頁面一致）
        const tourOrders = allOrders.filter(o => o.tour_id === orderData.tour_id)
        const nextOrderNumber = tourOrders.length + 1
        const orderNumber = `${tour.code}-O${nextOrderNumber.toString().padStart(2, '0')}`

        // 從 tour.selling_price_per_person 估算初始金額
        const sellingPricePerPerson = tour.selling_price_per_person || 0
        const estimatedPeople = orderData.member_count || 2
        const initialTotalAmount = sellingPricePerPerson * estimatedPeople

        await createOrder({
          order_number: orderNumber,
          tour_id: orderData.tour_id,
          tour_name: tour.name,
          contact_person: orderData.contact_person,
          sales_person: orderData.sales_person,
          assistant: orderData.assistant,
          member_count: orderData.member_count || 0,
          total_amount: orderData.total_amount || initialTotalAmount,
          paid_amount: 0,
          payment_status: 'unpaid',
          remaining_amount: orderData.total_amount || initialTotalAmount,
          workspace_id: user?.workspace_id,
        })
        toast.success('訂單建立成功')
        setAddOrderDialogTour(null)
        router.push(`/tours/${tour.code}?tab=orders`)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '建立訂單失敗')
      }
    },
    [user?.workspace_id, addOrderDialogTour, allOrders, router]
  )

  const { handleCreateChannel } = useTourChannelOperations({
    actions: actions as unknown as TourStoreActions,
  })

  const { renderActions } = useTourActionButtons({
    quotes,
    activeStatusTab,
    user,
    operations,
    onEditTour: handleOpenEditDialog,
    setSelectedTour,
    setDeleteConfirm: state => state.tour && openDeleteDialog(state.tour),
    onAddOrder: setAddOrderDialogTour,
    itineraries,
    handleCreateChannel,
    onOpenItineraryDialog: openItineraryDialog,
    onOpenContractDialog: openContractDialog,
    onCloseTour: openClosingDialog,
    onOpenArchiveDialog: openArchiveDialog,
    onOpenRequirementsDialog: undefined,
  })

  // 點擊整列導航到詳情頁面
  const handleRowClick = useCallback(
    (row: unknown) => {
      const item = row as Tour
      router.push(`/tours/${item.code}`)
    },
    [router]
  )

  // 開團（正式團）
  const handleOpenTourDialog = useCallback(() => {
    handleOpenCreateDialog()
  }, [handleOpenCreateDialog])

  // 提案（客戶詢價）
  const handleOpenProposalDialog = useCallback(() => {
    setNewTour({
      name: '',
      tour_type: 'proposal',
      countryId: '', // 🔧 核心表架構
      countryName: '', // 🔧 核心表架構
      countryCode: '', // 🔧 核心表架構
      cityCode: '',
      departure_date: '',
      return_date: '',
      price: 0,
      status: '待出發',
      isSpecial: false,
      max_participants: 20,
      description: '',
    })
    openDialog('create')
  }, [setNewTour, openDialog])

  // 開模板（標準行程）
  const handleOpenTemplateDialog = useCallback(() => {
    setNewTour({
      name: '',
      tour_type: 'template',
      countryId: '', // 🔧 核心表架構
      countryName: '', // 🔧 核心表架構
      countryCode: '', // 🔧 核心表架構
      cityCode: '',
      departure_date: '',
      return_date: '',
      price: 0,
      status: '待出發',
      isSpecial: false,
      max_participants: 20,
      description: '',
    })
    openDialog('create')
  }, [setNewTour, openDialog])

  // 開團轉換（提案/模板 → 正式團）
  const handleConvertTour = useCallback((tour: Tour) => {
    setConvertDialogTour(tour)
  }, [])

  const handleConvertConfirm = useCallback(
    async (
      tour: Tour,
      departure_date: string,
      return_date: string,
      orderData?: {
        contact_person?: string
        sales_person?: string
        assistant?: string
        member_count?: number
        total_amount?: number
      }
    ) => {
      await operations.handleConvertToOfficial(tour, departure_date, return_date, orderData)
    },
    [operations]
  )

  useEffect(() => {
    handleNavigationEffect()
  }, [handleNavigationEffect])

  return (
    <div className="h-full flex flex-col">
      <TourFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeTab={activeStatusTab}
        onTabChange={(tab: string) => {
          setActiveStatusTab(tab)
          setCurrentPage(1)
        }}
        onAddTour={handleOpenTourDialog}
        onAddProposal={handleOpenProposalDialog}
        onAddTemplate={handleOpenTemplateDialog}
        showReceivedTab={isLocal}
        receivedCount={receivedCount}
      />

      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto">
          <TourTable
            tours={filteredTours}
            loading={loading}
            onSort={handleSortChange}
            onRowClick={handleRowClick}
            renderActions={renderActions}
            getStatusColor={getStatusColor}
            ordersByTourId={ordersByTourId}
            activeTab={activeStatusTab}
            onConvertTour={handleConvertTour}
          />
        </div>
      </div>

      {/* TourForm only for create mode */}
      <TourFormShell
        isOpen={dialogState.isOpen && dialogState.type === 'create'}
        onClose={() => {
          resetForm()
          closeDialog()
        }}
        mode="create"
        newTour={newTour}
        setNewTour={setNewTour}
        newOrder={newOrder}
        setNewOrder={setNewOrder}
        submitting={submitting}
        formError={formError}
        onSubmit={handleAddTour}
        isFromProposal={false}
      />

      {/* TourEditDialog for edit mode */}
      {editDialogTour && (
        <TourEditDialog
          isOpen={!!editDialogTour}
          onClose={handleCloseEditDialog}
          tour={editDialogTour}
          onSuccess={() => {
            // Refresh is handled by SWR mutate in the hook
          }}
        />
      )}

      {/* ConvertToTourDialog for proposal/template → official */}
      <ConvertToTourDialog
        isOpen={!!convertDialogTour}
        onClose={() => setConvertDialogTour(null)}
        tour={convertDialogTour}
        onConvert={handleConvertConfirm}
      />

      <DeleteConfirmDialog
        isOpen={deleteConfirm.isOpen}
        tour={deleteConfirm.tour}
        onClose={closeDeleteDialog}
        onConfirm={handleDeleteTour}
      />

      <ArchiveReasonDialog
        isOpen={!!archiveDialogTour}
        tour={archiveDialogTour}
        onClose={closeArchiveDialog}
        onConfirm={reason => confirmArchive(reason, operations.handleArchiveTour)}
      />

      {itineraryDialogTour && (
        <LinkItineraryToTourDialog
          isOpen={!!itineraryDialogTour}
          onClose={closeItineraryDialog}
          tour={itineraryDialogTour}
        />
      )}

      {/* 行程表選擇對話框 */}
      {tourItineraryDialogTour && (
        <TourItineraryDialog
          isOpen={!!tourItineraryDialogTour}
          onClose={closeTourItineraryDialog}
          tour={tourItineraryDialogTour}
        />
      )}

      {contractDialogState.tour && (
        <ContractDialog
          isOpen={contractDialogState.isOpen}
          onClose={closeContractDialog}
          tour={contractDialogState.tour}
          mode={contractDialogState.mode}
        />
      )}

      {closingDialogTour && (
        <TourClosingDialog
          tour={closingDialogTour}
          open={!!closingDialogTour}
          onOpenChange={open => !open && closeClosingDialog()}
          onSuccess={closeClosingDialog}
        />
      )}

      {/* 報名對話框（新增訂單） */}
      <Dialog
        open={!!addOrderDialogTour}
        onOpenChange={open => !open && setAddOrderDialogTour(null)}
      >
        <DialogContent level={1} className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>報名旅遊團 - {addOrderDialogTour?.name}</DialogTitle>
          </DialogHeader>
          {addOrderDialogTour && (
            <AddOrderForm
              tourId={addOrderDialogTour.id}
              onSubmit={handleAddOrder}
              onCancel={() => setAddOrderDialogTour(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
