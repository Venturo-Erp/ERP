'use client'
/**
 * TourActionButtons - 旅遊團操作按鈕
 *
 * 顯示：報名 | 行程 | ⋮（更多）
 * - 報名：建立訂單
 * - 行程：查看/分享行程連結
 * - 更多：編輯、封存、刪除
 */

import { useCallback } from 'react'
import { Archive, ArchiveRestore, Trash2, Edit, Share2 } from 'lucide-react'
import { Tour, EmployeeFull } from '@/stores/types'
import { TOUR_ACTIONS } from '../constants'

import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface UseTourActionButtonsParams {
  quotes: unknown[]
  activeStatusTab: string
  user: EmployeeFull | null
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
  onAddOrder?: (tour: Tour) => void
  itineraries?: { id: string }[] // 用來判斷該團是否有行程表
}

export function useTourActionButtons(params: UseTourActionButtonsParams) {
  const {
    operations,
    onEditTour,
    setDeleteConfirm,
    onOpenArchiveDialog,
    onAddOrder,
    itineraries = [],
  } = params
  const router = useRouter()

  const renderActions = useCallback(
    (row: unknown) => {
      const tour = row as Tour

      // 報名（建立訂單）
      const handleSignUp = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (onAddOrder) {
          onAddOrder(tour)
        } else {
          // fallback: 導航到訂單頁面
          router.push(`/orders/new?tour_id=${tour.id}`)
        }
      }

      // 複製行程連結（帶業務 ref）
      const handleCopyLink = async (e: React.MouseEvent) => {
        e.stopPropagation()
        // 帶入業務編號，讓客戶看到負責業務
        const employeeCode = params.user?.employee_number || params.user?.id
        const refParam = employeeCode ? `?ref=${employeeCode}` : ''
        // 使用 tour.id（UUID）因為公開頁面用 tourId
        const link = `${window.location.origin}/public/itinerary/${tour.id}${refParam}`
        try {
          await navigator.clipboard.writeText(link)
          toast.success('已複製行程連結')
        } catch {
          toast.error('複製失敗')
        }
      }

      return (
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          {/* 報名 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignUp}
            className="h-7 px-2 text-xs text-morandi-gold hover:text-morandi-gold hover:bg-morandi-gold/10"
          >
            報名
          </Button>

          {/* 分享 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyLink}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
          >
            <Share2 size={12} />
            分享
          </Button>

          {/* 編輯 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEditTour(tour)}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
          >
            <Edit size={12} />
            編輯
          </Button>

          {/* 封存/取消封存 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (tour.archived) {
                operations.handleArchiveTour(tour)
              } else if (onOpenArchiveDialog) {
                onOpenArchiveDialog(tour)
              } else {
                operations.handleArchiveTour(tour)
              }
            }}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
          >
            {tour.archived ? <ArchiveRestore size={12} /> : <Archive size={12} />}
            {tour.archived ? '還原' : '封存'}
          </Button>

          {/* 刪除 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteConfirm({ isOpen: true, tour })}
            className="h-7 px-2 text-xs text-morandi-red hover:text-morandi-red hover:bg-morandi-red/10 gap-1"
          >
            <Trash2 size={12} />
            刪除
          </Button>
        </div>
      )
    },
    [operations, onEditTour, setDeleteConfirm, onOpenArchiveDialog, onAddOrder, router]
  )

  return {
    renderActions,
  }
}
