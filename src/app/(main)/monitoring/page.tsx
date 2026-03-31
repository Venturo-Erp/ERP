'use client'

/**
 * 監控中心頁面
 * 整合 Star-Office-UI 和 openclaw-mission-control
 */

import { useState } from 'react'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Monitor, LayoutDashboard, Bot, ClipboardList } from 'lucide-react'

export default function MonitoringPage() {
  const [activeTab, setActiveTab] = useState('overview')

  // Star-Office-UI URL（本地部署）
  const starOfficeUrl = 'http://127.0.0.1:19000'

  // Mission Control URL（需要部署後填入）
  const missionControlUrl = 'http://127.0.0.1:3100'

  return (
    <ContentPageLayout
      title="監控中心"
      icon={Monitor}
      tabs={[
        { value: 'overview', label: '總覽', icon: LayoutDashboard },
        { value: 'agents', label: 'Agent 狀態', icon: Bot },
        { value: 'tasks', label: '任務看板', icon: ClipboardList },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">

        {/* 總覽：兩個系統並排 */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* 左側：Star-Office-UI */}
            <Card className="p-0 overflow-hidden">
              <div className="bg-muted px-4 py-3 border-b">
                <h3 className="font-semibold">AI Agents 辦公室</h3>
                <p className="text-sm text-muted-foreground">像素風格即時狀態</p>
              </div>
              <div className="aspect-[4/3]">
                <iframe
                  src={starOfficeUrl}
                  className="w-full h-full border-0"
                  title="Star Office UI"
                />
              </div>
            </Card>

            {/* 右側：Mission Control */}
            <Card className="p-0 overflow-hidden">
              <div className="bg-muted px-4 py-3 border-b">
                <h3 className="font-semibold">任務控制中心</h3>
                <p className="text-sm text-muted-foreground">Kanban 看板管理</p>
              </div>
              <div className="aspect-[4/3]">
                <iframe
                  src={missionControlUrl}
                  className="w-full h-full border-0"
                  title="Mission Control"
                />
              </div>
            </Card>
          </div>

          {/* 快速統計 */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="p-4">
              <div className="text-2xl font-bold">8</div>
              <p className="text-xs text-muted-foreground">總 Agents</p>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-green-600">3</div>
              <p className="text-xs text-muted-foreground">活躍中</p>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-blue-600">12</div>
              <p className="text-xs text-muted-foreground">進行中任務</p>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-purple-600">45</div>
              <p className="text-xs text-muted-foreground">今日完成</p>
            </Card>
          </div>
        </TabsContent>

        {/* Agent 狀態：全螢幕 Star-Office-UI */}
        <TabsContent value="agents" className="space-y-4">
          <Card className="p-0 overflow-hidden">
            <div className="bg-muted px-4 py-3 border-b">
              <h3 className="font-semibold">AI Agents 即時狀態</h3>
              <p className="text-sm text-muted-foreground">Star Office UI - 像素風格辦公室</p>
            </div>
            <div className="h-[calc(100vh-300px)]">
              <iframe
                src={starOfficeUrl}
                className="w-full h-full border-0"
                title="Star Office UI Full"
              />
            </div>
          </Card>
        </TabsContent>

        {/* 任務看板：全螢幕 Mission Control */}
        <TabsContent value="tasks" className="space-y-4">
          <Card className="p-0 overflow-hidden">
            <div className="bg-muted px-4 py-3 border-b">
              <h3 className="font-semibold">任務看板</h3>
              <p className="text-sm text-muted-foreground">
                OpenClaw Mission Control - 即時任務管理
              </p>
            </div>
            <div className="h-[calc(100vh-300px)]">
              <iframe
                src={missionControlUrl}
                className="w-full h-full border-0"
                title="Mission Control Full"
              />
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </ContentPageLayout>
  )
}
