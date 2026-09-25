import { create } from "zustand"
import { produce, setAutoFreeze } from "immer"
import {
  ancestors,
  childrenOf,
  cloneSubtree,
  createNode,
  createPage,
  defaultAutoLayout,
  descendants,
  detach,
  finalize,
  insertNode,
  isContainer,
  isLockedDeep,
  isVisibleDeep,
  moveDeep,
  nextName,
  pageOf,
  removeNode,
  reparent,
  setBounds,
  sortByOrder,
  topLevel,
} from "./doc"
import { nodeAABB, selectionBounds, unionRects } from "./geometry"
import type { Camera, Doc, Guide, Measure, Point, Rect, SceneNode, Tool } from "./types"

setAutoFreeze(false)

type Recipe = (draft: Doc) => void

export interface PenDraft {
  points: { x: number; y: number; hx: number; hy: number }[]
  cursor: Point | null
}

export interface EditorState {
  doc: Doc
  pageId: string
  selection: string[]
  hoverId: string | null
  tool: Tool
  toolLocked: boolean
  camera: Camera
  viewport: { width: number; height: number }
  past: Doc[]
  future: Doc[]
  txBase: Doc | null
  editingTextId: string | null
  guides: Guide[]
  measures: Measure[]
  marquee: Rect | null
  penDraft: PenDraft | null
  clipboard: { nodes: SceneNode[]; roots: string[] } | null
  panelsHidden: boolean
  rightTab: "design" | "code"
  showShortcuts: boolean
  showRulers: boolean
  showPixelGrid: boolean
  snapping: boolean
  transforming: boolean
  dirty: number

  load: (doc: Doc) => void
  refreshText: () => void
  commit: (recipe: Recipe) => void
  begin: () => void
  preview: (recipe: Recipe) => void
  end: () => void
  cancel: () => void
  undo: () => void
  redo: () => void

  setTool: (tool: Tool, locked?: boolean) => void
  setCamera: (camera: Partial<Camera>) => void
  setViewport: (width: number, height: number) => void
  select: (ids: string[]) => void
  setHover: (id: string | null) => void
  set: (patch: Partial<EditorState>) => void

  updateNodes: (ids: string[], fn: (n: SceneNode, draft: Doc) => void) => void
  addNode: (node: SceneNode, parentId?: string, index?: number) => void
  deleteSelection: () => void
  duplicateSelection: () => void
  copy: () => void
  cut: () => void
  paste: (at?: Point) => void
  groupSelection: () => void
  ungroupSelection: () => void
  frameSelection: () => void
  addAutoLayout: () => void
  reorder: (mode: "forward" | "backward" | "front" | "back") => void
  toggleVisible: (ids?: string[]) => void
  toggleLocked: (ids?: string[]) => void
  align: (mode: "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom") => void
  distribute: (axis: "x" | "y") => void
  flip: (axis: "x" | "y") => void
  selectAll: () => void
  nudge: (dx: number, dy: number) => void
  moveInto: (ids: string[], parentId: string, index: number) => void

  addPage: () => void
  renamePage: (id: string, name: string) => void
  deletePage: (id: string) => void
  duplicatePage: (id: string) => void
  setPage: (id: string) => void

  zoomTo: (zoom: number, anchor?: Point) => void
  zoomBy: (factor: number, anchor?: Point) => void
  zoomToFit: (ids?: string[]) => void
}

const HISTORY_LIMIT = 150

const apply = (doc: Doc, recipe: Recipe) =>
  produce(doc, (draft) => {
    recipe(draft)
    finalize(draft)
  })

export function emptyDoc(name = "Untitled"): Doc {
  const page = createPage("Page 1")
  return { name, pages: [page], nodes: {} }
}

const visibleSelection = (doc: Doc, ids: string[]) => ids.filter((id) => doc.nodes[id])

