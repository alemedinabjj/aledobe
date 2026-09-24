import { useEditor } from "../../core/store"
import type { Doc, SceneNode } from "../../core/types"
import type { Phase } from "../ui/NumberInput"

export function edit(ids: string[], fn: (n: SceneNode, d: Doc) => void, phase: Phase = "commit") {
  const s = useEditor.getState()
  const recipe = (d: Doc) => {
    for (const id of ids) if (d.nodes[id]) fn(d.nodes[id], d)
  }
  if (phase === "preview") {
    if (!s.txBase) s.begin()
    s.preview(recipe)
    return
  }
  if (s.txBase) {
    s.preview(recipe)
    s.end()
    return
  }
  s.commit(recipe)
}

export function mixed<T>(nodes: SceneNode[], get: (n: SceneNode) => T): T | "mixed" {
  if (!nodes.length) return "mixed"
  const first = get(nodes[0])
  return nodes.every((n) => get(n) === first) ? first : "mixed"
}

export const num = (v: number | "mixed" | undefined): number | "mixed" => (v === undefined ? 0 : v)
