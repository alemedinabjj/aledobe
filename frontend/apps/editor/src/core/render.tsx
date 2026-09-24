import { Fragment, type ReactElement, type SVGProps } from "react"
import { rgba } from "./color"
import { nodeCenter } from "./geometry"
import { polygonPoints, starPoints, vertexPath } from "./shapes"
import { applyTextCase, layoutText } from "./text"
import type { Effect, Paint, SceneNode } from "./types"

type ShapeProps = SVGProps<SVGElement> & Record<string, unknown>

export interface RenderOptions {
  nodes: Record<string, SceneNode>
  editingTextId?: string | null
  interactive?: boolean
}

const closedShape = (n: SceneNode) => n.type !== "line" && n.type !== "text" && !(n.type === "path" && !n.closed)

function geometry(n: SceneNode, props: ShapeProps = {}): ReactElement | null {
  const p = props as Record<string, unknown>
  switch (n.type) {
    case "frame":
    case "rect":
    case "image": {
      const r = Math.min(n.cornerRadius, Math.min(n.width, n.height) / 2)
      return <rect x={n.x} y={n.y} width={Math.max(0, n.width)} height={Math.max(0, n.height)} rx={r} ry={r} {...p} />
    }
    case "group":
    case "text":
      return <rect x={n.x} y={n.y} width={Math.max(0, n.width)} height={Math.max(0, n.height)} {...p} />
    case "ellipse":
      return <ellipse cx={n.x + n.width / 2} cy={n.y + n.height / 2} rx={n.width / 2} ry={n.height / 2} {...p} />
    case "polygon":
      return <polygon points={polygonPoints(n)} strokeLinejoin={n.cornerRadius ? "round" : "miter"} {...p} />
    case "star":
      return <polygon points={starPoints(n)} strokeLinejoin={n.cornerRadius ? "round" : "miter"} {...p} />
    case "line":
      return <line x1={n.x} y1={n.y + n.height / 2} x2={n.x + n.width} y2={n.y + n.height / 2} {...p} />
    case "path":
      return <path d={vertexPath(n)} strokeLinecap="round" strokeLinejoin="round" {...p} />
  }
}

function paintDef(paint: Paint, id: string) {
  const stops = paint.stops.map((s, i) => (
    <stop key={i} offset={s.position} stopColor={s.color} stopOpacity={s.opacity * paint.opacity} />
  ))
  if (paint.type === "linear") {
    return (
      <linearGradient key={id} id={id} gradientTransform={`rotate(${paint.angle - 90} 0.5 0.5)`}>
        {stops}
      </linearGradient>
    )
  }
  if (paint.type === "radial") {
    return (
      <radialGradient key={id} id={id} cx="0.5" cy="0.5" r="0.5">
        {stops}
      </radialGradient>
    )
  }
  return null
}

const paintValue = (paint: Paint, id: string) => (paint.type === "solid" ? paint.color : `url(#${id})`)
const paintOpacity = (paint: Paint) => (paint.type === "solid" ? paint.opacity : 1)

