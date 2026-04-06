/**
 * Error Tracking — Stub implementation
 *
 * Currently logs to console. Drop-in replacement for Sentry when ready.
 * Usage:
 *   import { captureException, captureMessage, setUser } from '@/lib/error-tracking'
 */

type ErrorLevel = 'fatal' | 'error' | 'warning' | 'info' | 'debug'

interface ErrorContext {
  /** Which module / route / feature */
  module?: string
  /** Extra metadata */
  extra?: Record<string, unknown>
  /** Override severity */
  level?: ErrorLevel
  /** Request-scoped tags */
  tags?: Record<string, string>
}

let _currentUserId: string | null = null

/**
 * Capture an exception with optional context.
 */
export function captureException(error: unknown, context?: ErrorContext): void {
  const err = error instanceof Error ? error : new Error(String(error))
  const level = context?.level ?? 'error'

  console.error(`[error-tracking][${level}]`, err.message, {
    stack: err.stack,
    userId: _currentUserId,
    module: context?.module,
    ...context?.extra,
  })
}

/**
 * Capture a plain message.
 */
export function captureMessage(message: string, level: ErrorLevel = 'info'): void {
  const logFn =
    level === 'error' || level === 'fatal'
      ? console.error
      : level === 'warning'
        ? console.warn
        : console.log
  logFn(`[error-tracking][${level}]`, message, { userId: _currentUserId })
}

/**
 * Associate subsequent events with a user id.
 */
export function setUser(userId: string | null): void {
  _currentUserId = userId
}

/**
 * Wrap an async handler with automatic error tracking.
 * Returns the original result or re-throws after capturing.
 */
export async function withErrorTracking<T>(
  module: string,
  fn: () => Promise<T>,
  extra?: Record<string, unknown>
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    captureException(error, { module, extra })
    throw error
  }
}
