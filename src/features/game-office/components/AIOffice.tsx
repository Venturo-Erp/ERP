'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAgentStatusStore } from '@/stores/agent-status-store'
import { AgentAvatar } from './AgentAvatar'
import { Users, MessageSquare, Activity, Clock } from 'lucide-react'

interface AIOfficeProps {
  onAgentClick?: (agentId: string) => void
}

export function AIOffice({ onAgentClick }: AIOfficeProps) {
  const { agents, meetingActive, meetingTopic, meetingParticipants } = useAgentStatusStore()
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)

  // 模擬即時更新（之後換成 Supabase Realtime）
  useEffect(() => {
    const store = useAgentStatusStore.getState()
    
    // 模擬 Matthew 正在工作
    store.setAgentStatus('matthew', 'working', '開發 AI Office')
    store.setAgentMessage('matthew', '寫程式中...')
    
    // 模擬 Logan 待命
    store.setAgentStatus('logan', 'idle')
    
    return () => {}
  }, [])

  const workingCount = agents.filter(a => a.status === 'working').length
  const meetingCount = agents.filter(a => a.status === 'meeting').length

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-[#1a1a2e] to-[#16213e] overflow-hidden">
      {/* 背景格子 */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }}
      />

      {/* 頂部狀態欄 */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur text-white text-sm">
            <Users size={14} />
            <span>{agents.length} Agents</span>
          </div>
          
          {workingCount > 0 && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/20 backdrop-blur text-green-400 text-sm"
            >
              <Activity size={14} className="animate-pulse" />
              <span>{workingCount} 工作中</span>
            </motion.div>
          )}
          
          {meetingActive && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 backdrop-blur text-blue-400 text-sm"
            >
              <MessageSquare size={14} className="animate-pulse" />
              <span>會議中：{meetingTopic}</span>
            </motion.div>
          )}
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur text-white text-sm">
          <Clock size={14} />
          <span>{new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      {/* 會議區域（中央） */}
      {meetingActive && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
                     w-48 h-48 rounded-full border-2 border-blue-500/30 
                     bg-blue-500/5 backdrop-blur"
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white">
              <MessageSquare size={24} className="mx-auto mb-2 text-blue-400" />
              <div className="text-sm font-medium">{meetingTopic}</div>
              <div className="text-xs text-gray-400 mt-1">
                {meetingParticipants.length} 人參與
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Agents */}
      {agents.map((agent) => (
        <AgentAvatar
          key={agent.id}
          agent={agent}
          onClick={() => {
            setSelectedAgent(agent.id)
            onAgentClick?.(agent.id)
          }}
        />
      ))}

      {/* 選中的 Agent 詳情 */}
      <AnimatePresence>
        {selectedAgent && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-4 left-4 right-4 p-4 rounded-xl 
                       bg-white/10 backdrop-blur border border-white/20"
          >
            {(() => {
              const agent = agents.find(a => a.id === selectedAgent)
              if (!agent) return null
              return (
                <div className="flex items-center gap-4 text-white">
                  <div className="text-3xl">{agent.emoji}</div>
                  <div className="flex-1">
                    <div className="font-medium">{agent.name}</div>
                    <div className="text-sm text-gray-400">{agent.role}</div>
                    {agent.currentTask && (
                      <div className="text-sm text-green-400 mt-1">
                        📋 {agent.currentTask}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedAgent(null)}
                    className="text-gray-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
              )
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
