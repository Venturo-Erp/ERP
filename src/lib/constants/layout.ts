/**
 * Layout Constants
 * 版面配置相關常數
 */

// Header
const HEADER_HEIGHT = 72 // px
export const HEADER_HEIGHT_PX = '72px'

// Sidebar
const SIDEBAR_WIDTH_EXPANDED = 180 // px (與 Sidebar 的 w-[180px] 一致)
const SIDEBAR_WIDTH_COLLAPSED = 64 // px (與 Sidebar 的 w-16 一致)
export const SIDEBAR_WIDTH_EXPANDED_PX = '180px'
export const SIDEBAR_WIDTH_COLLAPSED_PX = '64px'

// Transitions
export const LAYOUT_TRANSITION_DURATION = 300 // ms

// Pages without sidebar
export const NO_SIDEBAR_PAGES = [
  '/login',
  '/unauthorized',
  '/view', // 分享的行程預覽頁面（無需登入、無側邊欄）
]

// Pages with custom layout (no padding, full height)
export const CUSTOM_LAYOUT_PAGES = ['/editor', '/workspace', '/design/new', '/office/editor']
