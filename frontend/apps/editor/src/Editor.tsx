import { useCallback, useEffect, useRef, useState } from "react"
import { TooltipProvider, Toaster } from "@aledobe/ui"
import { useEditor } from "./core/store"
import { useShortcuts } from "./core/shortcuts"
import { clearTextCache, fontCss } from "./core/text"
import type { Doc } from "./core/types"
import { Canvas } from "./components/canvas/Canvas"
import { LeftPanel } from "./components/LeftPanel"
import { RightPanel } from "./components/RightPanel"
import { Toolbar } from "./components/Toolbar"
import { ShortcutsDialog } from "./components/ShortcutsDialog"
import { HostContext, type EditorHost } from "./host"
import "./editor.css"

export interface EditorProps extends Partial<EditorHost> {
  doc: Doc
  onChange?: (doc: Doc) => void
  autosaveDelay?: number
}

export default function Editor({ doc, onChange, autosaveDelay = 800, saveStatus = "saved", ...host }: EditorProps) {
  const panelsHidden = useEditor((s) => s.panelsHidden)
  const dirty = useEditor((s) => s.dirty)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const loaded = useRef(false)

  useShortcuts()

  useEffect(() => {
    useEditor.getState().load(doc)
    loaded.current = true
  }, [doc])

  useEffect(() => {
    let cancelled = false
    const refresh = () => {
      if (cancelled) return
      clearTextCache()
      useEditor.getState().refreshText()
    }
    const fonts = new Set(
      Object.values(doc.nodes)
        .filter((n) => n.type === "text")
        .map((n) => fontCss(n)),
    )
    Promise.all([...fonts].map((font) => document.fonts?.load(font).catch(() => []))).then(refresh)
    document.fonts?.ready.then(refresh)
    document.fonts?.addEventListener?.("loadingdone", refresh)
    return () => {
      cancelled = true
      document.fonts?.removeEventListener?.("loadingdone", refresh)
    }
  }, [doc])

  const [pending, setPending] = useState(false)
  const pendingRef = useRef(false)

  const flush = useCallback(() => {
    if (!pendingRef.current) return
    pendingRef.current = false
    setPending(false)
    onChangeRef.current?.(useEditor.getState().doc)
  }, [])

  useEffect(() => {
    if (!dirty || !onChangeRef.current) return
    pendingRef.current = true
    setPending(true)
    const t = setTimeout(flush, autosaveDelay)
    return () => clearTimeout(t)
  }, [dirty, autosaveDelay, flush])

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (!pendingRef.current) return
      flush()
      e.preventDefault()
    }
    window.addEventListener("beforeunload", warn)
    return () => {
      window.removeEventListener("beforeunload", warn)
      flush()
    }
  }, [flush])

  return (
    <HostContext.Provider value={{ saveStatus: pending ? "unsaved" : saveStatus, ...host }}>
      <TooltipProvider delayDuration={400}>
        <div className="aledobe-editor dark flex h-full w-full overflow-hidden bg-background text-foreground">
          {!panelsHidden && <LeftPanel />}
          <main className="relative min-w-0 flex-1">
            <Canvas />
            {!panelsHidden && <Toolbar />}
          </main>
          {!panelsHidden && <RightPanel />}
        </div>
        <ShortcutsDialog />
        <Toaster position="bottom-right" />
      </TooltipProvider>
    </HostContext.Provider>
  )
}

export type { Doc } from "./core/types"
export { sampleDoc } from "./core/sample"
export { emptyDoc } from "./core/store"
export { thumbnail } from "./core/export"
