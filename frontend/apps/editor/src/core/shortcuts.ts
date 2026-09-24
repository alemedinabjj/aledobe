import { useEffect } from "react"
import { useEditor } from "./store"
import { exportSelection } from "./export"
import { pickImages, importImageFiles } from "./images"
import { createNode, nextName } from "./doc"
import type { Tool } from "./types"

const isTyping = () => {
  const el = document.activeElement as HTMLElement | null
  return (
    !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)
  )
}

const CLIP_PREFIX = "aledobe/nodes:"

export function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping()) return
      const s = useEditor.getState()
      if (s.editingTextId) return
      const mod = e.metaKey || e.ctrlKey
      const key = e.key.toLowerCase()
      const code = e.code
      const run = (fn: () => void) => {
        e.preventDefault()
        fn()
      }

      if (mod && key === "z") return run(() => (e.shiftKey ? s.redo() : s.undo()))
      if (mod && key === "y") return run(() => s.redo())
      if (mod && key === "d") return run(() => s.duplicateSelection())
      if (mod && key === "a") return run(() => s.selectAll())
      if (mod && e.altKey && code === "KeyG") return run(() => s.frameSelection())
      if (mod && key === "g") return run(() => (e.shiftKey ? s.ungroupSelection() : s.groupSelection()))
      if (mod && e.shiftKey && key === "h") return run(() => s.toggleVisible())
      if (mod && e.shiftKey && key === "l") return run(() => s.toggleLocked())
      if (mod && e.shiftKey && key === "k") return run(() => pickImages())
      if (mod && e.shiftKey && key === "e") return run(() => exportSelection("png", 2))
      if (mod && code === "BracketRight") return run(() => s.reorder(e.altKey ? "front" : "forward"))
      if (mod && code === "BracketLeft") return run(() => s.reorder(e.altKey ? "back" : "backward"))
      if (mod && key === "\\") return run(() => s.set({ panelsHidden: !s.panelsHidden }))
      if (mod && (key === "=" || key === "+")) return run(() => s.zoomBy(1.5))
      if (mod && key === "-") return run(() => s.zoomBy(1 / 1.5))
      if (mod && key === "0") return run(() => s.zoomTo(1))
      if (mod) return

      if (e.altKey) {
        const map: Record<string, Parameters<typeof s.align>[0]> = {
          KeyA: "left",
          KeyD: "right",
          KeyW: "top",
          KeyS: "bottom",
          KeyH: "hcenter",
          KeyV: "vcenter",
        }
        if (map[code]) return run(() => s.align(map[code]))
      }

      if (key === "delete" || key === "backspace") return run(() => s.deleteSelection())
      if (key === "escape") {
        return run(() => {
          if (s.tool !== "move") s.setTool("move")
          else if (s.selection.length) {
            const parent = s.doc.nodes[s.doc.nodes[s.selection[0]]?.parentId]
            s.select(parent ? [parent.id] : [])
          }
        })
      }
      if (key === "enter") {
        return run(() => {
          const n = s.selection.length === 1 ? s.doc.nodes[s.selection[0]] : null
          if (!n) return
          if (e.shiftKey) {
            const parent = s.doc.nodes[n.parentId]
            if (parent) s.select([parent.id])
          } else if (n.type === "text") s.set({ editingTextId: n.id })
          else if (n.children?.length) s.select(n.children)
        })
      }
      if (key.startsWith("arrow")) {
        const step = e.shiftKey ? 10 : 1
        const dx = key === "arrowleft" ? -step : key === "arrowright" ? step : 0
        const dy = key === "arrowup" ? -step : key === "arrowdown" ? step : 0
        return run(() => s.nudge(dx, dy))
      }
      if (e.shiftKey) {
        if (code === "Digit0") return run(() => s.zoomTo(1))
        if (code === "Digit1") return run(() => s.zoomToFit())
        if (code === "Digit2") return run(() => s.zoomToFit(s.selection.length ? s.selection : undefined))
        if (key === "?" || code === "Slash") return run(() => s.set({ showShortcuts: true }))
        if (code === "KeyA") return run(() => s.addAutoLayout())
        if (code === "KeyH") return run(() => s.flip("x"))
        if (code === "KeyV") return run(() => s.flip("y"))
        if (code === "KeyL") return run(() => s.setTool("arrow"))
        if (code === "KeyP") return run(() => s.setTool("pencil"))
        if (code === "Quote") return run(() => s.set({ showPixelGrid: !s.showPixelGrid }))
        return
      }
      if (key === "+" || key === "=") return run(() => s.zoomBy(1.5))
      if (key === "-") return run(() => s.zoomBy(1 / 1.5))
      const tools: Record<string, Tool> = {
        v: "move",
        h: "hand",
        f: "frame",
        a: "frame",
        r: "rect",
        o: "ellipse",
        l: "line",
        p: "pen",
        t: "text",
      }
      if (tools[key]) return run(() => s.setTool(tools[key]))
      if (/^[0-9]$/.test(key) && s.selection.length) {
        const value = key === "0" ? 1 : +key / 10
        return run(() => s.updateNodes(s.selection, (n) => (n.opacity = value)))
      }
    }

    const onCopy = (e: ClipboardEvent) => {
      if (isTyping()) return
      const s = useEditor.getState()
      if (!s.selection.length) return
      s.copy()
      const clip = useEditor.getState().clipboard
      if (clip) {
        e.clipboardData?.setData("text/plain", CLIP_PREFIX + JSON.stringify(clip))
        e.preventDefault()
      }
    }
    const onCut = (e: ClipboardEvent) => {
      if (isTyping()) return
      onCopy(e)
      useEditor.getState().deleteSelection()
    }
    const onPaste = (e: ClipboardEvent) => {
      if (isTyping()) return
      const s = useEditor.getState()
      const files = [...(e.clipboardData?.files ?? [])].filter((f) => f.type.startsWith("image/"))
      if (files.length) {
        e.preventDefault()
        importImageFiles(files)
        return
      }
      const text = e.clipboardData?.getData("text/plain") ?? ""
      if (text.startsWith(CLIP_PREFIX)) {
        e.preventDefault()
        try {
          s.set({ clipboard: JSON.parse(text.slice(CLIP_PREFIX.length)) })
          useEditor.getState().paste()
        } catch {
          return
        }
        return
      }
      if (text.trim()) {
        e.preventDefault()
        const c = {
          x: (s.viewport.width / 2 - s.camera.x) / s.camera.zoom,
          y: (s.viewport.height / 2 - s.camera.y) / s.camera.zoom,
        }
        s.addNode(
          createNode("text", {
            name: nextName(s.doc, "text"),
            text: text.slice(0, 5000),
            x: Math.round(c.x),
            y: Math.round(c.y),
          }),
        )
        return
      }
      if (s.clipboard) {
        e.preventDefault()
        s.paste()
      }
    }

    window.addEventListener("keydown", onKey)
    window.addEventListener("copy", onCopy)
    window.addEventListener("cut", onCut)
    window.addEventListener("paste", onPaste)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("copy", onCopy)
      window.removeEventListener("cut", onCut)
      window.removeEventListener("paste", onPaste)
    }
  }, [])
}

