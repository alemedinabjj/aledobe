import { Fragment } from "react"
import { Circle, Group, Line, Path, Rect, Shape, Text } from "react-konva"
import { useEditor } from "../../core/store"
import { lineEndpoints, nodeAABB, nodeCorners, selectionBounds, toScreen } from "../../core/geometry"
import { topLevel } from "../../core/doc"
import type { Camera, Doc, Point } from "../../core/types"

export const ACCENT = "#b26bff"
const GUIDE = "#ff4fd8"

function outlinePoints(doc: Doc, id: string, cam: Camera): number[] {
  const n = doc.nodes[id]
  if (!n) return []
  let pts: Point[]
  if (n.type === "line") pts = lineEndpoints(n)
  else if (n.type === "group") {
    const r = nodeAABB(doc, id)
    pts = [
      { x: r.x, y: r.y },
      { x: r.x + r.width, y: r.y },
      { x: r.x + r.width, y: r.y + r.height },
      { x: r.x, y: r.y + r.height },
    ]
  } else pts = nodeCorners(n)
  return pts.flatMap((p) => {
    const s = toScreen(p, cam)
    return [s.x, s.y]
  })
}

function Pill({ x, y, text, color = ACCENT }: { x: number; y: number; text: string; color?: string }) {
  const w = text.length * 6.4 + 12
  return (
    <Group x={x - w / 2} y={y} listening={false}>
      <Rect width={w} height={18} cornerRadius={4} fill={color} />
      <Text
        text={text}
        width={w}
        height={18}
        align="center"
        verticalAlign="middle"
        fontSize={11}
        fontStyle="500"
        fill="#fff"
        fontFamily="Inter, system-ui, -apple-system, Segoe UI, sans-serif"
      />
    </Group>
  )
}

const fmt = (v: number) => `${Math.round(v * 100) / 100}`

export function PixelGrid() {
  const cam = useEditor((s) => s.camera)
  const viewport = useEditor((s) => s.viewport)
  return (
    <Shape
      listening={false}
      sceneFunc={(ctx) => {
        const step = cam.zoom
        ctx.beginPath()
        for (let x = cam.x % step; x < viewport.width; x += step) {
          ctx.moveTo(Math.round(x) + 0.5, 0)
          ctx.lineTo(Math.round(x) + 0.5, viewport.height)
        }
        for (let y = cam.y % step; y < viewport.height; y += step) {
          ctx.moveTo(0, Math.round(y) + 0.5)
          ctx.lineTo(viewport.width, Math.round(y) + 0.5)
        }
        ctx.strokeStyle = "rgba(128,128,128,0.18)"
        ctx.lineWidth = 1
        ctx.stroke()
      }}
    />
  )
}

