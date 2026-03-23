'use client'

import { create } from 'zustand'

export type AgentStatus = 'idle' | 'working' | 'meeting' | 'thinking'

export interface Agent {
  id: string
  name: string
  emoji: string
  role: string
  status: AgentStatus
  currentTask?: string
  position: { x: number; y: number }
  lastMessage?: string
  lastActiveAt?: string
}

interface AgentStatusState {
  agents: Agent[]
  meetingActive: boolean
  meetingTopic?: string
  meetingParticipants: string[]
  
  // Actions
  setAgentStatus: (agentId: string, status: AgentStatus, task?: string) => void
  setAgentMessage: (agentId: string, message: string) => void
  setAgentPosition: (agentId: string, position: { x: number; y: number }) => void
  startMeeting: (topic: string, participants: string[]) => void
  endMeeting: () => void
  updateAgents: (agents: Agent[]) => void
}

// 預設 AI 團隊（位置對應 Phaser 場景物件 - 調整為場景內）
const defaultAgents: Agent[] = [
  {
    id: 'logan',
    name: 'Logan',
    emoji: '🐺',
    role: '協調者',
    status: 'idle',
    position: { x: 42, y: 22 },  // 左邊桌子旁
  },
  {
    id: 'matthew',
    name: 'Matthew',
    emoji: '🔧',
    role: 'IT Lead',
    status: 'working',
    currentTask: '開發 AI Office',
    position: { x: 42, y: 32 },  // 中間桌子旁
  },
  {
    id: 'nova',
    name: 'Nova',
    emoji: '✨',
    role: '設計與品質',
    status: 'idle',
    position: { x: 58, y: 22 },  // 右邊桌子旁
  },
  {
    id: 'caesar',
    name: 'Caesar',
    emoji: '🏛️',
    role: '財務',
    status: 'idle',
    position: { x: 50, y: 38 },  // 會議桌旁
  },
  {
    id: 'donki',
    name: 'Donki',
    emoji: '🎯',
    role: '特助',
    status: 'idle',
    position: { x: 60, y: 35 },  // 沙發旁
  },
  {
    id: 'yuzuki',
    name: 'Yuzuki',
    emoji: '🌙',
    role: '神秘顧問',
    status: 'idle',
    position: { x: 65, y: 28 },  // 茶水間旁
  },
]

export const useAgentStatusStore = create<AgentStatusState>((set) => ({
  agents: defaultAgents,
  meetingActive: false,
  meetingTopic: undefined,
  meetingParticipants: [],

  setAgentStatus: (agentId, status, task) =>
    set((state) => ({
      agents: state.agents.map((agent) =>
        agent.id === agentId
          ? { ...agent, status, currentTask: task, lastActiveAt: new Date().toISOString() }
          : agent
      ),
    })),

  setAgentMessage: (agentId, message) =>
    set((state) => ({
      agents: state.agents.map((agent) =>
        agent.id === agentId
          ? { ...agent, lastMessage: message, lastActiveAt: new Date().toISOString() }
          : agent
      ),
    })),

  setAgentPosition: (agentId, position) =>
    set((state) => ({
      agents: state.agents.map((agent) =>
        agent.id === agentId ? { ...agent, position } : agent
      ),
    })),

  startMeeting: (topic, participants) =>
    set((state) => ({
      meetingActive: true,
      meetingTopic: topic,
      meetingParticipants: participants,
      agents: state.agents.map((agent) =>
        participants.includes(agent.id)
          ? { ...agent, status: 'meeting' as AgentStatus }
          : agent
      ),
    })),

  endMeeting: () =>
    set((state) => ({
      meetingActive: false,
      meetingTopic: undefined,
      meetingParticipants: [],
      agents: state.agents.map((agent) =>
        state.meetingParticipants.includes(agent.id)
          ? { ...agent, status: 'idle' as AgentStatus }
          : agent
      ),
    })),

  updateAgents: (agents) => set({ agents }),
}))
