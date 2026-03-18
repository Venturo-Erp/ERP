/**
 * 冒險者公會任務系統 - 型別定義
 */

export type Priority = 'P0' | 'P1' | 'P2';
export type TaskStatus = 'todo' | 'in_progress' | 'completed';
export type TaskType = 'individual' | 'workflow';

export interface Task {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  priority: Priority;
  status: TaskStatus;
  assignees: string[]; // agent ids
  progress: number; // 0-100
  attachments: Attachment[];
  tour_code: string | null;
  is_legacy: boolean;
  task_type: TaskType;
  workflow_template: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  created_by: string;
}

export interface Attachment {
  id: string;
  filename: string;
  url: string;
  size: number;
  uploaded_at: string;
  tour_code: string | null;
  is_legacy: boolean;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority: Priority;
  assignees: string[];
  estimated_hours?: number;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  priority?: Priority;
  assignees?: string[];
  progress?: number;
  status?: TaskStatus;
}
