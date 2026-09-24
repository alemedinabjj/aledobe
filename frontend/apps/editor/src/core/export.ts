import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { NodeView } from "./render"
import { childrenOf, sortByOrder, topLevel } from "./doc"
import { selectionBounds } from "./geometry"
import { useEditor } from "./store"
import type { Doc } from "./types"

export type ExportFormat = "png" | "jpg" | "svg"

export function renderSvg(doc: Doc, ids: string[], background?: string, padding = 0) {
  const b = selectionBounds(doc, ids)
  if (!b) return null
  const x = b.x - padding
  const y = b.y - padding
  const width = Math.max(1, Math.ceil(b.width + padding * 2))
  const height = Math.max(1, Math.ceil(b.height + padding * 2))
  const body = renderToStaticMarkup(
    createElement(
      "g",
      null,
      background ? createElement("rect", { x, y, width, height, fill: background }) : null,
      ...ids.map((id) => createElement(NodeView, { key: id, id, options: { nodes: doc.nodes } })),
    ),
  )
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="${x} ${y} ${width} ${height}" fill="none">${body}</svg>`
  return { svg, width, height }
}

export async function rasterize(svg: string, width: number, height: number, scale: number, format: "png" | "jpg") {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }))
  try {
    const img = new Image()
    img.decoding = "async"
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = reject
      img.src = url
    })
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(width * scale)
    canvas.height = Math.round(height * scale)
    const ctx = canvas.getContext("2d")!
    if (format === "jpg") {
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), format === "png" ? "image/png" : "image/jpeg", 0.92),
    )
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function exportNodes(doc: Doc, ids: string[], format: ExportFormat, scale: number, name: string) {
  const out = renderSvg(doc, sortByOrder(doc, ids))
  if (!out) return
  const safe = name.replace(/[^\w\- ]+/g, "").trim() || "export"
  if (format === "svg") {
    download(new Blob([out.svg], { type: "image/svg+xml" }), `${safe}.svg`)
    return
  }
  const blob = await rasterize(out.svg, out.width, out.height, scale, format)
  download(blob, `${safe}${scale !== 1 ? `@${scale}x` : ""}.${format}`)
}

export async function exportSelection(format: ExportFormat, scale: number) {
  const s = useEditor.getState()
  const ids = topLevel(s.doc, s.selection)
  const targets = ids.length ? ids : childrenOf(s.doc, s.pageId)
  const name = ids.length === 1 ? s.doc.nodes[ids[0]].name : s.doc.name
  await exportNodes(s.doc, targets, format, scale, name)
}

export async function thumbnail(doc: Doc, maxSize = 480) {
  const page = doc.pages[0]
  if (!page?.children.length) return null
  const out = renderSvg(doc, page.children, page.background, 40)
  if (!out) return null
  const scale = Math.min(1, maxSize / Math.max(out.width, out.height))
  try {
    const blob = await rasterize(out.svg, out.width, out.height, scale, "png")
    return await new Promise<string>((resolve) => {
      const r = new FileReader()
      r.onload = () => resolve(r.result as string)
      r.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}
