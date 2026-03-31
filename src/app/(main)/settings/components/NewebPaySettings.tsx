'use client'

import { useState, useEffect } from 'react'
import { CreditCard, Eye, EyeOff, Save, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import type { Json } from '@/lib/supabase/types'
import { useAuthStore } from '@/stores/auth-store'
import { NEWEBPAY_LABELS } from '../constants/labels'

interface NewebPayConfig {
  merchantId: string
  hashKey: string
  hashIV: string
  isProduction: boolean
}

export function NewebPaySettings() {
  const workspaceId = useAuthStore(s => s.user?.workspace_id)
  const [config, setConfig] = useState<NewebPayConfig>({
    merchantId: '',
    hashKey: '',
    hashIV: '',
    isProduction: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showSecrets, setShowSecrets] = useState({
    hashKey: false,
    hashIV: false,
  })
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchConfig()
  }, [workspaceId])

  const fetchConfig = async () => {
    try {
      if (!workspaceId) return
      const { data, error } = await supabase
        .from('system_settings')
        .select('settings')
        .eq('category', 'newebpay')
        .eq('workspace_id', workspaceId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // 沒有資料，使用預設值
          return
        }
        throw error
      }

      if (data?.settings) {
        setConfig(data.settings as unknown as NewebPayConfig)
      }
    } catch (error) {
      logger.error('載入設定失敗:', error)
      setMessage({ type: 'error', text: NEWEBPAY_LABELS.LOAD_FAILED })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      if (!workspaceId) return
      const { error } = await supabase.from('system_settings').upsert(
        {
          category: 'newebpay',
          workspace_id: workspaceId,
          settings: config as unknown as Json,
          description: NEWEBPAY_LABELS.TITLE,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'category,workspace_id',
        }
      )

      if (error) throw error

      setMessage({ type: 'success', text: NEWEBPAY_LABELS.SAVE_SUCCESS })
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      logger.error('儲存設定失敗:', error)
      setMessage({ type: 'error', text: NEWEBPAY_LABELS.SAVE_FAILED })
    } finally {
      setSaving(false)
    }
  }

  const maskValue = (value: string) => {
    if (!value) return ''
    if (value.length <= 8) return '••••••••'
    return value.slice(0, 4) + '••••••••' + value.slice(-4)
  }

  if (loading) {
    return (
      <section className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <CreditCard className="h-5 w-5 text-morandi-gold" />
          <h2 className="text-lg font-semibold text-morandi-primary">{NEWEBPAY_LABELS.TITLE}</h2>
        </div>
        <div className="text-sm text-morandi-secondary">{NEWEBPAY_LABELS.LOADING}</div>
      </section>
    )
  }

  return (
    <section className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CreditCard className="h-5 w-5 text-morandi-gold" />
          <h2 className="text-lg font-semibold text-morandi-primary">{NEWEBPAY_LABELS.TITLE}</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-morandi-secondary">{NEWEBPAY_LABELS.SUBTITLE}</span>
        </div>
      </div>

      <div className="space-y-4">
        {/* 商店代號 */}
        <div className="space-y-2">
          <Label htmlFor="merchantId">{NEWEBPAY_LABELS.MERCHANT_ID}</Label>
          <Input
            id="merchantId"
            value={config.merchantId}
            onChange={e => setConfig({ ...config, merchantId: e.target.value })}
            placeholder={NEWEBPAY_LABELS.LABEL_8125}
          />
          <p className="text-xs text-morandi-secondary">{NEWEBPAY_LABELS.MERCHANT_ID_HINT}</p>
        </div>

        {/* HashKey */}
        <div className="space-y-2">
          <Label htmlFor="hashKey">HashKey</Label>
          <div className="flex items-center gap-2">
            <Input
              id="hashKey"
              type={showSecrets.hashKey ? 'text' : 'password'}
              value={showSecrets.hashKey ? config.hashKey : maskValue(config.hashKey)}
              onChange={e => setConfig({ ...config, hashKey: e.target.value })}
              placeholder={NEWEBPAY_LABELS.LABEL_6384}
              className="flex-1"
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0"
              onClick={() => setShowSecrets({ ...showSecrets, hashKey: !showSecrets.hashKey })}
            >
              {showSecrets.hashKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </Button>
          </div>
          <p className="text-xs text-morandi-secondary">{NEWEBPAY_LABELS.HASHKEY_HINT}</p>
        </div>

        {/* HashIV */}
        <div className="space-y-2">
          <Label htmlFor="hashIV">HashIV</Label>
          <div className="flex items-center gap-2">
            <Input
              id="hashIV"
              type={showSecrets.hashIV ? 'text' : 'password'}
              value={showSecrets.hashIV ? config.hashIV : maskValue(config.hashIV)}
              onChange={e => setConfig({ ...config, hashIV: e.target.value })}
              placeholder={NEWEBPAY_LABELS.LABEL_1330}
              className="flex-1"
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0"
              onClick={() => setShowSecrets({ ...showSecrets, hashIV: !showSecrets.hashIV })}
            >
              {showSecrets.hashIV ? <EyeOff size={16} /> : <Eye size={16} />}
            </Button>
          </div>
          <p className="text-xs text-morandi-secondary">{NEWEBPAY_LABELS.HASHIV_HINT}</p>
        </div>

        {/* 環境切換 */}
        <div className="flex items-center justify-between p-4 bg-morandi-background rounded-lg border border-border">
          <div>
            <Label htmlFor="isProduction" className="text-sm font-medium">
              {NEWEBPAY_LABELS.LABEL_2112}
            </Label>
            <p className="text-xs text-morandi-secondary mt-1">
              {config.isProduction ? NEWEBPAY_LABELS.ENV_PRODUCTION : NEWEBPAY_LABELS.ENV_TEST}
            </p>
          </div>
          <Switch
            id="isProduction"
            checked={config.isProduction}
            onCheckedChange={checked => setConfig({ ...config, isProduction: checked })}
          />
        </div>

        {/* 儲存按鈕與訊息 */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          {message && (
            <div
              className={`flex items-center gap-2 text-sm ${
                message.type === 'success' ? 'text-status-success' : 'text-status-danger'
              }`}
            >
              {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {message.text}
            </div>
          )}
          {!message && <div />}
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save size={16} />
            {saving ? NEWEBPAY_LABELS.SAVING : NEWEBPAY_LABELS.SAVE}
          </Button>
        </div>
      </div>

      {/* 說明 */}
      <div className="mt-6 p-4 bg-status-info-bg rounded-lg border border-status-info/30">
        <h4 className="text-sm font-medium text-morandi-primary mb-2">
          {NEWEBPAY_LABELS.SETUP_GUIDE}
        </h4>
        <ul className="text-xs text-morandi-secondary space-y-1 list-disc list-inside">
          <li>{NEWEBPAY_LABELS.GUIDE_1}</li>
          <li>{NEWEBPAY_LABELS.GUIDE_2}</li>
          <li>{NEWEBPAY_LABELS.GUIDE_3}</li>
          <li>{NEWEBPAY_LABELS.GUIDE_4}</li>
        </ul>
      </div>
    </section>
  )
}
