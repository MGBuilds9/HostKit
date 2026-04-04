import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { classNames, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cn(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium not-disabled:bg-transparent disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 data-[state=open]:bg-blue-100 data-[state=open]:text-blue-900 data-[state=open]:border-blue-100 leading-none transition-colors duration-200 focus-visible:ring-offset-2 rounded-md",
  {
    variants: {
      variant: {
        default: "bg-blue-primary text-primary-foreground hover:bg-blue-hover",
        destructive: "bg-red-500 text-white hover:bg-red-600",
        outline: "border border-input bg-background hover:bg-accent hover:text-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary-hover",
        ghost: "hover:bg-accent hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline p-0",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.HTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }