import { memo, useEffect, useRef, useState } from "react"
import Konva from "konva"
import { Arrow, Ellipse, Group, Image as KImage, Line, Path, Rect, Text } from "react-konva"
import { hexToRgb } from "../../core/color"
import { layoutText, applyTextCase } from "../../core/text"
import type { Paint, SceneNode } from "../../core/types"

type Nodes = Record<string, SceneNode>

const f = (n: number) => +n.toFixed(3)

function rgbaString(color: string, alpha: number) {
  const { r, g, b } = hexToRgb(color)
  return `rgba(${r},${g},${b},${alpha})`
}

function paintProps(p: Paint | undefined, w: number, h: number, kind: "fill" | "stroke") {
  if (!p) return {}
  if (p.type === "solid") return { [kind]: rgbaString(p.color, p.opacity) }
  const stops = p.stops.flatMap((s) => [s.position, rgbaString(s.color, s.opacity * p.opacity)])
  if (kind === "stroke") return { stroke: rgbaString(p.stops[0]?.color ?? p.color, p.opacity) }
  if (p.type === "linear") {
    const a = ((p.angle - 90) * Math.PI) / 180
    const cx = w / 2
    const cy = h / 2
    const len = (Math.abs(w * Math.cos(a)) + Math.abs(h * Math.sin(a))) / 2
    return {
      fillLinearGradientStartPoint: { x: cx - Math.cos(a) * len, y: cy - Math.sin(a) * len },
      fillLinearGradientEndPoint: { x: cx + Math.cos(a) * len, y: cy + Math.sin(a) * len },
      fillLinearGradientColorStops: stops,
    }
  }
  return {
    fillRadialGradientStartPoint: { x: w / 2, y: h / 2 },
    fillRadialGradientEndPoint: { x: w / 2, y: h / 2 },
    fillRadialGradientStartRadius: 0,
    fillRadialGradientEndRadius: Math.max(w, h) / 2,
    fillRadialGradientColorStops: stops,
  }
}

function shadowProps(n: SceneNode) {
  const e = n.effects.find((x) => x.visible && x.type === "drop-shadow")
  if (!e) return {}
  return {
    shadowColor: e.color,
    shadowOpacity: e.opacity,
    shadowBlur: e.blur,
    shadowOffsetX: e.x,
    shadowOffsetY: e.y,
    shadowForStrokeEnabled: false,
  }
}

function polygonLocal(n: SceneNode, star: boolean) {
  const count = Math.max(3, n.pointCount ?? (star ? 5 : 3))
  const ratio = n.innerRadius ?? 0.38
  const total = star ? count * 2 : count
  const pts: number[] = []
  for (let i = 0; i < total; i++) {
    const r = star && i % 2 === 1 ? ratio : 1
    const a = ((-90 + (i * 360) / total) * Math.PI) / 180
    pts.push(f(n.width / 2 + (Math.cos(a) * n.width * r) / 2), f(n.height / 2 + (Math.sin(a) * n.height * r) / 2))
  }
  return pts
}

function vertexPathLocal(n: SceneNode) {
  const vs = n.vertices ?? []
  if (!vs.length) return ""
  const P = (v: { x: number; y: number }) => `${f(v.x * n.width)} ${f(v.y * n.height)}`
  let d = `M${P(vs[0])}`
  const seg = (a: (typeof vs)[number], b: (typeof vs)[number]) => {
    if (!a.hx && !a.hy && !b.hx && !b.hy) return ` L${P(b)}`
    return ` C${P({ x: a.x + a.hx, y: a.y + a.hy })} ${P({ x: b.x - b.hx, y: b.y - b.hy })} ${P(b)}`
  }
  for (let i = 1; i < vs.length; i++) d += seg(vs[i - 1], vs[i])
  if (n.closed && vs.length > 2) d += seg(vs[vs.length - 1], vs[0]) + " Z"
  return d
}

const imageCache = new Map<string, HTMLImageElement>()

function useImage(src?: string) {
  const [img, setImg] = useState<HTMLImageElement | null>(() => (src ? (imageCache.get(src) ?? null) : null))
  useEffect(() => {
    if (!src) return
    const cached = imageCache.get(src)
    if (cached?.complete) {
      setImg(cached)
      return
    }
    const el = new window.Image()
    el.crossOrigin = "anonymous"
    el.onload = () => {
      imageCache.set(src, el)
      setImg(el)
    }
    el.src = src
  }, [src])
  return img
}

