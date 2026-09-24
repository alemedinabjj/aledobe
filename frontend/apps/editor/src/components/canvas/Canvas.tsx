import { useCallback, useEffect, useRef, useState } from "react"
import Konva from "konva"
import { Layer, Stage } from "react-konva"
import { useEditor, resolveSelectable } from "../../core/store"
import { KonvaNode } from "./KonvaNode"
import { SelectionTransformer } from "./SelectionTransformer"
import {
  ancestors,
  childrenOf,
  cloneSubtree,
  contrastColor,
  createNode,
  descendants,
  insertNode,
  isLockedDeep,
  moveDeep,
  nextName,
  removeNode,
  reparent,
  solid,
  topLevel,
} from "../../core/doc"
import {
  lineEndpoints,
  lineFromPoints,
  nodeAABB,
  pointInRect,
  rectFromPoints,
  rectIntersects,
  selectionBounds,
  snapAngle,
  toWorld,
  DEG,
} from "../../core/geometry"
import { collectSnapTargets, measureBetween, snapRect, type SnapTargets } from "../../core/interactions"
import { normalizeVertices, simplify, smoothHandles } from "../../core/shapes"
import type { Doc, Point, Rect, SceneNode, ShapeTool } from "../../core/types"
import { Overlay, PixelGrid } from "./Overlay"
import { TextEditor } from "./TextEditor"
import { CanvasContextMenu } from "./CanvasContextMenu"
import { importImageFiles } from "../../core/images"

type Recipe = (draft: Doc) => void

type Drag =
  | { kind: "pan"; start: Point; cam: { x: number; y: number } }
  | { kind: "marquee"; start: Point; base: string[]; additive: boolean }
  | {
      kind: "move"
      start: Point
      screen: Point
      ids: string[]
      started: boolean
      duplicate: boolean
      clones: SceneNode[][] | null
      bounds: Rect
      targets: SnapTargets | null
    }
  | { kind: "line-end"; id: string; which: 0 | 1; other: Point }
  | {
      kind: "create"
      tool: ShapeTool | "text"
      start: Point
      id: string | null
      parent: string
      node: SceneNode | null
      last: Recipe | null
    }
  | { kind: "pencil"; points: Point[] }
  | { kind: "pen-handle"; index: number }

const isTyping = () => {
  const el = document.activeElement as HTMLElement | null
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)
}

function frameAt(doc: Doc, parentId: string, p: Point, exclude: Set<string>): string | null {
  const list = childrenOf(doc, parentId)
  for (let i = list.length - 1; i >= 0; i--) {
    const id = list[i]
    const n = doc.nodes[id]
    if (!n || !n.visible || n.locked || exclude.has(id)) continue
    if (n.type === "group") {
      const inner = frameAt(doc, id, p, exclude)
      if (inner) return inner
      continue
    }
    if (n.type !== "frame") continue
    if (pointInRect(p, nodeAABB(doc, id))) return frameAt(doc, id, p, exclude) ?? id
  }
  return null
}

