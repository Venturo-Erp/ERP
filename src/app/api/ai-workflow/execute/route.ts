import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/utils/logger'

// AI Agent 角色對應
const AGENT_INFO: Record<string, { name: string; emoji: string; role: string }> = {
  logan: { name: 'Logan', emoji: '🐺', role: '協調者' },
  matthew: { name: 'Matthew', emoji: '🔧', role: 'IT Lead' },
  nova: { name: 'Nova', emoji: '✨', role: '設計與品質' },
  caesar: { name: 'Caesar', emoji: '🏛️', role: '財務' },
  donki: { name: 'Donki', emoji: '🎯', role: '特助' },
  yuzuki: { name: 'Yuzuki', emoji: '🌙', role: '神秘顧問' },
}

// 模擬 AI 執行結果
function generateResult(type: string, title: string, assignee: string, collaborators: string[]): string {
  const agent = AGENT_INFO[assignee]
  const collabList = collaborators.map(id => AGENT_INFO[id]).filter(Boolean)
  
  if (type === 'meeting') {
    const participants = [agent, ...collabList].map(a => `${a.emoji} ${a.name}`).join('、')
    return `📋 **會議結論**

**主題**：${title}
**參與者**：${participants}

**決議**：
1. ✅ 確認需求並開始執行
2. 📅 預計完成時間：本週內
3. 👤 主要負責人：${agent.name}

**下一步**：各自回到崗位執行分配的任務`
  }
  
  if (type === 'research') {
    return `🔍 **研究報告**

**主題**：${title}
**負責人**：${agent.emoji} ${agent.name}

**發現**：
1. 已找到可行方案
2. 技術難度：中等
3. 預估時間：3-5 天

**建議**：可以開始實作`
  }
  
  // development
  return `💻 **開發完成**

**任務**：${title}
**負責人**：${agent.emoji} ${agent.name}

**成果**：
- ✅ 功能實作完成
- ✅ 測試通過
- ✅ 已部署

**備註**：可進入下一階段`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { taskId, title, type, assignee, collaborators = [] } = body

    // 模擬執行時間（1-3秒）
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))

    const result = generateResult(type, title, assignee, collaborators)

    return NextResponse.json({
      ok: true,
      taskId,
      status: 'completed',
      result,
      completedAt: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('AI Workflow Execute Error:', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to execute task' },
      { status: 500 }
    )
  }
}
