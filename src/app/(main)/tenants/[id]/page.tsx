'use client'

/**
 * 租戶詳情頁面
 * 使用 API Route 處理 DB 操作
 */

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import { 
  Building2, 
  Shield, 
  ArrowLeft,
  Save,
  Loader2,
  Sparkles,
  Building
} from 'lucide-react'
import { FEATURES, getBasicFeatures, getPremiumFeatures, getEnterpriseFeatures } from '@/lib/permissions'

interface Workspace {
  id: string
  name: string
  code: string
  type: string
  is_active: boolean
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

  // 儲存功能權限
  const handleSave = async () => {
    setSaving(true)

    try {
      const res = await fetch('/api/permissions/features', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: id,
          features,
        }),
      })

      if (res.ok) {
        toast({ title: '已儲存功能權限' })
      } else {
        throw new Error('儲存失敗')
      }
    } catch (err) {
      console.error('儲存失敗:', err)
      toast({ title: '儲存失敗', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // 渲染功能列表
  const renderFeatureList = (featureList: ReturnType<typeof getBasicFeatures>) => (
    <div className="space-y-2">
      {featureList.map(feature => {
        const current = features.find(f => f.feature_code === feature.code)
        const isEnabled = current?.enabled ?? false

        return (
          <div
            key={feature.code}
            className="flex items-center justify-between p-3 rounded-lg border border-border bg-white hover:bg-morandi-bg/50 transition-colors"
          >
            <div className="flex-1">
              <div className="font-medium text-morandi-primary">{feature.name}</div>
              <div className="text-sm text-morandi-secondary">{feature.description}</div>
            </div>
            <Switch
              checked={isEnabled}
              onCheckedChange={() => toggleFeature(feature.code)}
            />
          </div>
        )
      })}
    </div>
  )

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
    >
      <div className="space-y-6">
        {/* 頂部操作列 */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.push('/tenants')} className="text-morandi-secondary">
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回列表
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-morandi-gold hover:bg-morandi-gold-hover text-white">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            儲存設定
          </Button>
        </div>

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

        {/* 功能模組分頁 */}
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="bg-morandi-bg p-1 rounded-lg mb-4">
            <TabsTrigger 
              value="basic" 
              className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <Shield className="h-4 w-4" />
              基本功能
            </TabsTrigger>
            <TabsTrigger 
              value="premium" 
              className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <Sparkles className="h-4 w-4" />
              付費功能
            </TabsTrigger>
            <TabsTrigger 
              value="enterprise" 
              className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <Building className="h-4 w-4" />
              企業功能
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic">
            <div className="bg-white border border-border rounded-lg p-4">
              <div className="text-sm text-morandi-secondary mb-4">基本功能（免費）</div>
              {renderFeatureList(getBasicFeatures())}
            </div>
          </TabsContent>

          <TabsContent value="premium">
            <div className="bg-white border border-border rounded-lg p-4">
              <div className="text-sm text-morandi-secondary mb-4">付費功能（需要訂閱）</div>
              {renderFeatureList(getPremiumFeatures())}
            </div>
          </TabsContent>

          <TabsContent value="enterprise">
            <div className="bg-white border border-border rounded-lg p-4">
              <div className="text-sm text-morandi-secondary mb-4">企業功能（特殊訂閱）</div>
              {renderFeatureList(getEnterpriseFeatures())}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </ContentPageLayout>
  )
}
