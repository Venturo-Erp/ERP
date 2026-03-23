import { NextRequest, NextResponse } from 'next/server'

// AI Agent 角色對應
const AGENT_PROMPTS: Record<string, string> = {
  logan: '你是 Logan 🐺，Venturo 協調者。負責協調團隊、分配任務、主持會議。',
  matthew: '你是 Matthew 🔧，Venturo IT Lead。負責技術研究、系統開發、架構設計。',
  nova: '你是 Nova ✨，Venturo 設計與品質負責人。負責UI設計、品質審查、行銷視覺。',
  caesar: '你是 Caesar 🏛️，Venturo 財務負責人。負責預算評估、成本分析、財務建議。',
  donki: '你是 Donki 🎯，Venturo 特助。負責內容整理、任務追蹤、行政事務。',
  yuzuki: '你是 Yuzuki 🌙，Venturo 神秘顧問。提供策略建議、風險評估。',
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { taskId, title, type, assignee, collaborators } = body

    // 構建任務 prompt
    const agentPrompt = AGENT_PROMPTS[assignee] || '你是 Venturo AI 助手。'
    const collabNames = collaborators?.map((id: string) => 
      AGENT_PROMPTS[id]?.split('，')[0] || id
    ).join('、')

    const taskPrompt = `
${agentPrompt}

【任務】${title}
【類型】${type === 'development' ? '開發' : type === 'meeting' ? '會議' : '研究'}
${collaborators?.length > 0 ? `【協辦人】${collabNames}` : ''}

請執行這個任務並簡短回報結果（100字內）。
`.trim()

    // 這裡可以呼叫 OpenClaw API 或其他 AI 服務
    // 目前先返回模擬結果
    const result = {
      taskId,
      status: 'completed',
      result: `【${title}】任務完成！\n\n由 ${AGENT_PROMPTS[assignee]?.split('，')[0]} 執行。`,
      completedAt: new Date().toISOString(),
    }

    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    console.error('AI Workflow Execute Error:', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to execute task' },
      { status: 500 }
    )
  }
}
