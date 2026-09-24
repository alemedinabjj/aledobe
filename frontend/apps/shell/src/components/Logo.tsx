import { cn } from "@aledobe/ui"

export function Logo({ className, withText = true }: { className?: string; withText?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg viewBox="0 0 32 32" className="size-7" fill="none">
        <defs>
          <linearGradient id="shell-logo" x1="0" y1="0" x2="32" y2="32">
            <stop stopColor="#C084FC" />
            <stop offset="1" stopColor="#7C3AED" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="28" height="28" rx="9" fill="url(#shell-logo)" />
        <path d="M10 22 16 9l6 13" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="16" cy="18.5" r="2.2" fill="#fff" />
      </svg>
      {withText && <span className="font-display text-lg font-semibold tracking-tight">aledobe</span>}
    </span>
  )
}
