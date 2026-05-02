'use client'

import React, { useState, useEffect } from 'react'
import { Settings, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  enable_line_clock: boolean
  enable_web_clock: boolean
}

interface LineConfig {
  setup_step: number
  is_connected: boolean
  bot_display_name?: string
  bot_basic_id?: string
  webhook_url?: string
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
  enable_line_clock: true,
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
  const [lineConfig, setLineConfig] = useState<LineConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lineToken, setLineToken] = useState('')
  const [lineSecret, setLineSecret] = useState('')
  const [lineSaving, setLineSaving] = useState(false)

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
            enable_line_clock: row.enable_line_clock !== false,
            enable_web_clock: row.enable_web_clock !== false,
          })
        }

        const lineRes = await fetch('/api/line/setup')
        if (lineRes.ok) setLineConfig(await lineRes.json())
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
          enable_line_clock: settings.enable_line_clock,
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

  const handleLineSetup = async () => {
    if (!lineToken || !lineSecret) {
      toast.error('請填寫 Channel Access Token 和 Channel Secret')
      return
    }
    setLineSaving(true)
    try {
      const saveRes = await fetch('/api/line/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_messaging',
          channel_access_token: lineToken,
          channel_secret: lineSecret,
        }),
      })
      const saveData = await saveRes.json()
      if (!saveRes.ok) {
        toast.error(saveData.error || '設定失敗')
        return
      }

      await fetch('/api/line/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_webhook' }),
      })
      await fetch('/api/line/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' }),
      })

      const lineRes = await fetch('/api/line/setup')
      if (lineRes.ok) setLineConfig(await lineRes.json())
      toast.success(`LINE Bot「${saveData.bot?.displayName}」設定完成！`)
      setLineToken('')
      setLineSecret('')
    } catch (err) {
      logger.error('LINE 設定失敗:', err)
      toast.error('設定失敗，請稍後再試')
    } finally {
      setLineSaving(false)
    }
  }

  if (permLoading) return <ModuleLoading fullscreen />
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
              <Input
                type="time"
                value={settings.work_start_time}
                onChange={e => setSettings(s => ({ ...s, work_start_time: e.target.value }))}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-morandi-primary">下班時間</Label>
              <Input
                type="time"
                value={settings.work_end_time}
                onChange={e => setSettings(s => ({ ...s, work_end_time: e.target.value }))}
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
              <div className="flex items-center justify-between pt-3 border-t border-border/50">
                <div>
                  <p className="text-sm text-morandi-primary">LINE 打卡</p>
                  <p className="text-xs text-morandi-muted">傳「上班」「下班」打卡</p>
                </div>
                <Switch
                  checked={settings.enable_line_clock}
                  onCheckedChange={v => setSettings(s => ({ ...s, enable_line_clock: v }))}
                />
              </div>
            </div>
          </Card>
        </div>

        {/* LINE@ 設定 */}
        <Card className="rounded-xl shadow-sm border border-border p-6">
          <div className="grid md:grid-cols-[280px_1fr] gap-6">
            <div>
              <h3 className="text-sm font-semibold text-morandi-primary flex items-center gap-2">
                LINE@ 機器人
                {lineConfig?.is_connected && (
                  <span className="flex items-center gap-1 text-xs font-normal text-morandi-green">
                    <CheckCircle2 size={12} /> 已連線
                  </span>
                )}
              </h3>
              <p className="text-xs text-morandi-muted mt-1 leading-relaxed">
                設定公司的 LINE Official Account，讓員工可以透過 LINE 打卡、收到通知。
              </p>
            </div>

            <div className="space-y-4">
              {lineConfig?.is_connected ? (
                <>
                  <div className="bg-morandi-green/5 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-morandi-muted">Bot 名稱</span>
                      <span className="font-medium text-morandi-primary">
                        {lineConfig.bot_display_name}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-morandi-muted">Bot ID</span>
                      <span className="font-mono text-xs text-morandi-secondary">
                        {lineConfig.bot_basic_id}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-morandi-muted">Webhook</span>
                      <span className="font-mono text-xs text-morandi-secondary truncate max-w-[250px]">
                        {lineConfig.webhook_url}
                      </span>
                    </div>
                  </div>
                  <div className="bg-morandi-container/30 rounded-lg p-3">
                    <p className="text-sm font-medium text-morandi-primary mb-2">員工打卡方式</p>
                    <ol className="text-xs text-morandi-secondary space-y-1 list-decimal pl-4">
                      <li>員工加入公司的 LINE@ 好友</li>
                      <li>傳送員工編號進行綁定（例如：E001）</li>
                      <li>之後傳「上班」或「下班」即可打卡</li>
                    </ol>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-status-warning-bg border border-status-warning/20 rounded-lg p-3 flex items-start gap-2">
                    <AlertCircle size={16} className="text-status-warning mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-morandi-primary">
                      要啟用 LINE 打卡，需要先設定公司的 LINE@ 機器人
                    </p>
                  </div>

                  <div className="space-y-3">
                    {[
                      {
                        step: 1,
                        title: '建立 LINE Official Account',
                        desc: '前往 LINE Official Account Manager 建立帳號（免費方案即可）',
                        link: { url: 'https://manager.line.biz/', label: '開啟 LINE OA Manager' },
                      },
                      {
                        step: 2,
                        title: '啟用 Messaging API',
                        desc: '在 LINE OA「設定」→「Messaging API」點擊啟用',
                        link: {
                          url: 'https://developers.line.biz/console/',
                          label: '開啟 LINE Developers',
                        },
                      },
                      {
                        step: 3,
                        title: '複製 Token 和 Secret',
                        desc: '在 LINE Developers → Channel →「Messaging API」找到 Channel access token，「Basic settings」找到 Channel secret',
                      },
                      {
                        step: 4,
                        title: '貼到下方欄位，點擊完成設定',
                      },
                    ].map(item => (
                      <div key={item.step} className="flex gap-3 items-start">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-morandi-gold text-white text-xs flex items-center justify-center font-medium">
                          {item.step}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-morandi-primary">{item.title}</p>
                          {item.desc && <p className="text-xs text-morandi-muted">{item.desc}</p>}
                          {item.link && (
                            <a
                              href={item.link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-morandi-gold hover:underline inline-flex items-center gap-1 mt-1"
                            >
                              {item.link.label} <ExternalLink size={10} />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3 pt-3 border-t border-border/50">
                    <div>
                      <Label className="text-sm font-medium text-morandi-primary">
                        Channel Access Token
                      </Label>
                      <Input
                        value={lineToken}
                        onChange={e => setLineToken(e.target.value)}
                        placeholder="貼上你的 Channel access token (long-lived)"
                        className="font-mono text-xs mt-1.5"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-morandi-primary">
                        Channel Secret
                      </Label>
                      <Input
                        value={lineSecret}
                        onChange={e => setLineSecret(e.target.value)}
                        placeholder="貼上你的 Channel secret"
                        className="font-mono text-xs mt-1.5"
                      />
                    </div>
                    <Button variant="soft-gold"
                      onClick={handleLineSetup}
                      disabled={lineSaving || !lineToken || !lineSecret}
 className="w-full"
                    >
                      {lineSaving ? '設定中...' : '完成設定'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </Card>
      </div>
    </ContentPageLayout>
  )
}
