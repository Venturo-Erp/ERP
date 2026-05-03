/**
 * POST /api/cis/analyze
 *
 * 把拜訪 summary 文字分析成 BrandCard。
 *
 * 模式：
 *   - 有 ANTHROPIC_API_KEY → 真 Claude API call（TODO: 等 William 確認後實作）
 *   - 沒有 → 啟發式分析（fallback、永遠可用）
 *
 * Response: { brand_card: BrandCard, mode: 'llm' | 'heuristic' }
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCapability } from '@/lib/auth/require-capability'
import { heuristicAnalyze } from '@/lib/cis/heuristic-analyze'

export async function POST(req: NextRequest) {
  const guard = await requireCapability('cis.visits.write')
  if (!guard.ok) return guard.response

  let summary = ''
  try {
    const body = (await req.json()) as { summary?: string }
    summary = (body.summary || '').slice(0, 8000)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!summary.trim()) {
    return NextResponse.json({ error: 'summary 不能為空' }, { status: 400 })
  }

  const hasLlmKey = !!process.env.ANTHROPIC_API_KEY

  if (hasLlmKey) {
    // TODO: 接真 Claude API、目前 fall through 到 heuristic
    // 實作參考 vault A 第七章「自動觸發 LLM 分析」
    // 預留 prompt 結構：
    //   system: 你是品牌策略顧問、把訪談摘要整理成結構化品牌資料卡 ...
    //   user:   <summary>
    //   tool:   返回 BrandCard JSON schema
  }

  const card = heuristicAnalyze(summary)
  return NextResponse.json({
    brand_card: card,
    mode: hasLlmKey ? 'llm-pending' : 'heuristic',
  })
}
