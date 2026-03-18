'use client';

/**
 * 任务视图 - 简化版
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

type TaskType = 'individual' | 'workflow';

type Task = {
  id: string;
  title: string;
  description: string | null;
  priority: 'P0' | 'P1' | 'P2';
  status: string;
  progress: number;
  assignees: string[];
  created_at: string;
  created_by: string;
};

interface TasksViewProps {
  taskType: TaskType;
}

export const TasksView: React.FC<TasksViewProps> = ({ taskType }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, [taskType]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('task_type', taskType)
        .neq('status', 'completed')
        .order('priority')
        .order('created_at', { ascending: false });

      if (data) setTasks(data as any);
    } catch (err) {
      console.error('載入任務失敗:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      P0: 'bg-red-100 text-red-700',
      P1: 'bg-amber-100 text-amber-700',
      P2: 'bg-green-100 text-green-700',
    };
    return colors[priority as keyof typeof colors] || colors.P2;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto mb-2"></div>
          <p className="text-sm text-morandi-secondary">載入中...</p>
        </div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-morandi-primary">
            {taskType === 'individual' ? '暫無獨立任務' : '暫無工作流任務'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4">
      {/* 表頭 */}
      <div className="border-b border-morandi-container/60">
        <div className="grid grid-cols-[1fr_100px_120px_200px_120px] px-2 py-2.5 gap-4">
          <span className="text-xs font-medium text-morandi-secondary">任務名稱</span>
          <span className="text-xs font-medium text-morandi-secondary">優先級</span>
          <span className="text-xs font-medium text-morandi-secondary text-center">進度</span>
          <span className="text-xs font-medium text-morandi-secondary">負責人</span>
          <span className="text-xs font-medium text-morandi-secondary">創建日期</span>
        </div>
      </div>

      {/* 任務列表 */}
      <div className="flex-1 overflow-auto">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="grid grid-cols-[1fr_100px_120px_200px_120px] px-2 py-3 gap-4 border-b border-morandi-container/30 items-center hover:bg-morandi-container/5 cursor-pointer"
          >
            <div>
              <div className="font-medium text-sm text-morandi-primary mb-1">{task.title}</div>
              {task.description && (
                <p className="text-xs text-morandi-secondary truncate">{task.description}</p>
              )}
            </div>
            <div>
              <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                {task.priority}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-morandi-container rounded-full h-2">
                  <div
                    className="bg-amber-600 h-2 rounded-full transition-all"
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
                <span className="text-xs text-morandi-primary font-medium w-8 text-right">
                  {task.progress}%
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {task.assignees.length > 0 ? (
                task.assignees.map((assignee) => (
                  <span
                    key={assignee}
                    className="px-2 py-0.5 bg-morandi-container text-morandi-primary rounded text-xs"
                  >
                    {assignee}
                  </span>
                ))
              ) : (
                <span className="text-xs text-morandi-secondary">-</span>
              )}
            </div>
            <div className="text-sm text-morandi-secondary">
              {new Date(task.created_at).toLocaleDateString('zh-TW')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
