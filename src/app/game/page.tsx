'use client'

import dynamic from 'next/dynamic'
import { Suspense, useState, useCallback } from 'react'
import { Grid3X3, Edit3, Eye, Users, Gamepad2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { GAME_OFFICE_LABELS } from './constants/labels'

const PhaserOffice = dynamic(() => import('@/features/game-office/components/PhaserOffice'), {
  ssr: false,
  loading: () => <div className="flex-1 bg-[#1a1a2e] animate-pulse" />,
})

const AIOffice = dynamic(() => import('@/features/game-office/components/AIOffice').then(m => ({ default: m.AIOffice })), {
  ssr: false,
  loading: () => <div className="flex-1 bg-[#1a1a2e] animate-pulse" />,
})

const RightPanel = dynamic(() => import('@/features/game-office/components/RightPanel'), {
  ssr: false,
})

// Map game assets to ERP routes
const ASSET_ROUTES: Record<string, { label: string; path: string }> = {
  BendedScreen_A_Tile: { label: '訂單管理', path: '/workspace/orders' },
  OldPC_A_Tile: { label: '訂單管理', path: '/workspace/orders' },
  OldPC_B_Tile: { label: '訂單管理', path: '/workspace/orders' },
  PcTower_Tile: { label: '系統設定', path: '/workspace/settings' },
  RotationScreen_A_Tile: { label: '團體管理', path: '/workspace/tours' },
  RotationScreen_B_Tile: { label: '團體管理', path: '/workspace/tours' },
  RotationScreen_C_Tile: { label: '報表', path: '/workspace/reports' },
  MeetingTable_Tile: { label: '作戰會議室', path: '/war-room' },
  Whiteboard_Tile: { label: '作戰會議室', path: '/war-room' },
  ConferenceTable_Tile: { label: '作戰會議室', path: '/war-room' },
}

type ViewMode = 'phaser' | 'ai-team'

export default function GameOfficePage() {
  const { user } = useAuthStore()
  const [viewMode, setViewMode] = useState<ViewMode>('ai-team') // 預設顯示 AI Team
  const [editMode, setEditMode] = useState(true)
  const [showGrid, setShowGrid] = useState(true)
  const [tooltip, setTooltip] = useState<{ label: string; path: string } | null>(null)

  const handleInteract = useCallback((asset: string) => {
    const route = ASSET_ROUTES[asset]
    if (route) {
      setTooltip(route)
      setTimeout(() => setTooltip(null), 3000)
    }
  }, [])

  return (
    <div className="flex flex-col h-screen bg-[#0d1117]">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏢</span>
            <span className="text-sm font-bold text-white tracking-wider">VENTURO OFFICE</span>
          </div>
          
          {/* 視圖切換 */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-white/5">
            <button
              onClick={() => setViewMode('ai-team')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-colors ${
                viewMode === 'ai-team'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Users size={14} />
              AI 團隊
            </button>
            <button
              onClick={() => setViewMode('phaser')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-colors ${
                viewMode === 'phaser'
                  ? 'bg-purple-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Gamepad2 size={14} />
              辦公室
            </button>
          </div>
        </div>
        
        <span className="text-xs text-morandi-secondary">
          {viewMode === 'ai-team' ? '🤖 AI Team Monitor v1.0' : 'Prototype v0.4'}
        </span>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* View Area */}
        <div className="flex-1 relative">
          {viewMode === 'ai-team' ? (
            <AIOffice
              onAgentClick={(agentId) => {
                console.log('Agent clicked:', agentId)
              }}
            />
          ) : (
            <>
              {/* Grid toggle */}
              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`absolute top-3 left-3 z-10 flex items-center gap-1 px-3 py-1.5 text-xs rounded border transition-colors ${
                  showGrid
                    ? 'border-[var(--border)] text-white bg-morandi-primary/80'
                    : 'border-[var(--border)] text-morandi-secondary bg-morandi-primary/80'
                }`}
              >
                <Grid3X3 className="w-3 h-3" />
                {GAME_OFFICE_LABELS.LABEL_330}
              </button>

              <PhaserOffice
                className="w-full h-full"
                editMode={editMode}
                workspaceId={user?.workspace_id}
                userId={user?.id}
                onInteract={handleInteract}
              />

              {/* Interaction tooltip */}
              {tooltip && (
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50 animate-bounce">
                  <a
                    href={tooltip.path}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg shadow-lg hover:bg-emerald-500 transition-colors text-sm font-bold"
                  >
                    🖥️ 開啟{tooltip.label}
                  </a>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right Panel - Dashboard (hidden in edit mode, asset panel takes over) */}
        {viewMode === 'phaser' && !editMode && (
          <div className="w-80 flex-shrink-0">
            <Suspense fallback={<div className="w-80 bg-[#0d1117]" />}>
              <RightPanel />
            </Suspense>
          </div>
        )}
      </div>

      {/* Bottom Bar */}
      <div className="flex items-center gap-4 px-4 py-2 border-t border-[var(--border)] text-xs text-morandi-secondary">
        {viewMode === 'phaser' && (
          <>
            <button
              onClick={() => setEditMode(!editMode)}
              className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                editMode ? 'text-amber-400 bg-amber-400/10' : 'text-muted-foreground hover:text-white'
              }`}
            >
              {editMode ? <Edit3 className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {editMode ? '✏️ 編輯中' : '👁️ 瀏覽中'}
            </button>
            <span className="text-morandi-primary">|</span>
          </>
        )}
        
        <span>
          {viewMode === 'ai-team' ? '🤖 AI 團隊監控' : '🏢 辦公室模式'}
        </span>
        <span className="text-morandi-primary">|</span>
        <span>{GAME_OFFICE_LABELS.LABEL_3801}</span>
        <span className="text-morandi-primary">|</span>
        <span className="text-yellow-500/70">
          {viewMode === 'ai-team' 
            ? '💡 點擊 Agent 查看詳情' 
            : '💡 提示：點電腦打開訂單管理'}
        </span>
      </div>
    </div>
  )
}
