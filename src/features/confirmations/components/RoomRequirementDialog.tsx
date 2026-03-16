'use client'

import { useState, useCallback } from 'react'
import { Plus, Trash2, Hotel, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores'
import { useToast } from '@/components/ui/use-toast'
import { logger } from '@/lib/utils/logger'

interface RoomType {
  id: string
  name: string   // 房型名稱（雙人房、三人房...）
  quantity: number
  note?: string
}

interface RoomRequirementDialogProps {
  open: boolean
  onClose: () => void
  hotelName: string
  hotelResourceId: string | null
  tourId: string
  serviceDate: string | null
  nights: number
  onSaved?: () => void
}

const PRESET_ROOM_TYPES = ['雙人房', '三人房', '單人房', '四人房', '家庭房', '套房']

let roomIdCounter = 0

export function RoomRequirementDialog({
  open,
  onClose,
  hotelName,
  hotelResourceId,
  tourId,
  serviceDate,
  nights,
  onSaved,
}: RoomRequirementDialogProps) {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([
    { id: `room-${++roomIdCounter}`, name: '雙人房', quantity: 1 },
  ])
  const [note, setNote] = useState('')

  const addRoomType = useCallback(() => {
    setRoomTypes(prev => [
      ...prev,
      { id: `room-${++roomIdCounter}`, name: '', quantity: 1 },
    ])
  }, [])

  const removeRoomType = useCallback((id: string) => {
    setRoomTypes(prev => prev.filter(r => r.id !== id))
  }, [])

  const updateRoomType = useCallback((id: string, field: keyof RoomType, value: string | number) => {
    setRoomTypes(prev =>
      prev.map(r => (r.id === id ? { ...r, [field]: value } : r))
    )
  }, [])

  const handleSave = async () => {
    const validRooms = roomTypes.filter(r => r.name.trim() && r.quantity > 0)
    if (validRooms.length === 0) {
      toast({ title: '請至少填寫一個房型', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const sb = createSupabaseBrowserClient()

      const items = validRooms.map(r => ({
        room_type: r.name.trim(),
        quantity: r.quantity,
        nights,
        note: r.note || undefined,
      }))

      const totalRooms = validRooms.reduce((sum, r) => sum + r.quantity, 0)

      const { error } = await sb.from('tour_requests').insert({
        tour_id: tourId,
        workspace_id: user?.workspace_id,
        request_type: 'accommodation',
        supplier_name: hotelName,
        supplier_id: hotelResourceId || undefined,
        items,
        status: 'draft',
        note: note.trim() || undefined,
        created_by: user?.id,
      } as never)

      if (error) throw error

      toast({ title: `已建立需求：${hotelName}（${totalRooms} 間 × ${nights} 晚）` })
      onSaved?.()
      onClose()

      // Reset
      setRoomTypes([{ id: `room-${++roomIdCounter}`, name: '雙人房', quantity: 1 }])
      setNote('')
    } catch (err) {
      logger.error('建立住宿需求失敗:', err)
      toast({ title: '建立失敗', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hotel size={18} className="text-morandi-gold" />
            住宿需求 — {hotelName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 基本資訊 */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
            <span>📅 {serviceDate || '-'}</span>
            <span>🌙 {nights} 晚</span>
          </div>

          {/* 房型列表 */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">房型需求</Label>
            {roomTypes.map((room, idx) => (
              <div key={room.id} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-5 shrink-0">{idx + 1}.</span>
                <div className="relative flex-1">
                  <Input
                    value={room.name}
                    onChange={e => updateRoomType(room.id, 'name', e.target.value)}
                    placeholder="房型名稱"
                    className="h-8 text-sm"
                    list={`room-presets-${room.id}`}
                  />
                  <datalist id={`room-presets-${room.id}`}>
                    {PRESET_ROOM_TYPES.map(t => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </div>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={1}
                    value={room.quantity}
                    onChange={e => updateRoomType(room.id, 'quantity', parseInt(e.target.value) || 1)}
                    className="h-8 w-16 text-sm text-center"
                  />
                  <span className="text-xs text-muted-foreground">間</span>
                </div>
                {roomTypes.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRoomType(room.id)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={addRoomType}
              className="w-full h-8 text-xs border-dashed"
            >
              <Plus size={12} className="mr-1" />
              新增房型
            </Button>
          </div>

          {/* 備註 */}
          <div className="space-y-1">
            <Label className="text-sm font-medium">備註</Label>
            <Input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="特殊需求（如海景房、高樓層...）"
              className="h-8 text-sm"
            />
          </div>

          {/* 摘要 */}
          {roomTypes.some(r => r.name.trim() && r.quantity > 0) && (
            <div className="bg-morandi-gold/5 border border-morandi-gold/20 rounded-md p-2 text-xs">
              <span className="font-medium text-morandi-primary">摘要：</span>
              {roomTypes
                .filter(r => r.name.trim() && r.quantity > 0)
                .map(r => `${r.name} × ${r.quantity}`)
                .join('、')}
              {' '}
              × {nights} 晚
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-morandi-gold hover:bg-morandi-gold-hover text-white"
          >
            {saving ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
            建立需求
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
