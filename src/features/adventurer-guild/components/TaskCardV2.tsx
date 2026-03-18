'use client';

import { useState } from 'react';
import { Task } from '../types';
import { useUpdateTask } from '../hooks/useUpdateTask';
import { useFileUpload } from '../hooks/useFileUpload';

interface TaskCardProps {
  task: Task;
  draggable?: boolean;
}

export function TaskCard({ task, draggable = true }: TaskCardProps) {
  const { updateProgress, updateStatus } = useUpdateTask();
  const { uploadFile, uploading } = useFileUpload();
  const [showProgressEdit, setShowProgressEdit] = useState(false);
  const [progressValue, setProgressValue] = useState(task.progress);

  const handleProgressSave = async () => {
    await updateProgress(task.id, progressValue);
    setShowProgressEdit(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file, task.id);
  };

  const handleComplete = async () => {
    if (confirm('確定要結案嗎？')) {
      await updateStatus(task.id, 'completed');
    }
  };

  const priorityColors = {
    P0: 'text-red-600 bg-red-50 border-red-200',
    P1: 'text-amber-600 bg-amber-50 border-amber-200',
    P2: 'text-green-600 bg-green-50 border-green-200',
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${draggable ? 'cursor-move hover:shadow-md' : ''} transition-shadow`}>
      {/* 标题 + 优先级 */}
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-medium text-gray-900 text-sm flex-1">{task.title}</h4>
        <span className={`px-2 py-0.5 text-xs font-medium border rounded ${priorityColors[task.priority]}`}>
          {task.priority}
        </span>
      </div>

      {/* 描述 */}
      {task.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{task.description}</p>
      )}

      {/* 团号 */}
      {task.tour_code && (
        <div className="mb-2 flex items-center gap-1.5">
          <span className="text-xs text-blue-600 font-medium">📋 {task.tour_code}</span>
        </div>
      )}

      {/* Legacy 标记 */}
      {task.is_legacy && (
        <div className="mb-2">
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">舊檔/台中</span>
        </div>
      )}

      {/* 进度条 */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-600">進度</span>
          {!showProgressEdit ? (
            <button
              onClick={() => setShowProgressEdit(true)}
              className="text-xs text-amber-600 hover:text-amber-700 font-medium"
            >
              {task.progress}%
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                max="100"
                value={progressValue}
                onChange={(e) => setProgressValue(Number(e.target.value))}
                className="w-12 px-1 py-0.5 border border-gray-300 rounded text-xs"
              />
              <button
                onClick={handleProgressSave}
                className="text-xs text-green-600 hover:text-green-700"
              >
                ✓
              </button>
              <button
                onClick={() => {
                  setShowProgressEdit(false);
                  setProgressValue(task.progress);
                }}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
          )}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div
            className="bg-amber-600 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${task.progress}%` }}
          />
        </div>
      </div>

      {/* 负责人 */}
      <div className="mb-3">
        <div className="text-xs text-gray-600 mb-1">負責人</div>
        <div className="flex flex-wrap gap-1">
          {task.assignees.map((assignee) => (
            <span
              key={assignee}
              className="px-2 py-0.5 bg-gray-100 text-xs rounded text-gray-700"
            >
              {assignee}
            </span>
          ))}
        </div>
      </div>

      {/* 附件 */}
      {task.attachments && task.attachments.length > 0 && (
        <div className="mb-3 pb-3 border-b border-gray-100">
          <div className="text-xs text-gray-600 mb-1">附件 ({task.attachments.length})</div>
          <div className="space-y-0.5">
            {task.attachments.slice(0, 2).map((att) => (
              <div key={att.id} className="text-xs flex items-center gap-1.5 text-gray-700">
                <span>📎</span>
                <span className="truncate flex-1">{att.filename}</span>
                {att.tour_code && (
                  <span className="text-blue-600">({att.tour_code})</span>
                )}
              </div>
            ))}
            {task.attachments.length > 2 && (
              <div className="text-xs text-gray-500">
                +{task.attachments.length - 2} 個檔案
              </div>
            )}
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex gap-2">
        <label className="cursor-pointer px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors flex-1 text-center">
          {uploading ? '上傳中...' : '📎 上傳'}
          <input
            type="file"
            className="hidden"
            onChange={handleFileUpload}
            disabled={uploading}
          />
        </label>

        {task.status !== 'completed' && (
          <button
            onClick={handleComplete}
            className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
          >
            ✓ 結案
          </button>
        )}
      </div>

      {/* 时间信息 */}
      <div className="mt-2 text-xs text-gray-400">
        {new Date(task.created_at).toLocaleDateString('zh-TW')}
        {task.completed_at && (
          <> · 完成於 {new Date(task.completed_at).toLocaleDateString('zh-TW')}</>
        )}
      </div>
    </div>
  );
}
