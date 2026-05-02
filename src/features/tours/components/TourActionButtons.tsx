'use client'
/**
 * TourActionButtons - 旅遊團操作按鈕（狀態感知）
 *
 * 按鈕按 tour.status 分組顯示：
 *   template   → 複製 + 編輯 + 封存 + 刪除
 *   proposal   → 開團 + 編輯 + 封存 + 刪除
 *   正式團      → 報名 + 分享 + 編輯 + 封存 + 刪除
 *                （upcoming / ongoing / returned / closed）
 *
 * 「結案」在詳細頁觸發、不在列表按鈕。
 */

import { useCallback } from 'react'
import { Archive, ArchiveRestore, Trash2, Edit, Share2, Copy, Send } from 'lucide-react'
import { Tour, EmployeeFull } from '@/stores/types'
import { TOUR_STATUS } from '@/lib/constants/status-maps'

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
  onOpenQuoteDialog?: (tour: Tour) => void
  onOpenItineraryDialog?: (tour: Tour) => void
  onOpenContractDialog?: (tour: Tour) => void
  onCloseTour?: (tour: Tour) => void
  onOpenArchiveDialog?: (tour: Tour) => void
  onOpenRequirementsDialog?: ((tour: Tour) => void) | undefined
  onAddOrder?: (tour: Tour) => void
  onConvertTour?: (tour: Tour) => void // 開團（proposal → upcoming）
  onCopyTemplate?: (tour: Tour) => void // 複製模板 → 新提案
  itineraries?: { id: string }[]
}

export function useTourActionButtons(params: UseTourActionButtonsParams) {
  const {
    operations,
    onEditTour,
    setDeleteConfirm,
    onOpenArchiveDialog,
    onAddOrder,
    onConvertTour,
    onCopyTemplate,
  } = params
  const router = useRouter()

  const renderActions = useCallback(
    (row: unknown) => {
      const tour = row as Tour
      const isTemplate = tour.status === TOUR_STATUS.TEMPLATE
      const isProposal = tour.status === TOUR_STATUS.PROPOSAL
      const isActiveTour = !isTemplate && !isProposal

      const handleSignUp = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (onAddOrder) {
          onAddOrder(tour)
        } else {
          router.push(`/orders/new?tour_id=${tour.id}`)
        }
      }

      const handleCopyLink = async (e: React.MouseEvent) => {
        e.stopPropagation()
        const employeeCode = params.user?.employee_number || params.user?.id
        const refParam = employeeCode ? `?ref=${employeeCode}` : ''
        const link = `${window.location.origin}/public/itinerary/${tour.id}${refParam}`
        try {
          await navigator.clipboard.writeText(link)
          toast.success('已複製行程連結')
        } catch {
          toast.error('複製失敗')
        }
      }

      const ArchiveButton = (
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
      )

      const EditButton = (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEditTour(tour)}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
        >
          <Edit size={12} />
          編輯
        </Button>
      )

      const DeleteButton = (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDeleteConfirm({ isOpen: true, tour })}
          className="h-7 px-2 text-xs text-morandi-red hover:text-morandi-red hover:bg-morandi-red/10 gap-1"
        >
          <Trash2 size={12} />
          刪除
        </Button>
      )

      return (
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          {/* 模板：複製按鈕 */}
          {isTemplate && onCopyTemplate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={e => {
                e.stopPropagation()
                onCopyTemplate(tour)
              }}
              className="h-7 px-2 text-xs text-morandi-gold hover:text-morandi-gold hover:bg-morandi-gold/10 gap-1"
            >
              <Copy size={12} />
              複製
            </Button>
          )}

          {/* 提案：開團按鈕 */}
          {isProposal && onConvertTour && (
            <Button
              variant="ghost"
              size="sm"
              onClick={e => {
                e.stopPropagation()
                onConvertTour(tour)
              }}
              className="h-7 px-2 text-xs text-morandi-gold hover:text-morandi-gold hover:bg-morandi-gold/10 gap-1"
            >
              <Send size={12} />
              開團
            </Button>
          )}

          {/* 正式團：報名、分享 */}
          {isActiveTour && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignUp}
                className="h-7 px-2 text-xs text-morandi-gold hover:text-morandi-gold hover:bg-morandi-gold/10"
              >
                報名
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyLink}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
              >
                <Share2 size={12} />
                分享
              </Button>
            </>
          )}

          {/* 所有狀態通用：編輯、封存、刪除 */}
          {EditButton}
          {ArchiveButton}
          {DeleteButton}
        </div>
      )
    },
    [
      operations,
      onEditTour,
      setDeleteConfirm,
      onOpenArchiveDialog,
      onAddOrder,
      onConvertTour,
      onCopyTemplate,
      router,
      params.user,
    ]
  )

  return {
    renderActions,
  }
}
