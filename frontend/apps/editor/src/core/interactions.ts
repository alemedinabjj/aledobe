import { descendants, isVisibleDeep } from "./doc"
import { handleLocal, nodeAABB, nodeCenter, rotatePoint } from "./geometry"
import type { Doc, Guide, Handle, Point, Rect, SceneNode } from "./types"

export interface SnapTargets {
  xs: { value: number; rect: Rect }[]
  ys: { value: number; rect: Rect }[]
}

export function collectSnapTargets(doc: Doc, pageId: string, exclude: string[]): SnapTargets {
  const skip = new Set(exclude.flatMap((id) => [id, ...descendants(doc, id)]))
  const xs: SnapTargets["xs"] = []
  const ys: SnapTargets["ys"] = []
  const walk = (ids: string[]) => {
    for (const id of ids) {
      if (skip.has(id) || !isVisibleDeep(doc, id)) continue
      const r = nodeAABB(doc, id)
      xs.push({ value: r.x, rect: r }, { value: r.x + r.width / 2, rect: r }, { value: r.x + r.width, rect: r })
      ys.push({ value: r.y, rect: r }, { value: r.y + r.height / 2, rect: r }, { value: r.y + r.height, rect: r })
      const n = doc.nodes[id]
      if (n.children && n.type !== "group") walk(n.children)
    }
  }
  walk(doc.pages.find((p) => p.id === pageId)?.children ?? [])
  return { xs, ys }
}

export function snapRect(rect: Rect, targets: SnapTargets, threshold: number) {
  const mine = {
    x: [rect.x, rect.x + rect.width / 2, rect.x + rect.width],
    y: [rect.y, rect.y + rect.height / 2, rect.y + rect.height],
  }
  const best = (values: number[], list: SnapTargets["xs"]) => {
    let delta = Infinity
    for (const v of values) {
      for (const t of list) {
        const d = t.value - v
        if (Math.abs(d) < Math.abs(delta) && Math.abs(d) <= threshold) delta = d
      }
    }
    return isFinite(delta) ? delta : 0
  }
  const dx = best(mine.x, targets.xs)
  const dy = best(mine.y, targets.ys)
  const snapped = { ...rect, x: rect.x + dx, y: rect.y + dy }
  const guides: Guide[] = []
  const sx = [snapped.x, snapped.x + snapped.width / 2, snapped.x + snapped.width]
  const sy = [snapped.y, snapped.y + snapped.height / 2, snapped.y + snapped.height]
  for (const t of targets.xs) {
    if (sx.some((v) => Math.abs(v - t.value) < 0.01)) {
      guides.push({
        axis: "x",
        value: t.value,
        from: Math.min(snapped.y, t.rect.y),
        to: Math.max(snapped.y + snapped.height, t.rect.y + t.rect.height),
      })
    }
  }
  for (const t of targets.ys) {
    if (sy.some((v) => Math.abs(v - t.value) < 0.01)) {
      guides.push({
        axis: "y",
        value: t.value,
        from: Math.min(snapped.x, t.rect.x),
        to: Math.max(snapped.x + snapped.width, t.rect.x + t.rect.width),
      })
    }
  }
  return { dx, dy, guides: dedupeGuides(guides) }
}

function dedupeGuides(guides: Guide[]) {
  const map = new Map<string, Guide>()
  for (const g of guides) {
    const key = `${g.axis}:${g.value.toFixed(2)}`
    const cur = map.get(key)
    if (!cur) map.set(key, { ...g })
    else {
      cur.from = Math.min(cur.from, g.from)
      cur.to = Math.max(cur.to, g.to)
    }
  }
  return [...map.values()]
}

