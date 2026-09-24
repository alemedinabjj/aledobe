import { nodeAABB, nodeCenter, rotatePoint, unionRects } from "./geometry"
import { layoutText } from "./text"
import type { AutoLayout, Doc, Effect, NodeType, Page, Paint, Rect, SceneNode } from "./types"

let counter = 0
export const uid = () =>
  `${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`

export const solid = (color: string, opacity = 1): Paint => ({
  id: uid(),
  type: "solid",
  color,
  opacity,
  visible: true,
  stops: [
    { position: 0, color, opacity: 1 },
    { position: 1, color: "#FFFFFF", opacity: 1 },
  ],
  angle: 90,
})

export const effect = (type: Effect["type"]): Effect => ({
  id: uid(),
  type,
  visible: true,
  x: 0,
  y: type === "layer-blur" ? 0 : 4,
  blur: type === "layer-blur" ? 8 : 12,
  spread: 0,
  color: "#000000",
  opacity: 0.25,
})

export const defaultAutoLayout = (): AutoLayout => ({
  direction: "horizontal",
  gap: 10,
  paddingTop: 10,
  paddingRight: 10,
  paddingBottom: 10,
  paddingLeft: 10,
  align: "start",
  justify: "start",
  hugWidth: true,
  hugHeight: true,
})

const NAMES: Record<NodeType, string> = {
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
}

export function nextName(doc: Doc, type: NodeType) {
  const base = NAMES[type]
  let max = 0
  for (const n of Object.values(doc.nodes)) {
    const m = n.name.match(new RegExp(`^${base} (\\d+)$`))
    if (m) max = Math.max(max, +m[1])
  }
  return `${base} ${max + 1}`
}

export function createNode(type: NodeType, props: Partial<SceneNode> = {}): SceneNode {
  const base: SceneNode = {
    id: uid(),
    type,
    name: NAMES[type],
    parentId: "",
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    blendMode: "normal",
    fills: [solid("#D9D9D9")],
    strokes: [],
    strokeWidth: 1,
    strokeAlign: "inside",
    strokeDash: 0,
    startCap: "none",
    endCap: "none",
    effects: [],
    cornerRadius: 0,
  }
  if (type === "frame") {
    Object.assign(base, { fills: [solid("#FFFFFF")], children: [], clipContent: true, layout: null, expanded: true })
  }
  if (type === "group") Object.assign(base, { fills: [], children: [], expanded: true })
  if (type === "polygon") Object.assign(base, { pointCount: 3 })
  if (type === "star") Object.assign(base, { pointCount: 5, innerRadius: 0.38 })
  if (type === "line") {
    Object.assign(base, { fills: [], strokes: [solid("#000000")], strokeAlign: "center", height: 0 })
  }
  if (type === "path") {
    Object.assign(base, { fills: [], strokes: [solid("#000000")], strokeAlign: "center", vertices: [], closed: false })
  }
  if (type === "text") {
    Object.assign(base, {
      fills: [solid("#000000")],
      text: "",
      fontFamily: "Inter",
      fontSize: 16,
      fontWeight: 400,
      italic: false,
      lineHeight: 120,
      letterSpacing: 0,
      textAlign: "left",
      textAutoResize: "width",
      textDecoration: "none",
      textCase: "none",
    })
  }
  if (type === "image") Object.assign(base, { fills: [], imageFit: "fill" })
  return { ...base, ...props }
}

export const createPage = (name: string): Page => ({ id: uid(), name, children: [], background: "#1E1B2A" })

