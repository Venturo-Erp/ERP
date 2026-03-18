'use client';

import { useState } from 'react';
import { useTasks } from '../hooks/useTasks';
import { useUpdateTask } from '../hooks/useUpdateTask';
import { TaskCard } from './TaskCard';
import { CreateTaskModal } from './CreateTaskModal';
import type { Priority } from '../types';

export function TaskBoard() {
  const { tasksByPriority, loading } = useTasks();
  const { updatePriority } = useUpdateTask();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const handleDragStart = (taskId: string) => {
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // 允許 drop
  };

  const handleDrop = async (newPriority: Priority) => {
    if (!draggedTaskId) return;

    try {
      await updatePriority(draggedTaskId, newPriority);
      setDraggedTaskId(null);
    } catch (err) {
      console.error('更新優先級失敗:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600">載入中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* 標題 + 建立按鈕 */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🎮 冒險者公會</h1>
            <p className="text-gray-600 mt-1">任務管理與工作流系統</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            + 新任務
          </button>
        </div>
      </div>

      {/* 任務看板 */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* P0 緊急 */}
        <div
          className="bg-red-50 rounded-lg p-4"
          onDragOver={handleDragOver}
          onDrop={() => handleDrop('P0')}
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🔴</span>
            <h2 className="text-lg font-bold text-gray-900">
              P0 緊急
            </h2>
            <span className="px-2 py-1 bg-red-500 text-white text-xs rounded">
              {tasksByPriority.P0.length}
            </span>
          </div>
          <div className="space-y-3">
            {tasksByPriority.P0.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                沒有緊急任務
              </div>
            ) : (
              tasksByPriority.P0.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onDragStart={() => handleDragStart(task.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* P1 重要 */}
        <div
          className="bg-yellow-50 rounded-lg p-4"
          onDragOver={handleDragOver}
          onDrop={() => handleDrop('P1')}
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🟡</span>
            <h2 className="text-lg font-bold text-gray-900">
              P1 重要
            </h2>
            <span className="px-2 py-1 bg-yellow-500 text-white text-xs rounded">
              {tasksByPriority.P1.length}
            </span>
          </div>
          <div className="space-y-3">
            {tasksByPriority.P1.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                沒有重要任務
              </div>
            ) : (
              tasksByPriority.P1.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onDragStart={() => handleDragStart(task.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* P2 普通 */}
        <div
          className="bg-green-50 rounded-lg p-4"
          onDragOver={handleDragOver}
          onDrop={() => handleDrop('P2')}
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🟢</span>
            <h2 className="text-lg font-bold text-gray-900">
              P2 普通
            </h2>
            <span className="px-2 py-1 bg-green-500 text-white text-xs rounded">
              {tasksByPriority.P2.length}
            </span>
          </div>
          <div className="space-y-3">
            {tasksByPriority.P2.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                沒有普通任務
              </div>
            ) : (
              tasksByPriority.P2.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onDragStart={() => handleDragStart(task.id)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* 已完成區域 */}
      {tasksByPriority.completed.length > 0 && (
        <div className="max-w-7xl mx-auto mt-6">
          <div className="bg-gray-100 rounded-lg p-4">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>✅</span>
              <span>已完成</span>
              <span className="px-2 py-1 bg-gray-500 text-white text-xs rounded">
                {tasksByPriority.completed.length}
              </span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {tasksByPriority.completed.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  draggable={false}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 建立任務彈窗 */}
      <CreateTaskModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}