function filterDef(n: SceneNode, id: string) {
  const effects = n.effects.filter((e) => e.visible)
  if (!effects.length) return null
  const drops = effects.filter((e) => e.type === "drop-shadow")
  const inners = effects.filter((e) => e.type === "inner-shadow")
  const blur = effects.find((e) => e.type === "layer-blur")
  const parts: ReactElement[] = []
  const merge: string[] = []
  drops.forEach((e: Effect, i) => {
    const k = `d${i}`
    parts.push(
      <Fragment key={k}>
        <feMorphology
          in="SourceAlpha"
          operator={e.spread >= 0 ? "dilate" : "erode"}
          radius={Math.abs(e.spread)}
          result={`${k}m`}
        />
        <feGaussianBlur in={`${k}m`} stdDeviation={e.blur / 2} result={`${k}b`} />
        <feOffset in={`${k}b`} dx={e.x} dy={e.y} result={`${k}o`} />
        <feFlood floodColor={e.color} floodOpacity={e.opacity} result={`${k}c`} />
        <feComposite in={`${k}c`} in2={`${k}o`} operator="in" result={k} />
      </Fragment>,
    )
    merge.push(k)
  })
  if (blur) {
    parts.push(<feGaussianBlur key="lb" in="SourceGraphic" stdDeviation={blur.blur / 2} result="lb" />)
    merge.push("lb")
  } else merge.push("SourceGraphic")
  inners.forEach((e, i) => {
    const k = `i${i}`
    parts.push(
      <Fragment key={k}>
        <feFlood floodColor="#000" result={`${k}f`} />
        <feComposite in={`${k}f`} in2="SourceAlpha" operator="out" result={`${k}inv`} />
        <feMorphology in={`${k}inv`} operator="dilate" radius={Math.max(0, e.spread)} result={`${k}sp`} />
        <feGaussianBlur in={`${k}sp`} stdDeviation={e.blur / 2} result={`${k}b`} />
        <feOffset in={`${k}b`} dx={e.x} dy={e.y} result={`${k}o`} />
        <feComposite in={`${k}o`} in2="SourceAlpha" operator="in" result={`${k}clip`} />
        <feFlood floodColor={e.color} floodOpacity={e.opacity} result={`${k}c`} />
        <feComposite in={`${k}c`} in2={`${k}clip`} operator="in" result={k} />
      </Fragment>,
    )
    merge.push(k)
  })
  return (
    <filter key={id} id={id} x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
      {parts}
      <feMerge>
        {merge.map((m) => (
          <feMergeNode key={m} in={m} />
        ))}
      </feMerge>
    </filter>
  )
}

function markerDef(cap: SceneNode["startCap"], id: string, color: string, start: boolean) {
  if (cap === "none") return null
  const size = 4
  const body =
    cap === "circle" ? (
      <circle cx="5" cy="5" r="3" fill={color} />
    ) : cap === "triangle" ? (
      <path d={start ? "M10 0 L0 5 L10 10 Z" : "M0 0 L10 5 L0 10 Z"} fill={color} />
    ) : (
      <path
        d={start ? "M9 1 L2 5 L9 9" : "M1 1 L8 5 L1 9"}
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    )
  return (
    <marker
      key={id}
      id={id}
      viewBox="0 0 10 10"
      refX={cap === "arrow" ? (start ? 2 : 8) : 5}
      refY="5"
      markerWidth={size}
      markerHeight={size}
      orient="auto"
      markerUnits="strokeWidth"
    >
      {body}
    </marker>
  )
}

function TextBody({ n, hidden }: { n: SceneNode; hidden: boolean }) {
  const layout = layoutText(n)
  const x = n.textAlign === "center" ? n.x + n.width / 2 : n.textAlign === "right" ? n.x + n.width : n.x
  const anchor = n.textAlign === "center" ? "middle" : n.textAlign === "right" ? "end" : "start"
  const fills = n.fills.filter((f) => f.visible)
  const lines = layout.lines.length ? layout.lines : [applyTextCase(n.text ?? "", n.textCase)]
  return (
    <>
      {fills.map((paint) => (
        <text
          key={paint.id}
          x={x}
          y={n.y}
          fill={paintValue(paint, `${n.id}-p-${paint.id}`)}
          fillOpacity={paintOpacity(paint)}
          fontFamily={`"${n.fontFamily}", Inter, sans-serif`}
          fontSize={n.fontSize}
          fontWeight={n.fontWeight}
          fontStyle={n.italic ? "italic" : "normal"}
          letterSpacing={layout.letterSpacing}
          textAnchor={anchor}
          textDecoration={n.textDecoration === "none" ? undefined : n.textDecoration}
          style={{ whiteSpace: "pre", opacity: hidden ? 0 : 1 }}
        >
          {lines.map((line, i) => (
            <tspan key={i} x={x} y={n.y + i * layout.lineHeight + layout.baseline}>
              {line || " "}
            </tspan>
          ))}
        </text>
      ))}
      {n.strokes
        .filter((s) => s.visible)
        .map((s) => (
          <text
            key={s.id}
            x={x}
            y={n.y}
            fill="none"
            stroke={s.color}
            strokeOpacity={s.opacity}
            strokeWidth={n.strokeWidth}
            fontFamily={`"${n.fontFamily}", Inter, sans-serif`}
            fontSize={n.fontSize}
            fontWeight={n.fontWeight}
            fontStyle={n.italic ? "italic" : "normal"}
            letterSpacing={layout.letterSpacing}
            textAnchor={anchor}
            style={{ whiteSpace: "pre", opacity: hidden ? 0 : 1 }}
          >
            {lines.map((line, i) => (
              <tspan key={i} x={x} y={n.y + i * layout.lineHeight + layout.baseline}>
                {line || " "}
              </tspan>
            ))}
          </text>
        ))}
    </>
  )
}

