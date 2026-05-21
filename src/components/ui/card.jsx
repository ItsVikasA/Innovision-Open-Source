import * as React from "react"
import { cn } from "@/lib/utils"

function Card({
  className,
  ...props
}) {
  return (
    (<div
      data-slot="card"
      className={cn(
        "glassmorphism text-card-foreground flex flex-col gap-6 rounded-xl py-6 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(88,101,242,0.12)] hover:border-[#5865F2]/30",
        className
      )}
      {...props} />)
  );
}

function CardHeader({
  className,
  ...props
}) {
  return (
    (<div
      data-slot="card-header"
      className={cn("flex flex-col gap-1.5 px-6", className)}
      {...props} />)
  );
}

function CardTitle({
  className,
  ...props
}) {
  return (
    (<div
      data-slot="card-title"
      className={cn("leading-none font-semibold text-white tracking-wide", className)}
      {...props} />)
  );
}

function CardDescription({
  className,
  ...props
}) {
  return (
    (<div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm font-light", className)}
      {...props} />)
  );
}

function CardContent({
  className,
  ...props
}) {
  return (<div data-slot="card-content" className={cn("px-6 text-sm text-gray-300 leading-relaxed", className)} {...props} />);
}

function CardFooter({
  className,
  ...props
}) {
  return (
    (<div
      data-slot="card-footer"
      className={cn("flex items-center px-6", className)}
      {...props} />)
  );
}

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
