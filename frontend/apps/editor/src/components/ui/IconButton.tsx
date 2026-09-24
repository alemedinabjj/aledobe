import type { ComponentProps, ReactNode } from "react"
import { cn, Tooltip, TooltipContent, TooltipTrigger } from "@aledobe/ui"

interface Props extends ComponentProps<"button"> {
  tip?: ReactNode
  shortcut?: string
  active?: boolean
  side?: "top" | "bottom" | "left" | "right"
}

export function IconButton({ tip, shortcut, active, side = "bottom", className, children, ...props }: Props) {
  const button = (
    <button
      type="button"
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground disabled:pointer-events-none disabled:opacity-35 [&_svg]:size-4",
        active && "bg-primary/15 text-neon hover:bg-primary/20 hover:text-neon",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
  if (!tip) return button
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side={side}>
        {tip}
        {shortcut && <span className="text-muted-foreground">{shortcut}</span>}
      </TooltipContent>
    </Tooltip>
  )
}
