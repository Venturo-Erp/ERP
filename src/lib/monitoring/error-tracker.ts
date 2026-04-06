/**
 * Frontend Error Tracker
 *
 * 目的：追蹤「按鈕不見、無法存檔」等使用者體驗問題
 *
 * 使用方式：
 * 1. 在關鍵操作加入追蹤
 * 2. 錯誤發生時自動記錄
 * 3. 定期檢視 localStorage 的錯誤日誌
 */

export interface ErrorLog {
  timestamp: string
  type: 'button_hidden' | 'button_disabled' | 'save_failed' | 'state_error' | 'rls_error'
  page: string
  action: string
  userId?: string
  workspaceId?: string
  details: {
    error?: string
    state?: unknown
    expectedState?: unknown
    [key: string]: unknown
  }
}

class ErrorTracker {
  private logs: ErrorLog[] = []
  private maxLogs = 100

  constructor() {
    // 從 localStorage 載入已有的錯誤日誌
    this.loadLogs()
  }

  /**
   * 記錄錯誤
   */
  track(log: Omit<ErrorLog, 'timestamp'>) {
    const errorLog: ErrorLog = {
      ...log,
      timestamp: new Date().toISOString(),
    }

    this.logs.push(errorLog)

    // 只保留最近 100 筆
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }

    // 儲存到 localStorage
    this.saveLogs()

    // 開發環境：直接在 console 顯示
    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorTracker]', errorLog)
    }

    // 嚴重錯誤：顯示 toast 通知（可選）
    if (log.type === 'save_failed' || log.type === 'rls_error') {
    }
  }

  /**
   * 追蹤按鈕狀態
   */
  trackButton(params: {
    page: string
    buttonId: string
    isVisible: boolean
    isDisabled: boolean
    expectedVisible?: boolean
    expectedDisabled?: boolean
    reason?: string
  }) {
    const { isVisible, isDisabled, expectedVisible, expectedDisabled, ...rest } = params

    // 按鈕應該出現但沒出現
    if (expectedVisible === true && !isVisible) {
      this.track({
        type: 'button_hidden',
        page: rest.page,
        action: `button_${rest.buttonId}`,
        details: {
          buttonId: rest.buttonId,
          expectedVisible: true,
          actualVisible: false,
          reason: rest.reason,
        },
      })
    }

    // 按鈕不應該 disabled 但被 disabled
    if (expectedDisabled === false && isDisabled) {
      this.track({
        type: 'button_disabled',
        page: rest.page,
        action: `button_${rest.buttonId}`,
        details: {
          buttonId: rest.buttonId,
          expectedDisabled: false,
          actualDisabled: true,
          reason: rest.reason,
        },
      })
    }
  }

  /**
   * 追蹤存檔失敗
   */
  trackSaveFailed(params: {
    page: string
    entity: string
    error: Error
    data?: unknown
    userId?: string
    workspaceId?: string
  }) {
    this.track({
      type: 'save_failed',
      page: params.page,
      action: `save_${params.entity}`,
      userId: params.userId,
      workspaceId: params.workspaceId,
      details: {
        entity: params.entity,
        error: params.error.message,
        errorStack: params.error.stack,
        data: params.data,
      },
    })
  }

  /**
   * 追蹤 RLS 錯誤
   */
  trackRLSError(params: {
    page: string
    table: string
    operation: 'select' | 'insert' | 'update' | 'delete'
    error: Error
    userId?: string
    workspaceId?: string
  }) {
    this.track({
      type: 'rls_error',
      page: params.page,
      action: `${params.operation}_${params.table}`,
      userId: params.userId,
      workspaceId: params.workspaceId,
      details: {
        table: params.table,
        operation: params.operation,
        error: params.error.message,
      },
    })
  }

  /**
   * 追蹤狀態錯誤
   */
  trackStateError(params: {
    page: string
    action: string
    actualState: unknown
    expectedState: unknown
    reason?: string
  }) {
    this.track({
      type: 'state_error',
      page: params.page,
      action: params.action,
      details: {
        actualState: params.actualState,
        expectedState: params.expectedState,
        reason: params.reason,
      },
    })
  }

  /**
   * 取得所有錯誤日誌
   */
  getLogs(): ErrorLog[] {
    return this.logs
  }

  /**
   * 取得特定類型的錯誤
   */
  getLogsByType(type: ErrorLog['type']): ErrorLog[] {
    return this.logs.filter(log => log.type === type)
  }

  /**
   * 取得特定頁面的錯誤
   */
  getLogsByPage(page: string): ErrorLog[] {
    return this.logs.filter(log => log.page === page)
  }

  /**
   * 清除所有錯誤日誌
   */
  clear() {
    this.logs = []
    this.saveLogs()
  }

  /**
   * 匯出錯誤日誌（供分析）
   */
  export(): string {
    return JSON.stringify(this.logs, null, 2)
  }

  /**
   * 儲存到 localStorage
   */
  private saveLogs() {
    try {
      localStorage.setItem('venturo_error_logs', JSON.stringify(this.logs))
    } catch (error) {
      console.error('Failed to save error logs:', error)
    }
  }

  /**
   * 從 localStorage 載入
   */
  private loadLogs() {
    try {
      const stored = localStorage.getItem('venturo_error_logs')
      if (stored) {
        this.logs = JSON.parse(stored)
      }
    } catch (error) {
      console.error('Failed to load error logs:', error)
      this.logs = []
    }
  }

  /**
   * 生成錯誤報告
   */
  generateReport(): {
    total: number
    byType: Record<ErrorLog['type'], number>
    byPage: Record<string, number>
    recentErrors: ErrorLog[]
  } {
    const byType = this.logs.reduce(
      (acc, log) => {
        acc[log.type] = (acc[log.type] || 0) + 1
        return acc
      },
      {} as Record<ErrorLog['type'], number>
    )

    const byPage = this.logs.reduce(
      (acc, log) => {
        acc[log.page] = (acc[log.page] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    return {
      total: this.logs.length,
      byType,
      byPage,
      recentErrors: this.logs.slice(-10),
    }
  }
}

// 全域單例
export const errorTracker = new ErrorTracker()

// 方便在 console 使用
if (typeof window !== 'undefined') {
  ;(window as unknown as Record<string, unknown>).errorTracker = errorTracker
}
