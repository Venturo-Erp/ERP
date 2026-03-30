'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, Loader2, AlertTriangle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores'
import { logger } from '@/lib/utils/logger'
import type { ResourceType } from './ResourcePanel'

interface QuickAddResourceProps {
  type: ResourceType
  countryId?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  initialName?: string
  onCreated: (resource: { id: string; name: string; type: string }) => void
}

const TYPE_LABELS: Record<ResourceType, string> = {
  attraction: '景點',
  hotel: '酒店',
  restaurant: '餐廳',
}

const TABLE_MAP: Record<ResourceType, string> = {
  attraction: 'attractions',
  hotel: 'hotels',
  restaurant: 'restaurants',
}

export function QuickAddResource({
  type,
  countryId,
  open: controlledOpen,
  onOpenChange,
  initialName = '',
  onCreated,
}: QuickAddResourceProps) {
  // 受控/非受控模式
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const isOpen = isControlled ? controlledOpen : internalOpen

  const [name, setName] = useState(initialName)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuthStore()

  const handleOpenChange = (open: boolean) => {
    if (isControlled) {
      onOpenChange?.(open)
    } else {
      setInternalOpen(open)
    }
  }

  useEffect(() => {
    if (isOpen) {
      setName(initialName)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const handleSubmit = async () => {
    const trimmed = name.trim()
    if (!trimmed) return

    if (!countryId) {
      setError('缺少國家資訊')
      return
    }

    const workspaceId = user?.workspace_id
    if (!workspaceId) {
      setError('未登入或缺少 workspace')
      return
    }

    setSaving(true)
    setError('')

    try {
      const table = TABLE_MAP[type] as 'attractions' | 'hotels' | 'restaurants'

      const insertData: Record<string, unknown> = {
        name: trimmed,
        country_id: countryId,
        data_verified: false,
        ...(type === 'attraction' ? { workspace_id: workspaceId } : {}),
      }

      // 酒店/餐廳需要 city_id — 自動抓該國第一個城市
      if (type !== 'attraction') {
        const { data: cities } = await supabase
          .from('cities')
          .select('id')
          .eq('country_id', countryId)
          .limit(1)

        if (!cities || cities.length === 0) {
          setError('該國家尚無城市資料，請先建立城市')
          setSaving(false)
          return
        }
        insertData.city_id = (cities[0] as { id: string }).id
      }

      const { data, error: dbError } = await supabase
        .from(table)
        .insert(insertData as any)
        .select('id, name')
        .single()

      if (dbError) {
        logger.error(
          'DB error detail:',
          JSON.stringify(dbError),
          'insertData:',
          JSON.stringify(insertData)
        )
        throw new Error(dbError.message || dbError.code || JSON.stringify(dbError))
      }
      const result = data as { id: string; name: string }

      logger.log(`快速新增${TYPE_LABELS[type]}:`, result)
      onCreated({ id: result.id, name: result.name, type })
      setName('')
      handleOpenChange(false)
    } catch (err) {
      logger.error('快速新增失敗:', err)
      setError(err instanceof Error ? err.message : '新增失敗')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) {
    return null // 移除「+ 新增」按鈕，改用拖拽
  }

  return (
    <div className="flex items-center gap-1.5">
      <div className="relative flex-1">
        <Input
          ref={inputRef}
          value={name}
          onChange={e => {
            setName(e.target.value)
            setError('')
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') handleSubmit()
            if (e.key === 'Escape') {
              handleOpenChange(false)
              setName('')
            }
          }}
          placeholder={`輸入${TYPE_LABELS[type]}名稱...`}
          className="h-7 text-xs pr-2"
          disabled={saving}
        />
        {error && (
          <div className="absolute -bottom-5 left-0 text-[10px] text-destructive flex items-center gap-0.5">
            <AlertTriangle size={10} />
            {error}
          </div>
        )}
      </div>
      <Button
        size="sm"
        onClick={handleSubmit}
        disabled={saving || !name.trim()}
        className="h-7 px-2 text-xs bg-morandi-gold hover:bg-morandi-gold-hover text-white"
      >
        {saving ? <Loader2 size={12} className="animate-spin" /> : '建立'}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          handleOpenChange(false)
          setName('')
          setError('')
        }}
        className="h-7 px-1.5 text-xs"
      >
        ✕
      </Button>
    </div>
  )
}
