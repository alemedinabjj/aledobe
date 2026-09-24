import { useState, type ReactNode } from "react"
import {
  ArrowUpRight,
  ChevronDown,
  Circle,
  Frame,
  Hand,
  Image as ImageIcon,
  Minus,
  MousePointer2,
  PenTool,
  Pencil,
  Pentagon,
  Square,
  Star,
  Type,
} from "lucide-react"
import {
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@aledobe/ui"
import { useEditor } from "../core/store"
import { pickImages } from "../core/images"
import type { Tool } from "../core/types"
import { mod, shift } from "../core/platform"

interface ToolDef {
  tool: Tool
  label: string
  icon: ReactNode
  shortcut: string
}

const MOVE: ToolDef[] = [
  { tool: "move", label: "Move", icon: <MousePointer2 />, shortcut: "V" },
  { tool: "hand", label: "Hand tool", icon: <Hand />, shortcut: "H" },
]
const FRAME: ToolDef[] = [{ tool: "frame", label: "Frame", icon: <Frame />, shortcut: "F" }]
const SHAPES: ToolDef[] = [
  { tool: "rect", label: "Rectangle", icon: <Square />, shortcut: "R" },
  { tool: "line", label: "Line", icon: <Minus className="-rotate-45" />, shortcut: "L" },
  { tool: "arrow", label: "Arrow", icon: <ArrowUpRight />, shortcut: `${shift}L` },
  { tool: "ellipse", label: "Ellipse", icon: <Circle />, shortcut: "O" },
  { tool: "polygon", label: "Polygon", icon: <Pentagon />, shortcut: "" },
  { tool: "star", label: "Star", icon: <Star />, shortcut: "" },
  { tool: "image", label: "Place image", icon: <ImageIcon />, shortcut: `${shift}${mod}K` },
]
const PEN: ToolDef[] = [
  { tool: "pen", label: "Pen", icon: <PenTool />, shortcut: "P" },
  { tool: "pencil", label: "Pencil", icon: <Pencil />, shortcut: `${shift}P` },
]
const TEXT: ToolDef[] = [{ tool: "text", label: "Text", icon: <Type />, shortcut: "T" }]

function activate(tool: Tool) {
  if (tool === "image") {
    pickImages()
    return
  }
  useEditor.getState().setTool(tool)
}

function ToolGroup({ tools }: { tools: ToolDef[] }) {
  const current = useEditor((s) => s.tool)
  const [last, setLast] = useState(tools[0].tool)
  const activeDef = tools.find((t) => t.tool === current)
  const shown = activeDef ?? tools.find((t) => t.tool === last) ?? tools[0]
  const active = !!activeDef

  return (
    <div className="flex items-center">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => activate(shown.tool)}
            className={cn(
              "flex size-9 items-center justify-center rounded-lg text-foreground/80 transition-colors hover:bg-white/[0.07] [&_svg]:size-[18px]",
              active && "bg-primary text-white shadow-[0_0_20px_-4px_rgb(168_85_247/0.9)] hover:bg-primary",
            )}
          >
            {shown.icon}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">
          {shown.label}
          {shown.shortcut && <span className="text-muted-foreground">{shown.shortcut}</span>}
        </TooltipContent>
      </Tooltip>
      {tools.length > 1 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-9 w-4 items-center justify-center rounded-md text-muted-foreground hover:bg-white/[0.07] hover:text-foreground"
            >
              <ChevronDown className="size-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-52">
            {tools.map((t) => (
              <DropdownMenuItem
                key={t.tool}
                onSelect={() => {
                  if (t.tool !== "image") setLast(t.tool)
                  activate(t.tool)
                }}
              >
                {t.icon}
                {t.label}
                <DropdownMenuShortcut>{t.shortcut}</DropdownMenuShortcut>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}

export function Toolbar() {
  return (
    <div className="pointer-events-auto absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-0.5 rounded-xl border border-white/[0.08] bg-[#15121f]/90 p-1 shadow-2xl shadow-black/60 backdrop-blur-xl">
      <ToolGroup tools={MOVE} />
      <ToolGroup tools={FRAME} />
      <ToolGroup tools={SHAPES} />
      <ToolGroup tools={PEN} />
      <ToolGroup tools={TEXT} />
    </div>
  )
}