export function Canvas() {
  const ref = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const drag = useRef<Drag | null>(null)
  const [space, setSpace] = useState(false)
  const [dragging, setDragging] = useState<Drag["kind"] | null>(null)

  const doc = useEditor((s) => s.doc)
  const pageId = useEditor((s) => s.pageId)
  const camera = useEditor((s) => s.camera)
  const tool = useEditor((s) => s.tool)
  const editingTextId = useEditor((s) => s.editingTextId)
  const viewport = useEditor((s) => s.viewport)
  const showPixelGrid = useEditor((s) => s.showPixelGrid)
  const page = doc.pages.find((p) => p.id === pageId) ?? doc.pages[0]

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let fitted = false
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect()
      useEditor.getState().setViewport(r.width, r.height)
      if (!fitted && r.width > 0) {
        fitted = true
        useEditor.getState().zoomToFit()
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const s = useEditor.getState()
      const r = el.getBoundingClientRect()
      const anchor = { x: e.clientX - r.left, y: e.clientY - r.top }
      if (e.ctrlKey || e.metaKey) {
        const factor = Math.exp(-e.deltaY * (e.ctrlKey && !e.metaKey && Math.abs(e.deltaY) < 50 ? 0.01 : 0.0025))
        s.zoomBy(factor, anchor)
      } else {
        const dx = e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX
        const dy = e.shiftKey && !e.deltaX ? 0 : e.deltaY
        s.setCamera({ x: s.camera.x - dx, y: s.camera.y - dy })
      }
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isTyping() && !useEditor.getState().editingTextId) {
        e.preventDefault()
        setSpace(true)
      }
      if (e.key === "Alt") updateMeasures(true)
    }
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpace(false)
      if (e.key === "Alt") useEditor.getState().set({ measures: [] })
    }
    const blur = () => {
      setSpace(false)
      useEditor.getState().set({ measures: [] })
    }
    window.addEventListener("keydown", down)
    window.addEventListener("keyup", up)
    window.addEventListener("blur", blur)
    return () => {
      window.removeEventListener("keydown", down)
      window.removeEventListener("keyup", up)
      window.removeEventListener("blur", blur)
    }
  }, [])

  const local = useCallback((e: { clientX: number; clientY: number }) => {
    const r = ref.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }, [])

  const world = useCallback(
    (e: { clientX: number; clientY: number }) => toWorld(local(e), useEditor.getState().camera),
    [local],
  )

  const hitAt = (e: {
    clientX: number
    clientY: number
  }): { id: string | null; handle: string | null; transformer: boolean } => {
    const stage = stageRef.current
    if (!stage) return { id: null, handle: null, transformer: false }
    const shape = stage.getIntersection(local(e))
    let node: Konva.Node | null = shape
    let id: string | null = null
    let handle: string | null = null
    while (node) {
      if (node instanceof Konva.Transformer) return { id: null, handle: null, transformer: true }
      if (!handle && node.getAttr("handle")) handle = node.getAttr("handle")
      if (!id && node.getAttr("nodeId")) id = node.getAttr("nodeId")
      node = node.getParent()
    }
    const s = useEditor.getState()
    if (id && (!s.doc.nodes[id] || isLockedDeep(s.doc, id))) id = null
    return { id, handle, transformer: false }
  }

  function updateMeasures(alt: boolean) {
    const s = useEditor.getState()
    if (!alt || !s.selection.length) {
      if (s.measures.length) s.set({ measures: [] })
      return
    }
    const sel = selectionBounds(s.doc, s.selection)
    if (!sel) return
    let other: Rect | null = null
    if (s.hoverId && !s.selection.includes(s.hoverId)) other = nodeAABB(s.doc, s.hoverId)
    else {
      const parent = s.doc.nodes[s.doc.nodes[s.selection[0]]?.parentId]
      if (parent) other = nodeAABB(s.doc, parent.id)
    }
    s.set({ measures: other ? measureBetween(sel, other) : [] })
  }

  const finishPen = useCallback((close = false) => {
    const s = useEditor.getState()
    const draft = s.penDraft
    if (!draft || draft.points.length < 2) {
      s.set({ penDraft: null })
      return
    }
    const norm = normalizeVertices(draft.points)
    const node = createNode("path", {
      name: nextName(s.doc, "path"),
      x: norm.x,
      y: norm.y,
      width: norm.width,
      height: norm.height,
      vertices: norm.vertices,
      closed: close,
      fills: close ? [{ ...createNode("rect").fills[0] }] : [],
    })
    s.set({ penDraft: null })
    s.addNode(node)
    if (!s.toolLocked) s.setTool("move")
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useEditor.getState()
      if (!s.penDraft) return
      if (e.key === "Enter" || e.key === "Escape") {
        e.preventDefault()
        e.stopPropagation()
        finishPen(false)
      }
    }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [finishPen])

  const onPointerDown = (e: React.PointerEvent) => {
    const s = useEditor.getState()
    if (s.editingTextId) {
      const active = document.activeElement as HTMLElement | null
      active?.blur()
    }
    const p = world(e)
    const screen = local(e)

    if (e.button === 1 || space || s.tool === "hand") {
      e.preventDefault()
      ref.current!.setPointerCapture(e.pointerId)
      drag.current = { kind: "pan", start: screen, cam: { x: s.camera.x, y: s.camera.y } }
      setDragging("pan")
      return
    }

    if (e.button === 2) {
      const hit = hitAt(e).id
      if (hit) {
        const resolved = resolveSelectable(s.doc, hit, s.selection, e.metaKey || e.ctrlKey)
        if (!s.selection.includes(resolved)) s.select([resolved])
      } else if (
        !s.selection.length ||
        !pointInRect(p, selectionBounds(s.doc, s.selection) ?? { x: 0, y: 0, width: 0, height: 0 })
      ) {
        s.select([])
      }
      return
    }
    if (e.button !== 0) return
    ref.current!.setPointerCapture(e.pointerId)

    const probe = hitAt(e)
    if (probe.transformer) {
      ref.current!.releasePointerCapture(e.pointerId)
      return
    }
    const handle = probe.handle
    if (s.tool === "pen") {
      const draft = s.penDraft ?? { points: [], cursor: null }
      const first = draft.points[0]
      if (first && draft.points.length > 2 && Math.hypot(first.x - p.x, first.y - p.y) * s.camera.zoom < 8) {
        finishPen(true)
        return
      }
      const pt = { x: Math.round(p.x), y: Math.round(p.y), hx: 0, hy: 0 }
      s.set({ penDraft: { points: [...draft.points, pt], cursor: p } })
      drag.current = { kind: "pen-handle", index: draft.points.length }
      setDragging("pen-handle")
      return
    }

    if (s.tool === "pencil") {
      drag.current = { kind: "pencil", points: [p] }
      s.set({ penDraft: { points: [{ ...p, hx: 0, hy: 0 }], cursor: null } })
      setDragging("pencil")
      return
    }

    if (s.tool !== "move" && s.tool !== "image") {
      const parent = frameAt(s.doc, s.pageId, p, new Set()) ?? s.pageId
      const start = { x: Math.round(p.x), y: Math.round(p.y) }
      drag.current = {
        kind: "create",
        tool: s.tool as ShapeTool | "text",
        start,
        id: null,
        parent,
        node: null,
        last: null,
      }
      setDragging("create")
      return
    }

    if (handle === "line-start" || handle === "line-end") {
      const single = s.selection.length === 1 ? s.doc.nodes[s.selection[0]] : null
      if (single?.type === "line") {
        s.begin()
        const [a, b] = lineEndpoints(single)
        drag.current = {
          kind: "line-end",
          id: single.id,
          which: handle === "line-start" ? 0 : 1,
          other: handle === "line-start" ? b : a,
        }
        setDragging("line-end")
        return
      }
    }

    const hit = hitAt(e).id
    const deep = e.metaKey || e.ctrlKey
    const selBounds = selectionBounds(s.doc, s.selection)
    let ids = s.selection
    if (hit) {
      const resolved = resolveSelectable(s.doc, hit, s.selection, deep)
      if (e.shiftKey) {
        ids = s.selection.includes(resolved) ? s.selection.filter((i) => i !== resolved) : [...s.selection, resolved]
        s.select(ids)
        if (!ids.includes(resolved)) return
      } else if (!s.selection.includes(resolved)) {
        const inSelBounds = s.selection.length > 1 && selBounds && pointInRect(p, selBounds)
        if (!inSelBounds) {
          ids = [resolved]
          s.select(ids)
        }
      }
    } else if (selBounds && s.selection.length > 1 && pointInRect(p, selBounds) && !e.shiftKey) {
      ids = s.selection
    } else {
      drag.current = { kind: "marquee", start: p, base: e.shiftKey ? s.selection : [], additive: e.shiftKey }
      if (!e.shiftKey) s.select([])
      setDragging("marquee")
      return
    }
    const top = topLevel(s.doc, ids).filter((id) => !isLockedDeep(s.doc, id))
    if (!top.length) return
    drag.current = {
      kind: "move",
      start: p,
      screen,
      ids: top,
      started: false,
      duplicate: e.altKey,
      clones: null,
      bounds: selectionBounds(s.doc, top)!,
      targets: null,
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const s = useEditor.getState()
    const p = world(e)
    const d = drag.current

    if (!d) {
      if (s.tool === "pen" && s.penDraft) s.set({ penDraft: { ...s.penDraft, cursor: p } })
      if (s.tool === "move" && !space) {
        const hit = hitAt(e).id
        s.setHover(hit ? resolveSelectable(s.doc, hit, s.selection, e.metaKey || e.ctrlKey) : null)
        updateMeasures(e.altKey)
      } else if (s.hoverId) s.setHover(null)
      return
    }

    if (d.kind === "pan") {
      const sc = local(e)
      s.setCamera({ x: d.cam.x + sc.x - d.start.x, y: d.cam.y + sc.y - d.start.y })
      return
    }

    if (d.kind === "marquee") {
      const rect = rectFromPoints(d.start, p)
      const hits = childrenOf(s.doc, s.pageId).flatMap((id) => {
        const n = s.doc.nodes[id]
        if (!n.visible || n.locked) return []
        const b = nodeAABB(s.doc, id)
        if (
          n.type === "frame" &&
          n.children?.length &&
          !(
            rect.x <= b.x &&
            rect.y <= b.y &&
            rect.x + rect.width >= b.x + b.width &&
            rect.y + rect.height >= b.y + b.height
          )
        ) {
          const inner = n.children.filter((c) => {
            const cn = s.doc.nodes[c]
            return cn.visible && !cn.locked && rectIntersects(rect, nodeAABB(s.doc, c))
          })
          if (inner.length) return inner
        }
        return rectIntersects(rect, b) ? [id] : []
      })
      s.set({ marquee: rect, selection: [...new Set([...d.base, ...hits])] })
      return
    }

    if (d.kind === "move") {
      const sc = local(e)
      if (!d.started) {
        if (Math.hypot(sc.x - d.screen.x, sc.y - d.screen.y) < 3) return
        d.started = true
        s.set({ hoverId: null })
        s.begin()
        if (d.duplicate) {
          d.clones = d.ids.map((id) => cloneSubtree(s.doc, id))
          d.ids = d.clones.map((c) => c[0].id)
          s.select(d.ids)
        }
        d.targets = s.snapping ? collectSnapTargets(useEditor.getState().doc, s.pageId, d.ids) : null
        setDragging("move")
      }
      let dx = p.x - d.start.x
      let dy = p.y - d.start.y
      if (e.shiftKey) {
        if (Math.abs(dx) > Math.abs(dy)) dy = 0
        else dx = 0
      }
      const moved = { ...d.bounds, x: d.bounds.x + dx, y: d.bounds.y + dy }
      let guides: ReturnType<typeof snapRect>["guides"] = []
      if (d.targets && !e.ctrlKey && !e.metaKey) {
        const snap = snapRect(moved, d.targets, 6 / s.camera.zoom)
        dx += snap.dx
        dy += snap.dy
        guides = snap.guides
      }
      dx = Math.round(d.bounds.x + dx) - d.bounds.x
      dy = Math.round(d.bounds.y + dy) - d.bounds.y
      const moving = new Set([
        ...d.ids,
        ...(d.clones ?? []).flat().map((n) => n.id),
        ...d.ids.flatMap((id) => (s.doc.nodes[id] ? descendants(s.doc, id) : [])),
      ])
      const clones = d.clones
      s.preview((draft) => {
        if (clones) {
          clones.forEach((group) => {
            const copies = structuredClone(group)
            const source = copies[0]
            copies.slice(1).forEach((n) => (draft.nodes[n.id] = n))
            const parent = source.parentId
            insertNode(draft, source, parent)
          })
        }
        const baseDoc = draft
        const single = d.ids.length === 1 ? baseDoc.nodes[d.ids[0]] : null
        const parent = single ? baseDoc.nodes[single.parentId] : null
        if (single && parent?.layout && pointInRect(p, nodeAABB(baseDoc, parent.id))) {
          const horizontal = parent.layout.direction === "horizontal"
          const siblings = (parent.children ?? []).filter((c) => c !== single.id)
          const pos = horizontal ? p.x : p.y
          let index = siblings.findIndex((c) => {
            const b = nodeAABB(baseDoc, c)
            return pos < (horizontal ? b.x + b.width / 2 : b.y + b.height / 2)
          })
          if (index === -1) index = siblings.length
          siblings.splice(index, 0, single.id)
          parent.children = siblings
          return
        }
        for (const id of d.ids) moveDeep(draft, id, dx, dy)
        const target = frameAt(draft, s.pageId, p, moving)
        for (const id of d.ids) {
          const n = draft.nodes[id]
          const current = draft.nodes[n.parentId]
          if (current?.type === "group") continue
          const dest = target ?? s.pageId
          if (dest !== n.parentId) reparent(draft, id, dest)
        }
      })
      s.set({ guides })
      return
    }

    if (d.kind === "line-end") {
      let target = p
      if (e.shiftKey) {
        const angle = snapAngle(Math.atan2(p.y - d.other.y, p.x - d.other.x) / DEG, 45) * DEG
        const len = Math.hypot(p.x - d.other.x, p.y - d.other.y)
        target = { x: d.other.x + Math.cos(angle) * len, y: d.other.y + Math.sin(angle) * len }
      }
      target = { x: Math.round(target.x), y: Math.round(target.y) }
      const geo = d.which === 0 ? lineFromPoints(target, d.other) : lineFromPoints(d.other, target)
      s.preview((draft) => Object.assign(draft.nodes[d.id], geo))
      return
    }

    if (d.kind === "create") {
      let cur = { x: Math.round(p.x), y: Math.round(p.y) }
      if (!d.id) {
        const sc = local(e)
        const st = { x: d.start.x * s.camera.zoom + s.camera.x, y: d.start.y * s.camera.zoom + s.camera.y }
        if (Math.hypot(sc.x - st.x, sc.y - st.y) < 3) return
        s.begin()
        const type = d.tool === "arrow" ? "line" : d.tool
        d.node = createNode(type, {
          name: nextName(s.doc, type),
          x: d.start.x,
          y: d.start.y,
          width: 0,
          height: 0,
          ...(d.tool === "arrow"
            ? { endCap: "arrow" as const, name: nextName(s.doc, "line").replace("Line", "Arrow") }
            : {}),
          ...(type === "text"
            ? { textAutoResize: "fixed" as const, text: "", fills: [solid(contrastColor(s.doc, d.parent))] }
            : {}),
        })
        d.id = d.node.id
        s.select([d.node.id])
      }
      const template = d.node!
      const place = (geo: Partial<SceneNode>) => {
        const recipe: Recipe = (draft) => insertNode(draft, { ...structuredClone(template), ...geo }, d.parent)
        d.last = recipe
        s.preview(recipe)
      }
      if (d.tool === "line" || d.tool === "arrow") {
        if (e.shiftKey) {
          const angle = snapAngle(Math.atan2(cur.y - d.start.y, cur.x - d.start.x) / DEG, 45) * DEG
          const len = Math.hypot(cur.x - d.start.x, cur.y - d.start.y)
          cur = { x: d.start.x + Math.cos(angle) * len, y: d.start.y + Math.sin(angle) * len }
        }
        place(lineFromPoints(d.start, cur))
        return
      }
      let w = cur.x - d.start.x
      let h = cur.y - d.start.y
      if (e.shiftKey) {
        const m = Math.max(Math.abs(w), Math.abs(h))
        w = m * Math.sign(w || 1)
        h = m * Math.sign(h || 1)
      }
      const rect = e.altKey
        ? { x: d.start.x - Math.abs(w), y: d.start.y - Math.abs(h), width: Math.abs(w) * 2, height: Math.abs(h) * 2 }
        : rectFromPoints(d.start, { x: d.start.x + w, y: d.start.y + h })
      place(rect)
      return
    }

    if (d.kind === "pencil") {
      d.points.push(p)
      s.set({ penDraft: { points: d.points.map((q) => ({ ...q, hx: 0, hy: 0 })), cursor: null } })
      return
    }

    if (d.kind === "pen-handle") {
      const draft = s.penDraft
      if (!draft) return
      const pt = draft.points[d.index]
      const hx = p.x - pt.x
      const hy = p.y - pt.y
      if (Math.hypot(hx, hy) * s.camera.zoom < 3) return
      const points = [...draft.points]
      points[d.index] = { ...pt, hx, hy }
      s.set({ penDraft: { points, cursor: p } })
    }
  }

  const onPointerUp = (e: React.PointerEvent) => {
    const s = useEditor.getState()
    const d = drag.current
    drag.current = null
    setDragging(null)
    if (ref.current?.hasPointerCapture(e.pointerId)) ref.current.releasePointerCapture(e.pointerId)
    if (!d) return

    if (d.kind === "marquee") {
      s.set({ marquee: null })
      return
    }
    if (d.kind === "move") {
      if (d.started) s.end()
      else if (!e.shiftKey && s.selection.length > 1) {
        const hit = hitAt(e).id
        if (hit) s.select([resolveSelectable(s.doc, hit, s.selection, e.metaKey || e.ctrlKey)])
      }
      return
    }
    if (d.kind === "line-end") {
      s.end()
      return
    }
    if (d.kind === "create") {
      if (!d.id) {
        const type = d.tool === "arrow" ? "line" : d.tool
        if (d.tool === "text") {
          const node = createNode("text", {
            name: "Text",
            x: d.start.x,
            y: d.start.y,
            fills: [solid(contrastColor(s.doc, d.parent))],
          })
          s.addNode(node, d.parent)
          s.set({ editingTextId: node.id })
          if (!s.toolLocked) useEditor.setState({ tool: "move" })
          return
        }
        const size = d.tool === "frame" ? { width: 200, height: 200 } : { width: 100, height: 100 }
        const node =
          type === "line"
            ? createNode("line", {
                name: nextName(s.doc, "line"),
                ...lineFromPoints(d.start, { x: d.start.x + 100, y: d.start.y }),
                ...(d.tool === "arrow" ? { endCap: "arrow" as const } : {}),
              })
            : createNode(type, {
                name: nextName(s.doc, type),
                x: d.start.x - size.width / 2,
                y: d.start.y - size.height / 2,
                ...size,
              })
        s.addNode(node, d.parent)
      } else {
        const n = useEditor.getState().doc.nodes[d.id]
        const last = d.last
        const id = d.id
        s.preview((draft) => {
          last?.(draft)
          const nn = draft.nodes[id]
          if (!nn) return
          if (nn.type !== "line") {
            nn.width = Math.max(1, nn.width)
            nn.height = Math.max(1, nn.height)
          }
          if (nn.type === "frame") {
            const frame = nn
            const siblings = childrenOf(draft, frame.parentId).filter((c) => c !== frame.id)
            const fb = nodeAABB(draft, frame.id)
            for (const c of siblings) {
              const b = nodeAABB(draft, c)
              if (
                b.x >= fb.x &&
                b.y >= fb.y &&
                b.x + b.width <= fb.x + fb.width &&
                b.y + b.height <= fb.y + fb.height
              ) {
                reparent(draft, c, frame.id)
              }
            }
          }
        })
        void n
        s.end()
        if (d.tool === "text") s.set({ editingTextId: d.id })
      }
      if (!s.toolLocked) useEditor.setState({ tool: "move" })
      return
    }
    if (d.kind === "pencil") {
      s.set({ penDraft: null })
      const pts = simplify(d.points, 1.5 / s.camera.zoom)
      if (pts.length < 2) return
      const norm = normalizeVertices(smoothHandles(pts))
      const node = createNode("path", {
        name: nextName(s.doc, "path"),
        x: norm.x,
        y: norm.y,
        width: norm.width,
        height: norm.height,
        vertices: norm.vertices,
        strokeWidth: 2,
      })
      s.addNode(node)
      return
    }
  }

  const onDoubleClick = (e: React.MouseEvent) => {
    const s = useEditor.getState()
    if (s.tool === "pen") {
      const draft = s.penDraft
      if (draft && draft.points.length > 2) {
        s.set({ penDraft: { ...draft, points: draft.points.slice(0, -1) } })
      }
      finishPen(false)
      return
    }
    const hit = hitAt(e).id
    if (!hit) return
    const n = s.doc.nodes[hit]
    const selected = s.selection[0] ? s.doc.nodes[s.selection[0]] : null
    if (selected && (selected.type === "group" || selected.type === "frame") && s.selection.length === 1) {
      const chain = [hit, ...ancestors(s.doc, hit)]
      const idx = chain.indexOf(selected.id)
      if (idx > 0) {
        const child = chain[idx - 1]
        if (s.doc.nodes[child].type === "text" && child === hit) {
          s.select([child])
          s.set({ editingTextId: child })
        } else s.select([child])
        return
      }
    }
    if (n.type === "text") {
      s.select([hit])
      s.set({ editingTextId: hit })
    }
  }

  const onDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("Files")) e.preventDefault()
  }

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith("image/"))
    if (files.length) await importImageFiles(files, world(e))
  }

  const cursor = (() => {
    if (dragging === "pan") return "grabbing"
    if (space || tool === "hand") return "grab"
    if (tool === "text") return "text"
    if (tool !== "move") return "crosshair"
    return "default"
  })()

  const bg = page?.background ?? "#1e1e1e"
  const zoom = camera.zoom

  return (
    <CanvasContextMenu>
      <div
        ref={ref}
        className="relative h-full w-full touch-none overflow-hidden outline-none select-none"
        style={{ cursor, background: bg }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={() => !drag.current && useEditor.getState().setHover(null)}
        onDoubleClick={onDoubleClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onContextMenu={(e) => {
          if (useEditor.getState().penDraft) e.preventDefault()
        }}
      >
        <Stage ref={stageRef} width={viewport.width} height={viewport.height} className="absolute inset-0">
          <Layer x={camera.x} y={camera.y} scaleX={zoom} scaleY={zoom} name="content">
            {page?.children.map((id) => (
              <KonvaNode key={id} id={id} nodes={doc.nodes} editingTextId={editingTextId} />
            ))}
          </Layer>
          <Layer listening>
            {showPixelGrid && zoom >= 8 && <PixelGrid />}
            <Overlay />
            <SelectionTransformer stageRef={stageRef} />
          </Layer>
        </Stage>
        <TextEditor />
      </div>
    </CanvasContextMenu>
  )
}

export function removeEmptyText(id: string) {
  const s = useEditor.getState()
  const n = s.doc.nodes[id]
  if (n && n.type === "text" && !(n.text ?? "").trim()) {
    s.commit((d) => removeNode(d, id))
    s.select([])
  }
}
