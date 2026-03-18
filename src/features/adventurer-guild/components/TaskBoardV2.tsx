// @ts-nocheck
'use client';

import { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { motion, AnimatePresence } from 'framer-motion';
import { useTasks } from '../hooks/useTasks';
import { useUpdateTask } from '../hooks/useUpdateTask';
import { TaskCard } from './TaskCard';
import { CreateTaskModal } from './CreateTaskModal';
import type { Priority, Task } from '../types';

const PRIORITY_CONFIG = {
  P0: { label: '🔴 P0 緊急', color: 'red', bgClass: 'bg-red-50' },
  P1: { label: '🟡 P1 重要', color: 'yellow', bgClass: 'bg-yellow-50' },
  P2: { label: '🟢 P2 普通', color: 'green', bgClass: 'bg-green-50' },
};

export function TaskBoardV2() {
  const { tasksByPriority, loading } = useTasks();
  const { updatePriority } = useUpdateTask();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    // 没有目标或位置没变
    if (!destination || 
        (source.droppableId === destination.droppableId && 
         source.index === destination.index)) {
      return;
    }

    const newPriority = destination.droppableId as Priority;
    
    try {
      await updatePriority(draggableId, newPriority);
    } catch (err) {
      console.error('更新优先级失败:', err);
    }
  };

  const renderColumn = (priority: Priority, tasks: Task[]) => {
    const config = PRIORITY_CONFIG[priority];
    
    return (
      <div className="flex-1 min-w-[320px]">
        <div className={`${config.bgClass} rounded-lg p-4 h-full`}>
          {/* 列标题 */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span>{config.label}</span>
              <span className={`px-2 py-1 bg-${config.color}-500 text-white text-xs rounded font-bold`}>
                {tasks.length}
              </span>
            </h2>
          </div>

          {/* 可拖拽区域 */}
          <Droppable droppableId={priority}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`space-y-3 min-h-[200px] transition-colors ${
                  snapshot.isDraggingOver ? 'bg-white/50 rounded-lg p-2' : ''
                }`}
              >
                <AnimatePresence>
                  {tasks.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-center text-gray-400 py-8"
                    >
                      {snapshot.isDraggingOver ? '放到這裡' : `沒有${config.label.slice(3)}任務`}
                    </motion.div>
                  ) : (
                    tasks.map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided, snapshot) => (
                          <motion.div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.2 }}
                            className={snapshot.isDragging ? 'opacity-50' : ''}
                          >
                            <TaskCard task={task} />
                          </motion.div>
                        )}
                      </Draggable>
                    ))
                  )}
                </AnimatePresence>
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      {/* 标题栏 */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              🎮 冒險者公會
            </h1>
            <p className="text-gray-600 mt-1">任務管理與工作流系統</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-shadow"
          >
            ✨ 新任務
          </motion.button>
        </div>
      </div>

      {/* 看板区域 */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="max-w-7xl mx-auto">
          <div className="flex gap-6 overflow-x-auto pb-6">
            {renderColumn('P0', tasksByPriority.P0)}
            {renderColumn('P1', tasksByPriority.P1)}
            {renderColumn('P2', tasksByPriority.P2)}
          </div>
        </div>
      </DragDropContext>

      {/* 已完成区域 */}
      {tasksByPriority.completed.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-7xl mx-auto mt-6"
        >
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>✅</span>
              <span>已完成</span>
              <span className="px-2 py-1 bg-green-500 text-white text-xs rounded">
                {tasksByPriority.completed.length}
              </span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <AnimatePresence>
                {tasksByPriority.completed.map((task) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <TaskCard task={task} draggable={false} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}

      {/* 建立任务弹窗 */}
      <CreateTaskModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}
