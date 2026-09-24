import { useMemo, useRef, useState } from "react"
import {
  ChevronDown,
  ChevronRight,
  Circle,
  Copy,
  Eye,
  EyeOff,
  Frame,
  Group,
  Hash,
  Image as ImageIcon,
  Lock,
  LockOpen,
  Minus,
  MoreHorizontal,
  Pentagon,
  Plus,
  Spline,
  Square,
  Star,
  Trash2,
  Type,
  Rows3,
  Columns3,
} from "lucide-react"
import {
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  ScrollArea,
} from "@aledobe/ui"
import { useEditor } from "../core/store"
import { ancestors, childrenOf, isContainer } from "../core/doc"
import type { SceneNode } from "../core/types"
import { MainMenu } from "./MainMenu"
import { useHost } from "../host"

function NodeIcon({ n }: { n: SceneNode }) {
  const cls = "size-3.5 shrink-0"
  if (n.type === "frame") {
    if (n.layout) return n.layout.direction === "horizontal" ? <Columns3 className={cls} /> : <Rows3 className={cls} />
    return n.parentId && n.children ? <Hash className={cls} /> : <Frame className={cls} />
  }
  if (n.type === "group") return <Group className={cls} />
  if (n.type === "rect") return <Square className={cls} />
  if (n.type === "ellipse") return <Circle className={cls} />
  if (n.type === "polygon") return <Pentagon className={cls} />
  if (n.type === "star") return <Star className={cls} />
  if (n.type === "line") return <Minus className={cn(cls, "-rotate-45")} />
  if (n.type === "path") return <Spline className={cls} />
  if (n.type === "text") return <Type className={cls} />
  return <ImageIcon className={cls} />
}

function Rename({ value, onDone }: { value: string; onDone: (v: string | null) => void }) {
  const [text, setText] = useState(value)
  return (
    <input
      autoFocus
      value={text}
      onFocus={(e) => e.target.select()}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => onDone(text.trim() || null)}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === "Enter") onDone(text.trim() || null)
        if (e.key === "Escape") onDone(null)
      }}
      onClick={(e) => e.stopPropagation()}
      className="h-5 min-w-0 flex-1 rounded border border-primary bg-background px-1 text-[11px] outline-none"
    />
  )
}

type DropPos = "before" | "after" | "inside"

