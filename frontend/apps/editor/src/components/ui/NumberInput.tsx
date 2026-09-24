import { useEffect, useRef, useState, type ReactNode } from "react"
import { cn } from "@aledobe/ui"

export type Phase = "preview" | "commit"

function evaluate(expr: string, current: number): number | null {
  const cleaned = expr.replace(/,/g, ".").replace(/[^\d+\-*/().\s%]/g, "")
  if (!cleaned.trim()) return null
  const relative = /^[+\-*/]/.test(cleaned.trim()) ? `${current}${cleaned}` : cleaned
  try {
    const value = Function(`"use strict"; return (${relative})`)()
    return typeof value === "number" && isFinite(value) ? value : null
  } catch {
    return null
  }
}

interface Props {
  value: number | "mixed"
  onChange: (value: number, phase: Phase) => void
  label?: ReactNode
  suffix?: string
  min?: number
  max?: number
  step?: number
  precision?: number
  className?: string
  title?: string
  disabled?: boolean
}

export function NumberInput({
  value,
  onChange,
  label,
  suffix,
  min = -Infinity,
  max = Infinity,
  step = 1,
  precision = 2,
  className,
  title,
  disabled,
}: Props) {
  const format = (v: number | "mixed") =>
    v === "mixed" ? "Mixed" : `${Math.round(v * 10 ** precision) / 10 ** precision}${suffix ?? ""}`
  const [text, setText] = useState(format(value))
  const [focused, setFocused] = useState(false)
  const scrub = useRef<{ x: number; start: number; moved: boolean } | null>(null)
  const clampV = (v: number) => Math.min(max, Math.max(min, v))

  useEffect(() => {
    if (!focused) setText(format(value))
  }, [value, focused])

  const commit = () => {
    const current = value === "mixed" ? 0 : value
    const next = evaluate(text.replace(suffix ?? "", ""), current)
    if (next !== null && next !== value) onChange(clampV(next), "commit")
    else setText(format(value))
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled) return
    e.preventDefault()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    scrub.current = { x: e.clientX, start: value === "mixed" ? 0 : value, moved: false }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const s = scrub.current
    if (!s) return
    const dx = e.clientX - s.x
    if (!s.moved && Math.abs(dx) < 2) return
    s.moved = true
    const factor = e.shiftKey ? 10 : e.altKey ? 0.1 : 1
    onChange(clampV(Math.round((s.start + dx * step * factor) * 100) / 100), "preview")
  }
  const onPointerUp = (e: React.PointerEvent) => {
    const s = scrub.current
    scrub.current = null
    if (!s?.moved) return
    const dx = e.clientX - s.x
    const factor = e.shiftKey ? 10 : e.altKey ? 0.1 : 1
    onChange(clampV(Math.round((s.start + dx * step * factor) * 100) / 100), "commit")
  }

  return (
    <div
      title={title}
      className={cn(
        "group flex h-7 min-w-0 items-center rounded-md border border-transparent bg-white/[0.04] text-[11px] transition-colors hover:border-white/10 focus-within:!border-primary focus-within:bg-transparent",
        disabled && "pointer-events-none opacity-40",
        className,
      )}
    >
      {label !== undefined && (
        <span
          className="flex h-full w-6 shrink-0 cursor-ew-resize items-center justify-center text-muted-foreground select-none [&_svg]:size-3"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          {label}
        </span>
      )}
      <input
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onFocus={(e) => {
          setFocused(true)
          e.target.select()
        }}
        onBlur={() => {
          setFocused(false)
          commit()
        }}
        onKeyDown={(e) => {
          e.stopPropagation()
          if (e.key === "Enter") {
            commit()
            ;(e.target as HTMLInputElement).blur()
          }
          if (e.key === "Escape") {
            setText(format(value))
            ;(e.target as HTMLInputElement).blur()
          }
          if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault()
            const base = value === "mixed" ? 0 : value
            const delta = (e.key === "ArrowUp" ? 1 : -1) * step * (e.shiftKey ? 10 : 1)
            const next = clampV(Math.round((base + delta) * 100) / 100)
            onChange(next, "commit")
            setText(format(next))
          }
        }}
        className={cn(
          "h-full w-full min-w-0 bg-transparent pr-1.5 text-foreground outline-none tabular-nums",
          label === undefined && "pl-2",
          value === "mixed" && !focused && "text-muted-foreground",
        )}
      />
    </div>
  )
}
