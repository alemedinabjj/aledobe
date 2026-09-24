import type { Paint } from "../../core/types"
import { paintToCss } from "../../core/render"
import { cn } from "@aledobe/ui"

export function Swatch({ paint, className }: { paint: Paint; className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-block size-4 shrink-0 overflow-hidden rounded-[4px] ring-1 ring-white/15",
        className,
      )}
      style={{
        backgroundImage: "repeating-conic-gradient(#555 0% 25%, #888 0% 50%)",
        backgroundSize: "6px 6px",
      }}
    >
      <span className="absolute inset-0" style={{ background: paintToCss(paint) }} />
    </span>
  )
}
