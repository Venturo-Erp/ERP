/**
 * Design Tokens Public API
 *
 * 中央出口，提供列印色板和型別定義
 *
 * 使用:
 * - import { PRINT_PALETTE } from '@/lib/design-tokens'
 * - import type { SemanticToken } from '@/lib/design-tokens'
 */

export { PRINT_PALETTE, getPrintColor, validatePrintPalette } from './print-palette'
export type { PrintPaletteKey, PrintColor } from './print-palette'

export type {
  SemanticToken,
  PrimitiveToken,
  TokenValue,
  TokenDefinition,
  TokensAPI,
  Theme,
  ThemeConfig,
} from './tokens.d'

// ─────────────────────────────────────
// Semantic Token Registry
// ─────────────────────────────────────

/**
 * 所有可用的 Semantic Token 名稱
 * 用於自動完成和型別檢查
 */
export const SEMANTIC_TOKENS = [
  'color-primary',
  'color-primary-text',
  'color-primary-light',
  'color-accent',
  'color-accent-hover',
  'color-accent-light',
  'color-secondary',
  'color-secondary-light',
  'color-status-info',
  'color-status-success',
  'color-status-warning',
  'color-status-danger',
  'color-status-neutral',
  'color-surface',
  'color-surface-muted',
  'color-surface-container',
  'color-background',
  'color-text-primary',
  'color-text-secondary',
  'color-text-muted',
  'color-text-inverse',
  'color-border-default',
  'color-border-muted',
  'color-border-subtle',
  'color-interactive-hover',
  'color-interactive-focus',
  'color-interactive-active',
  'color-interactive-disabled',
] as const

/**
 * Tailwind Color Map
 *
 * 將 Semantic Token 對應到 Tailwind class 前綴
 */
export const TAILWIND_COLOR_MAP: Record<string, string> = {
  'color-primary': 'primary',
  'color-primary-text': 'primary',
  'color-primary-light': 'primary-light',
  'color-accent': 'gold',
  'color-accent-hover': 'gold-hover',
  'color-accent-light': 'gold-light',
  'color-secondary': 'secondary',
  'color-secondary-light': 'secondary-light',
  'color-status-info': 'status-info',
  'color-status-success': 'status-success',
  'color-status-warning': 'status-warning',
  'color-status-danger': 'status-danger',
  'color-status-neutral': 'status-neutral',
  'color-surface': 'card',
  'color-surface-muted': 'secondary-light',
  'color-surface-container': 'accent',
  'color-background': 'background',
  'color-text-primary': 'foreground',
  'color-text-secondary': 'muted-foreground',
  'color-text-muted': 'muted-foreground',
  'color-text-inverse': 'primary-foreground',
  'color-border-default': 'border',
  'color-border-muted': 'border-muted',
  'color-border-subtle': 'border-subtle',
  'color-interactive-hover': 'interactive-hover',
  'color-interactive-focus': 'ring',
  'color-interactive-active': 'gold-hover',
  'color-interactive-disabled': 'muted',
} as const

/**
 * Token 文件注冊
 * （開發/文檔用）
 */
export const TOKEN_REGISTRY = {
  primitives: {
    path: './primitives.css',
    description: 'Layer 1: 原始色值（調色盤）',
  },
  semantic: {
    path: './semantic.css',
    description: 'Layer 2: 語義化別名（指向 primitives）',
  },
  printPalette: {
    path: './print-palette.ts',
    description: 'Layer 3: 列印專用常數',
  },
  themes: {
    morandi: {
      path: './themes/morandi.css',
      description: '莫蘭迪主題（預設）',
    },
    iron: {
      path: './themes/iron.css',
      description: '鐵灰冷調主題',
    },
  },
} as const

/**
 * 遷移指南
 *
 * 從舊系統（硬編碼）遷移到新系統（Design Tokens）的步驟：
 *
 * 1. **螢幕元件（.tsx）**
 *    ```typescript
 *    // ❌ Before - 硬編碼
 *    <div style={{ backgroundColor: '#c9aa7c' }}>
 *
 *    // ✅ After - 用 Tailwind class
 *    <div className="bg-gold">
 *
 *    // 或用 CSS variable
 *    <div style={{ backgroundColor: 'var(--color-accent)' }}>
 *    ```
 *
 * 2. **列印元件（PDF/email 生成）**
 *    ```typescript
 *    import { PRINT_PALETTE } from '@/lib/design-tokens'
 *
 *    // ❌ Before - 分散的常數
 *    const COLORS = { gold: '#B8A99A', brown: '#3a3633' }
 *
 *    // ✅ After - 集中式常數
 *    const styles = { backgroundColor: PRINT_PALETTE.gold.standard }
 *    ```
 *
 * 3. **型別安全（TypeScript）**
 *    ```typescript
 *    import type { SemanticToken } from '@/lib/design-tokens'
 *
 *    function useTokenColor(token: SemanticToken): string {
 *      return `var(--${token})`
 *    }
 *    ```
 *
 * 4. **Tailwind 延伸**
 *    ```javascript
 *    // tailwind.config.ts
 *    colors: {
 *      primary: 'var(--color-primary)',
 *      gold: 'var(--color-accent)',
 *    }
 *    ```
 */

export const MIGRATION_GUIDE = {
  documentation: 'https://docs.example.com/design-tokens',
  sprintPlan:
    'https://docs.example.com/design-tokens/sprint-plan',
  troubleshooting:
    'https://docs.example.com/design-tokens/troubleshooting',
} as const
