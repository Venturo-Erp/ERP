'use client'

import { useState } from 'react'
import { Task } from '../types'
import { useUpdateTask } from '../hooks/useUpdateTask'
import { useFileUpload } from '../hooks/useFileUpload'

interface TaskCardProps {
  task: Task
  draggable?: boolean
  onDragStart?: (e: React.DragEvent) => void
}

export function TaskCard({ task, draggable = true, onDragStart }: TaskCardProps) {
  const { updateProgress, updateStatus, updateAssignees } = useUpdateTask()
  const { uploadFile, uploading } = useFileUpload()
  const [showProgressEdit, setShowProgressEdit] = useState(false)
  const [showAssigneeEdit, setShowAssigneeEdit] = useState(false)

  const priorityColors = {
    P0: 'bg-red-500',
    P1: 'bg-yellow-500',
    P2: 'bg-green-500',
  }

  const handleProgressChange = async (newProgress: number) => {
    await updateProgress(task.id, newProgress)
    setShowProgressEdit(false)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await uploadFile(file, task.id)
  }

  const handleComplete = async () => {
    if (confirm('確定要結案嗎？')) {
      await updateStatus(task.id, 'completed')
    }
  }

  return (
    <div
      className={`p-4 bg-white rounded-lg shadow-sm border border-border ${
        draggable ? 'cursor-move' : ''
      }`}
      draggable={draggable}
      onDragStart={onDragStart}
    >
      {/* 標題 + 優先級 */}
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-morandi-primary">{task.title}</h3>
        <span
          className={`px-2 py-1 text-xs font-bold text-white rounded ${priorityColors[task.priority]}`}
        >
          {task.priority}
        </span>
      </div>

      {/* 描述 */}
      {task.description && (
        <p className="text-sm text-morandi-secondary mb-3">{task.description}</p>
      )}

      {/* 團號 */}
      {task.tour_code && (
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xs font-medium text-blue-600">📋 {task.tour_code}</span>
        </div>
      )}

      {/* Legacy 標記 */}
      {task.is_legacy && (
        <div className="mb-2">
          <span className="text-xs text-morandi-secondary">📁 舊檔/台中</span>
        </div>
      )}

      {/* 進度條 */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-morandi-secondary mb-1">
          <span>進度</span>
          <button
            onClick={() => setShowProgressEdit(!showProgressEdit)}
            className="text-blue-600 hover:underline"
          >
            {task.progress}%
          </button>
        </div>
        <div className="w-full bg-morandi-container rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${task.progress}%` }}
          />
        </div>
        {showProgressEdit && (
          <div className="mt-2 flex gap-2">
            <input
              type="number"
              min="0"
              max="100"
              defaultValue={task.progress}
              className="w-20 px-2 py-1 border rounded text-sm"
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  handleProgressChange(Number(e.currentTarget.value))
                }
              }}
            />
            <button
              onClick={() => setShowProgressEdit(false)}
              className="text-xs text-morandi-secondary"
            >
              取消
            </button>
          </div>
        )}
      </div>

      {/* 負責人 */}
      <div className="mb-3">
        <div className="text-xs text-morandi-secondary mb-1">負責人</div>
        <div className="flex flex-wrap gap-1">
          {task.assignees.map(assignee => (
            <span key={assignee} className="px-2 py-1 bg-morandi-container text-xs rounded">
              {assignee}
            </span>
          ))}
          <button
            onClick={() => setShowAssigneeEdit(!showAssigneeEdit)}
            className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
          >
            + 加人
          </button>
        </div>
      </div>

      {/* 附件 */}
      {task.attachments && task.attachments.length > 0 && (
        <div className="mb-3">
          <div className="text-xs text-morandi-secondary mb-1">
            附件 ({task.attachments.length})
          </div>
          <div className="space-y-1">
            {task.attachments.map(att => (
              <div key={att.id} className="text-xs flex items-center gap-2">
                <span>{att.filename}</span>
                {att.tour_code && <span className="text-blue-600">({att.tour_code})</span>}
                {att.is_legacy && <span className="text-morandi-secondary">(legacy)</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 操作按鈕 */}
      <div className="flex gap-2 mt-3 pt-3 border-t">
        <label className="cursor-pointer px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">
          {uploading ? '上傳中...' : '📎 上傳'}
          <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
        </label>

        {task.status !== 'completed' && (
          <button
            onClick={handleComplete}
            className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
          >
            ✅ 結案
          </button>
        )}
      </div>

      {/* 時間資訊 */}
      <div className="mt-2 text-xs text-muted-foreground">
        建立：{new Date(task.created_at).toLocaleString('zh-TW')}
        {task.completed_at && <> • 完成：{new Date(task.completed_at).toLocaleString('zh-TW')}</>}
      </div>
    </div>
  )
}