export const useEditor = create<EditorState>()((set, get) => ({
  doc: emptyDoc(),
  pageId: "",
  selection: [],
  hoverId: null,
  tool: "move",
  toolLocked: false,
  camera: { x: 0, y: 0, zoom: 1 },
  viewport: { width: 1200, height: 800 },
  past: [],
  future: [],
  txBase: null,
  editingTextId: null,
  guides: [],
  measures: [],
  marquee: null,
  penDraft: null,
  clipboard: null,
  panelsHidden: false,
  rightTab: "design",
  showShortcuts: false,
  showRulers: false,
  showPixelGrid: true,
  snapping: true,
  transforming: false,
  dirty: 0,

  refreshText: () => {
    const { doc } = get()
    const next = apply(doc, () => {})
    if (next !== doc) set({ doc: next })
  },

  load: (doc) => {
    const finalized = apply(doc, () => {})
    set({
      doc: finalized,
      pageId: finalized.pages[0].id,
      selection: [],
      past: [],
      future: [],
      txBase: null,
      editingTextId: null,
      penDraft: null,
    })
    requestAnimationFrame(() => get().zoomToFit())
  },

  commit: (recipe) => {
    const { doc, past } = get()
    const next = apply(doc, recipe)
    if (next === doc) return
    set({
      doc: next,
      past: [...past.slice(-HISTORY_LIMIT), doc],
      future: [],
      selection: visibleSelection(next, get().selection),
      dirty: get().dirty + 1,
    })
  },

  begin: () => set({ txBase: get().doc }),

  preview: (recipe) => {
    const base = get().txBase ?? get().doc
    set({ doc: apply(base, recipe) })
  },

  end: () => {
    const { txBase, doc, past } = get()
    if (txBase && txBase !== doc) {
      set({ past: [...past.slice(-HISTORY_LIMIT), txBase], future: [], dirty: get().dirty + 1 })
    }
    set({ txBase: null, guides: [], measures: [] })
  },

  cancel: () => {
    const { txBase } = get()
    if (txBase) set({ doc: txBase, txBase: null, guides: [] })
  },

  undo: () => {
    const { past, doc, future } = get()
    if (!past.length) return
    const prev = past[past.length - 1]
    set({
      doc: prev,
      past: past.slice(0, -1),
      future: [doc, ...future],
      selection: visibleSelection(prev, get().selection),
      editingTextId: null,
      dirty: get().dirty + 1,
    })
    if (!prev.pages.some((p) => p.id === get().pageId)) set({ pageId: prev.pages[0].id })
  },

  redo: () => {
    const { past, doc, future } = get()
    if (!future.length) return
    const next = future[0]
    set({
      doc: next,
      past: [...past, doc],
      future: future.slice(1),
      selection: visibleSelection(next, get().selection),
      dirty: get().dirty + 1,
    })
    if (!next.pages.some((p) => p.id === get().pageId)) set({ pageId: next.pages[0].id })
  },

  setTool: (tool, locked = false) => set({ tool, toolLocked: locked, penDraft: null, editingTextId: null }),
  setCamera: (camera) => set({ camera: { ...get().camera, ...camera } }),
  setViewport: (width, height) => set({ viewport: { width, height } }),
  select: (ids) => set({ selection: [...new Set(ids)] }),
  setHover: (id) => {
    if (get().hoverId !== id) set({ hoverId: id })
  },
  set: (patch) => set(patch),

  updateNodes: (ids, fn) =>
    get().commit((d) => {
      for (const id of ids) if (d.nodes[id]) fn(d.nodes[id], d)
    }),

  addNode: (node, parentId, index) => {
    get().commit((d) => insertNode(d, node, parentId ?? get().pageId, index))
    set({ selection: [node.id] })
  },

  deleteSelection: () => {
    const { selection, doc } = get()
    const ids = topLevel(doc, selection)
    if (!ids.length) return
    get().commit((d) => ids.forEach((id) => removeNode(d, id)))
    set({ selection: [], hoverId: null })
  },

  duplicateSelection: () => {
    const { selection, doc } = get()
    const ids = sortByOrder(doc, topLevel(doc, selection))
    if (!ids.length) return
    const created: string[] = []
    get().commit((d) => {
      for (const id of ids) {
        const nodes = cloneSubtree(d, id)
        const root = nodes[0]
        const parent = d.nodes[id].parentId
        const index = childrenOf(d, parent).indexOf(id) + 1
        nodes.slice(1).forEach((n) => (d.nodes[n.id] = n))
        insertNode(d, root, parent, index)
        created.push(root.id)
      }
    })
    set({ selection: created })
  },

  copy: () => {
    const { selection, doc } = get()
    const roots = sortByOrder(doc, topLevel(doc, selection))
    if (!roots.length) return
    const nodes = roots.flatMap((id) => [id, ...descendants(doc, id)]).map((id) => structuredClone(doc.nodes[id]))
    set({ clipboard: { nodes, roots } })
  },

  cut: () => {
    get().copy()
    get().deleteSelection()
  },

  paste: (at) => {
    const { clipboard, pageId, selection, doc } = get()
    if (!clipboard) return
    const source: Doc = { name: "", pages: [], nodes: Object.fromEntries(clipboard.nodes.map((n) => [n.id, n])) }
    let target = pageId
    const sel = selection.length === 1 ? doc.nodes[selection[0]] : null
    if (sel?.type === "frame" && !clipboard.roots.includes(sel.id)) target = sel.id
    const bounds = unionRects(clipboard.roots.map((id) => nodeAABB(source, id)))
    const created: string[] = []
    get().commit((d) => {
      let dx = 0
      let dy = 0
      if (at && bounds) {
        dx = at.x - bounds.x - bounds.width / 2
        dy = at.y - bounds.y - bounds.height / 2
      } else if (bounds && target !== pageId) {
        const t = d.nodes[target]
        if (!(bounds.x >= t.x && bounds.y >= t.y && bounds.x + bounds.width <= t.x + t.width)) {
          dx = t.x + (t.width - bounds.width) / 2 - bounds.x
          dy = t.y + (t.height - bounds.height) / 2 - bounds.y
        }
      }
      for (const root of clipboard.roots) {
        const nodes = cloneSubtree(source, root)
        nodes.slice(1).forEach((n) => (d.nodes[n.id] = n))
        insertNode(d, nodes[0], target)
        moveDeep(d, nodes[0].id, dx, dy)
        created.push(nodes[0].id)
      }
    })
    set({ selection: created })
  },

  groupSelection: () => {
    const { selection, doc } = get()
    const ids = sortByOrder(doc, topLevel(doc, selection))
    if (!ids.length) return
    const group = createNode("group", { name: nextName(doc, "group") })
    get().commit((d) => {
      const parent = d.nodes[ids[ids.length - 1]].parentId
      const index = childrenOf(d, parent).indexOf(ids[ids.length - 1])
      insertNode(d, group, parent, index + 1)
      ids.forEach((id) => reparent(d, id, group.id))
    })
    set({ selection: [group.id] })
  },

  ungroupSelection: () => {
    const { selection, doc } = get()
    const containers = selection.filter((id) => isContainer(doc.nodes[id]))
    if (!containers.length) return
    const released: string[] = []
    get().commit((d) => {
      for (const id of containers) {
        const n = d.nodes[id]
        const parent = n.parentId
        let index = childrenOf(d, parent).indexOf(id)
        for (const c of [...(n.children ?? [])]) {
          reparent(d, c, parent, index++)
          released.push(c)
        }
        removeNode(d, id)
      }
    })
    set({ selection: released })
  },

  frameSelection: () => {
    const { selection, doc } = get()
    const ids = sortByOrder(doc, topLevel(doc, selection))
    const b = selectionBounds(doc, ids)
    if (!b) return
    const frame = createNode("frame", {
      name: nextName(doc, "frame"),
      x: b.x,
      y: b.y,
      width: b.width,
      height: b.height,
    })
    get().commit((d) => {
      const parent = d.nodes[ids[ids.length - 1]].parentId
      const index = childrenOf(d, parent).indexOf(ids[ids.length - 1])
      insertNode(d, frame, parent, index + 1)
      ids.forEach((id) => reparent(d, id, frame.id))
    })
    set({ selection: [frame.id] })
  },

  addAutoLayout: () => {
    const { selection, doc } = get()
    if (selection.length === 1 && doc.nodes[selection[0]]?.type === "frame") {
      const f = doc.nodes[selection[0]]
      get().updateNodes([f.id], (n) => {
        if (n.layout) {
          n.layout = null
          return
        }
        const kids = n.children ?? []
        const boxes = kids.map((c) => nodeAABB(doc, c))
        const spreadX = boxes.length ? Math.max(...boxes.map((b) => b.x)) - Math.min(...boxes.map((b) => b.x)) : 0
        const spreadY = boxes.length ? Math.max(...boxes.map((b) => b.y)) - Math.min(...boxes.map((b) => b.y)) : 0
        const layout = defaultAutoLayout()
        layout.direction = spreadY > spreadX ? "vertical" : "horizontal"
        const key = layout.direction === "horizontal" ? "x" : "y"
        n.children = [...kids].sort((a, b) => nodeAABB(doc, a)[key] - nodeAABB(doc, b)[key])
        n.layout = layout
      })
      return
    }
    get().frameSelection()
    const id = get().selection[0]
    if (!id) return
    get().updateNodes([id], (n) => {
      const layout = defaultAutoLayout()
      const kids = n.children ?? []
      const d = get().doc
      const boxes = kids.map((c) => nodeAABB(d, c))
      const spreadX = boxes.length ? Math.max(...boxes.map((b) => b.x)) - Math.min(...boxes.map((b) => b.x)) : 0
      const spreadY = boxes.length ? Math.max(...boxes.map((b) => b.y)) - Math.min(...boxes.map((b) => b.y)) : 0
      layout.direction = spreadY > spreadX ? "vertical" : "horizontal"
      const key = layout.direction === "horizontal" ? "x" : "y"
      n.children = [...kids].sort((a, b) => nodeAABB(d, a)[key] - nodeAABB(d, b)[key])
      n.fills = []
      n.layout = layout
    })
  },

  reorder: (mode) => {
    const { selection, doc } = get()
    const ids = topLevel(doc, selection)
    if (!ids.length) return
    get().commit((d) => {
      const byParent = new Map<string, string[]>()
      ids.forEach((id) => {
        const p = d.nodes[id].parentId
        byParent.set(p, [...(byParent.get(p) ?? []), id])
      })
      for (const [parent, moving] of byParent) {
        const list = [...childrenOf(d, parent)]
        const set = new Set(moving)
        if (mode === "front") {
          const rest = list.filter((i) => !set.has(i))
          setList(d, parent, [...rest, ...list.filter((i) => set.has(i))])
        } else if (mode === "back") {
          const rest = list.filter((i) => !set.has(i))
          setList(d, parent, [...list.filter((i) => set.has(i)), ...rest])
        } else if (mode === "forward") {
          for (let i = list.length - 2; i >= 0; i--) {
            if (set.has(list[i]) && !set.has(list[i + 1])) [list[i], list[i + 1]] = [list[i + 1], list[i]]
          }
          setList(d, parent, list)
        } else {
          for (let i = 1; i < list.length; i++) {
            if (set.has(list[i]) && !set.has(list[i - 1])) [list[i], list[i - 1]] = [list[i - 1], list[i]]
          }
          setList(d, parent, list)
        }
      }
    })
  },

  toggleVisible: (ids) => {
    const target = ids ?? get().selection
    if (!target.length) return
    const allVisible = target.every((id) => get().doc.nodes[id]?.visible)
    get().updateNodes(target, (n) => (n.visible = !allVisible))
  },

  toggleLocked: (ids) => {
    const target = ids ?? get().selection
    if (!target.length) return
    const allLocked = target.every((id) => get().doc.nodes[id]?.locked)
    get().updateNodes(target, (n) => (n.locked = !allLocked))
    if (!allLocked && !ids) set({ selection: [] })
  },

  align: (mode) => {
    const { selection, doc } = get()
    const ids = topLevel(doc, selection)
    if (!ids.length) return
    let target: Rect | null
    if (ids.length === 1) {
      const parent = doc.nodes[doc.nodes[ids[0]].parentId]
      if (!parent) return
      target = parent
    } else {
      target = selectionBounds(doc, ids)
    }
    if (!target) return
    const t = target
    get().commit((d) => {
      for (const id of ids) {
        const b = nodeAABB(d, id)
        let dx = 0
        let dy = 0
        if (mode === "left") dx = t.x - b.x
        if (mode === "hcenter") dx = t.x + t.width / 2 - (b.x + b.width / 2)
        if (mode === "right") dx = t.x + t.width - (b.x + b.width)
        if (mode === "top") dy = t.y - b.y
        if (mode === "vcenter") dy = t.y + t.height / 2 - (b.y + b.height / 2)
        if (mode === "bottom") dy = t.y + t.height - (b.y + b.height)
        moveDeep(d, id, Math.round(dx), Math.round(dy))
      }
    })
  },

  distribute: (axis) => {
    const { selection, doc } = get()
    const ids = topLevel(doc, selection)
    if (ids.length < 3) return
    const boxes = ids.map((id) => ({ id, b: nodeAABB(doc, id) })).sort((a, b) => a.b[axis] - b.b[axis])
    const size = axis === "x" ? "width" : "height"
    const start = boxes[0].b[axis]
    const end = boxes[boxes.length - 1].b[axis] + boxes[boxes.length - 1].b[size]
    const total = boxes.reduce((s, x) => s + x.b[size], 0)
    const gap = (end - start - total) / (boxes.length - 1)
    get().commit((d) => {
      let cursor = start
      for (const { id, b } of boxes) {
        const delta = Math.round(cursor - b[axis])
        moveDeep(d, id, axis === "x" ? delta : 0, axis === "y" ? delta : 0)
        cursor += b[size] + gap
      }
    })
  },

  flip: (axis) => {
    const { selection, doc } = get()
    const ids = topLevel(doc, selection)
    const b = selectionBounds(doc, ids)
    if (!b) return
    get().commit((d) => {
      for (const id of ids) {
        for (const nid of [id, ...descendants(d, id)]) {
          const n = d.nodes[nid]
          if (axis === "x") {
            n.x = b.x + b.width - (n.x - b.x) - n.width
            n.rotation = -n.rotation
          } else {
            n.y = b.y + b.height - (n.y - b.y) - n.height
            n.rotation = -n.rotation
          }
          if (n.vertices) {
            n.vertices = n.vertices.map((v) =>
              axis === "x" ? { x: 1 - v.x, y: v.y, hx: -v.hx, hy: v.hy } : { x: v.x, y: 1 - v.y, hx: v.hx, hy: -v.hy },
            )
          }
        }
      }
    })
  },

  selectAll: () => {
    const { selection, doc, pageId } = get()
    const parent = selection.length ? (doc.nodes[selection[0]]?.parentId ?? pageId) : pageId
    set({
      selection: childrenOf(doc, parent).filter((id) => isVisibleDeep(doc, id) && !isLockedDeep(doc, id)),
    })
  },

  nudge: (dx, dy) => {
    const { selection, doc } = get()
    const ids = topLevel(doc, selection)
    if (!ids.length) return
    get().commit((d) => ids.forEach((id) => moveDeep(d, id, dx, dy)))
  },

  moveInto: (ids, parentId, index) => {
    const { doc } = get()
    const valid = topLevel(doc, ids).filter((id) => id !== parentId && !ancestors(doc, parentId).includes(id))
    if (!valid.length) return
    get().commit((d) => {
      let i = index
      for (const id of valid) {
        const n = d.nodes[id]
        const list = childrenOf(d, parentId)
        const current = list.indexOf(id)
        if (n.parentId === parentId && current !== -1 && current < i) i--
        detach(d, id)
        n.parentId = parentId
        const next = [...childrenOf(d, parentId)]
        next.splice(Math.max(0, Math.min(i, next.length)), 0, id)
        setList(d, parentId, next)
        i++
      }
    })
  },

  addPage: () => {
    const page = createPage(`Page ${get().doc.pages.length + 1}`)
    get().commit((d) => {
      d.pages.push(page)
    })
    set({ pageId: page.id, selection: [] })
  },

  renamePage: (id, name) =>
    get().commit((d) => {
      const p = d.pages.find((x) => x.id === id)
      if (p) p.name = name
    }),

  deletePage: (id) => {
    const { doc } = get()
    if (doc.pages.length < 2) return
    get().commit((d) => {
      const p = d.pages.find((x) => x.id === id)
      if (!p) return
      p.children.forEach((c) => removeNode(d, c))
      d.pages = d.pages.filter((x) => x.id !== id)
    })
    if (get().pageId === id) set({ pageId: get().doc.pages[0].id, selection: [] })
  },

  duplicatePage: (id) => {
    const page = createPage("")
    get().commit((d) => {
      const src = d.pages.find((p) => p.id === id)
      if (!src) return
      page.name = `${src.name} copy`
      page.background = src.background
      d.pages.splice(d.pages.indexOf(src) + 1, 0, page)
      for (const c of src.children) {
        const nodes = cloneSubtree(d, c)
        nodes.slice(1).forEach((n) => (d.nodes[n.id] = n))
        insertNode(d, nodes[0], page.id)
      }
    })
    set({ pageId: page.id, selection: [] })
  },

  setPage: (id) => {
    set({ pageId: id, selection: [], hoverId: null, editingTextId: null })
    requestAnimationFrame(() => get().zoomToFit())
  },

  zoomTo: (zoom, anchor) => {
    const { camera, viewport } = get()
    const z = Math.min(256, Math.max(0.02, zoom))
    const a = anchor ?? { x: viewport.width / 2, y: viewport.height / 2 }
    const wx = (a.x - camera.x) / camera.zoom
    const wy = (a.y - camera.y) / camera.zoom
    set({ camera: { zoom: z, x: a.x - wx * z, y: a.y - wy * z } })
  },

  zoomBy: (factor, anchor) => get().zoomTo(get().camera.zoom * factor, anchor),

  zoomToFit: (ids) => {
    const { doc, pageId, viewport } = get()
    const targets = ids ?? childrenOf(doc, pageId)
    const b = selectionBounds(doc, targets)
    if (!b) {
      set({ camera: { x: viewport.width / 2, y: viewport.height / 2, zoom: 1 } })
      return
    }
    const pad = 80
    const zoom = Math.min(
      (viewport.width - pad * 2) / Math.max(b.width, 1),
      (viewport.height - pad * 2) / Math.max(b.height, 1),
      ids ? 8 : 1,
    )
    const z = Math.max(0.02, zoom)
    set({
      camera: {
        zoom: z,
        x: viewport.width / 2 - (b.x + b.width / 2) * z,
        y: viewport.height / 2 - (b.y + b.height / 2) * z,
      },
    })
  },
}))

function setList(d: Doc, parent: string, list: string[]) {
  const page = d.pages.find((p) => p.id === parent)
  if (page) page.children = list
  else if (d.nodes[parent]) d.nodes[parent].children = list
}

export function currentPageNodes(state: EditorState) {
  return childrenOf(state.doc, state.pageId)
}

export function selectedNodes(state: EditorState) {
  return state.selection.map((id) => state.doc.nodes[id]).filter(Boolean)
}

export function resolveSelectable(doc: Doc, id: string, selection: string[], deep: boolean): string {
  if (deep) return id
  const chain = [...ancestors(doc, id)].reverse()
  const selectedSet = new Set(selection)
  const entered = (gid: string) =>
    selection.some((s) => s === gid || ancestors(doc, s).includes(gid)) || selectedSet.has(gid)
  for (const a of chain) {
    const n = doc.nodes[a]
    if (n.type === "group" && !entered(a)) return a
  }
  return id
}

export const pageIdOf = pageOf
export { setBounds }
