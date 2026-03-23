'use client'

import dynamic from 'next/dynamic'
import { Suspense, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Grid3X3, Edit3, Eye, MessageSquare, Play, Users } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { useAgentStatusStore, Agent, AgentStatus } from '@/stores/agent-status-store'
import { GAME_OFFICE_LABELS } from './constants/labels'

const PhaserOffice = dynamic(() => import('@/features/game-office/components/PhaserOffice'), {
  ssr: false,
  loading: () => <div className="flex-1 bg-[#1a1a2e] animate-pulse" />,
})

// 辦公室區域定義（調整為場景內）
const OFFICE_ZONES = {
  meetingRoom: { x: 50, y: 38, label: '會議桌', icon: '🏛️' },
  waterCooler: { x: 65, y: 28, label: '茶水間', icon: '☕' },
  desk1: { x: 42, y: 22, label: '電腦桌 1', icon: '💻' },
  desk2: { x: 42, y: 32, label: '電腦桌 2', icon: '💻' },
  desk3: { x: 58, y: 22, label: '電腦桌 3', icon: '💻' },
  restArea: { x: 60, y: 35, label: '沙發', icon: '🛋️' },
}

const statusColors: Record<AgentStatus, string> = {
  idle: 'bg-gray-400',
  working: 'bg-green-500',
  meeting: 'bg-blue-500',
  thinking: 'bg-yellow-500',
}