function ImageBody({ n }: { n: SceneNode }) {
  const img = useImage(n.src)
  if (!img) return <Rect width={n.width} height={n.height} fill="#2a2440" cornerRadius={n.cornerRadius} />
  const iw = img.naturalWidth
  const ih = img.naturalHeight
  if (n.imageFit === "stretch")
    return <KImage image={img} width={n.width} height={n.height} cornerRadius={n.cornerRadius} />
  if (n.imageFit === "fit") {
    const s = Math.min(n.width / iw, n.height / ih)
    const w = iw * s
    const h = ih * s
    return <KImage image={img} x={(n.width - w) / 2} y={(n.height - h) / 2} width={w} height={h} />
  }
  const s = Math.max(n.width / iw, n.height / ih)
  const cw = n.width / s
  const ch = n.height / s
  return (
    <KImage
      image={img}
      width={n.width}
      height={n.height}
      cornerRadius={n.cornerRadius}
      crop={{ x: (iw - cw) / 2, y: (ih - ch) / 2, width: cw, height: ch }}
    />
  )
}

function Body({ n, hidden }: { n: SceneNode; hidden: boolean }) {
  const fills = n.fills.filter((p) => p.visible)
  const strokes = n.strokes.filter((p) => p.visible && n.strokeWidth > 0)
  const stroke = strokes[0]
  const w = Math.max(0, n.width)
  const h = Math.max(0, n.height)
  const dash = n.strokeDash > 0 ? [n.strokeDash, n.strokeDash] : undefined
  const strokeProps = stroke
    ? { ...paintProps(stroke, w, h, "stroke"), strokeWidth: n.strokeWidth, dash, strokeScaleEnabled: false }
    : {}
  const shadow = shadowProps(n)
  const layers = fills.length ? fills : [undefined]

  if (n.type === "text") {
    const layout = layoutText(n)
    const fill = fills[0]
    return (
      <Text
        text={applyTextCase(n.text ?? "", n.textCase)}
        width={Math.max(1, w)}
        height={n.textAutoResize === "fixed" ? h : undefined}
        wrap={n.textAutoResize === "width" ? "none" : "word"}
        fontFamily={`"${n.fontFamily}", Inter, system-ui, -apple-system, "Segoe UI", sans-serif`}
        fontSize={n.fontSize}
        fontStyle={`${n.italic ? "italic " : ""}${n.fontWeight ?? 400}`}
        lineHeight={layout.lineHeight / (n.fontSize ?? 16)}
        letterSpacing={layout.letterSpacing}
        align={n.textAlign}
        textDecoration={n.textDecoration === "none" ? "" : n.textDecoration}
        opacity={hidden ? 0 : 1}
        {...paintProps(fill, w, h, "fill")}
        {...(stroke ? { stroke: stroke.color, strokeWidth: n.strokeWidth, fillAfterStrokeEnabled: true } : {})}
        {...shadow}
      />
    )
  }

  if (n.type === "image") {
    return (
      <>
        <Rect width={w} height={h} fill="transparent" />
        <ImageBody n={n} />
        {stroke && <Rect width={w} height={h} cornerRadius={n.cornerRadius} {...strokeProps} listening={false} />}
      </>
    )
  }

  if (n.type === "line") {
    const color = stroke ? stroke.color : "#000"
    return (
      <Arrow
        points={[0, 0, w, 0]}
        stroke={stroke ? rgbaString(stroke.color, stroke.opacity) : "transparent"}
        strokeWidth={n.strokeWidth}
        fill={color}
        dash={dash}
        pointerAtBeginning={n.startCap !== "none"}
        pointerAtEnding={n.endCap !== "none"}
        pointerLength={Math.max(6, n.strokeWidth * 3)}
        pointerWidth={Math.max(6, n.strokeWidth * 3)}
        lineCap="round"
        hitStrokeWidth={Math.max(10, n.strokeWidth + 8)}
        {...shadow}
      />
    )
  }

  return (
    <>
      {layers.map((p, i) => {
        const fillP = p ? paintProps(p, w, h, "fill") : {}
        const common = {
          key: p?.id ?? i,
          ...fillP,
          ...(i === layers.length - 1 ? strokeProps : {}),
          ...(i === 0 ? shadow : {}),
          hitStrokeWidth: 8,
        }
        switch (n.type) {
          case "frame":
          case "rect":
            return <Rect {...common} width={w} height={h} cornerRadius={Math.min(n.cornerRadius, Math.min(w, h) / 2)} />
          case "ellipse":
            return <Ellipse {...common} x={w / 2} y={h / 2} radiusX={w / 2} radiusY={h / 2} />
          case "polygon":
          case "star":
            return (
              <Line
                {...common}
                points={polygonLocal(n, n.type === "star")}
                closed
                lineJoin={n.cornerRadius ? "round" : "miter"}
                tension={0}
              />
            )
          case "path":
            return (
              <Path
                {...common}
                data={vertexPathLocal(n)}
                lineCap="round"
                lineJoin="round"
                fillEnabled={!!n.closed && !!p}
              />
            )
          default:
            return null
        }
      })}
      {!fills.length && n.type !== "path" && (
        <Rect width={w} height={h} fill="transparent" listening={n.type !== "frame"} />
      )}
    </>
  )
}