function luminance(hex: string) {
  const v = parseInt(hex.replace("#", "").padEnd(6, "0").slice(0, 6), 16)
  const c = [(v >> 16) & 255, (v >> 8) & 255, v & 255].map((x) => {
    const n = x / 255
    return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}

export function contrastColor(doc: Doc, parentId: string) {
  let bg: string | undefined
  let cur: string | undefined = parentId
  while (cur && !bg) {
    const n: SceneNode | undefined = doc.nodes[cur]
    if (!n) {
      bg = findPage(doc, cur)?.background
      break
    }
    const fill = n.fills.find((f) => f.visible && f.opacity > 0.5)
    if (fill) bg = fill.type === "solid" ? fill.color : fill.stops[0]?.color
    cur = n.parentId
  }
  return bg && luminance(bg) < 0.35 ? "#FFFFFF" : "#000000"
}

export const isContainer = (n?: SceneNode) => !!n && (n.type === "frame" || n.type === "group")

export function findPage(doc: Doc, id: string) {
  return doc.pages.find((p) => p.id === id)
}

export function childrenOf(doc: Doc, parentId: string): string[] {
  return findPage(doc, parentId)?.children ?? doc.nodes[parentId]?.children ?? []
}

export function setChildren(doc: Doc, parentId: string, children: string[]) {
  const page = findPage(doc, parentId)
  if (page) page.children = children
  else if (doc.nodes[parentId]) doc.nodes[parentId].children = children
}

export function ancestors(doc: Doc, id: string): string[] {
  const out: string[] = []
  let cur = doc.nodes[id]?.parentId
  while (cur && doc.nodes[cur]) {
    out.push(cur)
    cur = doc.nodes[cur].parentId
  }
  return out
}

export function pageOf(doc: Doc, id: string): string {
  const chain = ancestors(doc, id)
  const top = chain.length ? chain[chain.length - 1] : id
  return doc.nodes[top]?.parentId ?? ""
}

export function descendants(doc: Doc, id: string): string[] {
  const out: string[] = []
  const walk = (nid: string) => {
    for (const c of doc.nodes[nid]?.children ?? []) {
      out.push(c)
      walk(c)
    }
  }
  walk(id)
  return out
}

export function topLevel(doc: Doc, ids: string[]) {
  const set = new Set(ids)
  return ids.filter((id) => doc.nodes[id] && !ancestors(doc, id).some((a) => set.has(a)))
}

export function isVisibleDeep(doc: Doc, id: string) {
  return doc.nodes[id]?.visible !== false && ancestors(doc, id).every((a) => doc.nodes[a].visible)
}

export function isLockedDeep(doc: Doc, id: string) {
  return doc.nodes[id]?.locked || ancestors(doc, id).some((a) => doc.nodes[a].locked)
}

export function sortByOrder(doc: Doc, ids: string[]) {
  const index = new Map<string, number>()
  let i = 0
  const walk = (list: string[]) => {
    for (const id of list) {
      index.set(id, i++)
      walk(doc.nodes[id]?.children ?? [])
    }
  }
  doc.pages.forEach((p) => walk(p.children))
  return [...ids].sort((a, b) => (index.get(a) ?? 0) - (index.get(b) ?? 0))
}

export function insertNode(doc: Doc, node: SceneNode, parentId: string, index?: number) {
  node.parentId = parentId
  doc.nodes[node.id] = node
  const list = [...childrenOf(doc, parentId)]
  list.splice(index ?? list.length, 0, node.id)
  setChildren(doc, parentId, list)
}

export function detach(doc: Doc, id: string) {
  const n = doc.nodes[id]
  if (!n) return
  setChildren(
    doc,
    n.parentId,
    childrenOf(doc, n.parentId).filter((c) => c !== id),
  )
}

export function removeNode(doc: Doc, id: string) {
  if (!doc.nodes[id]) return
  detach(doc, id)
  for (const d of [id, ...descendants(doc, id)]) delete doc.nodes[d]
}

export function reparent(doc: Doc, id: string, parentId: string, index?: number) {
  const n = doc.nodes[id]
  if (!n || n.parentId === parentId) return
  detach(doc, id)
  n.parentId = parentId
  const list = [...childrenOf(doc, parentId)]
  list.splice(index ?? list.length, 0, id)
  setChildren(doc, parentId, list)
}

export function cloneSubtree(doc: Doc, id: string, map = new Map<string, string>()): SceneNode[] {
  const src = doc.nodes[id]
  const newId = uid()
  map.set(id, newId)
  const copy: SceneNode = JSON.parse(JSON.stringify(src))
  copy.id = newId
  const out = [copy]
  if (src.children) {
    copy.children = []
    for (const c of src.children) {
      const sub = cloneSubtree(doc, c, map)
      sub[0].parentId = newId
      copy.children.push(sub[0].id)
      out.push(...sub)
    }
  }
  return out
}

export function moveDeep(doc: Doc, id: string, dx: number, dy: number) {
  for (const nid of [id, ...descendants(doc, id)]) {
    const n = doc.nodes[nid]
    n.x += dx
    n.y += dy
  }
}

export function rotateDeep(doc: Doc, id: string, center: { x: number; y: number }, delta: number) {
  for (const nid of [id, ...descendants(doc, id)]) {
    const n = doc.nodes[nid]
    const c = rotatePoint(nodeCenter(n), center, delta)
    n.x = c.x - n.width / 2
    n.y = c.y - n.height / 2
    if (n.type !== "group") n.rotation = normalize(n.rotation + delta)
  }
}

const normalize = (a: number) => {
  let v = a % 360
  if (v > 180) v -= 360
  if (v <= -180) v += 360
  return Math.round(v * 100) / 100
}

export function scaleDeep(doc: Doc, id: string, from: Rect, to: Rect, includeSelf = true) {
  const sx = from.width ? to.width / from.width : 1
  const sy = from.height ? to.height / from.height : 1
  const ids = includeSelf ? [id, ...descendants(doc, id)] : descendants(doc, id)
  for (const nid of ids) {
    const n = doc.nodes[nid]
    const c = nodeCenter(n)
    const nc = { x: to.x + (c.x - from.x) * sx, y: to.y + (c.y - from.y) * sy }
    const r = ((n.rotation % 180) + 180) % 180
    const swap = r > 45 && r < 135
    n.width = Math.max(0, n.width * (swap ? sy : sx))
    n.height = Math.max(0, n.height * (swap ? sx : sy))
    n.x = nc.x - n.width / 2
    n.y = nc.y - n.height / 2
    if (n.type === "text" && n.textAutoResize === "width" && sx !== 1) n.textAutoResize = "height"
  }
}

export function setBounds(doc: Doc, id: string, to: Rect) {
  const n = doc.nodes[id]
  if (n.type === "group") {
    scaleDeep(doc, id, nodeAABB(doc, id), to, false)
    return
  }
  if (n.type === "frame") {
    n.x = to.x
    n.y = to.y
    n.width = to.width
    n.height = to.height
    return
  }
  n.x = to.x
  n.y = to.y
  n.width = to.width
  n.height = to.height
}

function depth(doc: Doc, id: string) {
  return ancestors(doc, id).length
}

function applyText(doc: Doc) {
  for (const n of Object.values(doc.nodes)) {
    if (n.type !== "text") continue
    const layout = layoutText(n)
    if (n.textAutoResize === "width") {
      if (n.width !== layout.width) n.width = layout.width
      if (n.height !== layout.height) n.height = layout.height
    } else if (n.textAutoResize === "height") {
      if (n.height !== layout.height) n.height = layout.height
    }
  }
}

function applyGroups(doc: Doc) {
  const groups = Object.values(doc.nodes)
    .filter((n) => n.type === "group")
    .sort((a, b) => depth(doc, b.id) - depth(doc, a.id))
  for (const g of groups) {
    if (!doc.nodes[g.id]) continue
    if (!g.children?.length) {
      removeNode(doc, g.id)
      continue
    }
    const r = unionRects(g.children.map((c) => nodeAABB(doc, c)))
    if (!r) continue
    const node = doc.nodes[g.id]
    if (node.x !== r.x || node.y !== r.y || node.width !== r.width || node.height !== r.height) {
      Object.assign(node, { x: r.x, y: r.y, width: r.width, height: r.height, rotation: 0 })
    }
  }
}

function applyAutoLayout(doc: Doc) {
  const frames = Object.values(doc.nodes)
    .filter((n) => n.type === "frame" && n.layout)
    .sort((a, b) => depth(doc, b.id) - depth(doc, a.id))
  for (const f of frames) {
    const frame = doc.nodes[f.id]
    const l = frame.layout!
    const kids = (frame.children ?? []).filter((c) => doc.nodes[c]?.visible)
    const horizontal = l.direction === "horizontal"
    const boxes = kids.map((c) => nodeAABB(doc, c))
    const main = (r: Rect) => (horizontal ? r.width : r.height)
    const cross = (r: Rect) => (horizontal ? r.height : r.width)
    const totalMain = boxes.reduce((s, b) => s + main(b), 0)
    const maxCross = boxes.reduce((m, b) => Math.max(m, cross(b)), 0)
    const padMainStart = horizontal ? l.paddingLeft : l.paddingTop
    const padMainEnd = horizontal ? l.paddingRight : l.paddingBottom
    const padCrossStart = horizontal ? l.paddingTop : l.paddingLeft
    const padCrossEnd = horizontal ? l.paddingBottom : l.paddingRight
    const gaps = Math.max(0, kids.length - 1)

    const hugMain = horizontal ? l.hugWidth : l.hugHeight
    const hugCross = horizontal ? l.hugHeight : l.hugWidth
    if (hugMain) {
      const size = padMainStart + totalMain + l.gap * gaps + padMainEnd
      if (horizontal) frame.width = Math.max(1, size)
      else frame.height = Math.max(1, size)
    }
    if (hugCross) {
      const size = padCrossStart + maxCross + padCrossEnd
      if (horizontal) frame.height = Math.max(1, size)
      else frame.width = Math.max(1, size)
    }

    const frameMain = horizontal ? frame.width : frame.height
    const frameCross = horizontal ? frame.height : frame.width
    const inner = frameMain - padMainStart - padMainEnd
    let gap = l.gap
    let cursor = padMainStart
    if (l.justify === "space-between" && kids.length > 1) gap = (inner - totalMain) / gaps
    else if (l.justify === "center") cursor += (inner - totalMain - l.gap * gaps) / 2
    else if (l.justify === "end") cursor += inner - totalMain - l.gap * gaps

    kids.forEach((id, i) => {
      const b = boxes[i]
      const innerCross = frameCross - padCrossStart - padCrossEnd
      let crossPos = padCrossStart
      if (l.align === "center") crossPos += (innerCross - cross(b)) / 2
      if (l.align === "end") crossPos += innerCross - cross(b)
      const tx = frame.x + (horizontal ? cursor : crossPos)
      const ty = frame.y + (horizontal ? crossPos : cursor)
      const dx = tx - b.x
      const dy = ty - b.y
      if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001) moveDeep(doc, id, dx, dy)
      cursor += main(b) + gap
    })
  }
}

export function finalize(doc: Doc) {
  applyText(doc)
  applyGroups(doc)
  applyAutoLayout(doc)
  applyGroups(doc)
}
