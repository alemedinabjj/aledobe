import { useEffect, useState } from "react"
import type { EditorProps } from "editor/Editor"
import { loadEditor, type EditorModule } from "../lib/editor"
import { Logo } from "./Logo"

export function EditorLoading({ label = "Loading editor" }: { label?: string }) {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-5 bg-background">
      <div className="relative">
        <div className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
        <Logo withText={false} className="relative" />
      </div>
      <p className="text-sm text-muted-foreground">{label}…</p>
    </div>
  )
}

export function useEditorModule() {
  const [mod, setMod] = useState<EditorModule | null>(null)
  const [error, setError] = useState<Error | null>(null)
  useEffect(() => {
    loadEditor().then(setMod, setError)
  }, [])
  return { mod, error }
}

export function EditorHost({ mod, ...props }: EditorProps & { mod: EditorModule }) {
  const Editor = mod.default
  return (
    <div className="h-screen">
      <Editor {...props} />
    </div>
  )
}