interface NodeProps {
  id: string
  nodes: Nodes
  editingTextId: string | null
}

function Wrapper({ n, children }: { n: SceneNode; children: React.ReactNode }) {
  const ref = useRef<Konva.Group>(null)
  const blur = n.effects.find((e) => e.visible && e.type === "layer-blur")
  useEffect(() => {
    const g = ref.current
    if (!g) return
    if (blur) {
      g.cache({ offset: blur.blur * 2 })
      g.filters([Konva.Filters.Blur])
      g.blurRadius(blur.blur / 2)
    } else if (g.isCached()) {
      g.clearCache()
      g.filters([])
    }
  })
  return (
    <Group
      ref={ref}
      nodeId={n.id}
      name="scene-node"
      x={n.x + n.width / 2}
      y={n.y + n.height / 2}
      offsetX={n.width / 2}
      offsetY={n.height / 2}
      width={n.width}
      height={n.height}
      rotation={n.rotation}
      opacity={n.opacity}
      globalCompositeOperation={n.blendMode === "normal" ? "source-over" : (n.blendMode as GlobalCompositeOperation)}
    >
      {children}
    </Group>
  )
}

export const KonvaNode = memo(function KonvaNode({ id, nodes, editingTextId }: NodeProps) {
  const n = nodes[id]
  if (!n || !n.visible) return null

  if (n.type === "group") {
    return (
      <Group nodeId={n.id} name="scene-group" opacity={n.opacity}>
        {n.children?.map((c) => (
          <KonvaNode key={c} id={c} nodes={nodes} editingTextId={editingTextId} />
        ))}
      </Group>
    )
  }

  if (n.type === "frame") {
    const cx = n.x + n.width / 2
    const cy = n.y + n.height / 2
    const rad = (n.rotation * Math.PI) / 180
    const r = Math.min(n.cornerRadius, Math.min(n.width, n.height) / 2)
    return (
      <Group opacity={n.opacity}>
        <Wrapper n={{ ...n, opacity: 1 }}>
          <Body n={{ ...n, strokes: [] }} hidden={false} />
          <Rect width={n.width} height={n.height} fill="transparent" />
        </Wrapper>
        <Group
          clipFunc={
            n.clipContent
              ? (ctx) => {
                  ctx.translate(cx, cy)
                  ctx.rotate(rad)
                  ctx.beginPath()
                  if (r > 0) ctx.roundRect(-n.width / 2, -n.height / 2, n.width, n.height, r)
                  else ctx.rect(-n.width / 2, -n.height / 2, n.width, n.height)
                  ctx.closePath()
                  ctx.rotate(-rad)
                  ctx.translate(-cx, -cy)
                }
              : undefined
          }
        >
          {n.children?.map((c) => (
            <KonvaNode key={c} id={c} nodes={nodes} editingTextId={editingTextId} />
          ))}
        </Group>
        {n.strokes.some((s) => s.visible) && n.strokeWidth > 0 && (
          <Group x={cx} y={cy} offsetX={n.width / 2} offsetY={n.height / 2} rotation={n.rotation} listening={false}>
            <Rect
              width={n.width}
              height={n.height}
              cornerRadius={r}
              stroke={rgbaString(n.strokes.find((s) => s.visible)!.color, n.strokes.find((s) => s.visible)!.opacity)}
              strokeWidth={n.strokeWidth}
              dash={n.strokeDash > 0 ? [n.strokeDash, n.strokeDash] : undefined}
            />
          </Group>
        )}
      </Group>
    )
  }

  return (
    <Wrapper n={n}>
      <Body n={n} hidden={editingTextId === n.id} />
    </Wrapper>
  )
})
