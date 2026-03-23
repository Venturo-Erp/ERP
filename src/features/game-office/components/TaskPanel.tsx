'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Play, Users, CheckCircle, Clock, MessageSquare, Code, Search } from 'lucide-react'
import { useAgentStatusStore, Agent } from '@/stores/agent-status-store'

export type TaskType = 'development' | 'meeting' | 'research'
export type TaskStatus = 'pending' | 'in_progress' | 'completed'

export interface Task {
  id: string
  title: string
  type: TaskType
  assignee: string
  collaborators: string[]
  status: TaskStatus
  createdAt: string
  result?: string
}

interface TaskPanelProps {
  onTaskStart?: (task: Task) => void
}

const taskTypeIcons: Record<TaskType, React.ReactNode> = {
  development: <Code size={14} />,
  meeting: <MessageSquare size={14} />,
  research: <Search size={14} />,
}

const taskTypeLabels: Record<TaskType, string> = {
  development: '開發',
  meeting: '會議',
  research: '研究',
}

export function TaskPanel({ onTaskStart }: TaskPanelProps) {
  const { agents, setAgentStatus, setAgentMessage, startMeeting } = useAgentStatusStore()
  
  // 從 localStorage 讀取任務（持久化）
  const [tasks, setTasks] = useState<Task[]>(() => {
    if (typeof window === 'undefined') return []
    const saved = localStorage.getItem('ai-office-tasks')
    return saved ? JSON.parse(saved) : []
  })
  
  // 任務變更時存到 localStorage
  useEffect(() => {
    localStorage.setItem('ai-office-tasks', JSON.stringify(tasks))
  }, [tasks])
  const [showForm, setShowForm] = useState(false)
  
  // Form state
  const [title, setTitle] = useState('')
  const [type, setType] = useState<TaskType>('development')
  const [assignee, setAssignee] = useState('matthew')
  const [collaborators, setCollaborators] = useState<string[]>([])

  const handleCreateTask = () => {
    if (!title.trim()) return
    
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: title.trim(),
      type,
      assignee,
      collaborators,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }
    
    setTasks(prev => [newTask, ...prev])
    setTitle('')
    setCollaborators([])
    setShowForm(false)
  }

  const handleStartTask = async (task: Task) => {
    // 更新任務狀態
    setTasks(prev => prev.map(t => 
      t.id === task.id ? { ...t, status: 'in_progress' as TaskStatus } : t
    ))
    
    // 更新 agent 狀態
    setAgentStatus(task.assignee, 'working', task.title)
    setAgentMessage(task.assignee, `執行中...`)
    
    // 如果是會議，啟動會議
    if (task.type === 'meeting') {
      const participants = [task.assignee, ...task.collaborators]
      startMeeting(task.title, participants)
    }
    
    // 協辦人也更新狀態
    task.collaborators.forEach(collab => {
      if (task.type === 'meeting') {
        setAgentStatus(collab, 'meeting', task.title)
      } else {
        setAgentStatus(collab, 'thinking', `協助中...`)
      }
    })
    
    onTaskStart?.(task)

    // 呼叫 AI API 執行任務
    try {
      const response = await fetch('/api/ai-workflow/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: task.id,
          title: task.title,
          type: task.type,
          assignee: task.assignee,
          collaborators: task.collaborators,
        }),
      })
      
      const result = await response.json()
      
      if (result.ok) {
        // 任務完成
        setTasks(prev => prev.map(t => 
          t.id === task.id 
            ? { ...t, status: 'completed' as TaskStatus, result: result.result } 
            : t
        ))
        setAgentStatus(task.assignee, 'idle')
        setAgentMessage(task.assignee, '✅ 完成！')
        task.collaborators.forEach(collab => {
          setAgentStatus(collab, 'idle')
        })
      }
    } catch (error) {
      console.error('Task execution failed:', error)
      setAgentMessage(task.assignee, '❌ 執行失敗')
    }
  }

  const handleCompleteTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, status: 'completed' as TaskStatus } : t
    ))
    
    // 重置 agent 狀態
    setAgentStatus(task.assignee, 'idle')
    setAgentMessage(task.assignee, '✅ 完成！')
    
    task.collaborators.forEach(collab => {
      setAgentStatus(collab, 'idle')
    })
  }

  const toggleCollaborator = (agentId: string) => {
    if (agentId === assignee) return // 不能選自己
    setCollaborators(prev => 
      prev.includes(agentId) 
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    )
  }

  const pendingTasks = tasks.filter(t => t.status === 'pending')
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress')
  const completedTasks = tasks.filter(t => t.status === 'completed')

  return (
    <div className="h-full flex flex-col bg-[#0d1117] border-l border-white/10">
      {/* Header */}
      <div className="p-3 border-b border-white/10 flex items-center justify-between">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          📋 工作流
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="p-1.5 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* New Task Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-white/10 overflow-hidden"
          >
            <div className="p-3 space-y-3">
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="任務內容..."
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 
                           text-white placeholder-white/30 text-sm"
              />
              
              {/* Task Type */}
              <div className="flex gap-2">
                {(['development', 'meeting', 'research'] as TaskType[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`flex-1 px-2 py-1.5 rounded text-xs flex items-center justify-center gap-1 transition-colors ${
                      type === t 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-white/5 text-white/50 hover:text-white'
                    }`}
                  >
                    {taskTypeIcons[t]}
                    {taskTypeLabels[t]}
                  </button>
                ))}
              </div>
              
              {/* Assignee */}
              <div>
                <label className="text-xs text-white/50 mb-1 block">負責人</label>
                <select
                  value={assignee}
                  onChange={e => setAssignee(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 
                             text-white text-sm"
                >
                  {agents.map(agent => (
                    <option key={agent.id} value={agent.id}>
                      {agent.emoji} {agent.name} - {agent.role}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Collaborators */}
              <div>
                <label className="text-xs text-white/50 mb-1 block">協辦人</label>
                <div className="flex flex-wrap gap-2">
                  {agents.filter(a => a.id !== assignee).map(agent => (
                    <button
                      key={agent.id}
                      onClick={() => toggleCollaborator(agent.id)}
                      className={`px-2 py-1 rounded text-xs transition-colors ${
                        collaborators.includes(agent.id)
                          ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                          : 'bg-white/5 text-white/50 border border-transparent hover:text-white'
                      }`}
                    >
                      {agent.emoji} {agent.name}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Submit */}
              <button
                onClick={handleCreateTask}
                disabled={!title.trim()}
                className="w-full py-2 rounded-lg bg-blue-500 text-white text-sm font-medium
                           hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed
                           transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={14} />
                建立任務
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task Lists */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* In Progress */}
        {inProgressTasks.length > 0 && (
          <div>
            <h3 className="text-xs text-white/50 mb-2 flex items-center gap-1">
              <Clock size={12} /> 進行中 ({inProgressTasks.length})
            </h3>
            <div className="space-y-2">
              {inProgressTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  agents={agents}
                  onComplete={() => handleCompleteTask(task.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Pending */}
        {pendingTasks.length > 0 && (
          <div>
            <h3 className="text-xs text-white/50 mb-2 flex items-center gap-1">
              📋 待執行 ({pendingTasks.length})
            </h3>
            <div className="space-y-2">
              {pendingTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  agents={agents}
                  onStart={() => handleStartTask(task)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Completed */}
        {completedTasks.length > 0 && (
          <div>
            <h3 className="text-xs text-white/50 mb-2 flex items-center gap-1">
              <CheckCircle size={12} /> 已完成 ({completedTasks.length})
            </h3>
            <div className="space-y-2">
              {completedTasks.slice(0, 3).map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  agents={agents}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {tasks.length === 0 && (
          <div className="text-center text-white/30 py-8">
            <div className="text-3xl mb-2">📋</div>
            <div className="text-sm">還沒有任務</div>
            <div className="text-xs mt-1">點擊右上角 + 新增</div>
          </div>
        )}
      </div>
    </div>
  )
}

interface TaskCardProps {
  task: Task
  agents: Agent[]
  onStart?: () => void
  onComplete?: () => void
}

function TaskCard({ task, agents, onStart, onComplete }: TaskCardProps) {
  const [expanded, setExpanded] = useState(false)
  const assigneeAgent = agents.find(a => a.id === task.assignee)
  const collabAgents = agents.filter(a => task.collaborators.includes(a.id))
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-3 rounded-lg border transition-colors cursor-pointer ${
        task.status === 'in_progress' 
          ? 'bg-blue-500/10 border-blue-500/30' 
          : task.status === 'completed'
            ? 'bg-green-500/10 border-green-500/30'
            : 'bg-white/5 border-white/10'
      }`}
      onClick={() => task.result && setExpanded(!expanded)}
    >
      <div className="flex items-start gap-2">
        <div className={`p-1 rounded ${
          task.type === 'meeting' ? 'bg-purple-500/20 text-purple-400' :
          task.type === 'research' ? 'bg-yellow-500/20 text-yellow-400' :
          'bg-blue-500/20 text-blue-400'
        }`}>
          {taskTypeIcons[task.type]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-white truncate">{task.title}</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-white/50">
              {assigneeAgent?.emoji} {assigneeAgent?.name}
            </span>
            {collabAgents.length > 0 && (
              <span className="text-xs text-white/30">
                + {collabAgents.map(a => a.emoji).join('')}
              </span>
            )}
            {task.status === 'completed' && (
              <span className="text-xs text-green-400">✓</span>
            )}
          </div>
        </div>
        
        {/* Actions */}
        {task.status === 'pending' && onStart && (
          <button
            onClick={(e) => { e.stopPropagation(); onStart(); }}
            className="p-1.5 rounded bg-green-500 text-white hover:bg-green-600 transition-colors"
          >
            <Play size={12} />
          </button>
        )}
        {task.status === 'in_progress' && (
          <div className="p-1.5">
            <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
      
      {/* Result (expandable) */}
      <AnimatePresence>
        {expanded && task.result && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-2 pt-2 border-t border-white/10 overflow-hidden"
          >
            <div className="text-xs text-white/70 whitespace-pre-wrap">
              {task.result}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
