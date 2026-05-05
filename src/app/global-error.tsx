'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'
import { ERROR_PAGE_LABELS } from './constants/labels'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // 記錄嚴重錯誤到 Sentry
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="zh-TW">
      <head>
        <title>{ERROR_PAGE_LABELS.LABEL_4210}</title>
      </head>
      <body className="m-0 font-sans">
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-900">
          <div className="max-w-md w-full text-center text-slate-200">
            {/* 錯誤圖示 */}
            <div className="mb-6 text-6xl">⚠️</div>

            {/* 標題 */}
            <h1 className="text-3xl font-bold mb-2">
              {ERROR_PAGE_LABELS.LABEL_3257}
            </h1>

            {/* 描述 */}
            <p className="text-slate-400 mb-8">
              {ERROR_PAGE_LABELS.LABEL_4904}
            </p>

            {/* 錯誤訊息（開發模式） */}
            {process.env.NODE_ENV === 'development' && (
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm font-mono text-red-500 break-words">
                  {error.message}
                </p>
              </div>
            )}

            {/* 重試按鈕 */}
            <button
              onClick={reset}
              className="bg-blue-500 text-white px-6 py-2 rounded-md cursor-pointer text-base font-medium hover:bg-blue-600 transition-colors"
            >
              {ERROR_PAGE_LABELS.LOADING_1029}
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
