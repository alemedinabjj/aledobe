declare module "editor/Editor" {
  import type { ComponentType } from "react"

  export type Doc = { name: string; pages: unknown[]; nodes: Record<string, unknown> }

  export interface EditorProps {
    doc: Doc
    onChange?: (doc: Doc) => void
    autosaveDelay?: number
    saveStatus?: "saved" | "saving" | "unsaved" | "offline" | "error"
    user?: { name: string; email?: string; avatarUrl?: string | null } | null
    onBack?: () => void
    onRename?: (name: string) => void
    onShare?: () => void
  }

  const Editor: ComponentType<EditorProps>
  export default Editor
  export function sampleDoc(name?: string): Doc
  export function emptyDoc(name?: string): Doc
  export function thumbnail(doc: Doc, maxSize?: number): Promise<string | null>
}
