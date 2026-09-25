import type { SceneNode } from "./types"

export interface TextLayout {
  lines: string[]
  width: number
  height: number
  lineHeight: number
  baseline: number
  letterSpacing: number
}

let ctx: CanvasRenderingContext2D | null = null
const cache = new Map<string, TextLayout>()

function context() {
  if (!ctx) ctx = document.createElement("canvas").getContext("2d")
  return ctx!
}

export function fontCss(n: SceneNode, scale = 1) {
  return `${n.italic ? "italic " : ""}${n.fontWeight ?? 400} ${(n.fontSize ?? 16) * scale}px "${n.fontFamily ?? "Inter"}", Inter, system-ui, -apple-system, "Segoe UI", sans-serif`
}

export function applyTextCase(text: string, textCase: SceneNode["textCase"]) {
  if (textCase === "upper") return text.toUpperCase()
  if (textCase === "lower") return text.toLowerCase()
  if (textCase === "title") return text.replace(/\b\p{L}/gu, (c) => c.toUpperCase())
  return text
}

export function clearTextCache() {
  cache.clear()
}

export function layoutText(n: SceneNode): TextLayout {
  const fontSize = n.fontSize ?? 16
  const letterSpacing = ((n.letterSpacing ?? 0) / 100) * fontSize
  const lineHeight = ((n.lineHeight ?? 120) / 100) * fontSize
  const mode = n.textAutoResize ?? "width"
  const text = applyTextCase(n.text ?? "", n.textCase)
  const key = [text, fontCss(n), letterSpacing, lineHeight, mode, mode === "width" ? 0 : n.width].join("|")
  const hit = cache.get(key)
  if (hit) return hit

  const c = context()
  c.font = fontCss(n)
  c.fontKerning = letterSpacing !== 0 ? "none" : "auto"
  const measure = (s: string) => c.measureText(s).width + letterSpacing * Array.from(s).length
  const metrics = c.measureText("Hg")
  const ascent = metrics.fontBoundingBoxAscent ?? fontSize * 0.8
  const descent = metrics.fontBoundingBoxDescent ?? fontSize * 0.2
  const baseline = (lineHeight - (ascent + descent)) / 2 + ascent

  const paragraphs = text.split("\n")
  let lines: string[] = []
  if (mode === "width") {
    lines = paragraphs
  } else {
    const max = Math.max(1, n.width)
    for (const paragraph of paragraphs) {
      const words = paragraph.split(/(\s+)/)
      let current = ""
      for (const word of words) {
        const candidate = current + word
        if (current && measure(candidate.trimEnd()) > max) {
          lines.push(current.trimEnd())
          current = word.trimStart()
        } else {
          current = candidate
        }
      }
      lines.push(current)
    }
  }

  const width = mode === "width" ? Math.max(1, ...lines.map(measure)) : n.width
  const height = mode === "fixed" ? n.height : Math.max(1, lines.length) * lineHeight
  const result = { lines, width: Math.ceil(width), height: Math.ceil(height), lineHeight, baseline, letterSpacing }
  if (cache.size > 2000) cache.clear()
  cache.set(key, result)
  return result
}
