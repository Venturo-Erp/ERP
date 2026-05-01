import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        // 主 CTA：飽和金漸層 + shadow、用於「儲存 / 確認 / 下單」等重要動作
        default:
          'bg-gradient-to-br from-morandi-gold to-morandi-gold-hover text-white hover:from-morandi-gold-hover hover:to-morandi-gold shadow-sm hover:shadow-md',
        // 危險動作：維持原樣、避免誤傷刪除類按鈕視覺強度
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        // Outline：加輕漸層底 + 金色邊、跟 default 搭配有層次
        outline:
          'border border-morandi-gold/30 bg-gradient-to-br from-background to-morandi-container/20 hover:from-morandi-gold/10 hover:to-morandi-gold/20 hover:border-morandi-gold/50 text-morandi-primary',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        // Soft：柔和漸層、給次要/非主 CTA、跟 dashboard widget 按鈕同一套配方
        soft: 'bg-gradient-to-br from-card to-morandi-container/30 border border-morandi-gold/30 text-morandi-primary hover:from-morandi-gold/10 hover:to-morandi-gold/20 hover:border-morandi-gold/50 shadow-sm hover:shadow-md',
        // Morandi 色系常用組合（避免各檔案手寫 className）
        'morandi-gold':
          'text-morandi-gold border border-morandi-gold/50 hover:bg-morandi-gold/10 hover:border-morandi-gold',
        // Soft gold：列表頁「新增 X」按鈕標準樣式（淺金平面、無 shadow、跟 status pill 視覺一致）
        // 取代 89 處手刻 className（2026-04-26 commit 99c54bcc8）
        'soft-gold':
          'bg-morandi-gold/15 text-morandi-primary border border-morandi-gold/30 hover:bg-morandi-gold/25 hover:border-morandi-gold/50 transition-colors',
        'morandi-destructive':
          'text-morandi-red border border-morandi-red/30 hover:bg-morandi-red/10',
        'morandi-destructive-ghost':
          'text-morandi-red hover:text-morandi-red hover:bg-morandi-red/10',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        xs: 'h-8 rounded-md px-2.5 text-sm',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
        iconSm: 'h-8 w-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )
  }
)
Button.displayName = 'Button'

export { Button,  }
