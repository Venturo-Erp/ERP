'use client'

import React, { useState, useEffect } from 'react'
import { Settings, Clock, MapPin, MessageCircle, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
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

export default function HRSettingsPage() {
  const user = useAuthStore(state => state.user)
  const [settings, setSettings] = useState<AttendanceSettings>(DEFAULT_SETTINGS)
  const [lineConfig, setLineConfig] = useState<LineConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // LINE 設定表單
  const [lineToken, setLineToken] = useState('')
  const [lineSecret, setLineSecret] = useState('')
  const [lineSaving, setLineSaving] = useState(false)

  // 載入設定
  useEffect(() => {
    if (!user?.workspace_id) return

    const load = async () => {
      try {
        // 載入打卡設定
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

        // 載入 LINE 設定狀態
        const lineRes = await fetch('/api/line/setup')
        if (lineRes.ok) {
          const lineData = await lineRes.json()
          setLineConfig(lineData)
        }
      } catch (err) {
        logger.error('載入設定失敗:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.workspace_id])

  // 儲存打卡設定
  const handleSave = async () => {
    if (!user?.workspace_id) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('workspace_attendance_settings' as never)
        .upsert(
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

  // LINE Bot 設定
  const handleLineSetup = async () => {
    if (!lineToken || !lineSecret) {
      toast.error('請填寫 Channel Access Token 和 Channel Secret')
      return
    }
    setLineSaving(true)
    try {
      // Step 1: 儲存 credentials
      const saveRes = await fetch('/api/line/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_messaging', channel_access_token: lineToken, channel_secret: lineSecret }),
      })
      const saveData = await saveRes.json()
      if (!saveRes.ok) {
        toast.error(saveData.error || '設定失敗')
        return
      }

      // Step 2: 設定 Webhook
      const webhookRes = await fetch('/api/line/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_webhook' }),
      })
      const webhookData = await webhookRes.json()

      // Step 3: 完成
      await fetch('/api/line/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' }),
      })

      // 重新載入狀態
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

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh] text-morandi-muted">載入中...</div>
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="text-morandi-primary" size={24} />
        <h1 className="text-xl font-semibold text-morandi-primary">人資設定</h1>
      </div>

      {/* 打卡時間設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock size={18} />
            打卡時間
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>上班時間</Label>
              <Input
                type="time"
                value={settings.work_start_time}
                onChange={e => setSettings(s => ({ ...s, work_start_time: e.target.value }))}
              />
            </div>
            <div>
              <Label>下班時間</Label>
              <Input
                type="time"
                value={settings.work_end_time}
                onChange={e => setSettings(s => ({ ...s, work_end_time: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>標準工時（小時）</Label>
              <Input
                type="number"
                value={settings.standard_work_hours}
                onChange={e => setSettings(s => ({ ...s, standard_work_hours: Number(e.target.value) }))}
              />
            </div>
            <div>
              <Label>遲到寬限（分鐘）</Label>
              <Input
                type="number"
                value={settings.late_threshold_minutes}
                onChange={e => setSettings(s => ({ ...s, late_threshold_minutes: Number(e.target.value) }))}
              />
              <p className="text-xs text-morandi-muted mt-1">0 = 超過上班時間即算遲到</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>允許忘打卡補登</Label>
              <p className="text-xs text-morandi-muted">員工可以申請補打卡</p>
            </div>
            <Switch
              checked={settings.allow_missed_clock_request}
              onCheckedChange={v => setSettings(s => ({ ...s, allow_missed_clock_request: v }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* GPS 定位設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin size={18} />
            GPS 定位打卡
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>要求 GPS 定位</Label>
              <p className="text-xs text-morandi-muted">打卡時必須在指定範圍內</p>
            </div>
            <Switch
              checked={settings.require_gps}
              onCheckedChange={v => setSettings(s => ({ ...s, require_gps: v }))}
            />
          </div>
          {settings.require_gps && (
            <div className="grid grid-cols-3 gap-4 pl-4 border-l-2 border-morandi-gold/30">
              <div>
                <Label>公司緯度</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={settings.gps_latitude || ''}
                  onChange={e => setSettings(s => ({ ...s, gps_latitude: Number(e.target.value) || null }))}
                  placeholder="25.0330"
                />
              </div>
              <div>
                <Label>公司經度</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={settings.gps_longitude || ''}
                  onChange={e => setSettings(s => ({ ...s, gps_longitude: Number(e.target.value) || null }))}
                  placeholder="121.5654"
                />
              </div>
              <div>
                <Label>允許半徑（公尺）</Label>
                <Input
                  type="number"
                  value={settings.gps_radius_meters}
                  onChange={e => setSettings(s => ({ ...s, gps_radius_meters: Number(e.target.value) }))}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 打卡管道 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageCircle size={18} />
            打卡管道
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>網頁打卡</Label>
              <p className="text-xs text-morandi-muted">員工從 ERP 系統內打卡</p>
            </div>
            <Switch
              checked={settings.enable_web_clock}
              onCheckedChange={v => setSettings(s => ({ ...s, enable_web_clock: v }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>LINE 打卡</Label>
              <p className="text-xs text-morandi-muted">員工透過 LINE 傳「上班」「下班」打卡</p>
            </div>
            <Switch
              checked={settings.enable_line_clock}
              onCheckedChange={v => setSettings(s => ({ ...s, enable_line_clock: v }))}
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full bg-morandi-gold hover:bg-morandi-gold-hover text-white">
        {saving ? '儲存中...' : '儲存打卡設定'}
      </Button>

      {/* LINE Bot 設定 */}
      <Card className="border-2 border-morandi-green/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageCircle size={18} className="text-morandi-green" />
            LINE@ 機器人設定
            {lineConfig?.is_connected && (
              <span className="flex items-center gap-1 text-xs font-normal text-morandi-green">
                <CheckCircle2 size={14} /> 已連線
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {lineConfig?.is_connected ? (
            // 已設定
            <div className="space-y-3">
              <div className="bg-morandi-green/5 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-morandi-muted">Bot 名稱</span>
                  <span className="font-medium">{lineConfig.bot_display_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-morandi-muted">Bot ID</span>
                  <span className="font-mono text-xs">{lineConfig.bot_basic_id}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-morandi-muted">Webhook</span>
                  <span className="font-mono text-xs truncate max-w-[200px]">{lineConfig.webhook_url}</span>
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
            </div>
          ) : (
            // 未設定 — 教學步驟
            <div className="space-y-4">
              <div className="bg-status-warning-bg border border-status-warning/20 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle size={16} className="text-status-warning mt-0.5 flex-shrink-0" />
                <p className="text-sm text-morandi-primary">
                  要啟用 LINE 打卡，需要先設定公司的 LINE@ 機器人
                </p>
              </div>

              {/* 教學步驟 */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-morandi-primary">設定步驟</h4>

                <div className="space-y-2">
                  <div className="flex gap-3 items-start">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-morandi-primary text-white text-xs flex items-center justify-center">1</span>
                    <div>
                      <p className="text-sm font-medium">建立 LINE Official Account</p>
                      <p className="text-xs text-morandi-muted">前往 LINE Official Account Manager 建立帳號（免費方案即可）</p>
                      <a href="https://manager.line.biz/" target="_blank" rel="noopener noreferrer"
                        className="text-xs text-morandi-gold hover:underline inline-flex items-center gap-1 mt-1">
                        開啟 LINE OA Manager <ExternalLink size={10} />
                      </a>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-morandi-primary text-white text-xs flex items-center justify-center">2</span>
                    <div>
                      <p className="text-sm font-medium">啟用 Messaging API</p>
                      <p className="text-xs text-morandi-muted">在 LINE OA 的「設定」→「Messaging API」點擊啟用，會引導到 LINE Developers</p>
                      <a href="https://developers.line.biz/console/" target="_blank" rel="noopener noreferrer"
                        className="text-xs text-morandi-gold hover:underline inline-flex items-center gap-1 mt-1">
                        開啟 LINE Developers <ExternalLink size={10} />
                      </a>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-morandi-primary text-white text-xs flex items-center justify-center">3</span>
                    <div>
                      <p className="text-sm font-medium">複製 Token 和 Secret</p>
                      <p className="text-xs text-morandi-muted">
                        在 LINE Developers Console → 你的 Channel → 「Messaging API」分頁找到 Channel access token（長效）。
                        在「Basic settings」分頁找到 Channel secret。
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-morandi-primary text-white text-xs flex items-center justify-center">4</span>
                    <div>
                      <p className="text-sm font-medium">貼到下方欄位，點擊完成設定</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 設定表單 */}
              <div className="space-y-3 pt-2 border-t">
                <div>
                  <Label>Channel Access Token</Label>
                  <Input
                    value={lineToken}
                    onChange={e => setLineToken(e.target.value)}
                    placeholder="貼上你的 Channel access token (long-lived)"
                    className="font-mono text-xs"
                  />
                </div>
                <div>
                  <Label>Channel Secret</Label>
                  <Input
                    value={lineSecret}
                    onChange={e => setLineSecret(e.target.value)}
                    placeholder="貼上你的 Channel secret"
                    className="font-mono text-xs"
                  />
                </div>
                <Button
                  onClick={handleLineSetup}
                  disabled={lineSaving || !lineToken || !lineSecret}
                  className="w-full bg-morandi-gold hover:bg-morandi-gold-hover text-white"
                >
                  {lineSaving ? '設定中...' : '完成設定'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
