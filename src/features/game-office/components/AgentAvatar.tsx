'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Agent, AgentStatus } from '@/stores/agent-status-store'

interface AgentAvatarProps {
  agent: Agent
  onClick?: () => void
}

const statusColors: Record<AgentStatus, string> = {
  idle: 'bg-gray-400',
  working: 'bg-green-500',
  meeting: 'bg-blue-500',
  thinking: 'bg-yellow-500',
}

const statusLabels: Record<AgentStatus, string> = {
  idle: '待命',
  working: '工作中',
  meeting: '開會中',
  thinking: '思考中',
}

export function AgentAvatar({ agent, onClick }: AgentAvatarProps) {
  return (
    <motion.div
      className="absolute cursor-pointer"
      style={{
        left: `${agent.position.x}%`,
        top: `${agent.position.y}%`,
        transform: 'translate(-50%, -50%)',
      }}
      animate={{
        scale: agent.status === 'working' ? [1, 1.05, 1] : 1,
      }}
      transition={{
        duration: 1,
        repeat: agent.status === 'working' ? Infinity : 0,
      }}
      onClick={onClick}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* 對話泡泡 */}
      <AnimatePresence>
        {agent.lastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.8 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 
                       bg-white rounded-lg shadow-lg text-sm whitespace-nowrap
                       border border-gray-200 max-w-[200px] truncate"
          >
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 
                            w-2 h-2 bg-white border-r border-b border-gray-200 rotate-45" />
            {agent.lastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Agent 頭像 */}
      <div className="relative">
        {/* 狀態環 */}
        <motion.div
          className={`absolute -inset-1 rounded-full ${statusColors[agent.status]} opacity-30`}
          animate={{
            scale: agent.status === 'meeting' ? [1, 1.2, 1] : 1,
          }}
          transition={{
            duration: 1.5,
            repeat: agent.status === 'meeting' ? Infinity : 0,
          }}
        />
        
        {/* 頭像 */}
        <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 
                        flex items-center justify-center text-2xl shadow-lg border-2 border-white">
          {agent.emoji}
        </div>

        {/* 狀態指示燈 */}
        <motion.div
          className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full ${statusColors[agent.status]}
                      border-2 border-white shadow`}
          animate={{
            scale: agent.status !== 'idle' ? [1, 1.2, 1] : 1,
          }}
          transition={{
            duration: 0.8,
            repeat: agent.status !== 'idle' ? Infinity : 0,
          }}
        />
      </div>

      {/* 名稱和狀態 */}
      <div className="mt-1 text-center">
        <div className="text-xs font-medium text-white drop-shadow-md">
          {agent.name}
        </div>
        <div className="text-[10px] text-gray-300 drop-shadow">
          {agent.currentTask || statusLabels[agent.status]}
        </div>
      </div>
    </motion.div>
  )
}
