'use client'

/**
 * 租戶詳情頁面
 * 
 * 包含：基本資料、功能權限設定
 */

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { 
  Building2, 
  Settings, 
  Shield, 
  ArrowLeft,
  Save,
  Loader2
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { FEATURES, getBasicFeatures, getPremiumFeatures, getEnterpriseFeatures } from '@/lib/permissions'

interface Workspace {
  id: string
  name: string
  code: string
  type: string
  status: string
  created_at: string
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
      const { data: ws, error: wsError } = await supabase
        .from('workspaces')
        .select('id, name, code, type, status, created_at')
        .eq('id', id)
        .single()

      if (wsError || !ws) {
        toast({ title: '找不到租戶', variant: 'destructive' })
        router.push('/tenants')
        return
      }

      setWorkspace(ws)

      // 取得功能權限
      const { data: featuresData } = await supabase
        .from('workspace_features')
        .select('feature_code, enabled')
        .eq('workspace_id', id)

      // 初始化功能列表（如果沒有記錄，預設為未啟用）
      const featureMap = new Map(featuresData?.map(f => [f.feature_code, f.enabled]) || [])
      const allFeatures = FEATURES.map(f => ({
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
      // 使用 upsert 更新所有功能
      const upsertData = features.map(f => ({
        workspace_id: id,
        feature_code: f.feature_code,
        enabled: f.enabled,
        enabled_at: f.enabled ? new Date().toISOString() : null,
      }))

      const { error } = await supabase
        .from('workspace_features')
        .upsert(upsertData, { onConflict: 'workspace_id,feature_code' })

      if (error) throw error

      toast({ title: '已儲存功能權限' })
    } catch (err) {
      console.error('儲存失敗:', err)
      toast({ title: '儲存失敗', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // 渲染功能列表
  const renderFeatureList = (featureList: ReturnType<typeof getBasicFeatures>) => (
    <div className="space-y-3">
      {featureList.map(feature => {
        const current = features.find(f => f.feature_code === feature.code)
        const isEnabled = current?.enabled ?? false

        return (
          <div
            key={feature.code}
            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
          >
            <div className="flex-1">
              <div className="font-medium">{feature.name}</div>
              <div className="text-sm text-muted-foreground">{feature.description}</div>
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
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
        { label: workspace?.name || '詳情' },
      ]}
    >
      <div className="space-y-6">
        {/* 返回按鈕 */}
        <Button variant="ghost" onClick={() => router.push('/tenants')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回列表
        </Button>

        {/* 基本資訊卡片 */}
        <Card className="p-6">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label className="text-muted-foreground">公司名稱</Label>
              <div className="font-medium">{workspace?.name}</div>
            </div>
            <div>
              <Label className="text-muted-foreground">代碼</Label>
              <div className="font-medium">{workspace?.code}</div>
            </div>
            <div>
              <Label className="text-muted-foreground">類型</Label>
              <Badge variant="outline">{workspace?.type}</Badge>
            </div>
            <div>
              <Label className="text-muted-foreground">狀態</Label>
              <Badge variant={workspace?.status === 'active' ? 'default' : 'secondary'}>
                {workspace?.status === 'active' ? '啟用' : '停用'}
              </Badge>
            </div>
          </div>
        </Card>

        {/* 功能權限 */}
        <Tabs defaultValue="basic" className="w-full">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="basic" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                基本功能
              </TabsTrigger>
              <TabsTrigger value="premium" className="flex items-center gap-2">
                💰 付費功能
              </TabsTrigger>
              <TabsTrigger value="enterprise" className="flex items-center gap-2">
                🏢 企業功能
              </TabsTrigger>
            </TabsList>

            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              儲存
            </Button>
          </div>

          <TabsContent value="basic">
            <Card className="p-4">
              <h3 className="font-medium mb-4 text-muted-foreground">
                基本功能（免費）
              </h3>
              {renderFeatureList(getBasicFeatures())}
            </Card>
          </TabsContent>

          <TabsContent value="premium">
            <Card className="p-4">
              <h3 className="font-medium mb-4 text-muted-foreground">
                付費功能（需要訂閱）
              </h3>
              {renderFeatureList(getPremiumFeatures())}
            </Card>
          </TabsContent>

          <TabsContent value="enterprise">
            <Card className="p-4">
              <h3 className="font-medium mb-4 text-muted-foreground">
                企業功能（特殊訂閱）
              </h3>
              {renderFeatureList(getEnterpriseFeatures())}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ContentPageLayout>
  )
}
