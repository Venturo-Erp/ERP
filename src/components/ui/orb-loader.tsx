'use client'

import { cn } from '@/lib/utils'

interface OrbLoaderProps {
  className?: string
  size?: number
}

/**
 * 熔岩球載入動畫（Uiverse.io by andrew-manzyk）
 * 用途：行程表生成等需要較長等待時間的轉場特效
 */
export function OrbLoader({ className, size = 1 }: OrbLoaderProps) {
  return (
    <div
      className={cn('orb-loader', className)}
      style={{ '--size': size } as React.CSSProperties}
    >
      <svg>
        <defs>
          <mask id="clipping">
            <polygon points="50 0, 100 0, 100 50, 50 50" fill="white" />
            <polygon points="0 0, 50 0, 50 50, 0 50" fill="white" />
            <polygon points="50 50, 100 50, 100 100, 50 100" fill="white" />
            <polygon points="0 50, 50 50, 50 100, 0 100" fill="white" />
            <polygon points="25 25, 75 25, 75 75, 25 75" fill="white" />
            <polygon points="15 15, 85 15, 85 85, 15 85" fill="white" />
            <polygon points="35 35, 65 35, 65 65, 35 65" fill="white" />
          </mask>
        </defs>
      </svg>
      <div className="box" />
    </div>
  )
}
