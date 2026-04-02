'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

const DropdownMenuItemContext = React.createContext<{ onOpenChange?: (open: boolean) => void }>({})
const DropdownMenuTriggerRefContext = React.createContext<React.RefObject<HTMLElement | null>>({ current: null })

const DropdownMenu = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    open?: boolean
    onOpenChange?: (open: boolean) => void
    children: React.ReactNode
  }
>(({ className, open, onOpenChange, children, ...props }, ref) => {
  const [isOpen, setIsOpen] = React.useState(open || false)
  const triggerRef = React.useRef<HTMLElement | null>(null)

  React.useEffect(() => {
    if (open !== undefined) {
      setIsOpen(open)
    }
  }, [open])

  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen)
    onOpenChange?.(newOpen)
  }

  return (
    <DropdownMenuTriggerRefContext.Provider value={triggerRef}>
    <div ref={ref} className={cn('relative', className)} {...props}>
      {React.Children.map(children, child =>
        React.isValidElement(child)
          ? React.cloneElement(
              child as React.ReactElement<{
                isOpen?: boolean
                onOpenChange?: (open: boolean) => void
              }>,
              {
                isOpen,
                onOpenChange: handleOpenChange,
              }
            )
          : child
      )}
    </div>
    </DropdownMenuTriggerRefContext.Provider>
  )
})
DropdownMenu.displayName = 'DropdownMenu'

const DropdownMenuTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    isOpen?: boolean
    onOpenChange?: (open: boolean) => void
    asChild?: boolean
  }
>(({ className, children, isOpen, onOpenChange, asChild, ...props }, ref) => {
  const triggerRef = React.useContext(DropdownMenuTriggerRefContext)

  const setRef = React.useCallback((el: HTMLElement | null) => {
    if (triggerRef) triggerRef.current = el
    if (typeof ref === 'function') ref(el as HTMLButtonElement | null)
    else if (ref) (ref as React.MutableRefObject<HTMLButtonElement | null>).current = el as HTMLButtonElement | null
  }, [ref, triggerRef])

  if (asChild && React.isValidElement(children)) {
    type ChildProps = { onClick?: React.MouseEventHandler<HTMLElement>; ref?: React.Ref<HTMLElement> }
    const childElement = children as React.ReactElement<ChildProps>
    return React.cloneElement(childElement, {
      ref: setRef,
      onClick: (e: React.MouseEvent<HTMLElement>) => {
        onOpenChange?.(!isOpen)
        childElement.props.onClick?.(e)
      },
      ...props,
    } as ChildProps)
  }

  return (
    <button
      ref={setRef}
      className={cn(
        'flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        'disabled:pointer-events-none disabled:opacity-50',
        className
      )}
      onClick={() => onOpenChange?.(!isOpen)}
      {...props}
    >
      {children}
    </button>
  )
})
DropdownMenuTrigger.displayName = 'DropdownMenuTrigger'

const DropdownMenuContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    isOpen?: boolean
    onOpenChange?: (open: boolean) => void
    align?: 'start' | 'center' | 'end'
  }
>(({ className, children, isOpen, onOpenChange, align = 'start', ...props }, _ref) => {
  const contentRef = React.useRef<HTMLDivElement>(null)
  const triggerRef = React.useContext(DropdownMenuTriggerRefContext)
  const [position, setPosition] = React.useState<{ top: number; left: number } | null>(null)

  React.useEffect(() => {
    if (!isOpen || !triggerRef?.current) {
      setPosition(null)
      return
    }

    const updatePosition = () => {
      const trigger = triggerRef.current
      const content = contentRef.current
      if (!trigger || !content) return

      const rect = trigger.getBoundingClientRect()
      const contentWidth = content.offsetWidth || 192

      let left = rect.left
      if (align === 'end') left = rect.right - contentWidth
      else if (align === 'center') left = rect.left + rect.width / 2 - contentWidth / 2

      left = Math.min(left, window.innerWidth - contentWidth - 8)
      left = Math.max(left, 8)

      setPosition({ top: rect.bottom + 4, left })
    }

    // 先渲染再定位
    requestAnimationFrame(updatePosition)
  }, [isOpen, align, triggerRef])

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        contentRef.current && !contentRef.current.contains(event.target as Node) &&
        triggerRef?.current && !triggerRef.current.contains(event.target as Node)
      ) {
        onOpenChange?.(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onOpenChange, triggerRef])

  if (!isOpen) return null

  const portalContent = (
    <DropdownMenuItemContext.Provider value={{ onOpenChange }}>
      <div
        ref={contentRef}
        className={cn(
          'fixed z-[9999] min-w-[8rem] max-h-[70vh] overflow-y-auto rounded-md border border-border bg-card p-1 shadow-md',
          'animate-in fade-in-0 zoom-in-95',
          className
        )}
        style={position ? { top: position.top, left: position.left } : { visibility: 'hidden', top: 0, left: 0 }}
        {...props}
      >
        {children}
      </div>
    </DropdownMenuItemContext.Provider>
  )

  if (typeof document === 'undefined') return null
  return createPortal(portalContent, document.body)
})
DropdownMenuContent.displayName = 'DropdownMenuContent'

const DropdownMenuItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { onOpenChange?: (open: boolean) => void }
>(({ className, onClick, onOpenChange, ...props }, ref) => {
  const context = React.useContext(DropdownMenuItemContext)
  const closeMenu = onOpenChange || context.onOpenChange

  return (
    <div
      ref={ref}
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-md px-2 py-1.5 text-sm outline-none',
        'hover:bg-morandi-container hover:text-morandi-primary',
        'focus:bg-morandi-container focus:text-morandi-primary',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className
      )}
      onClick={e => {
        onClick?.(e)
        closeMenu?.(false)
      }}
      {...props}
    />
  )
})
DropdownMenuItem.displayName = 'DropdownMenuItem'

const DropdownMenuSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('-mx-1 my-1 h-px bg-muted', className)} {...props} />
))
DropdownMenuSeparator.displayName = 'DropdownMenuSeparator'

const DropdownMenuLabel = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('px-2 py-1.5 text-sm font-semibold text-morandi-primary', className)}
      {...props}
    />
  )
)
DropdownMenuLabel.displayName = 'DropdownMenuLabel'

const DropdownMenuCheckboxItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    checked?: boolean
    onCheckedChange?: (checked: boolean) => void
  }
>(({ className, children, checked, onCheckedChange, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'relative flex cursor-pointer select-none items-center rounded-md px-2 py-1.5 pl-8 text-sm outline-none',
      'hover:bg-morandi-container hover:text-morandi-primary',
      'focus:bg-morandi-container focus:text-morandi-primary',
      className
    )}
    onClick={e => {
      e.stopPropagation()
      onCheckedChange?.(!checked)
    }}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      {checked && (
        <svg
          className="h-4 w-4 text-morandi-primary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </span>
    {children}
  </div>
))
DropdownMenuCheckboxItem.displayName = 'DropdownMenuCheckboxItem'

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
}
