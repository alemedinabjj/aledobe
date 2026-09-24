import type { SceneNode, Vertex } from "./types"

const f = (n: number) => +n.toFixed(3)

export function polygonPoints(n: SceneNode) {
  const count = Math.max(3, n.pointCount ?? 3)
  const cx = n.x + n.width / 2
  const cy = n.y + n.height / 2
  const pts: string[] = []
  for (let i = 0; i < count; i++) {
    const a = (-90 + (i * 360) / count) * (Math.PI / 180)
    pts.push(`${f(cx + (Math.cos(a) * n.width) / 2)},${f(cy + (Math.sin(a) * n.height) / 2)}`)
  }
  return pts.join(" ")
}

export function starPoints(n: SceneNode) {
  const count = Math.max(3, n.pointCount ?? 5)
  const ratio = n.innerRadius ?? 0.38
  const cx = n.x + n.width / 2
  const cy = n.y + n.height / 2
  const pts: string[] = []
  for (let i = 0; i < count * 2; i++) {
    const r = i % 2 === 0 ? 1 : ratio
    const a = (-90 + (i * 180) / count) * (Math.PI / 180)
    pts.push(`${f(cx + (Math.cos(a) * n.width * r) / 2)},${f(cy + (Math.sin(a) * n.height * r) / 2)}`)
  }
  return pts.join(" ")
}

export function vertexPath(n: SceneNode) {
  const vs = n.vertices ?? []
  if (!vs.length) return ""
  const P = (v: Vertex) => ({ x: n.x + v.x * n.width, y: n.y + v.y * n.height })
  const H = (v: Vertex, sign: 1 | -1) => ({
    x: n.x + (v.x + sign * v.hx) * n.width,
    y: n.y + (v.y + sign * v.hy) * n.height,
  })
  const first = P(vs[0])
  let d = `M${f(first.x)} ${f(first.y)}`
  const seg = (a: Vertex, b: Vertex) => {
    const pb = P(b)
    if (!a.hx && !a.hy && !b.hx && !b.hy) return ` L${f(pb.x)} ${f(pb.y)}`
    const c1 = H(a, 1)
    const c2 = H(b, -1)
    return ` C${f(c1.x)} ${f(c1.y)} ${f(c2.x)} ${f(c2.y)} ${f(pb.x)} ${f(pb.y)}`
  }
  for (let i = 1; i < vs.length; i++) d += seg(vs[i - 1], vs[i])
  if (n.closed && vs.length > 2) d += seg(vs[vs.length - 1], vs[0]) + " Z"
  return d
}

export function normalizeVertices(points: { x: number; y: number; hx: number; hy: number }[]) {
  const minX = Math.min(...points.map((p) => p.x))
  const minY = Math.min(...points.map((p) => p.y))
  const maxX = Math.max(...points.map((p) => p.x))
  const maxY = Math.max(...points.map((p) => p.y))
  const w = maxX - minX
  const h = maxY - minY
  const nx = (v: number) => (w ? (v - minX) / w : 0)
  const ny = (v: number) => (h ? (v - minY) / h : 0)
  return {
    x: minX,
    y: minY,
    width: w,
    height: h,
    vertices: points.map((p) => ({ x: nx(p.x), y: ny(p.y), hx: w ? p.hx / w : 0, hy: h ? p.hy / h : 0 })),
  }
}

export function simplify(points: { x: number; y: number }[], tolerance: number) {
  if (points.length < 3) return points
  const sq = (a: { x: number; y: number }, b: { x: number; y: number }, p: { x: number; y: number }) => {
    let x = a.x
    let y = a.y
    let dx = b.x - x
    let dy = b.y - y
    if (dx || dy) {
      const t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy)
      if (t > 1) {
        x = b.x
        y = b.y
      } else if (t > 0) {
        x += dx * t
        y += dy * t
      }
    }
    dx = p.x - x
    dy = p.y - y
    return dx * dx + dy * dy
  }
  const tol = tolerance * tolerance
  const keep = new Uint8Array(points.length)
  keep[0] = keep[points.length - 1] = 1
  const stack: [number, number][] = [[0, points.length - 1]]
  while (stack.length) {
    const [first, last] = stack.pop()!
    let max = 0
    let index = 0
    for (let i = first + 1; i < last; i++) {
      const d = sq(points[first], points[last], points[i])
      if (d > max) {
        max = d
        index = i
      }
    }
    if (max > tol) {
      keep[index] = 1
      stack.push([first, index], [index, last])
    }
  }
  return points.filter((_, i) => keep[i])
}

export function smoothHandles(points: { x: number; y: number }[]) {
  return points.map((p, i) => {
    if (i === 0 || i === points.length - 1) return { ...p, hx: 0, hy: 0 }
    const prev = points[i - 1]
    const next = points[i + 1]
    return { ...p, hx: (next.x - prev.x) / 6, hy: (next.y - prev.y) / 6 }
  })
}
