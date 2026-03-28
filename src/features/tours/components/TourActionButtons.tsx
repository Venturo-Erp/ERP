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
import { Tour, User } from '@/stores/types'
import { TOUR_ACTIONS } from '../constants'

import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

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
  const router = useRouter()

  const renderActions = useCallback(
    (row: unknown) => {
      const tour = row as Tour

      // 報名（建立訂單）
      const handleSignUp = (e: React.MouseEvent) => {
        e.stopPropagation()
        // 導航到訂單頁面並帶入團資訊
        router.push(`/orders/new?tour_id=${tour.id}`)
      }

      // 行程（查看/分享）
      const handleItinerary = (e: React.MouseEvent) => {
        e.stopPropagation()
        // 導航到行程分頁
        router.push(`/tours/${tour.code}?tab=itinerary`)
      }

      // 複製行程連結
      const handleCopyLink = async (e: React.MouseEvent) => {
        e.stopPropagation()
        const link = `${window.location.origin}/public/tour/${tour.code}`
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

          {/* 行程 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleItinerary}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            行程
          </Button>

          {/* 複製連結 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyLink}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            title="複製行程連結"
          >
            <Share2 size={14} />
          </Button>

          {/* 編輯 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEditTour(tour)}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            title="編輯"
          >
            <Edit size={14} />
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
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            title={tour.archived ? TOUR_ACTIONS.unarchive : TOUR_ACTIONS.archive}
          >
            {tour.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
          </Button>

          {/* 刪除 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteConfirm({ isOpen: true, tour })}
            className="h-7 px-2 text-xs text-morandi-red hover:text-morandi-red hover:bg-morandi-red/10"
            title={TOUR_ACTIONS.delete}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      )
    },
    [operations, onEditTour, setDeleteConfirm, onOpenArchiveDialog, router]
  )

  return {
    renderActions,
  }
}
