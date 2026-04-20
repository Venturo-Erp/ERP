'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Users, MapPin } from 'lucide-react'
import { COMP_WORKSPACE_LABELS } from '../constants/labels'

interface ChatHeaderProps {
  showMemberSidebar: boolean
  onToggleMemberSidebar: () => void
  tourId?: string | null
}

export function ChatHeader({ showMemberSidebar, onToggleMemberSidebar, tourId }: ChatHeaderProps) {
  const router = useRouter()

  return (
    <div className="flex items-center gap-1">
      {/* 跳轉到旅遊團詳情 */}
      {tourId && (
        <Button
          variant="ghost"
          size="icon"
          aria-label="Button"
          className="w-8 h-8 text-morandi-gold hover:text-morandi-gold/80 hover:bg-morandi-gold/10"
          onClick={() => router.push(`/tours?highlight=${tourId}`)}
          title={COMP_WORKSPACE_LABELS.前往旅遊團詳情}
        >
          <MapPin size={16} />
        </Button>
      )}

      <Button
        variant="ghost"
        size="icon"
        aria-label="Toggle menu"
        className="w-8 h-8"
        onClick={onToggleMemberSidebar}
      >
        <Users size={16} />
      </Button>
    </div>
  )
}
