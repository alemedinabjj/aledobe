import { paintToCss } from "./render"
import { rgba } from "./color"
import type { SceneNode } from "./types"

const px = (v: number) => `${Math.round(v * 100) / 100}px`

export function nodeToCss(n: SceneNode, parent?: SceneNode | null) {
  const lines: [string, string][] = []
  lines.push(["width", px(n.width)])
  lines.push(["height", px(n.height)])
  if (parent && !parent.layout) {
    lines.push(["position", "absolute"])
    lines.push(["left", px(n.x - parent.x)])
    lines.push(["top", px(n.y - parent.y)])
  }
  if (n.rotation) lines.push(["transform", `rotate(${n.rotation}deg)`])
  if (n.opacity < 1) lines.push(["opacity", `${Math.round(n.opacity * 100) / 100}`])
  if (n.blendMode !== "normal") lines.push(["mix-blend-mode", n.blendMode])
  const fills = n.fills.filter((f) => f.visible)
  if (n.type === "text") {
    if (fills[0]) lines.push(["color", paintToCss(fills[0])])
    lines.push(["font-family", `"${n.fontFamily}", sans-serif`])
    lines.push(["font-size", px(n.fontSize ?? 16)])
    lines.push(["font-weight", `${n.fontWeight}`])
    if (n.italic) lines.push(["font-style", "italic"])
    lines.push(["line-height", `${n.lineHeight}%`])
    if (n.letterSpacing) lines.push(["letter-spacing", `${(n.letterSpacing ?? 0) / 100}em`])
    if (n.textAlign !== "left") lines.push(["text-align", n.textAlign ?? "left"])
    if (n.textDecoration !== "none") lines.push(["text-decoration", n.textDecoration ?? "none"])
    if (n.textCase === "upper") lines.push(["text-transform", "uppercase"])
    if (n.textCase === "lower") lines.push(["text-transform", "lowercase"])
    if (n.textCase === "title") lines.push(["text-transform", "capitalize"])
  } else if (fills.length && n.type !== "line") {
    lines.push(["background", fills.map(paintToCss).reverse().join(", ")])
  }
  const stroke = n.strokes.find((s) => s.visible)
  if (stroke && n.strokeWidth) {
    const style = n.strokeDash ? "dashed" : "solid"
    if (n.type === "line")
      lines.push(["border-top", `${px(n.strokeWidth)} ${style} ${rgba(stroke.color, stroke.opacity)}`])
    else if (n.strokeAlign === "outside")
      lines.push(["outline", `${px(n.strokeWidth)} ${style} ${rgba(stroke.color, stroke.opacity)}`])
    else lines.push(["border", `${px(n.strokeWidth)} ${style} ${rgba(stroke.color, stroke.opacity)}`])
  }
  if (n.type === "ellipse") lines.push(["border-radius", "50%"])
  else if (n.cornerRadius) lines.push(["border-radius", px(n.cornerRadius)])
  const shadows = n.effects
    .filter((e) => e.visible && e.type !== "layer-blur")
    .map(
      (e) =>
        `${e.type === "inner-shadow" ? "inset " : ""}${px(e.x)} ${px(e.y)} ${px(e.blur)} ${px(e.spread)} ${rgba(e.color, e.opacity)}`,
    )
  if (shadows.length) lines.push(["box-shadow", shadows.join(", ")])
  const blur = n.effects.find((e) => e.visible && e.type === "layer-blur")
  if (blur) lines.push(["filter", `blur(${px(blur.blur / 2)})`])
  if (n.type === "frame" && n.clipContent) lines.push(["overflow", "hidden"])
  if (n.layout) {
    const l = n.layout
    lines.push(["display", "flex"])
    lines.push(["flex-direction", l.direction === "horizontal" ? "row" : "column"])
    lines.push(["gap", px(l.gap)])
    lines.push(["padding", [l.paddingTop, l.paddingRight, l.paddingBottom, l.paddingLeft].map(px).join(" ")])
    const map = { start: "flex-start", center: "center", end: "flex-end", "space-between": "space-between" }
    lines.push(["justify-content", map[l.justify]])
    lines.push(["align-items", map[l.align]])
  }
  return lines.map(([k, v]) => `${k}: ${v};`).join("\n")
}

export function nodeToTailwind(n: SceneNode) {
  const c: string[] = [`w-[${Math.round(n.width)}px]`, `h-[${Math.round(n.height)}px]`]
  const fill = n.fills.find((f) => f.visible && f.type === "solid")
  if (fill) c.push(n.type === "text" ? `text-[${fill.color}]` : `bg-[${fill.color}]`)
  if (n.type === "ellipse") c.push("rounded-full")
  else if (n.cornerRadius) c.push(`rounded-[${n.cornerRadius}px]`)
  const stroke = n.strokes.find((s) => s.visible)
  if (stroke && n.strokeWidth) c.push(`border-[${n.strokeWidth}px]`, `border-[${stroke.color}]`)
  if (n.opacity < 1) c.push(`opacity-[${Math.round(n.opacity * 100) / 100}]`)
  if (n.type === "text") c.push(`text-[${n.fontSize}px]`, `font-[${n.fontWeight}]`)
  if (n.layout) {
    c.push("flex", n.layout.direction === "horizontal" ? "flex-row" : "flex-col", `gap-[${n.layout.gap}px]`)
    c.push(
      `pt-[${n.layout.paddingTop}px]`,
      `pr-[${n.layout.paddingRight}px]`,
      `pb-[${n.layout.paddingBottom}px]`,
      `pl-[${n.layout.paddingLeft}px]`,
    )
  }
  return c.join(" ")
}
