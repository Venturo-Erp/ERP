'use client'
/* eslint-disable venturo/no-custom-modal -- 冒險者公會專用 Modal，待重構為標準 Dialog */

import { useState } from 'react'
import { useCreateTask } from '../hooks/useCreateTask'
import type { Priority } from '../types'

interface CreateTaskModalProps {
  isOpen: boolean
  onClose: () => void
}

const AGENT_LIST = [
  'matthew',
  'caesar',
  'nova',
  'leon',
  'ben',
  'eddie',
  '前端工程師',
  'UI設計師',
  'IT自動化',
  'IT安全',
  'IT代碼審查',
  'IG策展',
  '廣告經理',
  '短視頻',
  'donki',
  '悠月',
]

export function CreateTaskModal({ isOpen, onClose }: CreateTaskModalProps) {
  const { createTask, creating } = useCreateTask()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Priority>('P1')
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      alert('請輸入任務標題')
      return
    }

    try {
      await createTask({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        assignees: selectedAssignees,
      })

      // 重置表單
      setTitle('')
      setDescription('')
      setPriority('P1')
      setSelectedAssignees([])
      onClose()
    } catch (err) {
      alert('建立任務失敗：' + (err as Error).message)
    }
  }

  const toggleAssignee = (assignee: string) => {
    if (selectedAssignees.includes(assignee)) {
      setSelectedAssignees(selectedAssignees.filter(a => a !== assignee))
    } else {
      setSelectedAssignees([...selectedAssignees, assignee])
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">建立新任務</h2>
          <button onClick={onClose} className="text-morandi-secondary hover:text-morandi-primary">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 標題 */}
          <div>
            <label className="block text-sm font-medium text-morandi-primary mb-1">
              任務標題 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例如：開發冒險者公會系統"
              required
            />
          </div>

          {/* 描述 */}
          <div>
            <label className="block text-sm font-medium text-morandi-primary mb-1">任務描述</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="詳細說明任務內容..."
            />
          </div>

          {/* 優先級 */}
          <div>
            <label className="block text-sm font-medium text-morandi-primary mb-2">優先級</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPriority('P0')}
                className={`px-4 py-2 rounded-md font-medium ${
                  priority === 'P0'
                    ? 'bg-red-500 text-white'
                    : 'bg-morandi-container text-morandi-primary hover:bg-morandi-container'
                }`}
              >
                🔴 P0 緊急
              </button>
              <button
                type="button"
                onClick={() => setPriority('P1')}
                className={`px-4 py-2 rounded-md font-medium ${
                  priority === 'P1'
                    ? 'bg-yellow-500 text-white'
                    : 'bg-morandi-container text-morandi-primary hover:bg-morandi-container'
                }`}
              >
                🟡 P1 重要
              </button>
              <button
                type="button"
                onClick={() => setPriority('P2')}
                className={`px-4 py-2 rounded-md font-medium ${
                  priority === 'P2'
                    ? 'bg-green-500 text-white'
                    : 'bg-morandi-container text-morandi-primary hover:bg-morandi-container'
                }`}
              >
                🟢 P2 普通
              </button>
            </div>
          </div>

          {/* 負責人 */}
          <div>
            <label className="block text-sm font-medium text-morandi-primary mb-2">
              負責人（可多選）
            </label>
            <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto border border-border rounded-md p-3">
              {AGENT_LIST.map(agent => (
                <label
                  key={agent}
                  className="flex items-center gap-2 cursor-pointer hover:bg-morandi-container p-2 rounded"
                >
                  <input
                    type="checkbox"
                    checked={selectedAssignees.includes(agent)}
                    onChange={() => toggleAssignee(agent)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{agent}</span>
                </label>
              ))}
            </div>
            {selectedAssignees.length > 0 && (
              <div className="mt-2 text-sm text-morandi-secondary">
                已選：{selectedAssignees.join(', ')}
              </div>
            )}
          </div>

          {/* 按鈕 */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={creating}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-morandi-muted"
            >
              {creating ? '建立中...' : '建立任務'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-morandi-container text-morandi-primary rounded-md hover:bg-morandi-container"
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
