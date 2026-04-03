/**
 * Logan Chat API
 * POST /api/logan/chat
 */

import { NextRequest } from 'next/server'
import { chatWithLogan, teachLogan, isLoganAvailable, type MemoryCategory } from '@/lib/logan'
import { getServerAuth } from '@/lib/auth/server-auth'
import { logger } from '@/lib/utils/logger'
import { ApiError, successResponse } from '@/lib/api/response'
import { validateBody } from '@/lib/api/validation'
import { loganChatSchema } from '@/lib/validations/api-schemas'


export async function POST(request: NextRequest) {
  // 全局 AI 開關
  if (process.env.NEXT_PUBLIC_DISABLE_AI === 'true') {
    return ApiError.internal('AI 功能已停用')
  }

  try {
    // 驗證身份
    const auth = await getServerAuth()
    if (!auth.success) {
      return ApiError.unauthorized(auth.error.error)
    }

    const { workspaceId, employeeId } = auth.data
    const validation = await validateBody(request, loganChatSchema)
    if (!validation.success) return validation.error
    const { message, action } = validation.data
    const body = validation.data

    // 根據 action 處理
    switch (action) {
      case 'chat': {
        if (!message || typeof message !== 'string') {
          return ApiError.validation('請提供訊息內容')
        }

        const result = await chatWithLogan(workspaceId, employeeId, message)
        return successResponse(result)
      }

      case 'teach': {
        const { title, content, category, tags, importance } = body
        if (!title || !content) {
          return ApiError.validation('請提供標題和內容')
        }

        const result = await teachLogan(workspaceId, employeeId, {
          title,
          content,
          category: category as MemoryCategory,
          tags,
          importance,
        })
        return successResponse(result)
      }

      default:
        return ApiError.validation('未知的操作')
    }
  } catch (error) {
    logger.error('Logan API error:', error)
    return ApiError.internal('伺服器錯誤')
  }
}

export async function GET() {
  // 全局 AI 開關
  if (process.env.NEXT_PUBLIC_DISABLE_AI === 'true') {
    return successResponse({
      available: false,
      disabled: true,
      model: null,
    })
  }

  try {
    const available = await isLoganAvailable()
    return successResponse({
      available,
      model: process.env.OLLAMA_MODEL || 'qwen2.5:7b',
    })
  } catch (error) {
    return successResponse({
      available: false,
      error: '無法檢查 Logan 狀態',
    })
  }
}