export function Overlay() {
  const doc = useEditor((s) => s.doc)
  const pageId = useEditor((s) => s.pageId)
  const cam = useEditor((s) => s.camera)
  const selection = useEditor((s) => s.selection)
  const hoverId = useEditor((s) => s.hoverId)
  const guides = useEditor((s) => s.guides)
  const marquee = useEditor((s) => s.marquee)
  const penDraft = useEditor((s) => s.penDraft)
  const measures = useEditor((s) => s.measures)
  const editingTextId = useEditor((s) => s.editingTextId)
  const txBase = useEditor((s) => s.txBase)
  const tool = useEditor((s) => s.tool)
  const transforming = useEditor((s) => s.transforming)
  const page = doc.pages.find((p) => p.id === pageId)

  const ids = topLevel(doc, selection)
  const single = ids.length === 1 ? doc.nodes[ids[0]] : null
  const bounds = selectionBounds(doc, ids)
  const interacting = !!txBase

  let dimension: { x: number; y: number; text: string } | null = null
  if (single?.type === "line") {
    const [a, b] = lineEndpoints(single).map((p) => toScreen(p, cam))
    dimension = { x: (a.x + b.x) / 2, y: Math.max(a.y, b.y) + 10, text: fmt(single.width) }
  } else if (single && single.type !== "group") {
    const pts = nodeCorners(single).map((p) => toScreen(p, cam))
    dimension = {
      x: pts.reduce((s, p) => s + p.x, 0) / 4,
      y: Math.max(...pts.map((p) => p.y)) + 8,
      text: `${fmt(single.width)} × ${fmt(single.height)}`,
    }
  } else if (bounds) {
    const tl = toScreen({ x: bounds.x, y: bounds.y + bounds.height }, cam)
    dimension = {
      x: tl.x + (bounds.width * cam.zoom) / 2,
      y: tl.y + 8,
      text: `${fmt(bounds.width)} × ${fmt(bounds.height)}`,
    }
  }

  const drawPath = (points: NonNullable<typeof penDraft>["points"]) =>
    points
      .map((p, i) => {
        const s = toScreen(p, cam)
        if (i === 0) return `M${s.x} ${s.y}`
        const prev = points[i - 1]
        const c1 = toScreen({ x: prev.x + prev.hx, y: prev.y + prev.hy }, cam)
        const c2 = toScreen({ x: p.x - p.hx, y: p.y - p.hy }, cam)
        return `C${c1.x} ${c1.y} ${c2.x} ${c2.y} ${s.x} ${s.y}`
      })
      .join(" ")

  return (
    <>
      {(page?.children ?? [])
        .map((id) => doc.nodes[id])
        .filter((n) => n && n.visible && n.type === "frame")
        .map((f) => {
          const r = nodeAABB(doc, f.id)
          const p = toScreen({ x: r.x, y: r.y }, cam)
          const active = selection.includes(f.id) || hoverId === f.id
          return (
            <Text
              key={f.id}
              nodeId={f.id}
              x={p.x}
              y={p.y - 17}
              text={f.name}
              fontSize={11}
              fontFamily="Inter, system-ui, -apple-system, Segoe UI, sans-serif"
              fill={active ? "#c9a3ff" : "rgba(160,150,190,0.9)"}
              width={Math.max(40, r.width * cam.zoom)}
              wrap="none"
              ellipsis
            />
          )
        })}

      {hoverId && !selection.includes(hoverId) && doc.nodes[hoverId] && !interacting && (
        <Line
          points={outlinePoints(doc, hoverId, cam)}
          closed={doc.nodes[hoverId].type !== "line"}
          stroke={ACCENT}
          strokeWidth={1.5}
          listening={false}
        />
      )}

      {!transforming &&
        selection.map((id) => (
          <Line
            key={id}
            points={outlinePoints(doc, id, cam)}
            closed={doc.nodes[id]?.type !== "line"}
            stroke={ACCENT}
            strokeWidth={1}
            dash={ids.includes(id) ? undefined : [3, 2]}
            listening={false}
          />
        ))}

      {single?.type === "line" &&
        !interacting &&
        tool === "move" &&
        lineEndpoints(single).map((p, i) => {
          const s = toScreen(p, cam)
          return (
            <Circle
              key={i}
              handle={i === 0 ? "line-start" : "line-end"}
              x={s.x}
              y={s.y}
              radius={5}
              fill="#fff"
              stroke={ACCENT}
              strokeWidth={1.5}
              hitStrokeWidth={10}
            />
          )
        })}

      {dimension && !editingTextId && !transforming && <Pill x={dimension.x} y={dimension.y} text={dimension.text} />}

      {guides.map((g, i) => {
        const a = g.axis === "x" ? toScreen({ x: g.value, y: g.from }, cam) : toScreen({ x: g.from, y: g.value }, cam)
        const b = g.axis === "x" ? toScreen({ x: g.value, y: g.to }, cam) : toScreen({ x: g.to, y: g.value }, cam)
        return <Line key={i} points={[a.x, a.y, b.x, b.y]} stroke={GUIDE} strokeWidth={1} listening={false} />
      })}

      {measures.map((m, i) => {
        const a = toScreen({ x: m.x1, y: m.y1 }, cam)
        const b = toScreen({ x: m.x2, y: m.y2 }, cam)
        return (
          <Fragment key={i}>
            <Line points={[a.x, a.y, b.x, b.y]} stroke={GUIDE} strokeWidth={1} listening={false} />
            <Pill x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 9} text={m.label} color={GUIDE} />
          </Fragment>
        )
      })}

      {marquee && (
        <Rect
          x={marquee.x * cam.zoom + cam.x}
          y={marquee.y * cam.zoom + cam.y}
          width={marquee.width * cam.zoom}
          height={marquee.height * cam.zoom}
          fill="rgba(178,107,255,0.08)"
          stroke={ACCENT}
          strokeWidth={1}
          listening={false}
        />
      )}

      {penDraft && penDraft.points.length > 0 && (
        <Group listening={false}>
          <Path
            data={drawPath(penDraft.points)}
            stroke={tool === "pencil" ? "#000" : ACCENT}
            strokeWidth={tool === "pencil" ? 2 * cam.zoom : 1.5}
            lineCap="round"
            lineJoin="round"
          />
          {tool === "pen" && penDraft.cursor && (
            <Line
              points={[
                toScreen(penDraft.points[penDraft.points.length - 1], cam).x,
                toScreen(penDraft.points[penDraft.points.length - 1], cam).y,
                toScreen(penDraft.cursor, cam).x,
                toScreen(penDraft.cursor, cam).y,
              ]}
              stroke={ACCENT}
              strokeWidth={1}
              dash={[4, 3]}
            />
          )}
          {tool === "pen" &&
            penDraft.points.map((p, i) => {
              const s = toScreen(p, cam)
              const h1 = toScreen({ x: p.x + p.hx, y: p.y + p.hy }, cam)
              const h2 = toScreen({ x: p.x - p.hx, y: p.y - p.hy }, cam)
              return (
                <Fragment key={i}>
                  {(p.hx !== 0 || p.hy !== 0) && (
                    <>
                      <Line points={[h1.x, h1.y, h2.x, h2.y]} stroke={ACCENT} strokeWidth={1} />
                      <Circle x={h1.x} y={h1.y} radius={3} fill={ACCENT} />
                      <Circle x={h2.x} y={h2.y} radius={3} fill={ACCENT} />
                    </>
                  )}
                  <Rect
                    x={s.x - 4}
                    y={s.y - 4}
                    width={8}
                    height={8}
                    fill={i === 0 ? ACCENT : "#fff"}
                    stroke={ACCENT}
                    strokeWidth={1.5}
                  />
                </Fragment>
              )
            })}
        </Group>
      )}
    </>
  )
}
