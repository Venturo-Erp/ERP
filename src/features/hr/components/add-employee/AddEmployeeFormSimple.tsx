'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { X, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { useUserStore } from '@/stores/user-store'
import { alertSuccess, alertError } from '@/lib/ui/alert-dialog'
import { logger } from '@/lib/utils/logger'

interface AddEmployeeFormSimpleProps {
  onSubmit: () => void
  onCancel: () => void
}

export function AddEmployeeFormSimple({ onSubmit, onCancel }: AddEmployeeFormSimpleProps) {
  const { create: createEmployee } = useUserStore()
  const [submitting, setSubmitting] = useState(false)
  
  const [formData, setFormData] = useState({
    chinese_name: '',
    english_name: '',
    email: '',
    department: '',
    position: '',
    default_password: '00000000', // 預設密碼
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.chinese_name || !formData.email) {
      await alertError('請填寫必填欄位')
      return
    }

    setSubmitting(true)
    try {
      // 創建員工（系統會自動生成員工編號）
      await createEmployee({
        chinese_name: formData.chinese_name,
        english_name: formData.english_name,
        display_name: formData.chinese_name, // 預設用中文名
        email: formData.email,
        department: formData.department,
        position: formData.position,
        status: 'active',
        // 預設密碼會在後端處理
        needs_profile_completion: true, // 標記需要完成個人資料
      })

      await alertSuccess('員工新增成功', '系統已發送設定通知給該員工')
      onSubmit()
    } catch (error) {
      logger.error('新增員工失敗:', error)
      await alertError('新增失敗')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-morandi-gold/20 flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-morandi-gold" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-morandi-primary">新增員工</h3>
            <p className="text-xs text-morandi-secondary">快速建立，員工登入後自行補完</p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onCancel}
          className="text-morandi-secondary hover:text-morandi-primary"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="space-y-5">
        {/* 中文姓名（必填） */}
        <div>
          <Label className="text-sm font-semibold text-morandi-primary mb-2 flex items-center gap-1">
            中文姓名
            <span className="text-morandi-red">*</span>
          </Label>
          <Input
            required
            value={formData.chinese_name}
            onChange={(e) => setFormData({ ...formData, chinese_name: e.target.value })}
            placeholder="例：簡威廉"
            className="bg-morandi-container/30"
          />
        </div>

        {/* 英文姓名 */}
        <div>
          <Label className="text-sm font-semibold text-morandi-primary mb-2">
            英文姓名
          </Label>
          <Input
            value={formData.english_name}
            onChange={(e) => setFormData({ ...formData, english_name: e.target.value })}
            placeholder="例：William Chien"
            className="bg-morandi-container/30"
          />
          <p className="text-xs text-morandi-secondary mt-1">選填，員工可自行補完</p>
        </div>

        {/* Email（必填） */}
        <div>
          <Label className="text-sm font-semibold text-morandi-primary mb-2 flex items-center gap-1">
            Email
            <span className="text-morandi-red">*</span>
          </Label>
          <Input
            required
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="name@company.com"
            className="bg-morandi-container/30"
          />
        </div>

        {/* 部門 */}
        <div>
          <Label className="text-sm font-semibold text-morandi-primary mb-2">
            部門
          </Label>
          <Select
            value={formData.department}
            onValueChange={(value) => setFormData({ ...formData, department: value })}
          >
            <SelectTrigger className="bg-morandi-container/30">
              <SelectValue placeholder="選擇部門" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="營運">營運</SelectItem>
              <SelectItem value="業務">業務</SelectItem>
              <SelectItem value="技術">技術</SelectItem>
              <SelectItem value="客服">客服</SelectItem>
              <SelectItem value="財務">財務</SelectItem>
              <SelectItem value="人資">人資</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 職位 */}
        <div>
          <Label className="text-sm font-semibold text-morandi-primary mb-2">
            職位
          </Label>
          <Input
            value={formData.position}
            onChange={(e) => setFormData({ ...formData, position: e.target.value })}
            placeholder="例：業務專員"
            className="bg-morandi-container/30"
          />
        </div>

        {/* 預設密碼提示 */}
        <div className="bg-morandi-blue/10 border border-morandi-blue/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-morandi-blue/20 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-xs text-morandi-blue font-bold">!</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-morandi-primary mb-1">預設密碼</p>
              <p className="text-xs text-morandi-secondary leading-relaxed">
                新員工預設密碼為 <code className="px-2 py-0.5 bg-morandi-container rounded font-mono">00000000</code>
                <br />
                首次登入後會要求員工修改密碼並補完個人資料
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-morandi-border">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="text-morandi-secondary"
        >
          取消
        </Button>
        <Button
          type="submit"
          disabled={submitting || !formData.chinese_name || !formData.email}
          className="bg-morandi-gold hover:bg-morandi-gold/90 text-white"
        >
          {submitting ? '建立中...' : '建立員工'}
        </Button>
      </div>
    </form>
  )
}
