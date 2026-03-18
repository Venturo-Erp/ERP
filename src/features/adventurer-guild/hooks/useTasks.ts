import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { Task, Priority, TaskStatus } from '../types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient(supabaseUrl, supabaseKey);

  // 載入任務
  const loadTasks = async () => {
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (err) throw err;
      setTasks(data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 即時訂閱
  useEffect(() => {
    loadTasks();

    const channel = supabase
      .channel('tasks_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'tasks' },
        () => loadTasks()
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  // 按優先級分組
  const tasksByPriority = {
    P0: tasks.filter(t => t.priority === 'P0' && t.status !== 'completed'),
    P1: tasks.filter(t => t.priority === 'P1' && t.status !== 'completed'),
    P2: tasks.filter(t => t.priority === 'P2' && t.status !== 'completed'),
    completed: tasks.filter(t => t.status === 'completed'),
  };

  return {
    tasks,
    tasksByPriority,
    loading,
    error,
    reload: loadTasks,
  };
}