function LayerRow({
  id,
  depth,
  dragState,
  setDragState,
}: {
  id: string
  depth: number
  dragState: { over: string | null; pos: DropPos | null }
  setDragState: (s: { over: string | null; pos: DropPos | null }) => void
}) {
  const n = useEditor((s) => s.doc.nodes[id])
  const selected = useEditor((s) => s.selection.includes(id))
  const parentSelected = useEditor((s) => ancestors(s.doc, id).some((a) => s.selection.includes(a)))
  const hovered = useEditor((s) => s.hoverId === id)
  const [renaming, setRenaming] = useState(false)
  if (!n) return null
  const container = isContainer(n) && (n.children?.length ?? 0) > 0
  const s = useEditor.getState

  const onClick = (e: React.MouseEvent) => {
    const st = s()
    if (e.shiftKey && st.selection.length) {
      const flat = flatten(st.doc, st.pageId)
      const a = flat.indexOf(st.selection[st.selection.length - 1])
      const b = flat.indexOf(id)
      if (a !== -1 && b !== -1) {
        const range = flat.slice(Math.min(a, b), Math.max(a, b) + 1)
        st.select([...st.selection, ...range])
        return
      }
    }
    if (e.metaKey || e.ctrlKey) {
      st.select(selected ? st.selection.filter((x) => x !== id) : [...st.selection, id])
      return
    }
    st.select([id])
  }

  const indicator = dragState.over === id ? dragState.pos : null

  return (
    <>
      <div
        draggable={!renaming}
        onDragStart={(e) => {
          const st = s()
          const ids = st.selection.includes(id) ? st.selection : [id]
          if (!st.selection.includes(id)) st.select([id])
          e.dataTransfer.setData("application/x-aledobe-layers", JSON.stringify(ids))
          e.dataTransfer.effectAllowed = "move"
        }}
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes("application/x-aledobe-layers")) return
          e.preventDefault()
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
          const y = (e.clientY - r.top) / r.height
          const pos: DropPos = isContainer(n) && y > 0.25 && y < 0.75 ? "inside" : y < 0.5 ? "before" : "after"
          if (dragState.over !== id || dragState.pos !== pos) setDragState({ over: id, pos })
        }}
        onDragLeave={() => setDragState({ over: null, pos: null })}
        onDrop={(e) => {
          e.preventDefault()
          const raw = e.dataTransfer.getData("application/x-aledobe-layers")
          setDragState({ over: null, pos: null })
          if (!raw) return
          const ids: string[] = JSON.parse(raw)
          const st = s()
          if (ids.includes(id)) return
          if (indicator === "inside") {
            st.moveInto(ids, id, (n.children ?? []).length)
            return
          }
          const parent = n.parentId
          const list = childrenOf(st.doc, parent)
          const index = list.indexOf(id)
          st.moveInto(ids, parent, indicator === "before" ? index + 1 : index)
        }}
        onClick={onClick}
        onDoubleClick={() => setRenaming(true)}
        onMouseEnter={() => s().setHover(id)}
        onMouseLeave={() => s().setHover(null)}
        className={cn(
          "group relative flex h-7 cursor-default items-center gap-1.5 pr-1.5 text-[11px] select-none",
          !n.visible && "text-muted-foreground/50",
          selected
            ? "bg-primary/20 text-foreground"
            : parentSelected
              ? "bg-primary/[0.07]"
              : hovered
                ? "outline outline-1 -outline-offset-1 outline-primary/60"
                : "",
          indicator === "inside" && "outline outline-2 -outline-offset-2 outline-primary",
        )}
        style={{ paddingLeft: 8 + depth * 14 }}
      >
        {indicator === "before" && <div className="absolute inset-x-2 top-0 h-0.5 rounded bg-primary" />}
        {indicator === "after" && <div className="absolute inset-x-2 bottom-0 h-0.5 rounded bg-primary" />}
        <button
          type="button"
          className={cn("flex size-4 items-center justify-center text-muted-foreground", !container && "invisible")}
          onClick={(e) => {
            e.stopPropagation()
            s().updateNodes([id], (x) => (x.expanded = !x.expanded))
          }}
        >
          {n.expanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        </button>
        <span
          className={cn("text-muted-foreground", selected && "text-neon", n.type === "frame" && "text-foreground/80")}
        >
          <NodeIcon n={n} />
        </span>
        {renaming ? (
          <Rename
            value={n.name}
            onDone={(v) => {
              setRenaming(false)
              if (v) s().updateNodes([id], (x) => (x.name = v))
            }}
          />
        ) : (
          <span className={cn("min-w-0 flex-1 truncate", n.type === "frame" && depth === 0 && "font-medium")}>
            {n.name}
          </span>
        )}
        <span className={cn("flex items-center gap-0.5", !n.locked && n.visible && "invisible group-hover:visible")}>
          <button
            type="button"
            className={cn(
              "flex size-5 items-center justify-center rounded text-muted-foreground hover:text-foreground",
              !n.locked && "invisible group-hover:visible",
            )}
            onClick={(e) => {
              e.stopPropagation()
              s().toggleLocked([id])
            }}
          >
            {n.locked ? <Lock className="size-3" /> : <LockOpen className="size-3" />}
          </button>
          <button
            type="button"
            className="flex size-5 items-center justify-center rounded text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation()
              s().toggleVisible([id])
            }}
          >
            {n.visible ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
          </button>
        </span>
      </div>
      {container &&
        n.expanded &&
        [...(n.children ?? [])]
          .reverse()
          .map((c) => <LayerRow key={c} id={c} depth={depth + 1} dragState={dragState} setDragState={setDragState} />)}
    </>
  )
}

function flatten(doc: ReturnType<typeof useEditor.getState>["doc"], pageId: string) {
  const out: string[] = []
  const walk = (ids: string[]) => {
    for (const id of [...ids].reverse()) {
      out.push(id)
      const n = doc.nodes[id]
      if (n?.expanded && n.children) walk(n.children)
    }
  }
  walk(childrenOf(doc, pageId))
  return out
}

