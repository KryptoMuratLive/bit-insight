import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const tradingButtonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        bull: "bg-gradient-to-r from-bull to-bull/80 text-bull-foreground hover:from-bull/90 hover:to-bull/70 shadow-lg",
        bear: "bg-gradient-to-r from-bear to-bear/80 text-bear-foreground hover:from-bear/90 hover:to-bear/70 shadow-lg",
        trading: "bg-gradient-to-r from-primary to-accent text-background hover:from-primary/90 hover:to-accent/90 shadow-lg",
        alert: "bg-warning text-warning-foreground hover:bg-warning/90 shadow-md animate-pulse"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface TradingButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof tradingButtonVariants> {
  asChild?: boolean
}

const TradingButton = React.forwardRef<HTMLButtonElement, TradingButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(tradingButtonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
TradingButton.displayName = "TradingButton"

export { TradingButton, tradingButtonVariants }