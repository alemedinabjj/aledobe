import { Eye, EyeOff, Minus } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from "@aledobe/ui"
import type { Paint, PaintType } from "../../core/types"
import { ColorPicker } from "../ui/ColorPicker"
import { NumberInput, type Phase } from "../ui/NumberInput"
import { Swatch } from "../ui/Swatch"
import { IconButton } from "../ui/IconButton"
import { normalizeHex } from "../../core/color"
import { useEffect, useState } from "react"

interface Props {
  paint: Paint
  onChange: (fn: (p: Paint) => void, phase: Phase) => void
  onRemove: () => void
  allowGradient?: boolean
}

function HexField({ paint, onChange }: Pick<Props, "paint" | "onChange">) {
  const [text, setText] = useState(paint.color.replace("#", ""))
  useEffect(() => setText(paint.color.replace("#", "")), [paint.color])
  if (paint.type !== "solid") {
    return <span className="flex-1 truncate pl-1 text-[11px] capitalize text-foreground/80">{paint.type} gradient</span>
  }
  return (
    <input
      value={text}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === "Enter") (e.target as HTMLInputElement).blur()
      }}
      onBlur={() => {
        const h = normalizeHex(text)
        if (h) onChange((p) => (p.color = h), "commit")
        else setText(paint.color.replace("#", ""))
      }}
      className="min-w-0 flex-1 bg-transparent pl-1 text-[11px] uppercase outline-none"
    />
  )
}

export function PaintRow({ paint, onChange, onRemove, allowGradient = true }: Props) {
  const [stop, setStop] = useState(0)
  return (
    <div className={cn("group flex items-center gap-1", !paint.visible && "opacity-50")}>
      <div className="flex h-7 min-w-0 flex-1 items-center gap-1 rounded-md bg-white/[0.04] pl-1.5 hover:ring-1 hover:ring-white/10">
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="flex items-center">
              <Swatch paint={paint} />
            </button>
          </PopoverTrigger>
          <PopoverContent side="left" align="start" className="w-auto p-3" onOpenAutoFocus={(e) => e.preventDefault()}>
            {allowGradient && (
              <div className="mb-3 flex items-center gap-2">
                <Select value={paint.type} onValueChange={(v) => onChange((p) => (p.type = v as PaintType), "commit")}>
                  <SelectTrigger size="xs" className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solid">Solid</SelectItem>
                    <SelectItem value="linear">Linear</SelectItem>
                    <SelectItem value="radial">Radial</SelectItem>
                  </SelectContent>
                </Select>
                {paint.type === "linear" && (
                  <NumberInput
                    className="w-20"
                    label="∠"
                    value={paint.angle}
                    suffix="°"
                    onChange={(v, phase) => onChange((p) => (p.angle = v), phase)}
                  />
                )}
              </div>
            )}
            {paint.type !== "solid" && (
              <div className="mb-3">
                <div
                  className="relative h-4 rounded-md ring-1 ring-white/10"
                  style={{
                    background: `linear-gradient(90deg, ${paint.stops.map((s) => `${s.color} ${s.position * 100}%`).join(",")})`,
                  }}
                >
                  {paint.stops.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setStop(i)}
                      className={cn(
                        "absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded border-2 shadow",
                        stop === i ? "border-white" : "border-white/40",
                      )}
                      style={{ left: `${s.position * 100}%`, background: s.color }}
                    />
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                  Stop {stop + 1}
                  <NumberInput
                    className="w-20"
                    value={Math.round((paint.stops[stop]?.position ?? 0) * 100)}
                    suffix="%"
                    min={0}
                    max={100}
                    precision={0}
                    onChange={(v, phase) => onChange((p) => (p.stops[stop].position = v / 100), phase)}
                  />
                </div>
              </div>
            )}
            {paint.type === "solid" ? (
              <ColorPicker
                color={paint.color}
                opacity={paint.opacity}
                onChange={(color, opacity, phase) =>
                  onChange((p) => {
                    p.color = color
                    p.opacity = opacity
                  }, phase)
                }
              />
            ) : (
              <ColorPicker
                color={paint.stops[stop]?.color ?? "#000000"}
                opacity={paint.stops[stop]?.opacity ?? 1}
                onChange={(color, opacity, phase) =>
                  onChange((p) => {
                    p.stops[stop].color = color
                    p.stops[stop].opacity = opacity
                  }, phase)
                }
              />
            )}
          </PopoverContent>
        </Popover>
        <HexField paint={paint} onChange={onChange} />
        <div className="w-14 border-l border-white/[0.06]">
          <NumberInput
            className="h-6 bg-transparent hover:border-transparent"
            value={Math.round(paint.opacity * 100)}
            suffix="%"
            min={0}
            max={100}
            precision={0}
            onChange={(v, phase) => onChange((p) => (p.opacity = v / 100), phase)}
          />
        </div>
      </div>
      <IconButton
        tip={paint.visible ? "Hide" : "Show"}
        onClick={() => onChange((p) => (p.visible = !p.visible), "commit")}
      >
        {paint.visible ? <Eye /> : <EyeOff />}
      </IconButton>
      <IconButton tip="Remove" onClick={onRemove}>
        <Minus />
      </IconButton>
    </div>
  )
}
