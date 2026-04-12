'use client'

import React from 'react'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { GraduationCap, BookOpen, Video, FileText, ExternalLink } from 'lucide-react'
import { Card } from '@/components/ui/card'

/**
 * 數位培訓頁面 — 第一版（靜態框架）
 * 未來會接入課程管理系統
 */
export default function TrainingPage() {
  return (
    <ContentPageLayout title="數位培訓" icon={GraduationCap}>
      <div className="space-y-6">
        {/* 即將推出提示 */}
        <Card className="rounded-xl border border-morandi-gold/30 bg-morandi-gold/5 p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-morandi-gold/20 flex items-center justify-center flex-shrink-0">
              <GraduationCap size={24} className="text-morandi-gold" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-morandi-primary">數位培訓中心</h3>
              <p className="text-sm text-morandi-secondary mt-1">
                完整的線上學習平台即將上線，包含課程管理、學習進度追蹤、測驗評量等功能。
              </p>
            </div>
          </div>
        </Card>

        {/* 功能預覽 */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="rounded-xl border border-border p-5">
            <div className="w-10 h-10 rounded-lg bg-status-info-bg flex items-center justify-center mb-3">
              <Video size={20} className="text-status-info" />
            </div>
            <h4 className="text-sm font-semibold text-morandi-primary">線上課程</h4>
            <p className="text-xs text-morandi-muted mt-1">
              影片課程、直播教學、錄播回放，員工隨時隨地學習
            </p>
          </Card>

          <Card className="rounded-xl border border-border p-5">
            <div className="w-10 h-10 rounded-lg bg-morandi-green/10 flex items-center justify-center mb-3">
              <BookOpen size={20} className="text-morandi-green" />
            </div>
            <h4 className="text-sm font-semibold text-morandi-primary">學習進度</h4>
            <p className="text-xs text-morandi-muted mt-1">
              追蹤每位員工的學習完成率、測驗成績、學習時數
            </p>
          </Card>

          <Card className="rounded-xl border border-border p-5">
            <div className="w-10 h-10 rounded-lg bg-morandi-gold/10 flex items-center justify-center mb-3">
              <FileText size={20} className="text-morandi-gold" />
            </div>
            <h4 className="text-sm font-semibold text-morandi-primary">知識庫</h4>
            <p className="text-xs text-morandi-muted mt-1">公司 SOP、作業手冊、培訓教材集中管理</p>
          </Card>
        </div>

        {/* 規劃中的功能 */}
        <Card className="rounded-xl border border-border p-5">
          <h4 className="text-sm font-semibold text-morandi-primary mb-3">規劃中的功能</h4>
          <div className="grid md:grid-cols-2 gap-3">
            {[
              '課程分類與標籤管理',
              '必修課程指派（依職務/部門）',
              '學習時數統計報表',
              '線上測驗與及格門檻',
              '證照到期提醒',
              '新人入職培訓流程',
              '學習積分與排行榜',
              '外部課程連結整合',
            ].map(feature => (
              <div key={feature} className="flex items-center gap-2 text-sm text-morandi-secondary">
                <span className="w-1.5 h-1.5 rounded-full bg-morandi-gold flex-shrink-0" />
                {feature}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </ContentPageLayout>
  )
}
