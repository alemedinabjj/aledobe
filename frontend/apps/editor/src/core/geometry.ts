import type { Camera, Doc, Handle, Point, Rect, SceneNode } from "./types"

export const DEG = Math.PI / 180

export function rotatePoint(p: Point, c: Point, deg: number): Point {
  if (!deg) return { ...p }
  const a = deg * DEG
  const cos = Math.cos(a)
  const sin = Math.sin(a)
  const dx = p.x - c.x
  const dy = p.y - c.y
  return { x: c.x + dx * cos - dy * sin, y: c.y + dx * sin + dy * cos }
}

export const nodeCenter = (n: Rect): Point => ({ x: n.x + n.width / 2, y: n.y + n.height / 2 })

export function nodeCorners(n: SceneNode): Point[] {
  const c = nodeCenter(n)
  return [
    { x: n.x, y: n.y },
    { x: n.x + n.width, y: n.y },
    { x: n.x + n.width, y: n.y + n.height },
    { x: n.x, y: n.y + n.height },
  ].map((p) => rotatePoint(p, c, n.rotation))
}

export function pointsBounds(points: Point[]): Rect {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of points) {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  }
  if (!isFinite(minX)) return { x: 0, y: 0, width: 0, height: 0 }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

export function unionRects(rects: Rect[]): Rect | null {
  if (!rects.length) return null
  return pointsBounds(
    rects.flatMap((r) => [
      { x: r.x, y: r.y },
      { x: r.x + r.width, y: r.y + r.height },
    ]),
  )
}

export function nodeAABB(doc: Doc, id: string): Rect {
  const n = doc.nodes[id]
  if (!n) return { x: 0, y: 0, width: 0, height: 0 }
  if (n.type === "group" && n.children?.length) {
    return unionRects(n.children.map((c) => nodeAABB(doc, c))) ?? n
  }
  return pointsBounds(nodeCorners(n))
}

export function selectionBounds(doc: Doc, ids: string[]): Rect | null {
  return unionRects(ids.filter((id) => doc.nodes[id]).map((id) => nodeAABB(doc, id)))
}

export const rectContains = (outer: Rect, inner: Rect) =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  inner.x + inner.width <= outer.x + outer.width &&
  inner.y + inner.height <= outer.y + outer.height

export const rectIntersects = (a: Rect, b: Rect) =>
  a.x <= b.x + b.width && a.x + a.width >= b.x && a.y <= b.y + b.height && a.y + a.height >= b.y

export const pointInRect = (p: Point, r: Rect) =>
  p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height

export const toScreen = (p: Point, cam: Camera): Point => ({ x: p.x * cam.zoom + cam.x, y: p.y * cam.zoom + cam.y })
export const toWorld = (p: Point, cam: Camera): Point => ({ x: (p.x - cam.x) / cam.zoom, y: (p.y - cam.y) / cam.zoom })

export function rectFromPoints(a: Point, b: Point): Rect {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(a.x - b.x), height: Math.abs(a.y - b.y) }
}

export const HANDLES: Handle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"]

export function handleLocal(h: Handle): Point {
  const x = h.includes("w") ? -0.5 : h.includes("e") ? 0.5 : 0
  const y = h.includes("n") ? -0.5 : h.includes("s") ? 0.5 : 0
  return { x, y }
}

export function handlePosition(r: Rect, rotation: number, h: Handle): Point {
  const l = handleLocal(h)
  const c = nodeCenter(r)
  return rotatePoint({ x: c.x + l.x * r.width, y: c.y + l.y * r.height }, c, rotation)
}

const CURSORS = ["ns-resize", "nesw-resize", "ew-resize", "nwse-resize"]

export function handleCursor(h: Handle, rotation: number) {
  const base: Record<Handle, number> = { n: 0, ne: 45, e: 90, se: 135, s: 180, sw: 225, w: 270, nw: 315 }
  const angle = (((base[h] + rotation) % 180) + 180) % 180
  return CURSORS[Math.round(angle / 45) % 4]
}

export const round = (v: number, precision = 100) => Math.round(v * precision) / precision

export function snapAngle(deg: number, step = 15) {
  return Math.round(deg / step) * step
}

export function normalizeAngle(deg: number) {
  let a = deg % 360
  if (a > 180) a -= 360
  if (a <= -180) a += 360
  return round(a)
}

export function lineEndpoints(n: SceneNode): [Point, Point] {
  const c = nodeCenter(n)
  return [rotatePoint({ x: n.x, y: c.y }, c, n.rotation), rotatePoint({ x: n.x + n.width, y: c.y }, c, n.rotation)]
}

export function lineFromPoints(a: Point, b: Point) {
  const length = Math.hypot(b.x - a.x, b.y - a.y)
  const rotation = Math.atan2(b.y - a.y, b.x - a.x) / DEG
  const cx = (a.x + b.x) / 2
  const cy = (a.y + b.y) / 2
  return { x: cx - length / 2, y: cy, width: length, height: 0, rotation: normalizeAngle(rotation) }
}
