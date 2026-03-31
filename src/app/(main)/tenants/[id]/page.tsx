'use client'

/**
 * 租戶詳情頁面
 * 兩張卡片：基本功能（永遠可用）、付費功能（需開通）
 */

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import { 
  Building2, 
  Save,
  Loader2,
  Lock,
  Unlock,
  Sparkles,
} from 'lucide-react'
import { FEATURES, getBasicFeatures, getPremiumFeatures, getEnterpriseFeatures } from '@/lib/permissions'

interface Workspace {
  id: string
  name: string
  code: string
  type: string
  is_active: boolean
  premium_enabled?: boolean
  premium_expires_at?: string
}

interface WorkspaceFeature {
  feature_code: string
  enabled: boolean
}

export default function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { toast } = useToast()
  
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [features, setFeatures] = useState<WorkspaceFeature[]>([])
  const [premiumEnabled, setPremiumEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // 載入資料
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)

      // 取得租戶資料
      const wsRes = await fetch(`/api/workspaces/${id}`)
      if (!wsRes.ok) {
        toast({ title: '找不到租戶', variant: 'destructive' })
        router.push('/tenants')
        return
      }
      const ws = await wsRes.json()
      setWorkspace(ws)
      setPremiumEnabled(ws.premium_enabled ?? false)

      // 取得功能權限
      const featuresRes = await fetch(`/api/permissions/features?workspace_id=${id}`)
      const featuresData: WorkspaceFeature[] = featuresRes.ok ? await featuresRes.json() : []
      
      // 初始化功能列表
      const featureMap = new Map<string, boolean>(featuresData.map(f => [f.feature_code, f.enabled]))
      const allFeatures: WorkspaceFeature[] = FEATURES.map(f => ({
        feature_code: f.code,
        enabled: featureMap.get(f.code) ?? false,
      }))
      setFeatures(allFeatures)

      setLoading(false)
    }

    fetchData()
  }, [id, router, toast])

  // 切換功能
  const toggleFeature = (featureCode: string) => {
    setFeatures(prev =>
      prev.map(f =>
        f.feature_code === featureCode ? { ...f, enabled: !f.enabled } : f
      )
    )
  }

  // 儲存
  const handleSave = async () => {
    setSaving(true)

    try {
      // 儲存功能權限
      const res = await fetch('/api/permissions/features', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: id,
          features,
          premium_enabled: premiumEnabled,
        }),
      })

      if (res.ok) {
        toast({ title: '已儲存' })
      } else {
        throw new Error('儲存失敗')
      }
    } catch {
      toast({ title: '儲存失敗', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // 合併付費和企業功能
  const premiumAndEnterpriseFeatures = [...getPremiumFeatures(), ...getEnterpriseFeatures()]

  if (loading) {
    return (
      <ContentPageLayout title="載入中..." icon={Building2}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-morandi-gold" />
        </div>
      </ContentPageLayout>
    )
  }

  return (
    <ContentPageLayout
      title={workspace?.name || '租戶詳情'}
      icon={Building2}
      breadcrumb={[
        { label: '租戶管理', href: '/tenants' },
        { label: workspace?.name || '詳情', href: `/tenants/${id}` },
      ]}
      showBackButton
      onBack={() => router.push('/tenants')}
      headerActions={
        <Button onClick={handleSave} disabled={saving} className="bg-morandi-gold hover:bg-morandi-gold-hover text-white">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          儲存
        </Button>
      }
    >
      <div className="space-y-6">
        {/* 租戶資訊卡片 */}
        <div className="bg-white border border-border rounded-lg p-6">
          <div className="grid grid-cols-4 gap-6">
            <div>
              <div className="text-sm text-morandi-secondary mb-1">公司名稱</div>
              <div className="font-semibold text-morandi-primary">{workspace?.name}</div>
            </div>
            <div>
              <div className="text-sm text-morandi-secondary mb-1">公司代碼</div>
              <div className="font-semibold text-morandi-primary">{workspace?.code}</div>
            </div>
            <div>
              <div className="text-sm text-morandi-secondary mb-1">類型</div>
              <Badge variant="outline" className="font-medium">{workspace?.type}</Badge>
            </div>
            <div>
              <div className="text-sm text-morandi-secondary mb-1">狀態</div>
              <Badge className={workspace?.is_active ? 'bg-morandi-green/20 text-morandi-green' : 'bg-morandi-secondary/20 text-morandi-secondary'}>
                {workspace?.is_active ? '啟用中' : '已停用'}
              </Badge>
            </div>
          </div>
        </div>

        {/* 基本功能卡片 */}
        <div className="bg-white border border-border rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-morandi-bg/30">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-morandi-green"></div>
              <h3 className="font-semibold text-morandi-primary">基本功能</h3>
              <span className="text-sm text-morandi-secondary">（免費）</span>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {getBasicFeatures().map(feature => {
                const current = features.find(f => f.feature_code === feature.code)
                const isEnabled = current?.enabled ?? false

                return (
                  <div
                    key={feature.code}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-morandi-bg/30 transition-colors"
                  >
                    <span className="text-sm font-medium text-morandi-primary">{feature.name}</span>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={() => toggleFeature(feature.code)}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* 付費功能卡片 */}
        <div className={`bg-white border rounded-lg overflow-hidden ${premiumEnabled ? 'border-morandi-gold' : 'border-border'}`}>
          <div className={`px-6 py-4 border-b border-border ${premiumEnabled ? 'bg-morandi-gold/10 border-morandi-gold/30' : 'bg-gray-50 border-border'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className={`h-4 w-4 ${premiumEnabled ? 'text-morandi-gold' : 'text-gray-400'}`} />
                <h3 className={`font-semibold ${premiumEnabled ? 'text-morandi-primary' : 'text-gray-500'}`}>付費功能</h3>
                {premiumEnabled ? (
                  <Badge className="bg-morandi-gold/20 text-morandi-gold border-morandi-gold/30">
                    <Unlock className="h-3 w-3 mr-1" />
                    已開通
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-gray-500 border-gray-300">
                    <Lock className="h-3 w-3 mr-1" />
                    未開通
                  </Badge>
                )}
              </div>
              <Switch
                checked={premiumEnabled}
                onCheckedChange={setPremiumEnabled}
              />
            </div>
            {premiumEnabled && workspace?.premium_expires_at && (
              <div className="text-sm text-morandi-secondary mt-2">
                到期日：{new Date(workspace.premium_expires_at).toLocaleDateString('zh-TW')}
              </div>
            )}
          </div>
          <div className={`p-6 ${!premiumEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {premiumAndEnterpriseFeatures.map(feature => {
                const current = features.find(f => f.feature_code === feature.code)
                const isEnabled = current?.enabled ?? false

                return (
                  <div
                    key={feature.code}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-morandi-bg/30 transition-colors"
                  >
                    <span className="text-sm font-medium text-morandi-primary">{feature.name}</span>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={() => toggleFeature(feature.code)}
                      disabled={!premiumEnabled}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </ContentPageLayout>
  )
}