function Pages() {
  const pages = useEditor((s) => s.doc.pages)
  const pageId = useEditor((s) => s.pageId)
  const [open, setOpen] = useState(true)
  const [renaming, setRenaming] = useState<string | null>(null)
  const s = useEditor.getState
  return (
    <div className="border-b border-white/[0.06] py-1.5">
      <div className="flex h-7 items-center justify-between px-3">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1 text-[11px] font-semibold"
        >
          Pages
          {open ? (
            <ChevronDown className="size-3 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-3 text-muted-foreground" />
          )}
        </button>
        <button
          type="button"
          onClick={() => s().addPage()}
          className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
          title="Add page"
        >
          <Plus className="size-3.5" />
        </button>
      </div>
      {open && (
        <div className="max-h-40 overflow-y-auto">
          {pages.map((p) => (
            <div
              key={p.id}
              onClick={() => s().setPage(p.id)}
              onDoubleClick={() => setRenaming(p.id)}
              className={cn(
                "group mx-1.5 flex h-7 items-center gap-2 rounded-md px-2 text-[11px] hover:bg-white/[0.04]",
                p.id === pageId && "bg-white/[0.06] font-medium",
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  p.id === pageId ? "bg-neon shadow-[0_0_8px] shadow-neon" : "bg-transparent",
                )}
              />
              {renaming === p.id ? (
                <Rename
                  value={p.name}
                  onDone={(v) => {
                    setRenaming(null)
                    if (v) s().renamePage(p.id, v)
                  }}
                />
              ) : (
                <span className="flex-1 truncate">{p.name}</span>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => e.stopPropagation()}
                    className="invisible flex size-5 items-center justify-center rounded text-muted-foreground group-hover:visible hover:text-foreground"
                  >
                    <MoreHorizontal className="size-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onSelect={() => setRenaming(p.id)}>Rename</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => s().duplicatePage(p.id)}>
                    <Copy /> Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    disabled={pages.length < 2}
                    onSelect={() => s().deletePage(p.id)}
                  >
                    <Trash2 /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function LeftPanel() {
  const pageChildren = useEditor((s) => childrenOf(s.doc, s.pageId))
  const docName = useEditor((s) => s.doc.name)
  const host = useHost()
  const [dragState, setDragState] = useState<{ over: string | null; pos: DropPos | null }>({ over: null, pos: null })
  const [editingName, setEditingName] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const layers = useMemo(() => [...pageChildren].reverse(), [pageChildren])
  const pageId = useEditor((s) => s.pageId)

  return (
    <aside ref={rootRef} className="flex h-full w-60 shrink-0 flex-col border-r border-white/[0.06] bg-panel">
      <div className="flex h-12 items-center gap-1.5 border-b border-white/[0.06] px-2">
        <MainMenu />
        <div className="min-w-0 flex-1">
          {editingName ? (
            <Rename
              value={docName}
              onDone={(v) => {
                setEditingName(false)
                if (v) {
                  useEditor.getState().commit((d) => {
                    d.name = v
                  })
                  host.onRename?.(v)
                }
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingName(true)}
              className="block w-full truncate rounded px-1 py-0.5 text-left text-[12px] font-semibold hover:bg-white/[0.05]"
            >
              {docName}
            </button>
          )}
          <SaveIndicator />
        </div>
      </div>
      <Pages />
      <div className="flex h-9 items-center px-3 text-[11px] font-semibold">Layers</div>
      <ScrollArea
        className="min-h-0 flex-1"
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("application/x-aledobe-layers")) e.preventDefault()
        }}
        onDrop={(e) => {
          const raw = e.dataTransfer.getData("application/x-aledobe-layers")
          if (!raw || dragState.over) return
          useEditor.getState().moveInto(JSON.parse(raw), pageId, childrenOf(useEditor.getState().doc, pageId).length)
        }}
      >
        <div className="pb-6">
          {layers.map((id) => (
            <LayerRow key={id} id={id} depth={0} dragState={dragState} setDragState={setDragState} />
          ))}
          {!layers.length && (
            <p className="px-4 py-6 text-center text-[11px] leading-relaxed text-muted-foreground">
              Nothing here yet. Press <kbd className="rounded bg-white/10 px-1">F</kbd> to draw a frame or{" "}
              <kbd className="rounded bg-white/10 px-1">R</kbd> for a rectangle.
            </p>
          )}
        </div>
      </ScrollArea>
    </aside>
  )
}

function SaveIndicator() {
  const { saveStatus } = useHost()
  const map = {
    saved: ["bg-emerald-400", "Saved"],
    saving: ["bg-amber-400 animate-pulse", "Saving…"],
    unsaved: ["bg-amber-400", "Unsaved changes"],
    offline: ["bg-sky-400", "Saved locally"],
    error: ["bg-rose-500", "Couldn't save"],
  } as const
  const [dot, label] = map[saveStatus]
  return (
    <div className="flex items-center gap-1.5 px-1 text-[10px] text-muted-foreground">
      <span className={cn("size-1.5 rounded-full", dot)} />
      {label}
    </div>
  )
}