export function resizeLocal(
  n0: SceneNode,
  handle: Handle,
  pointer: Point,
  opts: { keepRatio: boolean; fromCenter: boolean },
): Rect {
  const c0 = nodeCenter(n0)
  const local = rotatePoint(pointer, c0, -n0.rotation)
  const px = local.x - c0.x
  const py = local.y - c0.y
  const w0 = n0.width
  const h0 = n0.height
  let L = -w0 / 2
  let R = w0 / 2
  let T = -h0 / 2
  let B = h0 / 2
  const hl = handleLocal(handle)
  if (hl.x > 0) R = px
  if (hl.x < 0) L = px
  if (hl.y > 0) B = py
  if (hl.y < 0) T = py
  if (opts.fromCenter) {
    if (hl.x > 0) L = -R
    if (hl.x < 0) R = -L
    if (hl.y > 0) T = -B
    if (hl.y < 0) B = -T
  }
  if (opts.keepRatio && w0 > 0 && h0 > 0) {
    const ratio = w0 / h0
    const isCorner = hl.x !== 0 && hl.y !== 0
    if (isCorner) {
      const sx = Math.abs(R - L) / w0
      const sy = Math.abs(B - T) / h0
      const s = Math.max(sx, sy)
      const nw = w0 * s * Math.sign(R - L || 1)
      const nh = h0 * s * Math.sign(B - T || 1)
      if (opts.fromCenter) {
        R = nw / 2
        L = -nw / 2
        B = nh / 2
        T = -nh / 2
      } else {
        if (hl.x > 0) R = L + nw
        else L = R - nw
        if (hl.y > 0) B = T + nh
        else T = B - nh
      }
    } else if (hl.x !== 0) {
      const nh = Math.abs(R - L) / ratio
      T = -nh / 2
      B = nh / 2
    } else {
      const nw = Math.abs(B - T) * ratio
      L = -nw / 2
      R = nw / 2
    }
  }
  const left = Math.min(L, R)
  const right = Math.max(L, R)
  const top = Math.min(T, B)
  const bottom = Math.max(T, B)
  const width = right - left
  const height = bottom - top
  const lc = { x: c0.x + (left + right) / 2, y: c0.y + (top + bottom) / 2 }
  const wc = rotatePoint(lc, c0, n0.rotation)
  return { x: wc.x - width / 2, y: wc.y - height / 2, width, height }
}

export function resizeBox(
  box: Rect,
  handle: Handle,
  pointer: Point,
  opts: { keepRatio: boolean; fromCenter: boolean },
): Rect {
  const fake = { ...box, rotation: 0 } as SceneNode
  return resizeLocal(fake, handle, pointer, opts)
}

export function roundRect(r: Rect): Rect {
  const x = Math.round(r.x)
  const y = Math.round(r.y)
  return { x, y, width: Math.round(r.x + r.width) - x, height: Math.round(r.y + r.height) - y }
}

export function measureBetween(a: Rect, b: Rect) {
  const out: { x1: number; y1: number; x2: number; y2: number; label: string }[] = []
  const acx = a.x + a.width / 2
  const acy = a.y + a.height / 2
  const inside = a.x >= b.x && a.y >= b.y && a.x + a.width <= b.x + b.width && a.y + a.height <= b.y + b.height
  const fmt = (v: number) => `${Math.round(v * 100) / 100}`
  if (inside) {
    out.push({ x1: b.x, y1: acy, x2: a.x, y2: acy, label: fmt(a.x - b.x) })
    out.push({ x1: a.x + a.width, y1: acy, x2: b.x + b.width, y2: acy, label: fmt(b.x + b.width - a.x - a.width) })
    out.push({ x1: acx, y1: b.y, x2: acx, y2: a.y, label: fmt(a.y - b.y) })
    out.push({ x1: acx, y1: a.y + a.height, x2: acx, y2: b.y + b.height, label: fmt(b.y + b.height - a.y - a.height) })
    return out.filter((m) => Math.hypot(m.x2 - m.x1, m.y2 - m.y1) > 0.5)
  }
  if (b.x > a.x + a.width) out.push({ x1: a.x + a.width, y1: acy, x2: b.x, y2: acy, label: fmt(b.x - a.x - a.width) })
  if (b.x + b.width < a.x) out.push({ x1: b.x + b.width, y1: acy, x2: a.x, y2: acy, label: fmt(a.x - b.x - b.width) })
  if (b.y > a.y + a.height)
    out.push({ x1: acx, y1: a.y + a.height, x2: acx, y2: b.y, label: fmt(b.y - a.y - a.height) })
  if (b.y + b.height < a.y)
    out.push({ x1: acx, y1: b.y + b.height, x2: acx, y2: a.y, label: fmt(a.y - b.y - b.height) })
  return out
}
