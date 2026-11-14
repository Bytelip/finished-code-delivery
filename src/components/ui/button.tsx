import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground font-semibold shadow-[0_0_16px_rgba(0,240,255,0.35)] hover:bg-primary/90 hover:shadow-[0_0_22px_rgba(0,240,255,0.55)]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[0_0_16px_rgba(255,46,86,0.35)] hover:bg-destructive/90 hover:shadow-[0_0_22px_rgba(255,46,86,0.55)]",
        outline:
          "border border-border/80 bg-background/70 shadow-sm hover:border-cyan/60 hover:bg-cyan/10 hover:text-cyan",
        secondary:
          "border border-border/50 bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 hover:border-cyan/40",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        hud: "border border-cyan/40 bg-card/90 text-foreground font-mono tracking-wide backdrop-blur-md hover:border-cyan hover:bg-cyan/15 hover:text-cyan hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] active:scale-[0.98]",
        pill: "rounded-full border border-border/60 bg-background/70 font-mono text-[11px] tracking-wide text-muted-foreground backdrop-blur hover:border-cyan/60 hover:text-cyan data-[active=true]:border-cyan data-[active=true]:bg-cyan/15 data-[active=true]:text-cyan data-[active=true]:shadow-[0_0_14px_rgba(0,240,255,0.4)]",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
        pill: "h-7 px-3",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
