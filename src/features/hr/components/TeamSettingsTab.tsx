'use client'

/**
 * 團務設定 Tab（HR > 職務管理）
 * 管理選人欄位 + 欄位→職務映射
 * 職務列表直接讀 workspace_roles（與「職務權限」Tab 共用）
 */

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2, Pencil, Loader2, ListChecks } from 'lucide-react'
import { logger } from '@/lib/utils/logger'

interface Role {
  id: string
  name: string
}

interface SelectorField {
  id: string
  name: string
  level: 'tour' | 'order'
  is_required: boolean
  sort_order: number
  roles: { id: string; name: string }[]
}

export function TeamSettingsTab() {
  const { toast } = useToast()

  // 職務列表（來自 workspace_roles，與職務權限 Tab 共用）
  const [roles, setRoles] = useState<Role[]>([])
  const [loadingRoles, setLoadingRoles] = useState(true)

  // 選人欄位
  const [selectorFields, setSelectorFields] = useState<SelectorField[]>([])
  const [loadingFields, setLoadingFields] = useState(true)

  // 欄位 Dialog
  const [fieldDialogOpen, setFieldDialogOpen] = useState(false)
  const [editingField, setEditingField] = useState<SelectorField | null>(null)
  const [fieldForm, setFieldForm] = useState({
    name: '',
    level: 'tour' as 'tour' | 'order',
    is_required: false,
    role_ids: [] as string[],
  })
  const [savingField, setSavingField] = useState(false)

  // 載入職務列表（workspace_roles）
  const fetchRoles = useCallback(async () => {
    setLoadingRoles(true)
    try {
      const res = await fetch('/api/roles')
      if (res.ok) setRoles(await res.json())
    } catch (err) {
      logger.error('Failed to fetch roles:', err)
    }
    setLoadingRoles(false)
  }, [])

  // 載入選人欄位
  const fetchSelectorFields = useCallback(async () => {
    setLoadingFields(true)
    try {
      const res = await fetch('/api/job-roles/selector-fields')
      if (res.ok) setSelectorFields(await res.json())
    } catch (err) {
      logger.error('Failed to fetch selector fields:', err)
    }
    setLoadingFields(false)
  }, [])

  useEffect(() => {
    fetchRoles()
    fetchSelectorFields()
  }, [fetchRoles, fetchSelectorFields])

  const openFieldDialog = (field?: SelectorField) => {
    if (field) {
      setEditingField(field)
      setFieldForm({
        name: field.name,
        level: field.level,
        is_required: field.is_required,
        role_ids: field.roles.map(r => r.id),
      })
    } else {
      setEditingField(null)
      setFieldForm({ name: '', level: 'tour', is_required: false, role_ids: [] })
    }
    setFieldDialogOpen(true)
  }

  const handleSaveField = async () => {
    if (!fieldForm.name.trim()) return
    setSavingField(true)
    try {
      const isEdit = !!editingField
      const url = isEdit
        ? `/api/job-roles/selector-fields/${editingField.id}`
        : '/api/job-roles/selector-fields'

      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fieldForm),
      })

      if (res.ok) {
        setFieldDialogOpen(false)
        fetchSelectorFields()
        toast({ title: isEdit ? '已更新' : '已新增' })
      } else {
        const err = await res.json()
        toast({ title: err.error || '儲存失敗', variant: 'destructive' })
      }
    } catch (err) {
      logger.error('Failed to save selector field:', err)
      toast({ title: '儲存失敗', variant: 'destructive' })
    }
    setSavingField(false)
  }

  const handleDeleteField = async (field: SelectorField) => {
    if (!confirm(`確定要刪除「${field.name}」欄位嗎？`)) return
    try {
      const res = await fetch(`/api/job-roles/selector-fields/${field.id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchSelectorFields()
        toast({ title: '已刪除' })
      }
    } catch (err) {
      logger.error('Failed to delete selector field:', err)
    }
  }

  const toggleRoleMapping = (roleId: string) => {
    setFieldForm(prev => ({
      ...prev,
      role_ids: prev.role_ids.includes(roleId)
        ? prev.role_ids.filter(id => id !== roleId)
        : [...prev.role_ids, roleId],
    }))
  }

  const isLoading = loadingRoles || loadingFields

  return (
    <div>
      {/* 選人欄位區塊 */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-morandi-gold" />
            <h3 className="font-semibold text-morandi-primary">選人欄位</h3>
            <span className="text-xs text-morandi-secondary">
              定義開團/建訂單時出現的選人下拉欄位
            </span>
          </div>
          <Button
            size="sm"
            onClick={() => openFieldDialog()}
            disabled={isLoading}
            className="bg-gradient-to-br from-morandi-gold/40 to-morandi-container/60 text-morandi-primary ring-1 ring-border/50 hover:from-morandi-gold/60 hover:to-morandi-container/80 shadow-md hover:shadow-lg"
          >
            <Plus className="h-4 w-4 mr-1" />
            新增欄位
          </Button>
        </div>

        {loadingFields ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-morandi-secondary" />
          </div>
        ) : selectorFields.length === 0 ? (
          <div className="text-center py-8 text-morandi-secondary">
            <ListChecks className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">尚未建立選人欄位</p>
            <p className="text-xs mt-1">點擊「新增欄位」開始設定</p>
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-morandi-bg/50 border-b border-border">
                  <th className="text-left p-3 text-sm font-semibold text-morandi-primary">
                    欄位名稱
                  </th>
                  <th className="text-left p-3 text-sm font-semibold text-morandi-primary">層級</th>
                  <th className="text-left p-3 text-sm font-semibold text-morandi-primary">
                    可選職務
                  </th>
                  <th className="text-center p-3 text-sm font-semibold text-morandi-primary">
                    必填
                  </th>
                  <th className="text-right p-3 text-sm font-semibold text-morandi-primary">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {selectorFields.map(field => (
                  <tr
                    key={field.id}
                    className="border-b border-border last:border-b-0 hover:bg-morandi-bg/20"
                  >
                    <td className="p-3 text-sm text-morandi-primary font-medium">{field.name}</td>
                    <td className="p-3">
                      <Badge
                        variant="outline"
                        className={
                          field.level === 'tour'
                            ? 'text-morandi-green border-morandi-green/30'
                            : 'text-morandi-gold border-morandi-gold/30'
                        }
                      >
                        {field.level === 'tour' ? '團' : '訂單'}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {field.roles.length > 0 ? (
                          field.roles.map(role => (
                            <Badge
                              key={role.id}
                              variant="secondary"
                              className="text-xs bg-morandi-container text-morandi-primary"
                            >
                              {role.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-morandi-secondary">全部員工</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      {field.is_required && (
                        <Badge className="bg-morandi-red/10 text-morandi-red border-morandi-red/30 text-xs">
                          必填
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 hover:bg-morandi-bg"
                          onClick={() => openFieldDialog(field)}
                        >
                          <Pencil className="h-3.5 w-3.5 text-morandi-secondary" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 hover:bg-morandi-red/10"
                          onClick={() => handleDeleteField(field)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-morandi-red" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 新增/編輯欄位 Dialog */}
      <Dialog open={fieldDialogOpen} onOpenChange={setFieldDialogOpen}>
        <DialogContent level={1} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-morandi-primary">
              {editingField ? '編輯選人欄位' : '新增選人欄位'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-morandi-primary">欄位名稱</Label>
              <Input
                value={fieldForm.name}
                onChange={e => setFieldForm({ ...fieldForm, name: e.target.value })}
                placeholder="例如：團控、助理、業務"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-morandi-primary">層級</Label>
              <Select
                value={fieldForm.level}
                onValueChange={(v: 'tour' | 'order') => setFieldForm({ ...fieldForm, level: v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tour">團（開團時出現）</SelectItem>
                  <SelectItem value="order">訂單（建訂單時出現）</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-morandi-primary">可選職務</Label>
              <p className="text-xs text-morandi-secondary mt-1 mb-2">
                勾選後，此欄位的下拉只會顯示該職務的員工。不勾選 = 全部員工。
              </p>
              {loadingRoles ? (
                <div className="flex justify-center py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-morandi-secondary" />
                </div>
              ) : roles.length === 0 ? (
                <p className="text-sm text-morandi-secondary">請先在「職務權限」Tab 新增職務</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {roles.map(role => (
                    <label
                      key={role.id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                        fieldForm.role_ids.includes(role.id)
                          ? 'border-morandi-gold bg-morandi-gold/5'
                          : 'border-border hover:border-morandi-gold/50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={fieldForm.role_ids.includes(role.id)}
                        onChange={() => toggleRoleMapping(role.id)}
                        className="accent-morandi-gold"
                      />
                      <span className="text-sm text-morandi-primary">{role.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-morandi-primary">必填</Label>
              <Switch
                checked={fieldForm.is_required}
                onCheckedChange={v => setFieldForm({ ...fieldForm, is_required: v })}
                className="data-[state=checked]:bg-morandi-gold"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFieldDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleSaveField}
              disabled={savingField || !fieldForm.name.trim()}
              className="bg-gradient-to-br from-morandi-gold/40 to-morandi-container/60 text-morandi-primary ring-1 ring-border/50 hover:from-morandi-gold/60 hover:to-morandi-container/80 shadow-md hover:shadow-lg"
            >
              {savingField && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingField ? '更新' : '建立'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
