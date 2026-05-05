'use client'

import React, { useState, useEffect } from 'react'
import { Settings } from 'lucide-react'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TimeInput } from '@/components/ui/time-input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { useCapabilities, CAPABILITIES } from '@/lib/permissions'
import { UnauthorizedPage } from '@/components/unauthorized-page'
import { ModuleLoading } from '@/components/module-loading'
import { logger } from '@/lib/utils/logger'

interface AttendanceSettings {
  work_start_time: string
  work_end_time: string
  late_threshold_minutes: number
  standard_work_hours: number
  allow_missed_clock_request: boolean
  require_gps: boolean
  gps_latitude: number | null
  gps_longitude: number | null
  gps_radius_meters: number
  enable_web_clock: boolean
}

const DEFAULT_SETTINGS: AttendanceSettings = {
  work_start_time: '09:00',
  work_end_time: '18:00',
  late_threshold_minutes: 0,
  standard_work_hours: 8,
  allow_missed_clock_request: true,
  require_gps: false,
  gps_latitude: null,
  gps_longitude: null,
  gps_radius_meters: 500,
  enable_web_clock: true,
}

/** 設定區塊：左邊說明 + 右邊內容 */
function SettingSection({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <Card className="rounded-xl shadow-sm border border-border p-6">
      <div className="grid md:grid-cols-[280px_1fr] gap-6">
        <div>
          <h3 className="text-sm font-semibold text-morandi-primary">{title}</h3>
          <p className="text-xs text-morandi-muted mt-1 leading-relaxed">{description}</p>
        </div>
        <div className="space-y-4">{children}</div>
      </div>
    </Card>
  )
}

