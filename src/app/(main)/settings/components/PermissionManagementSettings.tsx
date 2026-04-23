import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Shield } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { PERMISSION_LABELS } from '../constants/labels'

export function PermissionManagementSettings() {
  const router = useRouter()

  return (
    <Card className="rounded-xl shadow-lg border border-border p-8">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-6 w-6 text-morandi-gold" />
        <h2 className="text-xl font-semibold">{PERMISSION_LABELS.TITLE}</h2>
      </div>

      <div className="space-y-4">
        {/* 跨分公司權限 */}
        <div className="p-6 border border-border rounded-lg bg-card hover:bg-accent/5 transition-colors">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-morandi-gold" />
                <h3 className="font-medium">{PERMISSION_LABELS.CROSS_BRANCH_PERMISSION}</h3>
              </div>
              <p className="text-sm text-morandi-secondary mb-3">{PERMISSION_LABELS.MANAGE_9542}</p>

              {/* 功能說明 */}
              <div className="mt-3 p-3 bg-morandi-container/20 rounded-lg text-xs text-morandi-muted space-y-1">
                <p>✓ {PERMISSION_LABELS.PERM_1}</p>
                <p>✓ {PERMISSION_LABELS.PERM_2}</p>
                <p>✓ {PERMISSION_LABELS.PERM_3}</p>
                <p>✓ {PERMISSION_LABELS.PERM_4}</p>
              </div>
            </div>

            <Button
              variant="default"
              onClick={() => router.push('/settings/permissions')}
              className="ml-4 gap-2 bg-morandi-gold hover:bg-morandi-gold-hover"
            >
              <Shield className="h-4 w-4" />
              <span>{PERMISSION_LABELS.PERMISSION_SETTINGS}</span>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
