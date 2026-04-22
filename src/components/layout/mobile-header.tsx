'use client'

import { COMPANY_NAME } from '@/lib/tenant'

import { Menu } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { COMP_LAYOUT_LABELS } from './constants/labels'

// 頁面標題映射
const PAGE_TITLES: Record<string, string> = {
  '/': COMP_LAYOUT_LABELS.首頁,
  '/calendar': COMP_LAYOUT_LABELS.行事曆,
  '/channel': COMP_LAYOUT_LABELS.工作空間,
  '/todos': COMP_LAYOUT_LABELS.待辦事項,
  '/tours': COMP_LAYOUT_LABELS.旅遊團,
  '/orders': COMP_LAYOUT_LABELS.訂單,
  '/contracts': COMP_LAYOUT_LABELS.合約,
  '/customers': COMP_LAYOUT_LABELS.客戶,
  '/finance': COMP_LAYOUT_LABELS.財務系統,
  '/finance/payments': COMP_LAYOUT_LABELS.請款管理,
  '/finance/cashier': COMP_LAYOUT_LABELS.出納管理,
  '/finance/treasury/disbursement': COMP_LAYOUT_LABELS.出納管理,
  '/finance/vouchers': COMP_LAYOUT_LABELS.會計傳票,
  '/settings': COMP_LAYOUT_LABELS.設定,
  '/destinations': COMP_LAYOUT_LABELS.地區管理,
  '/attractions': COMP_LAYOUT_LABELS.景點管理,
  '/database/suppliers': COMP_LAYOUT_LABELS.供應商,
  '/visas': COMP_LAYOUT_LABELS.簽證管理,
  '/confirmations': COMP_LAYOUT_LABELS.確認單,
  '/image-library': COMP_LAYOUT_LABELS.圖庫,
}

interface MobileHeaderProps {
  onMenuClick: () => void
}

export function MobileHeader({ onMenuClick }: MobileHeaderProps) {
  const pathname = usePathname()

  // 取得當前頁面標題
  const getPageTitle = () => {
    // 精確匹配
    if (PAGE_TITLES[pathname]) {
      return PAGE_TITLES[pathname]
    }
    // 前綴匹配（處理動態路由如 /orders/123）
    const matchedPath = Object.keys(PAGE_TITLES).find(
      path => path !== '/' && pathname.startsWith(path)
    )
    return matchedPath ? PAGE_TITLES[matchedPath] : COMPANY_NAME
  }

  return (
    <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-card border-b border-border z-40 flex items-center px-4 print:hidden">
      {/* 漢堡按鈕 */}
      <button
        onClick={onMenuClick}
        className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-muted active:bg-morandi-container transition-colors -ml-2"
        aria-label={COMP_LAYOUT_LABELS.開啟選單}
      >
        <Menu className="w-6 h-6 text-morandi-primary" />
      </button>

      {/* 頁面標題 */}
      <h1 className="ml-2 text-lg font-semibold text-foreground truncate">{getPageTitle()}</h1>
    </header>
  )
}
