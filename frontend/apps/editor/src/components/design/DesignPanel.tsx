import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalDistributeCenter,
  ArrowDown,
  ArrowRight,
  Baseline,
  CaseLower,
  CaseSensitive,
  CaseUpper,
  ChevronDown,
  Download,
  Eye,
  EyeOff,
  FlipHorizontal2,
  FlipVertical2,
  Italic,
  Minus,
  MoveHorizontal,
  MoveVertical,
  Plus,
  RotateCw,
  Scan,
  Settings2,
  Square,
  Strikethrough,
  TextAlignCenter,
  TextAlignEnd,
  TextAlignStart,
  Underline,
  WrapText,
  Maximize2,
} from "lucide-react"
import { useState } from "react"
import {
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  ToggleGroup,
  ToggleGroupItem,
} from "@aledobe/ui"
import { useEditor } from "../../core/store"
import { defaultAutoLayout, descendants, effect, solid, topLevel } from "../../core/doc"
import { lineFromPoints, lineEndpoints, nodeAABB, nodeCenter, normalizeAngle } from "../../core/geometry"
import { exportNodes, type ExportFormat } from "../../core/export"
import { pickReplacementImage } from "./replaceImage"
import type { BlendMode, Effect, SceneNode, StrokeCap } from "../../core/types"
import { NumberInput } from "../ui/NumberInput"
import { Section } from "../ui/Section"
import { IconButton } from "../ui/IconButton"
import { ColorPicker } from "../ui/ColorPicker"
import { Swatch } from "../ui/Swatch"
import { PaintRow } from "./PaintRow"
import { edit, mixed } from "./common"

const FONTS = [
  "Inter",
  "Roboto",
  "Poppins",
  "Montserrat",
  "Space Grotesk",
  "DM Sans",
  "Manrope",
  "Playfair Display",
  "Lora",
  "JetBrains Mono",
]
const WEIGHTS = [
  [100, "Thin"],
  [200, "Extra Light"],
  [300, "Light"],
  [400, "Regular"],
  [500, "Medium"],
  [600, "Semi Bold"],
  [700, "Bold"],
  [800, "Extra Bold"],
  [900, "Black"],
] as const
const BLENDS: BlendMode[] = [
  "normal",
  "multiply",
  "screen",
  "overlay",
  "darken",
  "lighten",
  "color-dodge",
  "color-burn",
  "hard-light",
  "soft-light",
  "difference",
  "exclusion",
  "hue",
  "saturation",
  "color",
  "luminosity",
]
const PRESETS: { group: string; items: [string, number, number][] }[] = [
  {
    group: "Phone",
    items: [
      ["iPhone 16 Pro", 402, 874],
      ["iPhone 16", 393, 852],
      ["Android Compact", 412, 917],
    ],
  },
  {
    group: "Tablet",
    items: [
      ['iPad Pro 11"', 834, 1194],
      ["Surface Pro", 1368, 912],
    ],
  },
  {
    group: "Desktop",
    items: [
      ["Desktop", 1440, 1024],
      ["MacBook Air", 1280, 832],
      ["Full HD", 1920, 1080],
    ],
  },
  {
    group: "Social",
    items: [
      ["Instagram post", 1080, 1350],
      ["Instagram story", 1080, 1920],
      ["YouTube thumbnail", 1280, 720],
      ["LinkedIn post", 1200, 627],
    ],
  },
]

const hasRadius = (n: SceneNode) => ["rect", "frame", "image", "polygon", "star"].includes(n.type)

