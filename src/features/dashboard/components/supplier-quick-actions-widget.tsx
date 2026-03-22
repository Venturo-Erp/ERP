'use client'

/**
 * SupplierQuickActionsWidget - 供應商快捷入口
 * 
 * 顯示給供應商（transportation/dmc）的快捷操作
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  ClipboardList, 
  TrendingUp, 
  Truck, 
  Users,
  ArrowRight,
  Inbox
} from 'lucide-react'
import { useAuthStore } from '@/stores'
import { supabase } from '@/lib/supabase/client'

interface QuickAction {
  id: string
  label: string
  description: string
  href: string
  icon: React.ReactNode
  badge?: number
  badgeColor?: 'default' | 'destructive' | 'secondary'
}

export function SupplierQuickActionsWidget() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [pendingRequests, setPendingRequests] = useState(0)
  const [loading, setLoading] = useState(true)

  // 載入待處理需求數量
  useEffect(() => {
    if (!user?.workspace_id) return

    const fetchPendingCount = async () => {
      setLoading(true)
      const { count } = await supabase
        .from('tour_requests')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_workspace_id', user.workspace_id as string)
        .eq('status', 'sent')

      setPendingRequests(count || 0)
      setLoading(false)
    }

    fetchPendingCount()
  }, [user?.workspace_id])

  // 判斷是否為供應商
  const isSupplier = 
    user?.workspace_type === 'transportation' || 
    user?.workspace_type === 'dmc' ||
    user?.workspace_type === 'vehicle_supplier' ||
    user?.workspace_type === 'guide_supplier'

  // 非供應商不顯示此 widget
  if (!isSupplier) {
    return null
  }

  const quickActions: QuickAction[] = [
    {
      id: 'requests',
      label: '需求收件匣',
      description: '查看收到的需求單',
      href: '/tours',
      icon: <Inbox className="h-5 w-5" />,
      badge: pendingRequests > 0 ? pendingRequests : undefined,
      badgeColor: 'destructive'
    },
    {
      id: 'finance',
      label: '收款管理',
      description: '查看應收帳款',
      href: '/finance/payments',
      icon: <TrendingUp className="h-5 w-5" />
    },
    {
      id: 'hr',
      label: '人員管理',
      description: '管理員工資料',
      href: '/hr',
      icon: <Users className="h-5 w-5" />
    }
  ]

  // 車行專屬：派單管理
  if (user?.workspace_type === 'transportation' || user?.workspace_type === 'vehicle_supplier') {
    quickActions.splice(1, 0, {
      id: 'dispatch',
      label: '派單管理',
      description: '分配司機與車輛',
      href: '/supplier/dispatch',
      icon: <Truck className="h-5 w-5" />
    })
  }

  return (
    <Card className="overflow-hidden flex flex-col h-full border border-morandi-gold/20 shadow-sm rounded-2xl hover:shadow-md hover:border-morandi-gold/20 transition-all duration-200">
      <div className="bg-morandi-container px-4 py-3 border-b border-morandi-gold/20 flex-shrink-0">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-morandi-gold" />
          <h3 className="font-semibold text-sm text-morandi-primary">
            供應商專區
          </h3>
          {pendingRequests > 0 && (
            <Badge variant="destructive" className="text-xs">
              {pendingRequests} 待處理
            </Badge>
          )}
        </div>
      </div>

      <div className="p-4 flex-1">
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map(action => (
            <Button
              key={action.id}
              variant="outline"
              className="h-auto flex flex-col items-start p-3 gap-1 hover:bg-morandi-gold/5 hover:border-morandi-gold/30 transition-all"
              onClick={() => router.push(action.href)}
            >
              <div className="flex items-center justify-between w-full">
                <div className="p-1.5 rounded-lg bg-morandi-gold/10 text-morandi-gold">
                  {action.icon}
                </div>
                {action.badge && (
                  <Badge 
                    variant={action.badgeColor || 'default'} 
                    className="text-xs"
                  >
                    {action.badge}
                  </Badge>
                )}
              </div>
              <div className="text-left mt-1">
                <div className="font-medium text-sm">{action.label}</div>
                <div className="text-xs text-muted-foreground">
                  {action.description}
                </div>
              </div>
            </Button>
          ))}
        </div>

        {/* 快速連結提示 */}
        <div className="mt-4 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            💡 所有功能都在側邊選單中
          </p>
        </div>
      </div>
    </Card>
  )
}
