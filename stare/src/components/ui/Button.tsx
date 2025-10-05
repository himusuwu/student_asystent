import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { LoadingSpinner } from "@/components/ui/LoadingSpinner"

const buttonVariants = cva(
  "relative inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold tracking-tight transition-all duration-300 ease-snappy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-brand-primary via-brand-emphasis to-brand-glow text-white shadow-soft hover:shadow-soft-lg",
        premium:
          "bg-brand-subtle text-brand-emphasis hover:-translate-y-0.5 hover:shadow-soft",
        surface:
          "bg-surface-card text-foreground border border-surface-border dark:border-slate-700/60 backdrop-blur-md hover:-translate-y-0.5 hover:shadow-soft",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        outline:
          "border border-border bg-transparent text-foreground hover:border-brand-emphasis/60 hover:text-brand-emphasis",
        ghost:
          "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        link: "text-brand-emphasis underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-6",
        sm: "h-9 px-4 text-xs",
        lg: "h-12 px-8 text-base",
        xl: "h-14 px-10 text-base",
        icon: "h-11 w-11 p-0",
      },
      forceRounded: {
        true: "rounded-full",
        false: "rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      forceRounded: false,
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  loading?: boolean
  spinnerColor?: "primary" | "secondary" | "white"
  iconSpacing?: string
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      forceRounded,
      asChild = false,
      leftIcon,
      rightIcon,
      loading = false,
      spinnerColor,
      iconSpacing = "0.5rem",
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button"
    const gapStyle = { gap: iconSpacing }
    const showSpinner = loading
    const spinnerTone = spinnerColor ?? (variant === "default" ? "white" : "primary")

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, forceRounded, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading}
        {...props}
      >
        <span className="relative flex w-full items-center justify-center" style={gapStyle}>
          {showSpinner ? (
            <LoadingSpinner size="sm" color={spinnerTone} className="mr-1" />
          ) : (
            leftIcon && (
              <span aria-hidden className="flex items-center text-base">
                {leftIcon}
              </span>
            )
          )}

          {children && <span className="truncate leading-none">{children}</span>}

          {!showSpinner && rightIcon && (
            <span aria-hidden className="flex items-center text-base">
              {rightIcon}
            </span>
          )}
        </span>
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
