// @ts-nocheck
'use client'

import { useState } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { useTasks } from '../hooks/useTasks'
import { useUpdateTask } from '../hooks/useUpdateTask'
import { TaskCard } from './TaskCardV2'
import { CreateTaskModal } from './CreateTaskModal'
import type { Priority, Task } from '../types'

const PRIORITY_CONFIG = {
  P0: {
    label: 'P0 緊急',
    icon: '🔴',
    bgClass: 'bg-red-50',
    borderClass: 'border-red-200',
    badgeClass: 'bg-red-500',
  },
  P1: {
    label: 'P1 重要',
    icon: '🟡',
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-200',
    badgeClass: 'bg-amber-500',
  },
  P2: {
    label: 'P2 普通',
    icon: '🟢',
    bgClass: 'bg-green-50',
    borderClass: 'border-green-200',
    badgeClass: 'bg-green-500',
  },
}

export function TaskBoardV3() {
  const { tasksByPriority, loading } = useTasks()
  const { updatePriority } = useUpdateTask()
  const [showCreateModal, setShowCreateModal] = useState(false)

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result

    if (
      !destination ||
      (source.droppableId === destination.droppableId && source.index === destination.index)
    ) {
      return
    }

    const newPriority = destination.droppableId as Priority

    try {
      await updatePriority(draggableId, newPriority)
    } catch (err) {
      console.error('更新優先級失敗:', err)
    }
  }

  const renderColumn = (priority: Priority, tasks: Task[]) => {
    const config = PRIORITY_CONFIG[priority]

    return (
      <div className="flex-1 min-w-[340px]">
        <div className={`${config.bgClass} border ${config.borderClass} rounded-lg p-4 h-full`}>
          {/* 列标题 */}
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="text-xl">{config.icon}</span>
              <h3 className="font-semibold text-morandi-primary">{config.label}</h3>
            </div>
            <span
              className={`${config.badgeClass} text-white px-2 py-1 rounded-full text-xs font-medium`}
            >
              {tasks.length}
            </span>
          </div>

          {/* 可拖拽区域 */}
          <Droppable droppableId={priority}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`space-y-2 min-h-[300px] ${
                  snapshot.isDraggingOver ? 'bg-white/60 rounded p-2' : ''
                }`}
              >
                {tasks.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12 text-sm">
                    {snapshot.isDraggingOver ? '拖到這裡' : '沒有任務'}
                  </div>
                ) : (
                  tasks.map((task, index) => (
                    <Draggable key={task.id} draggableId={task.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={snapshot.isDragging ? 'opacity-60' : ''}
                        >
                          <TaskCard task={task} />
                        </div>
                      )}
                    </Draggable>
                  ))
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-stone-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600 mx-auto mb-3"></div>
          <p className="text-morandi-secondary text-sm">載入中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* 标题栏 - 参考 Venturo 风格 */}
      <div className="bg-white border-b border-border px-6 py-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-morandi-primary flex items-center gap-2">
              <span className="text-amber-600">🎮</span>
              <span>冒險者公會</span>
            </h1>
            <p className="text-sm text-morandi-secondary mt-1">任務管理與工作流系統</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            + 新任務
          </button>
        </div>
      </div>

      {/* 看板区域 */}
      <div className="p-6">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="max-w-7xl mx-auto">
            <div className="flex gap-4 overflow-x-auto pb-4">
              {renderColumn('P0', tasksByPriority.P0)}
              {renderColumn('P1', tasksByPriority.P1)}
              {renderColumn('P2', tasksByPriority.P2)}
            </div>
          </div>
        </DragDropContext>

        {/* 已完成区域 */}
        {tasksByPriority.completed.length > 0 && (
          <div className="max-w-7xl mx-auto mt-6">
            <div className="bg-white border border-border rounded-lg p-5">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
                <span className="text-xl">✅</span>
                <h3 className="font-semibold text-morandi-primary">已完成</h3>
                <span className="bg-morandi-container0 text-white px-2 py-1 rounded-full text-xs font-medium">
                  {tasksByPriority.completed.length}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {tasksByPriority.completed.map(task => (
                  <TaskCard key={task.id} task={task} draggable={false} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 建立任务弹窗 */}
      <CreateTaskModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </div>
  )
}