function Row({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-2 gap-2", className)}>{children}</div>
}

function AlignBar({ ids, count }: { ids: string[]; count: number }) {
  const s = useEditor.getState
  const disabled = ids.length === 0
  return (
    <div className="flex items-center justify-between border-b border-white/[0.06] px-2 py-2">
      <IconButton disabled={disabled} tip="Align left" shortcut="⌥A" onClick={() => s().align("left")}>
        <AlignStartVertical />
      </IconButton>
      <IconButton disabled={disabled} tip="Align horizontal centers" shortcut="⌥H" onClick={() => s().align("hcenter")}>
        <AlignCenterVertical />
      </IconButton>
      <IconButton disabled={disabled} tip="Align right" shortcut="⌥D" onClick={() => s().align("right")}>
        <AlignEndVertical />
      </IconButton>
      <IconButton disabled={disabled} tip="Align top" shortcut="⌥W" onClick={() => s().align("top")}>
        <AlignStartHorizontal />
      </IconButton>
      <IconButton disabled={disabled} tip="Align vertical centers" shortcut="⌥V" onClick={() => s().align("vcenter")}>
        <AlignCenterHorizontal />
      </IconButton>
      <IconButton disabled={disabled} tip="Align bottom" shortcut="⌥S" onClick={() => s().align("bottom")}>
        <AlignEndHorizontal />
      </IconButton>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            disabled={count < 3}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-white/[0.06] hover:text-foreground disabled:opacity-35"
          >
            <AlignHorizontalDistributeCenter className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => s().distribute("x")}>
            <AlignHorizontalDistributeCenter /> Distribute horizontal spacing
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => s().distribute("y")}>
            <AlignVerticalDistributeCenter /> Distribute vertical spacing
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function TypeHeader({ nodes }: { nodes: SceneNode[] }) {
  const single = nodes.length === 1 ? nodes[0] : null
  const label = single
    ? {
        frame: "Frame",
        group: "Group",
        rect: "Rectangle",
        ellipse: "Ellipse",
        polygon: "Polygon",
        star: "Star",
        line: "Line",
        path: "Vector",
        text: "Text",
        image: "Image",
      }[single.type]
    : `${nodes.length} layers`
  const isFrame = single?.type === "frame"
  return (
    <div className="flex h-10 items-center justify-between border-b border-white/[0.06] px-3">
      {isFrame ? (
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1 rounded px-1 py-0.5 text-[11px] font-semibold hover:bg-white/[0.06]">
            Frame <ChevronDown className="size-3 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-96 w-64 overflow-y-auto">
            {PRESETS.map((g, i) => (
              <div key={g.group}>
                {i > 0 && <DropdownMenuSeparator />}
                <DropdownMenuLabel>{g.group}</DropdownMenuLabel>
                {g.items.map(([name, w, h]) => (
                  <DropdownMenuItem
                    key={name}
                    onSelect={() =>
                      edit([single!.id], (n) => {
                        n.width = w
                        n.height = h
                        if (n.layout) {
                          n.layout.hugWidth = false
                          n.layout.hugHeight = false
                        }
                      })
                    }
                  >
                    <span className="flex-1">{name}</span>
                    <span className="text-xs opacity-60">
                      {w}×{h}
                    </span>
                  </DropdownMenuItem>
                ))}
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <span className="text-[11px] font-semibold">{label}</span>
      )}
      <div className="flex">
        <IconButton tip="Flip horizontal" shortcut="⇧H" onClick={() => useEditor.getState().flip("x")}>
          <FlipHorizontal2 />
        </IconButton>
        <IconButton tip="Flip vertical" shortcut="⇧V" onClick={() => useEditor.getState().flip("y")}>
          <FlipVertical2 />
        </IconButton>
      </div>
    </div>
  )
}

function LayoutSection({ nodes }: { nodes: SceneNode[] }) {
  const doc = useEditor((s) => s.doc)
  const ids = nodes.map((n) => n.id)
  const boxes = nodes.map((n) => (n.type === "group" ? nodeAABB(doc, n.id) : n))
  const X = mixed(boxes as SceneNode[], (b) => Math.round(b.x * 100) / 100)
  const Y = mixed(boxes as SceneNode[], (b) => Math.round(b.y * 100) / 100)
  const W = mixed(nodes, (n) => Math.round(n.width * 100) / 100)
  const H = mixed(nodes, (n) => Math.round(n.height * 100) / 100)
  const R = mixed(nodes, (n) => n.rotation)
  const radiusNodes = nodes.filter(hasRadius)
  const radius = mixed(radiusNodes, (n) => n.cornerRadius)
  const frames = nodes.filter((n) => n.type === "frame")
  const lines = nodes.filter((n) => n.type === "line")
  const [locked, setLocked] = useState(false)

  const setPos = (axis: "x" | "y", v: number, phase: "preview" | "commit") =>
    edit(
      ids,
      (n, d) => {
        const b = n.type === "group" ? nodeAABB(d, n.id) : n
        const delta = v - b[axis]
        for (const id of [n.id, ...descendants(d, n.id)]) d.nodes[id][axis] += delta
      },
      phase,
    )

  const setSize = (dim: "width" | "height", v: number, phase: "preview" | "commit") =>
    edit(
      ids,
      (n, d) => {
        const value = Math.max(dim === "height" && n.type === "line" ? 0 : 0.01, v)
        if (n.type === "line" && dim === "width") {
          const [a] = lineEndpoints(n)
          const angle = (n.rotation * Math.PI) / 180
          Object.assign(n, lineFromPoints(a, { x: a.x + Math.cos(angle) * value, y: a.y + Math.sin(angle) * value }))
          return
        }
        const other = dim === "width" ? "height" : "width"
        const ratio = n[other] / (n[dim] || 1)
        if (n.type === "group") {
          const from = nodeAABB(d, n.id)
          const to = { ...from, [dim]: value, ...(locked ? { [other]: value * ratio } : {}) }
          const sx = from.width ? to.width / from.width : 1
          const sy = from.height ? to.height / from.height : 1
          for (const id of descendants(d, n.id)) {
            const c = d.nodes[id]
            c.x = to.x + (c.x - from.x) * sx
            c.y = to.y + (c.y - from.y) * sy
            c.width *= sx
            c.height *= sy
          }
          return
        }
        const center = nodeCenter(n)
        n[dim] = value
        if (locked) n[other] = value * ratio
        if (n.rotation) {
          n.x = center.x - n.width / 2
          n.y = center.y - n.height / 2
        }
        if (n.type === "text") n.textAutoResize = dim === "width" && !locked ? "height" : "fixed"
        if (n.type === "frame" && n.layout) {
          if (dim === "width" || locked) n.layout.hugWidth = false
          if (dim === "height" || locked) n.layout.hugHeight = false
        }
      },
      phase,
    )

  const setRotation = (v: number, phase: "preview" | "commit") =>
    edit(
      ids,
      (n, d) => {
        const delta = normalizeAngle(v) - n.rotation
        if (!delta) return
        const c = n.type === "group" ? nodeCenter(nodeAABB(d, n.id)) : nodeCenter(n)
        if (n.type !== "group") n.rotation = normalizeAngle(v)
        for (const id of descendants(d, n.id)) {
          const child = d.nodes[id]
          const cc = nodeCenter(child)
          const a = (delta * Math.PI) / 180
          const dx = cc.x - c.x
          const dy = cc.y - c.y
          const nx = c.x + dx * Math.cos(a) - dy * Math.sin(a)
          const ny = c.y + dx * Math.sin(a) + dy * Math.cos(a)
          child.x = nx - child.width / 2
          child.y = ny - child.height / 2
          if (child.type !== "group") child.rotation = normalizeAngle(child.rotation + delta)
        }
      },
      phase,
    )

  return (
    <Section title="Layout">
      <div className="flex flex-col gap-2">
        <Row>
          <NumberInput label="X" value={X} onChange={(v, p) => setPos("x", v, p)} />
          <NumberInput label="Y" value={Y} onChange={(v, p) => setPos("y", v, p)} />
        </Row>
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
          <NumberInput label="W" value={W} min={0} onChange={(v, p) => setSize("width", v, p)} />
          <NumberInput
            label="H"
            value={H}
            min={0}
            disabled={lines.length === nodes.length}
            onChange={(v, p) => setSize("height", v, p)}
          />
          <IconButton tip="Constrain proportions" active={locked} onClick={() => setLocked(!locked)}>
            <Maximize2 />
          </IconButton>
        </div>
        <Row>
          <NumberInput label={<RotateCw />} value={R} suffix="°" onChange={setRotation} />
          {radiusNodes.length > 0 ? (
            <NumberInput
              label={<Scan />}
              title="Corner radius"
              value={radius}
              min={0}
              onChange={(v, p) =>
                edit(
                  radiusNodes.map((n) => n.id),
                  (n) => (n.cornerRadius = v),
                  p,
                )
              }
            />
          ) : (
            <span />
          )}
        </Row>
        {frames.length > 0 && (
          <label className="mt-1 flex cursor-pointer items-center gap-2 text-[11px] text-muted-foreground">
            <Switch
              checked={frames.every((f) => f.clipContent)}
              onCheckedChange={(v) =>
                edit(
                  frames.map((f) => f.id),
                  (n) => (n.clipContent = v),
                )
              }
            />
            Clip content
          </label>
        )}
      </div>
    </Section>
  )
}

function AutoLayoutSection({ frame }: { frame: SceneNode }) {
  const l = frame.layout
  const set = (fn: (l: NonNullable<SceneNode["layout"]>) => void, phase: "preview" | "commit" = "commit") =>
    edit([frame.id], (n) => n.layout && fn(n.layout), phase)
  return (
    <Section
      title="Auto layout"
      actions={
        <IconButton
          tip={l ? "Remove auto layout" : "Add auto layout"}
          shortcut="⇧A"
          onClick={() => edit([frame.id], (n) => (n.layout = n.layout ? null : defaultAutoLayout()))}
        >
          {l ? <Minus /> : <Plus />}
        </IconButton>
      }
    >
      {l && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <ToggleGroup
              type="single"
              value={l.direction}
              onValueChange={(v) => v && set((x) => (x.direction = v as "horizontal" | "vertical"))}
            >
              <ToggleGroupItem value="vertical" title="Vertical">
                <ArrowDown />
              </ToggleGroupItem>
              <ToggleGroupItem value="horizontal" title="Horizontal">
                <ArrowRight />
              </ToggleGroupItem>
            </ToggleGroup>
            <NumberInput
              className="flex-1"
              label={l.direction === "horizontal" ? <MoveHorizontal /> : <MoveVertical />}
              title="Gap"
              value={l.justify === "space-between" ? "mixed" : l.gap}
              min={0}
              onChange={(v, p) =>
                set((x) => {
                  x.gap = v
                  if (x.justify === "space-between") x.justify = "start"
                }, p)
              }
            />
          </div>
          <div className="grid grid-cols-[auto_1fr] gap-2">
            <AlignmentGrid
              layout={l}
              onChange={(align, justify) =>
                set((x) => {
                  x.align = align
                  x.justify = justify
                })
              }
            />
            <div className="flex flex-col gap-2">
              <NumberInput
                label={<span className="text-[10px]">↔</span>}
                title="Horizontal padding"
                value={l.paddingLeft === l.paddingRight ? l.paddingLeft : "mixed"}
                min={0}
                onChange={(v, p) =>
                  set((x) => {
                    x.paddingLeft = v
                    x.paddingRight = v
                  }, p)
                }
              />
              <NumberInput
                label={<span className="text-[10px]">↕</span>}
                title="Vertical padding"
                value={l.paddingTop === l.paddingBottom ? l.paddingTop : "mixed"}
                min={0}
                onChange={(v, p) =>
                  set((x) => {
                    x.paddingTop = v
                    x.paddingBottom = v
                  }, p)
                }
              />
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <label className="flex items-center gap-2">
              <Switch checked={l.hugWidth} onCheckedChange={(v) => set((x) => (x.hugWidth = v))} /> Hug width
            </label>
            <label className="flex items-center gap-2">
              <Switch checked={l.hugHeight} onCheckedChange={(v) => set((x) => (x.hugHeight = v))} /> Hug height
            </label>
          </div>
          <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Switch
              checked={l.justify === "space-between"}
              onCheckedChange={(v) => set((x) => (x.justify = v ? "space-between" : "start"))}
            />
            Space between
          </label>
        </div>
      )}
    </Section>
  )
}

function AlignmentGrid({
  layout,
  onChange,
}: {
  layout: NonNullable<SceneNode["layout"]>
  onChange: (align: "start" | "center" | "end", justify: "start" | "center" | "end" | "space-between") => void
}) {
  const opts = ["start", "center", "end"] as const
  const horizontal = layout.direction === "horizontal"
  return (
    <div className="grid size-[64px] grid-cols-3 grid-rows-3 place-items-center rounded-md bg-white/[0.04] p-1">
      {opts.map((row) =>
        opts.map((col) => {
          const align = horizontal ? row : col
          const justify = horizontal ? col : row
          const active = layout.align === align && (layout.justify === justify || layout.justify === "space-between")
          return (
            <button
              key={`${row}-${col}`}
              type="button"
              onClick={() => onChange(align, layout.justify === "space-between" ? "space-between" : justify)}
              className="flex size-4 items-center justify-center rounded-sm hover:bg-white/10"
            >
              <span className={cn("rounded-full", active ? "h-2.5 w-1 bg-neon" : "size-1 bg-white/30")} />
            </button>
          )
        }),
      )}
    </div>
  )
}

function ShapeSection({ nodes }: { nodes: SceneNode[] }) {
  const ids = nodes.map((n) => n.id)
  const stars = nodes.filter((n) => n.type === "star")
  return (
    <Section title={stars.length === nodes.length ? "Star" : "Polygon"}>
      <Row>
        <NumberInput
          label="#"
          title="Count"
          value={mixed(nodes, (n) => n.pointCount ?? 3)}
          min={3}
          max={60}
          precision={0}
          onChange={(v, p) => edit(ids, (n) => (n.pointCount = Math.round(v)), p)}
        />
        {stars.length === nodes.length && (
          <NumberInput
            label="%"
            title="Ratio"
            value={mixed(nodes, (n) => Math.round((n.innerRadius ?? 0.38) * 100))}
            min={1}
            max={100}
            precision={0}
            onChange={(v, p) => edit(ids, (n) => (n.innerRadius = v / 100), p)}
          />
        )}
      </Row>
    </Section>
  )
}

function AppearanceSection({ nodes }: { nodes: SceneNode[] }) {
  const ids = nodes.map((n) => n.id)
  const opacity = mixed(nodes, (n) => Math.round(n.opacity * 100))
  const blend = mixed(nodes, (n) => n.blendMode)
  const visible = nodes.every((n) => n.visible)
  return (
    <Section
      title="Appearance"
      actions={
        <IconButton
          tip={visible ? "Hide" : "Show"}
          shortcut="⇧⌘H"
          onClick={() => useEditor.getState().toggleVisible(ids)}
        >
          {visible ? <Eye /> : <EyeOff />}
        </IconButton>
      }
    >
      <Row>
        <NumberInput
          label={<Baseline />}
          title="Opacity"
          value={opacity}
          suffix="%"
          min={0}
          max={100}
          precision={0}
          onChange={(v, p) => edit(ids, (n) => (n.opacity = v / 100), p)}
        />
        <Select
          value={blend === "mixed" ? undefined : blend}
          onValueChange={(v) => edit(ids, (n) => (n.blendMode = v as BlendMode))}
        >
          <SelectTrigger size="xs" className="h-7 border-transparent bg-white/[0.04] text-[11px] capitalize">
            <SelectValue placeholder="Mixed" />
          </SelectTrigger>
          <SelectContent>
            {BLENDS.map((b) => (
              <SelectItem key={b} value={b} className="capitalize">
                {b.replace("-", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Row>
    </Section>
  )
}

function TextSection({ nodes }: { nodes: SceneNode[] }) {
  const ids = nodes.map((n) => n.id)
  const family = mixed(nodes, (n) => n.fontFamily ?? "Inter")
  const weight = mixed(nodes, (n) => n.fontWeight ?? 400)
  const size = mixed(nodes, (n) => n.fontSize ?? 16)
  const lh = mixed(nodes, (n) => n.lineHeight ?? 120)
  const ls = mixed(nodes, (n) => n.letterSpacing ?? 0)
  const align = mixed(nodes, (n) => n.textAlign ?? "left")
  const deco = mixed(nodes, (n) => n.textDecoration ?? "none")
  const tcase = mixed(nodes, (n) => n.textCase ?? "none")
  const resize = mixed(nodes, (n) => n.textAutoResize ?? "width")
  const italic = nodes.every((n) => n.italic)
  return (
    <Section title="Typography">
      <div className="flex flex-col gap-2">
        <Select
          value={family === "mixed" ? undefined : family}
          onValueChange={(v) => edit(ids, (n) => (n.fontFamily = v))}
        >
          <SelectTrigger size="xs" className="h-7 border-transparent bg-white/[0.04] text-[11px]">
            <SelectValue placeholder="Mixed" />
          </SelectTrigger>
          <SelectContent>
            {FONTS.map((f) => (
              <SelectItem key={f} value={f}>
                <span style={{ fontFamily: f }}>{f}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Row>
          <Select
            value={weight === "mixed" ? undefined : String(weight)}
            onValueChange={(v) => edit(ids, (n) => (n.fontWeight = +v))}
          >
            <SelectTrigger size="xs" className="h-7 border-transparent bg-white/[0.04] text-[11px]">
              <SelectValue placeholder="Mixed" />
            </SelectTrigger>
            <SelectContent>
              {WEIGHTS.map(([w, name]) => (
                <SelectItem key={w} value={String(w)}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <NumberInput
            label={<CaseSensitive />}
            title="Font size"
            value={size}
            min={1}
            onChange={(v, p) => edit(ids, (n) => (n.fontSize = v), p)}
          />
        </Row>
        <Row>
          <NumberInput
            label={<WrapText />}
            title="Line height"
            value={lh}
            suffix="%"
            min={0}
            precision={0}
            onChange={(v, p) => edit(ids, (n) => (n.lineHeight = v), p)}
          />
          <NumberInput
            label={<span className="text-[10px]">|A|</span>}
            title="Letter spacing"
            value={ls}
            suffix="%"
            onChange={(v, p) => edit(ids, (n) => (n.letterSpacing = v), p)}
          />
        </Row>
        <div className="flex items-center justify-between">
          <ToggleGroup
            type="single"
            value={align === "mixed" ? "" : align}
            onValueChange={(v) => v && edit(ids, (n) => (n.textAlign = v as SceneNode["textAlign"]))}
          >
            <ToggleGroupItem value="left" title="Align left">
              <TextAlignStart />
            </ToggleGroupItem>
            <ToggleGroupItem value="center" title="Align center">
              <TextAlignCenter />
            </ToggleGroupItem>
            <ToggleGroupItem value="right" title="Align right">
              <TextAlignEnd />
            </ToggleGroupItem>
          </ToggleGroup>
          <ToggleGroup
            type="single"
            value={resize === "mixed" ? "" : resize}
            onValueChange={(v) => v && edit(ids, (n) => (n.textAutoResize = v as SceneNode["textAutoResize"]))}
          >
            <ToggleGroupItem value="width" title="Auto width">
              <MoveHorizontal />
            </ToggleGroupItem>
            <ToggleGroupItem value="height" title="Auto height">
              <MoveVertical />
            </ToggleGroupItem>
            <ToggleGroupItem value="fixed" title="Fixed size">
              <Square />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="flex items-center justify-between">
          <ToggleGroup
            type="multiple"
            value={[...(italic ? ["italic"] : []), ...(deco !== "mixed" && deco !== "none" ? [deco] : [])]}
          >
            <ToggleGroupItem value="italic" title="Italic" onClick={() => edit(ids, (n) => (n.italic = !italic))}>
              <Italic />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="underline"
              title="Underline"
              onClick={() => edit(ids, (n) => (n.textDecoration = deco === "underline" ? "none" : "underline"))}
            >
              <Underline />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="line-through"
              title="Strikethrough"
              onClick={() => edit(ids, (n) => (n.textDecoration = deco === "line-through" ? "none" : "line-through"))}
            >
              <Strikethrough />
            </ToggleGroupItem>
          </ToggleGroup>
          <ToggleGroup
            type="single"
            value={tcase === "mixed" ? "" : tcase}
            onValueChange={(v) => edit(ids, (n) => (n.textCase = (v || "none") as SceneNode["textCase"]))}
          >
            <ToggleGroupItem value="upper" title="Uppercase">
              <CaseUpper />
            </ToggleGroupItem>
            <ToggleGroupItem value="lower" title="Lowercase">
              <CaseLower />
            </ToggleGroupItem>
            <ToggleGroupItem value="title" title="Title case">
              <span className="text-[10px] font-semibold">Aa</span>
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
    </Section>
  )
}

function PaintsSection({ nodes, kind }: { nodes: SceneNode[]; kind: "fills" | "strokes" }) {
  const ids = nodes.map((n) => n.id)
  const first = nodes[0]
  const same = nodes.every(
    (n) =>
      JSON.stringify(n[kind].map((p) => ({ ...p, id: 0 }))) ===
      JSON.stringify(first[kind].map((p) => ({ ...p, id: 0 }))),
  )
  const paints = same ? first[kind] : null
  const open = nodes.filter((n) => n.type === "line" || (n.type === "path" && !n.closed))
  const add = () =>
    edit(ids, (n) => {
      const color = kind === "fills" ? (n.type === "frame" ? "#FFFFFF" : "#D9D9D9") : "#000000"
      n[kind] = [...n[kind], solid(color)]
    })
  return (
    <Section
      title={kind === "fills" ? "Fill" : "Stroke"}
      actions={
        <IconButton tip={`Add ${kind === "fills" ? "fill" : "stroke"}`} onClick={add}>
          <Plus />
        </IconButton>
      }
    >
      {!paints ? (
        <button
          type="button"
          onClick={() => edit(ids, (n) => (n[kind] = structuredClone(first[kind])))}
          className="text-[11px] text-muted-foreground hover:text-foreground"
        >
          Mixed — click to replace all
        </button>
      ) : (
        <div className="flex flex-col gap-1.5">
          {[...paints].reverse().map((paint) => {
            const index = paints.indexOf(paint)
            return (
              <PaintRow
                key={paint.id}
                paint={paint}
                allowGradient={kind === "fills"}
                onChange={(fn, phase) => edit(ids, (n) => n[kind][index] && fn(n[kind][index]), phase)}
                onRemove={() => edit(ids, (n) => (n[kind] = n[kind].filter((_, i) => i !== index)))}
              />
            )
          })}
        </div>
      )}
      {kind === "strokes" && paints && paints.length > 0 && (
        <div className="mt-2 flex flex-col gap-2">
          <Row>
            <NumberInput
              label={<Minus />}
              title="Stroke weight"
              value={mixed(nodes, (n) => n.strokeWidth)}
              min={0}
              onChange={(v, p) => edit(ids, (n) => (n.strokeWidth = v), p)}
            />
            <Select
              value={mixed(nodes, (n) => n.strokeAlign) as string}
              onValueChange={(v) => edit(ids, (n) => (n.strokeAlign = v as SceneNode["strokeAlign"]))}
            >
              <SelectTrigger size="xs" className="h-7 border-transparent bg-white/[0.04] text-[11px] capitalize">
                <SelectValue placeholder="Mixed" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inside">Inside</SelectItem>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="outside">Outside</SelectItem>
              </SelectContent>
            </Select>
          </Row>
          <Row>
            <NumberInput
              label={<span className="text-[10px]">- -</span>}
              title="Dash"
              value={mixed(nodes, (n) => n.strokeDash)}
              min={0}
              onChange={(v, p) => edit(ids, (n) => (n.strokeDash = v), p)}
            />
            <span />
          </Row>
          {open.length === nodes.length && (
            <Row>
              <CapSelect
                label="Start"
                value={mixed(nodes, (n) => n.startCap)}
                onChange={(v) => edit(ids, (n) => (n.startCap = v))}
              />
              <CapSelect
                label="End"
                value={mixed(nodes, (n) => n.endCap)}
                onChange={(v) => edit(ids, (n) => (n.endCap = v))}
              />
            </Row>
          )}
        </div>
      )}
    </Section>
  )
}

function CapSelect({
  label,
  value,
  onChange,
}: {
  label: string
  value: StrokeCap | "mixed"
  onChange: (v: StrokeCap) => void
}) {
  return (
    <Select value={value === "mixed" ? undefined : value} onValueChange={(v) => onChange(v as StrokeCap)}>
      <SelectTrigger size="xs" className="h-7 border-transparent bg-white/[0.04] text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <SelectValue placeholder="Mixed" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">None</SelectItem>
        <SelectItem value="arrow">Arrow</SelectItem>
        <SelectItem value="triangle">Triangle</SelectItem>
        <SelectItem value="circle">Circle</SelectItem>
      </SelectContent>
    </Select>
  )
}

function EffectsSection({ nodes }: { nodes: SceneNode[] }) {
  const ids = nodes.map((n) => n.id)
  const first = nodes[0]
  const same = nodes.every((n) => n.effects.length === first.effects.length)
  const effects = same ? first.effects : []
  const update = (i: number, fn: (e: Effect) => void, phase: "preview" | "commit" = "commit") =>
    edit(ids, (n) => n.effects[i] && fn(n.effects[i]), phase)
  return (
    <Section
      title="Effects"
      actions={
        <IconButton
          tip="Add effect"
          onClick={() => edit(ids, (n) => (n.effects = [...n.effects, effect("drop-shadow")]))}
        >
          <Plus />
        </IconButton>
      }
    >
      <div className="flex flex-col gap-1.5">
        {effects.map((e, i) => (
          <div key={e.id} className={cn("flex items-center gap-1", !e.visible && "opacity-50")}>
            <Popover>
              <PopoverTrigger asChild>
                <IconButton tip="Effect settings">
                  <Settings2 />
                </IconButton>
              </PopoverTrigger>
              <PopoverContent side="left" align="start" className="w-64 p-3">
                <div className="mb-3 text-xs font-semibold capitalize">{e.type.replace("-", " ")}</div>
                <div className="grid grid-cols-2 gap-2">
                  {e.type !== "layer-blur" && (
                    <>
                      <NumberInput label="X" value={e.x} onChange={(v, p) => update(i, (x) => (x.x = v), p)} />
                      <NumberInput label="Y" value={e.y} onChange={(v, p) => update(i, (x) => (x.y = v), p)} />
                    </>
                  )}
                  <NumberInput
                    label="B"
                    title="Blur"
                    value={e.blur}
                    min={0}
                    onChange={(v, p) => update(i, (x) => (x.blur = v), p)}
                  />
                  {e.type !== "layer-blur" && (
                    <NumberInput
                      label="S"
                      title="Spread"
                      value={e.spread}
                      onChange={(v, p) => update(i, (x) => (x.spread = v), p)}
                    />
                  )}
                </div>
                {e.type !== "layer-blur" && (
                  <div className="mt-3">
                    <ColorPicker
                      color={e.color}
                      opacity={e.opacity}
                      onChange={(color, opacity, phase) =>
                        update(
                          i,
                          (x) => {
                            x.color = color
                            x.opacity = opacity
                          },
                          phase,
                        )
                      }
                    />
                  </div>
                )}
              </PopoverContent>
            </Popover>
            <Select value={e.type} onValueChange={(v) => update(i, (x) => (x.type = v as Effect["type"]))}>
              <SelectTrigger size="xs" className="h-7 flex-1 border-transparent bg-white/[0.04] text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="drop-shadow">Drop shadow</SelectItem>
                <SelectItem value="inner-shadow">Inner shadow</SelectItem>
                <SelectItem value="layer-blur">Layer blur</SelectItem>
              </SelectContent>
            </Select>
            {e.type !== "layer-blur" && <Swatch className="mx-1" paint={{ ...solid(e.color, e.opacity), id: e.id }} />}
            <IconButton tip={e.visible ? "Hide" : "Show"} onClick={() => update(i, (x) => (x.visible = !x.visible))}>
              {e.visible ? <Eye /> : <EyeOff />}
            </IconButton>
            <IconButton
              tip="Remove"
              onClick={() => edit(ids, (n) => (n.effects = n.effects.filter((_, j) => j !== i)))}
            >
              <Minus />
            </IconButton>
          </div>
        ))}
      </div>
    </Section>
  )
}

function ImageSection({ nodes }: { nodes: SceneNode[] }) {
  const ids = nodes.map((n) => n.id)
  const fit = mixed(nodes, (n) => n.imageFit ?? "fill")
  return (
    <Section title="Image">
      <Row>
        <Select
          value={fit === "mixed" ? undefined : fit}
          onValueChange={(v) => edit(ids, (n) => (n.imageFit = v as SceneNode["imageFit"]))}
        >
          <SelectTrigger size="xs" className="h-7 border-transparent bg-white/[0.04] text-[11px]">
            <SelectValue placeholder="Mixed" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fill">Fill</SelectItem>
            <SelectItem value="fit">Fit</SelectItem>
            <SelectItem value="stretch">Stretch</SelectItem>
          </SelectContent>
        </Select>
        <button
          type="button"
          onClick={() => pickReplacementImage(ids)}
          className="h-7 rounded-md bg-white/[0.04] text-[11px] hover:bg-white/[0.08]"
        >
          Replace…
        </button>
      </Row>
    </Section>
  )
}

function ExportSection({ ids, name }: { ids: string[]; name: string }) {
  const [format, setFormat] = useState<ExportFormat>("png")
  const [scale, setScale] = useState("2")
  const [busy, setBusy] = useState(false)
  return (
    <Section title="Export">
      <div className="flex flex-col gap-2">
        <Row>
          <Select value={scale} onValueChange={setScale} disabled={format === "svg"}>
            <SelectTrigger size="xs" className="h-7 border-transparent bg-white/[0.04] text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["0.5", "1", "2", "3", "4"].map((s) => (
                <SelectItem key={s} value={s}>
                  {s}x
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
            <SelectTrigger size="xs" className="h-7 border-transparent bg-white/[0.04] text-[11px] uppercase">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="png">PNG</SelectItem>
              <SelectItem value="jpg">JPG</SelectItem>
              <SelectItem value="svg">SVG</SelectItem>
            </SelectContent>
          </Select>
        </Row>
        <button
          type="button"
          disabled={busy || !ids.length}
          onClick={async () => {
            setBusy(true)
            try {
              await exportNodes(useEditor.getState().doc, ids, format, +scale, name)
            } finally {
              setBusy(false)
            }
          }}
          className="flex h-8 items-center justify-center gap-2 rounded-md border border-white/10 text-[11px] font-medium hover:bg-white/[0.06] disabled:opacity-40"
        >
          <Download className="size-3.5" />
          {busy ? "Exporting…" : `Export ${name}`}
        </button>
      </div>
    </Section>
  )
}

function PageSection() {
  const page = useEditor((s) => s.doc.pages.find((p) => p.id === s.pageId))
  if (!page) return null
  const setBg = (color: string, phase: "preview" | "commit") => {
    const s = useEditor.getState()
    const recipe = (d: typeof s.doc) => {
      const p = d.pages.find((x) => x.id === page.id)
      if (p) p.background = color
    }
    if (phase === "preview") {
      if (!s.txBase) s.begin()
      s.preview(recipe)
    } else if (s.txBase) {
      s.preview(recipe)
      s.end()
    } else s.commit(recipe)
  }
  return (
    <Section title="Page">
      <div className="flex h-7 items-center gap-2 rounded-md bg-white/[0.04] pl-1.5">
        <Popover>
          <PopoverTrigger asChild>
            <button type="button">
              <Swatch paint={solid(page.background)} />
            </button>
          </PopoverTrigger>
          <PopoverContent side="left" align="start" className="w-auto p-3">
            <ColorPicker color={page.background} opacity={1} onChange={(c, _o, phase) => setBg(c, phase)} />
          </PopoverContent>
        </Popover>
        <span className="text-[11px] uppercase">{page.background.replace("#", "")}</span>
      </div>
    </Section>
  )
}

export function DesignPanel() {
  const selection = useEditor((s) => s.selection)
  const doc = useEditor((s) => s.doc)
  const pageId = useEditor((s) => s.pageId)
  const ids = topLevel(doc, selection)
  const nodes = ids.map((id) => doc.nodes[id]).filter(Boolean)

  if (!nodes.length) {
    const page = doc.pages.find((p) => p.id === pageId)
    return (
      <>
        <PageSection />
        <ExportSection ids={page?.children ?? []} name={page?.name ?? "Page"} />
      </>
    )
  }

  const texts = nodes.filter((n) => n.type === "text")
  const shapes = nodes.filter((n) => n.type === "polygon" || n.type === "star")
  const images = nodes.filter((n) => n.type === "image")
  const nonGroups = nodes.filter((n) => n.type !== "group")
  const single = nodes.length === 1 ? nodes[0] : null

  return (
    <>
      <AlignBar ids={ids} count={ids.length} />
      <TypeHeader nodes={nodes} />
      <LayoutSection nodes={nodes} />
      {single?.type === "frame" && <AutoLayoutSection frame={single} />}
      {shapes.length === nodes.length && <ShapeSection nodes={shapes} />}
      <AppearanceSection nodes={nodes} />
      {texts.length === nodes.length && <TextSection nodes={texts} />}
      {images.length === nodes.length && <ImageSection nodes={images} />}
      {nonGroups.length === nodes.length && (
        <>
          {nodes.every((n) => n.type !== "line") && <PaintsSection nodes={nodes} kind="fills" />}
          <PaintsSection nodes={nodes} kind="strokes" />
        </>
      )}
      <EffectsSection nodes={nodes} />
      <ExportSection ids={ids} name={single ? single.name : `${nodes.length} layers`} />
    </>
  )
}
