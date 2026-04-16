/**
 * Design Token 型別定義
 *
 * 提供開發者自動完成 + 型別安全
 */

/**
 * Semantic Token Names
 * 用於 CSS variables 和 Tailwind classes
 *
 * 例:
 * - bg-primary (Tailwind class)
 * - var(--color-primary) (CSS variable)
 * - useToken('color-primary') (TypeScript)
 */
export type SemanticToken =
  | 'color-primary'
  | 'color-primary-text'
  | 'color-primary-light'
  | 'color-accent'
  | 'color-accent-hover'
  | 'color-accent-light'
  | 'color-secondary'
  | 'color-secondary-light'
  | 'color-status-info'
  | 'color-status-success'
  | 'color-status-warning'
  | 'color-status-danger'
  | 'color-status-neutral'
  | 'color-surface'
  | 'color-surface-muted'
  | 'color-surface-container'
  | 'color-background'
  | 'color-text-primary'
  | 'color-text-secondary'
  | 'color-text-muted'
  | 'color-text-inverse'
  | 'color-border-default'
  | 'color-border-muted'
  | 'color-border-subtle'
  | 'color-interactive-hover'
  | 'color-interactive-focus'
  | 'color-interactive-active'
  | 'color-interactive-disabled'

/**
 * Primitive Token Names
 * 原始色值，不帶語義
 */
export type PrimitiveToken =
  | 'color-primary-900'
  | 'color-primary-700'
  | 'color-gold-500'
  | 'color-gold-400'
  | 'color-gold-600'
  | 'color-secondary-700'
  | 'color-secondary-400'
  | 'color-green-500'
  | 'color-red-500'
  | 'color-category-purple'
  | 'color-category-orange'
  | 'color-category-pink'
  | 'color-category-indigo'

/**
 * Token Value 元數據
 */
export interface TokenValue {
  readonly value: string
  readonly category: 'color' | 'sizing' | 'spacing' | 'typography'
  readonly description: string
  readonly semantic?: boolean
}

/**
 * Token 定義集合
 */
export interface TokenDefinition {
  [key: string]: TokenValue
}

/**
 * 提供給開發者的 Tokens API
 */
export interface TokensAPI {
  /**
   * 取得 semantic token 定義
   */
  getSemantic(token: SemanticToken): TokenValue

  /**
   * 取得 primitive token 定義
   */
  getPrimitive(token: PrimitiveToken): TokenValue

  /**
   * 取得 CSS variable 名稱
   */
  getCSSVariable(token: SemanticToken): string

  /**
   * 取得 Tailwind class 名稱
   */
  getTailwindClass(token: SemanticToken): string

  /**
   * 列出所有可用 token
   */
  listTokens(): string[]
}

/**
 * 主題類型
 */
export type Theme = 'morandi' | 'iron' | 'system'

/**
 * 主題設定
 */
export interface ThemeConfig {
  currentTheme: Theme
  available: Theme[]
  setTheme: (theme: Theme) => void
  systemPreference: 'light' | 'dark'
}

/**
 * Design Token 索引
 *
 * 用於編譯時檢查和運行時 lookup
 */
declare global {
  interface Window {
    __DESIGN_TOKENS__?: TokensAPI
    __THEME_CONFIG__?: ThemeConfig
  }

  namespace NodeJS {
    interface ProcessEnv {
      /**
       * 設計系統版本
       */
      NEXT_PUBLIC_DESIGN_SYSTEM_VERSION?: string
    }
  }
}

export {}
