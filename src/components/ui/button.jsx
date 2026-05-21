"use client";

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1) disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive cursor-pointer hover:scale-105 active:scale-95",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-[#5865F2] to-[#EC4899] text-white shadow-md border-0 rounded-full neon-glow hover:neon-glow-secondary",
        destructive:
          "bg-destructive text-white shadow-sm hover:bg-destructive/90 rounded-full",
        outline:
          "border border-[#5865F2]/40 bg-background/50 backdrop-blur-xs text-[#22D3EE] shadow-sm hover:bg-[#5865F2]/10 hover:border-[#22D3EE] rounded-full",
        secondary:
          "bg-[#8B5CF6] text-white shadow-sm hover:bg-[#8B5CF6]/90 rounded-full neon-glow",
        ghost: "hover:bg-white/5 hover:text-[#22D3EE] rounded-md",
        link: "text-[#22D3EE] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-full gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-full px-6 has-[>svg]:px-4",
        icon: "size-9 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  onMouseEnter,
  onClick,
  ...props
}) {
  const Comp = asChild ? Slot : "button"
  const { playHover, playClick } = useSoundEffects();

  const handleMouseEnter = (e) => {
    if (onMouseEnter) onMouseEnter(e);
    playHover();
  };

  const handlePointerDown = (e) => {
    playClick();
  };

  const handleClick = (e) => {
    if (onClick) onClick(e);
  };

  return (
    (<Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      onMouseEnter={handleMouseEnter}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      {...props} />)
  );
}

export { Button, buttonVariants }