export function NodeView({ id, options }: { id: string; options: RenderOptions }) {
  const n = options.nodes[id]
  if (!n || !n.visible) return null
  const c = nodeCenter(n)
  const rotate = n.rotation ? `rotate(${n.rotation} ${c.x} ${c.y})` : undefined
  const defs: ReactElement[] = []
  const fills = n.fills.filter((f) => f.visible)
  const strokes = n.strokes.filter((s) => s.visible && n.strokeWidth > 0)
  fills.concat(strokes).forEach((p) => {
    if (p.type !== "solid") {
      const def = paintDef(p, `${n.id}-p-${p.id}`)
      if (def) defs.push(def)
    }
  })
  const filterId = `${n.id}-fx`
  const filter = filterDef(n, filterId)
  if (filter) defs.push(filter)
  const hitProps = options.interactive ? { "data-node-id": n.id } : {}
  const style = { mixBlendMode: n.blendMode === "normal" ? undefined : n.blendMode } as const

  if (n.type === "group") {
    return (
      <g {...hitProps} opacity={n.opacity} style={style} filter={filter ? `url(#${filterId})` : undefined}>
        {defs.length > 0 && <defs>{defs}</defs>}
        {n.children?.map((cid) => (
          <NodeView key={cid} id={cid} options={options} />
        ))}
      </g>
    )
  }

  const strokeColor = strokes[0]?.color ?? "#000"
  const startMarker =
    n.type === "line" || n.type === "path" ? markerDef(n.startCap, `${n.id}-ms`, strokeColor, true) : null
  const endMarker =
    n.type === "line" || n.type === "path" ? markerDef(n.endCap, `${n.id}-me`, strokeColor, false) : null
  if (startMarker) defs.push(startMarker)
  if (endMarker) defs.push(endMarker)

  const closed = closedShape(n)
  const align = closed ? n.strokeAlign : "center"
  const clipId = `${n.id}-clip`
  const maskId = `${n.id}-mask`
  if (closed && (align === "inside" || n.type === "image")) {
    defs.push(
      <clipPath key={clipId} id={clipId}>
        {geometry(n)}
      </clipPath>,
    )
  }
  const childClipId = `${n.id}-cclip`
  if (n.type === "frame" && n.clipContent) {
    defs.push(
      <clipPath key={childClipId} id={childClipId}>
        {geometry(n, { transform: rotate })}
      </clipPath>,
    )
  }
  if (closed && align === "outside") {
    const pad = n.strokeWidth * 2 + 4
    defs.push(
      <mask
        key={maskId}
        id={maskId}
        maskUnits="userSpaceOnUse"
        x={n.x - pad}
        y={n.y - pad}
        width={n.width + pad * 2}
        height={n.height + pad * 2}
      >
        <rect x={n.x - pad} y={n.y - pad} width={n.width + pad * 2} height={n.height + pad * 2} fill="#fff" />
        {geometry(n, { fill: "#000" })}
      </mask>,
    )
  }

  const dash = n.strokeDash > 0 ? `${n.strokeDash} ${n.strokeDash}` : undefined
  const strokeEls = strokes.map((s) => {
    const width = align === "center" ? n.strokeWidth : n.strokeWidth * 2
    const el = geometry(n, {
      key: s.id,
      fill: "none",
      stroke: paintValue(s, `${n.id}-p-${s.id}`),
      strokeOpacity: paintOpacity(s),
      strokeWidth: width,
      strokeDasharray: dash,
      markerStart: startMarker ? `url(#${n.id}-ms)` : undefined,
      markerEnd: endMarker ? `url(#${n.id}-me)` : undefined,
      clipPath: align === "inside" ? `url(#${clipId})` : undefined,
      mask: align === "outside" ? `url(#${maskId})` : undefined,
    })
    return el
  })

  const hit =
    options.interactive &&
    (n.type === "line" || (n.type === "path" && !n.closed)
      ? geometry(n, {
          stroke: "transparent",
          strokeWidth: Math.max(8, n.strokeWidth + 6),
          fill: "none",
          pointerEvents: "stroke",
        })
      : n.type === "path"
        ? geometry(n, { fill: "transparent", stroke: "transparent", strokeWidth: 8, pointerEvents: "all" })
        : n.type === "frame"
          ? null
          : geometry(n, { fill: "transparent", pointerEvents: "all" }))

  let body: ReactElement
  if (n.type === "text") {
    body = (
      <>
        <TextBody n={n} hidden={options.editingTextId === n.id} />
        {options.interactive && (
          <rect
            x={n.x}
            y={n.y}
            width={Math.max(n.width, 4)}
            height={Math.max(n.height, 4)}
            fill="transparent"
            pointerEvents="all"
          />
        )}
      </>
    )
  } else if (n.type === "image") {
    const par = n.imageFit === "fit" ? "xMidYMid meet" : n.imageFit === "stretch" ? "none" : "xMidYMid slice"
    body = (
      <>
        {fills.map((p) =>
          geometry(n, { key: p.id, fill: paintValue(p, `${n.id}-p-${p.id}`), fillOpacity: paintOpacity(p) }),
        )}
        {n.src && (
          <image
            href={n.src}
            x={n.x}
            y={n.y}
            width={Math.max(0, n.width)}
            height={Math.max(0, n.height)}
            preserveAspectRatio={par}
            clipPath={`url(#${clipId})`}
          />
        )}
        {strokeEls}
        {hit}
      </>
    )
  } else {
    body = (
      <>
        {fills.map((p) =>
          geometry(n, {
            key: p.id,
            fill: paintValue(p, `${n.id}-p-${p.id}`),
            fillOpacity: paintOpacity(p),
          }),
        )}
        {n.type !== "frame" && strokeEls}
        {hit}
      </>
    )
  }

  if (n.type === "frame") {
    const frameHit = options.interactive ? geometry(n, { fill: "transparent", pointerEvents: "all" }) : null
    return (
      <g {...hitProps} opacity={n.opacity} style={style}>
        {defs.length > 0 && <defs>{defs}</defs>}
        <g transform={rotate} filter={filter ? `url(#${filterId})` : undefined}>
          {body}
          {frameHit}
        </g>
        <g clipPath={n.clipContent ? `url(#${childClipId})` : undefined}>
          {n.children?.map((cid) => (
            <NodeView key={cid} id={cid} options={options} />
          ))}
        </g>
        <g transform={rotate}>{strokeEls}</g>
      </g>
    )
  }

  return (
    <g {...hitProps} opacity={n.opacity} style={style} filter={filter ? `url(#${filterId})` : undefined}>
      {defs.length > 0 && <defs>{defs}</defs>}
      <g transform={rotate}>{body}</g>
    </g>
  )
}

export function paintToCss(p: Paint) {
  if (p.type === "solid") return rgba(p.color, p.opacity)
  const stops = p.stops
    .map((s) => `${rgba(s.color, s.opacity * p.opacity)} ${Math.round(s.position * 100)}%`)
    .join(", ")
  return p.type === "linear" ? `linear-gradient(${p.angle}deg, ${stops})` : `radial-gradient(circle, ${stops})`
}