export default function HRSettingsPage() {
  const user = useAuthStore(state => state.user)
  const { can, loading: permLoading } = useCapabilities()
  const [settings, setSettings] = useState<AttendanceSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user?.workspace_id) return
    const load = async () => {
      try {
        const { data } = await supabase
          .from('workspace_attendance_settings' as never)
          .select('*')
          .eq('workspace_id', user.workspace_id!)
          .single()

        if (data) {
          const row = data as Record<string, unknown>
          setSettings({
            work_start_time: ((row.work_start_time as string) || '09:00:00').slice(0, 5),
            work_end_time: ((row.work_end_time as string) || '18:00:00').slice(0, 5),
            late_threshold_minutes: Number(row.late_threshold_minutes) || 0,
            standard_work_hours: Number(row.standard_work_hours) || 8,
            allow_missed_clock_request: row.allow_missed_clock_request !== false,
            require_gps: row.require_gps === true,
            gps_latitude: row.gps_latitude as number | null,
            gps_longitude: row.gps_longitude as number | null,
            gps_radius_meters: Number(row.gps_radius_meters) || 500,
            enable_web_clock: row.enable_web_clock !== false,
          })
        }
      } catch (err) {
        logger.error('載入設定失敗:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.workspace_id])

  const handleSave = async () => {
    if (!user?.workspace_id) return
    setSaving(true)
    try {
      const { error } = await supabase.from('workspace_attendance_settings' as never).upsert(
        {
          workspace_id: user.workspace_id,
          work_start_time: settings.work_start_time,
          work_end_time: settings.work_end_time,
          late_threshold_minutes: settings.late_threshold_minutes,
          standard_work_hours: settings.standard_work_hours,
          allow_missed_clock_request: settings.allow_missed_clock_request,
          require_gps: settings.require_gps,
          gps_latitude: settings.gps_latitude,
          gps_longitude: settings.gps_longitude,
          gps_radius_meters: settings.gps_radius_meters,
          enable_web_clock: settings.enable_web_clock,
          updated_at: new Date().toISOString(),
        } as never,
        { onConflict: 'workspace_id' } as never
      )
      if (error) throw error
      toast.success('打卡設定已儲存')
    } catch (err) {
      logger.error('儲存設定失敗:', err)
      toast.error('儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  if (permLoading) return null  // ModuleGuard 已在外層顯示 loading
  if (!can(CAPABILITIES.HR_READ_SETTINGS)) return <UnauthorizedPage />

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-morandi-muted">
        載入中...
      </div>
    )
  }

  return (
    <ContentPageLayout
      title="人資設定"
      icon={Settings}
      primaryAction={{
        label: saving ? '儲存中...' : '儲存設定',
        onClick: handleSave,
        disabled: saving,
      }}
    >
      <div className="space-y-4">
        {/* 打卡時間 */}
        <SettingSection
          title="打卡時間"
          description="設定上下班時間與標準工時，系統依此判斷遲到與加班。"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-morandi-primary">上班時間</Label>
              <TimeInput
                value={settings.work_start_time}
                onChange={v => setSettings(s => ({ ...s, work_start_time: v }))}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-morandi-primary">下班時間</Label>
              <TimeInput
                value={settings.work_end_time}
                onChange={v => setSettings(s => ({ ...s, work_end_time: v }))}
                className="mt-1.5"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-morandi-primary">標準工時（小時）</Label>
              <Input
                type="number"
                value={settings.standard_work_hours}
                onChange={e =>
                  setSettings(s => ({ ...s, standard_work_hours: Number(e.target.value) }))
                }
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-morandi-primary">遲到寬限（分鐘）</Label>
              <Input
                type="number"
                value={settings.late_threshold_minutes}
                onChange={e =>
                  setSettings(s => ({ ...s, late_threshold_minutes: Number(e.target.value) }))
                }
                className="mt-1.5"
              />
              <p className="text-xs text-morandi-muted mt-1">0 = 超過上班時間即算遲到</p>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div>
              <p className="text-sm font-medium text-morandi-primary">允許忘打卡補登</p>
              <p className="text-xs text-morandi-muted">員工可以申請補打卡</p>
            </div>
            <Switch
              checked={settings.allow_missed_clock_request}
              onCheckedChange={v => setSettings(s => ({ ...s, allow_missed_clock_request: v }))}
            />
          </div>
        </SettingSection>

        {/* GPS + 打卡管道 並排 */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* GPS 定位 */}
          <Card className="rounded-xl shadow-sm border border-border p-5">
            <h3 className="text-sm font-semibold text-morandi-primary mb-1">GPS 定位打卡</h3>
            <p className="text-xs text-morandi-muted mb-4">開啟後員工需在指定地點範圍內才能打卡</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-morandi-primary">要求 GPS 定位</p>
                <Switch
                  checked={settings.require_gps}
                  onCheckedChange={v => setSettings(s => ({ ...s, require_gps: v }))}
                />
              </div>
              {settings.require_gps && (
                <div className="space-y-3 pt-3 border-t border-border/50">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-morandi-muted">緯度</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={settings.gps_latitude || ''}
                        onChange={e =>
                          setSettings(s => ({ ...s, gps_latitude: Number(e.target.value) || null }))
                        }
                        placeholder="25.0330"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-morandi-muted">經度</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={settings.gps_longitude || ''}
                        onChange={e =>
                          setSettings(s => ({
                            ...s,
                            gps_longitude: Number(e.target.value) || null,
                          }))
                        }
                        placeholder="121.5654"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-morandi-muted">允許半徑（公尺）</Label>
                    <Input
                      type="number"
                      value={settings.gps_radius_meters}
                      onChange={e =>
                        setSettings(s => ({ ...s, gps_radius_meters: Number(e.target.value) }))
                      }
                      className="mt-1"
                    />
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* 打卡管道 */}
          <Card className="rounded-xl shadow-sm border border-border p-5">
            <h3 className="text-sm font-semibold text-morandi-primary mb-1">打卡管道</h3>
            <p className="text-xs text-morandi-muted mb-4">選擇允許員工使用哪些方式打卡</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-morandi-primary">網頁打卡</p>
                  <p className="text-xs text-morandi-muted">從 ERP 系統內打卡</p>
                </div>
                <Switch
                  checked={settings.enable_web_clock}
                  onCheckedChange={v => setSettings(s => ({ ...s, enable_web_clock: v }))}
                />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </ContentPageLayout>
  )
}
