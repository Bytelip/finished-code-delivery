import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground font-semibold shadow-[0_0_16px_rgba(0,240,255,0.35)] hover:bg-primary/90 hover:shadow-[0_0_22px_rgba(0,240,255,0.55)]",
        secondary:
          "border border-border/70 bg-background/60 text-foreground shadow-sm hover:border-cyan/50 hover:bg-accent/70 hover:text-foreground",
        toggle:
          "rounded-full border border-border/60 bg-background/70 font-mono text-xs tracking-wide text-muted-foreground backdrop-blur hover:border-cyan/60 hover:text-foreground",
        icon: "size-11 shrink-0 border border-border/60 bg-background/60 p-0 text-foreground hover:border-cyan/50 hover:bg-accent/70",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-11 px-4 py-2",
        sm: "min-h-11 rounded-md px-3 text-xs",
        lg: "min-h-12 rounded-md px-8",
        icon: "size-11 p-0",
        pill: "min-h-9 px-3",
      },
    },
    defaultVariants: {
      variant: "primary",
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