export const SHORTCUTS: { group: string; items: [string, string][] }[] = [
  {
    group: "Tools",
    items: [
      ["Move", "V"],
      ["Hand", "H / Space"],
      ["Frame", "F"],
      ["Rectangle", "R"],
      ["Ellipse", "O"],
      ["Line", "L"],
      ["Arrow", "⇧ L"],
      ["Pen", "P"],
      ["Pencil", "⇧ P"],
      ["Text", "T"],
      ["Place image", "⇧ ⌘ K"],
    ],
  },
  {
    group: "Edit",
    items: [
      ["Undo / Redo", "⌘ Z / ⇧ ⌘ Z"],
      ["Copy / Paste", "⌘ C / ⌘ V"],
      ["Duplicate", "⌘ D"],
      ["Duplicate while dragging", "⌥ drag"],
      ["Delete", "⌫"],
      ["Select all", "⌘ A"],
      ["Deep select", "⌘ click"],
      ["Select parent / children", "⇧ ↵ / ↵"],
      ["Nudge", "↑ ↓ ← →  (⇧ = 10px)"],
      ["Opacity", "1 … 0"],
    ],
  },
  {
    group: "Object",
    items: [
      ["Group / Ungroup", "⌘ G / ⇧ ⌘ G"],
      ["Frame selection", "⌥ ⌘ G"],
      ["Auto layout", "⇧ A"],
      ["Bring forward / to front", "⌘ ] / ⌥ ⌘ ]"],
      ["Send backward / to back", "⌘ [ / ⌥ ⌘ ["],
      ["Flip horizontal / vertical", "⇧ H / ⇧ V"],
      ["Hide / Lock", "⇧ ⌘ H / ⇧ ⌘ L"],
      ["Align left · center · right", "⌥ A · ⌥ H · ⌥ D"],
      ["Align top · middle · bottom", "⌥ W · ⌥ V · ⌥ S"],
      ["Measure distances", "hold ⌥"],
    ],
  },
  {
    group: "View",
    items: [
      ["Zoom in / out", "+ / −"],
      ["Zoom to 100%", "⇧ 0"],
      ["Zoom to fit", "⇧ 1"],
      ["Zoom to selection", "⇧ 2"],
      ["Pixel grid", "⇧ '"],
      ["Minimize UI", "⌘ \\"],
      ["Export PNG @2x", "⇧ ⌘ E"],
    ],
  },
]
