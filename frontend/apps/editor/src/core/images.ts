import { createNode, nextName } from "./doc"
import { useEditor } from "./store"
import type { Point } from "./types"

export function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function imageSize(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => resolve({ width: 200, height: 200 })
    img.src = src
  })
}

export async function importImageFiles(files: File[], at?: Point) {
  const s = useEditor.getState()
  const center = at ?? {
    x: (s.viewport.width / 2 - s.camera.x) / s.camera.zoom,
    y: (s.viewport.height / 2 - s.camera.y) / s.camera.zoom,
  }
  const created: string[] = []
  let offset = 0
  for (const file of files) {
    const src = await readFile(file)
    const size = await imageSize(src)
    const scale = Math.min(1, 800 / Math.max(size.width, size.height))
    const width = Math.round(size.width * scale)
    const height = Math.round(size.height * scale)
    const node = createNode("image", {
      name: file.name.replace(/\.[^.]+$/, "") || nextName(useEditor.getState().doc, "image"),
      src,
      x: Math.round(center.x - width / 2 + offset),
      y: Math.round(center.y - height / 2 + offset),
      width,
      height,
    })
    useEditor.getState().addNode(node)
    created.push(node.id)
    offset += 20
  }
  useEditor.getState().select(created)
}

export function pickImages() {
  const input = document.createElement("input")
  input.type = "file"
  input.accept = "image/*"
  input.multiple = true
  input.onchange = () => {
    const files = [...(input.files ?? [])]
    if (files.length) importImageFiles(files)
  }
  input.click()
}
