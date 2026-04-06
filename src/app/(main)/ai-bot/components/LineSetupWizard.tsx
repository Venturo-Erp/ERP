{'use client'}

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { MessageCircle } from 'lucide-react'
import { toast } from 'sonner'

interface LineSetupWizardProps {
  onComplete?: () => void
}

export function LineSetupWizard({ onComplete }: LineSetupWizardProps) {
  const [config, setConfig] = useState<{
    setup_step: number
    is_connected: boolean
    bot_display_name?: string
    bot_basic_id?: string
    webhook_url?: string
  }>({ setup_step: 0, is_connected: false })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [token, setToken] = useState('')
  const [secret, setSecret] = useState('')

  useEffect(() => {
    fetch('/api/line/setup')
      .then(r => r.json())
      .then(data => {
        setConfig(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleSaveCredentials = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/line/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_messaging', channel_access_token: token, channel_secret: secret }),
      })
      const data = await res.json()
      if (data.ok) {
        toast.success(`驗證成功！Bot: ${data.bot.displayName}`)
        setConfig(prev => ({ ...prev, setup_step: 2, bot_display_name: data.bot.displayName, bot_basic_id: data.bot.basicId }))
        setToken('')
        setSecret('')
      } else {
        toast.error(data.error || '驗證失敗，請確認 Token 和 Secret 是否正確')
      }
    } catch {
      toast.error('連線失敗，請檢查網路')
    } finally {
      setSaving(false)
    }
  }

  const handleSetWebhook = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/line/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_webhook' }),
      })
      const data = await res.json()
      if (data.ok) {
        toast.success('Webhook 設定成功！')
        setConfig(prev => ({ ...prev, setup_step: 3, is_connected: true, webhook_url: data.webhook_url }))
      } else {
        toast.error(data.error || 'Webhook 設定失敗')
      }
    } catch {
      toast.error('設定失敗')
    } finally {
      setSaving(false)
    }
  }

  const handleComplete = async () => {
    await fetch('/api/line/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete' }),
    })
    setConfig(prev => ({ ...prev, setup_step: 4, is_connected: true }))
    toast.success('LINE Bot 設定完成！')
    onComplete?.()
  }

  if (loading) return <div className="py-8 text-center text-morandi-secondary">載入中...</div>

  const step = config.setup_step

  if (step >= 4 && config.is_connected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-morandi-green" />
            LINE Bot 已連接
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-morandi-muted">Bot 名稱</label>
              <p className="font-medium">{config.bot_display_name || '—'}</p>
            </div>
            <div>
              <label className="text-xs text-morandi-muted">Bot ID</label>
              <p className="font-mono text-sm">{config.bot_basic_id || '—'}</p>
            </div>
            <div>
              <label className="text-xs text-morandi-muted">Webhook</label>
              <p className="font-mono text-xs">{config.webhook_url || '—'}</p>
            </div>
            <div>
              <label className="text-xs text-morandi-muted">狀態</label>
              <Badge className="bg-morandi-green/20 text-morandi-green">運作中</Badge>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setConfig(prev => ({ ...prev, setup_step: 0 }))}>
            重新設定
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card className={step >= 1 ? 'border-morandi-green/30' : ''}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 1 ? 'bg-morandi-green text-white' : 'bg-morandi-container text-morandi-secondary'}`}>1</span>
            建立 LINE Messaging API Channel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ol className="list-decimal list-inside space-y-2 text-sm text-morandi-secondary">
            <li>前往 <a href="https://developers.line.biz/console/" target="_blank" rel="noopener noreferrer" className="text-morandi-gold underline">LINE Developers Console</a></li>
            <li>點擊 <strong>Create</strong> 建立 Provider（輸入公司名稱）</li>
            <li>在 Provider 內點擊 <strong>Create a Messaging API channel</strong></li>
            <li>進入 Channel → 點 <strong>Messaging API</strong> 分頁 → 找到 Channel access token → 點 <strong>Issue</strong> 產生</li>
            <li>點 <strong>Basic settings</strong> 分頁 → 複製 <strong>Channel secret</strong></li>
          </ol>
          {step < 1 && (
            <Button variant="outline" size="sm" onClick={() => setConfig(prev => ({ ...prev, setup_step: 1 }))}>
              我已建立，下一步
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className={step >= 2 ? 'border-morandi-green/30' : step >= 1 ? '' : 'opacity-50'}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 2 ? 'bg-morandi-green text-white' : 'bg-morandi-container text-morandi-secondary'}`}>2</span>
            輸入 API 金鑰
            {step >= 2 && config.bot_display_name && (
              <Badge className="bg-morandi-green/20 text-morandi-green ml-2">{config.bot_display_name}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        {step >= 1 && (
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium">Channel Access Token</label>
              <Input
                type="password"
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder="貼上 Channel access token..."
                className="mt-1 font-mono text-xs"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Channel Secret</label>
              <Input
                type="password"
                value={secret}
                onChange={e => setSecret(e.target.value)}
                placeholder="貼上 Channel secret..."
                className="mt-1 font-mono text-xs"
              />
            </div>
            {step < 2 && (
              <Button onClick={handleSaveCredentials} disabled={saving || !token || !secret}>
                {saving ? '驗證中...' : '驗證並儲存'}
              </Button>
            )}
          </CardContent>
        )}
      </Card>

      <Card className={step >= 3 ? 'border-morandi-green/30' : step >= 2 ? '' : 'opacity-50'}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 3 ? 'bg-morandi-green text-white' : 'bg-morandi-container text-morandi-secondary'}`}>3</span>
            設定 Webhook（自動）
            {step >= 3 && <Badge className="bg-morandi-green/20 text-morandi-green ml-2">已連接</Badge>}
          </CardTitle>
        </CardHeader>
        {step >= 2 && step < 3 && (
          <CardContent>
            <p className="text-sm text-morandi-secondary mb-3">
              點擊下方按鈕，系統會自動幫你設定 Webhook URL 並測試連線。
            </p>
            <Button onClick={handleSetWebhook} disabled={saving}>
              {saving ? '設���中...' : '一鍵設定 Webhook'}
            </Button>
          </CardContent>
        )}
      </Card>

      <Card className={step >= 3 ? '' : 'opacity-50'}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 4 ? 'bg-morandi-green text-white' : 'bg-morandi-container text-morandi-secondary'}`}>4</span>
            完成！
          </CardTitle>
        </CardHeader>
        {step >= 3 && step < 4 && (
          <CardContent>
            <p className="text-sm text-morandi-secondary mb-3">
              LINE Bot 已成功連接！客戶傳訊息給你的 LINE@ 帳號，AI 助理會自動回覆。
            </p>
            <Button onClick={handleComplete}>完成設定</Button>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