export default function GameOfficePage() {
  const { user } = useAuthStore()
  const { agents, setAgentPosition, setAgentStatus, setAgentMessage, startMeeting, endMeeting, meetingActive, meetingTopic } = useAgentStatusStore()
  
  const [editMode, setEditMode] = useState(false)
  const [showGrid, setShowGrid] = useState(true)
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [showMeetingDialog, setShowMeetingDialog] = useState(false)
  const [meetingInput, setMeetingInput] = useState('')
  const [meetingResult, setMeetingResult] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // 點擊地圖移動 Agent
  const handleMapClick = useCallback((e: React.MouseEvent) => {
    if (!selectedAgent || !containerRef.current) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    
    // 移動 Agent
    setAgentPosition(selectedAgent, { x, y })
    
    // 檢查是否到達特殊區域
    Object.entries(OFFICE_ZONES).forEach(([zoneId, zone]) => {
      const distance = Math.sqrt((x - zone.x) ** 2 + (y - zone.y) ** 2)
      if (distance < 10) {
        if (zoneId === 'meetingRoom') {
          setShowMeetingDialog(true)
        } else if (zoneId.startsWith('desk')) {
          setAgentStatus(selectedAgent, 'working', '專注工作中')
          setAgentMessage(selectedAgent, '寫程式...')
        } else if (zoneId === 'restArea') {
          setAgentStatus(selectedAgent, 'idle', '休息中')
          setAgentMessage(selectedAgent, '😴')
        } else if (zoneId === 'waterCooler') {
          setAgentStatus(selectedAgent, 'thinking', '喝咖啡討論')
          setAgentMessage(selectedAgent, '討論中...')
        }
      }
    })
    
    setSelectedAgent(null)
  }, [selectedAgent, setAgentPosition, setAgentStatus, setAgentMessage])

  // 開始會議
  const handleStartMeeting = async () => {
    if (!meetingInput.trim()) return
    
    // 把所有在會議室附近的 agents 加入會議
    const nearMeeting = agents.filter(a => {
      const distance = Math.sqrt((a.position.x - OFFICE_ZONES.meetingRoom.x) ** 2 + 
                                  (a.position.y - OFFICE_ZONES.meetingRoom.y) ** 2)
      return distance < 15
    })
    
    const participantIds = nearMeeting.map(a => a.id)
    startMeeting(meetingInput, participantIds)
    
    // 模擬會議討論（之後改成真正的 AI 對話）
    setMeetingResult(null)
    
    // 更新 agents 對話
    nearMeeting.forEach((agent, i) => {
      setTimeout(() => {
        setAgentMessage(agent.id, ['思考中...', '有想法！', '同意！', '讓我補充...'][i % 4])
      }, i * 1000)
    })
    
    // 模擬會議結果
    setTimeout(() => {
      setMeetingResult(`
📋 **會議結論**

**主題**：${meetingInput}

**參與者**：${nearMeeting.map(a => a.emoji + ' ' + a.name).join('、')}

**決議**：
1. ✅ 確認需求並開始執行
2. 📅 預計完成時間：今天
3. 👤 負責人：${nearMeeting[0]?.name || 'Matthew'}

**下一步**：
- ${nearMeeting[0]?.name || 'Matthew'} 回電腦桌開始工作
- 其他人可去休息或繼續討論
      `.trim())
      
      endMeeting()
    }, 3000)
    
    setShowMeetingDialog(false)
    setMeetingInput('')
  }

  return (
    <div className="flex flex-col h-screen bg-[#0d1117]">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏢</span>
            <span className="text-sm font-bold text-white tracking-wider">VENTURO AI OFFICE</span>
          </div>
          
          {/* 狀態指示 */}
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-1 rounded bg-white/10 text-white">
              <Users size={12} className="inline mr-1" />
              {agents.length} Agents
            </span>
            {agents.filter(a => a.status === 'working').length > 0 && (
              <span className="px-2 py-1 rounded bg-green-500/20 text-green-400">
                {agents.filter(a => a.status === 'working').length} 工作中
              </span>
            )}
            {meetingActive && (
              <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-400 animate-pulse">
                🏛️ 會議中
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {selectedAgent && (
            <span className="text-xs text-yellow-400 animate-pulse">
              👆 點擊地圖移動 {agents.find(a => a.id === selectedAgent)?.name}
            </span>
          )}
          <span className="text-xs text-morandi-secondary">v1.0</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Game Area */}
        <div 
          ref={containerRef}
          className="flex-1 relative cursor-crosshair"
          onClick={handleMapClick}
        >
          {/* Phaser 辦公室背景 */}
          <PhaserOffice
            className="w-full h-full"
            editMode={editMode}
            workspaceId={user?.workspace_id}
            userId={user?.id}
          />
          
          {/* 區域標示 - 只在 hover 時顯示 */}
          
          {/* AI Agents 覆蓋層 */}
          {agents.map((agent) => (
            <motion.div
              key={agent.id}
              className={`absolute cursor-pointer ${selectedAgent === agent.id ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-transparent rounded-full' : ''}`}
              style={{
                left: `${agent.position.x}%`,
                top: `${agent.position.y}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: 100,
              }}
              animate={{
                x: 0,
                y: 0,
                scale: agent.status === 'working' ? [1, 1.05, 1] : 1,
              }}
              transition={{
                type: 'spring',
                damping: 20,
                stiffness: 100,
              }}
              onClick={(e) => {
                e.stopPropagation()
                setSelectedAgent(selectedAgent === agent.id ? null : agent.id)
              }}
              whileHover={{ scale: 1.1 }}
            >
              {/* 對話泡泡 */}
              <AnimatePresence>
                {agent.lastMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 
                               bg-white rounded-lg shadow-lg text-xs whitespace-nowrap
                               border border-gray-200"
                  >
                    {agent.lastMessage}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Agent 頭像 */}
              <div className="relative">
                <motion.div
                  className={`absolute -inset-1 rounded-full ${statusColors[agent.status]} opacity-30`}
                  animate={{
                    scale: agent.status !== 'idle' ? [1, 1.3, 1] : 1,
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 
                                flex items-center justify-center text-xl shadow-lg border-2 border-white">
                  {agent.emoji}
                </div>
                <motion.div
                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ${statusColors[agent.status]}
                              border-2 border-white shadow`}
                />
              </div>

              {/* 名稱 */}
              <div className="mt-1 text-center">
                <div className="text-[10px] font-medium text-white drop-shadow-md">
                  {agent.name}
                </div>
              </div>
            </motion.div>
          ))}

          {/* 會議對話框 */}
          <AnimatePresence>
            {showMeetingDialog && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
                           w-96 p-4 rounded-xl bg-[#1a1a2e] border border-white/20 shadow-2xl z-50"
              >
                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                  <MessageSquare size={20} className="text-blue-400" />
                  開始會議
                </h3>
                <textarea
                  value={meetingInput}
                  onChange={(e) => setMeetingInput(e.target.value)}
                  placeholder="輸入今天的會議主題或討論內容..."
                  className="w-full h-24 px-3 py-2 rounded-lg bg-white/10 border border-white/20 
                             text-white placeholder-white/50 text-sm resize-none"
                />
                <div className="flex justify-end gap-2 mt-3">
                  <button
                    onClick={() => setShowMeetingDialog(false)}
                    className="px-4 py-2 text-sm text-white/70 hover:text-white"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleStartMeeting}
                    className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
                  >
                    <Play size={14} />
                    開始
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 會議結果 */}
          <AnimatePresence>
            {meetingResult && (
              <motion.div
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 100 }}
                className="absolute top-4 right-4 w-80 p-4 rounded-xl bg-[#1a1a2e] border border-white/20 shadow-2xl z-50"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-white">📋 會議結果</h3>
                  <button
                    onClick={() => setMeetingResult(null)}
                    className="text-white/50 hover:text-white text-sm"
                  >
                    ✕
                  </button>
                </div>
                <div className="text-xs text-white/80 whitespace-pre-wrap">
                  {meetingResult}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="flex items-center gap-4 px-4 py-2 border-t border-[var(--border)] text-xs text-morandi-secondary">
        <button
          onClick={() => setEditMode(!editMode)}
          className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
            editMode ? 'text-amber-400 bg-amber-400/10' : 'text-muted-foreground hover:text-white'
          }`}
        >
          {editMode ? <Edit3 className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          {editMode ? '編輯模式' : '遊戲模式'}
        </button>
        <span className="text-morandi-primary">|</span>
        <span>🤖 點擊 Agent 選中 → 點擊地圖移動</span>
        <span className="text-morandi-primary">|</span>
        <span>🏛️ 移動到會議室開會</span>
        <span className="text-morandi-primary">|</span>
        <span>💻 移動到電腦桌工作</span>
      </div>
    </div>
  )
}
