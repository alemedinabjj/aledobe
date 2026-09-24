import { HexColorPicker } from "react-colorful"
import { Pipette } from "lucide-react"
import { useEffect, useState } from "react"
import { clamp, normalizeHex } from "../../core/color"
import type { Phase } from "./NumberInput"
import { NumberInput } from "./NumberInput"

interface Props {
  color: string
  opacity: number
  onChange: (color: string, opacity: number, phase: Phase) => void
}

const SWATCHES = [
  "#000000",
  "#FFFFFF",
  "#A855F7",
  "#E879F9",
  "#7C3AED",
  "#22D3EE",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#3B82F6",
  "#F472B6",
  "#94A3B8",
  "#1E1B2E",
  "#FDE68A",
]

export function ColorPicker({ color, opacity, onChange }: Props) {
  const [hex, setHex] = useState(color.replace("#", ""))
  useEffect(() => setHex(color.replace("#", "")), [color])

  const eyedrop = async () => {
    const Ctor = (window as unknown as { EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> } })
      .EyeDropper
    if (!Ctor) return
    try {
      const res = await new Ctor().open()
      const h = normalizeHex(res.sRGBHex)
      if (h) onChange(h, opacity, "commit")
    } catch {
      return
    }
  }

  return (
    <div
      className="flex w-60 flex-col gap-3 [&_.react-colorful]:!w-full [&_.react-colorful__hue]:!h-3 [&_.react-colorful__hue]:!rounded-full [&_.react-colorful__pointer]:!size-4 [&_.react-colorful__saturation]:!rounded-lg [&_.react-colorful__saturation]:!border-b-0"
      onPointerUp={() => onChange(color, opacity, "commit")}
    >
      <HexColorPicker
        color={color}
        onChange={(c) => onChange(c.toUpperCase(), opacity, "preview")}
        className="!h-48 gap-3"
      />
      <div className="flex gap-1.5 text-[11px]">
        <button
          type="button"
          onClick={eyedrop}
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          title="Pick color"
        >
          <Pipette className="size-3.5" />
        </button>
        <div className="flex h-7 flex-1 items-center rounded-md bg-white/[0.04] px-2 focus-within:ring-1 focus-within:ring-primary">
          <span className="mr-1.5 text-muted-foreground">#</span>
          <input
            value={hex}
            onChange={(e) => setHex(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation()
              if (e.key === "Enter") (e.target as HTMLInputElement).blur()
            }}
            onBlur={() => {
              const h = normalizeHex(hex)
              if (h) onChange(h, opacity, "commit")
              else setHex(color.replace("#", ""))
            }}
            className="w-full bg-transparent uppercase outline-none"
          />
        </div>
        <NumberInput
          className="w-16"
          value={Math.round(opacity * 100)}
          suffix="%"
          min={0}
          max={100}
          precision={0}
          onChange={(v, phase) => onChange(color, clamp(v, 0, 100) / 100, phase)}
        />
      </div>
      <div className="grid grid-cols-7 gap-1.5 border-t pt-3">
        {SWATCHES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s, opacity, "commit")}
            className="aspect-square rounded-md ring-1 ring-white/10 transition-transform hover:scale-110"
            style={{ background: s }}
            title={s}
          />
        ))}
      </div>
    </div>
  )
}
