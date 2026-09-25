import { useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router"
import { Button, toast } from "@aledobe/ui"
import type { Doc, EditorProps } from "editor/Editor"
import { EditorHost, EditorLoading, useEditorModule } from "../components/EditorHost"
import { useSession } from "../lib/session"
import type { DesignFile } from "../lib/types"

type Status = NonNullable<EditorProps["saveStatus"]>

export default function FilePage() {
  const { fileId } = useParams()
  const navigate = useNavigate()
  const { api, user } = useSession()
  const { mod, error } = useEditorModule()
  const [file, setFile] = useState<DesignFile | null>(null)
  const [doc, setDoc] = useState<Doc | null>(null)
  const [status, setStatus] = useState<Status>("saved")
  const [missing, setMissing] = useState(false)
  const lastThumb = useRef(0)

  useEffect(() => {
    if (!api || !fileId) return
    api.getFile(fileId).then(setFile, () => setMissing(true))
  }, [api, fileId])

  useEffect(() => {
    if (!file || !mod || doc) return
    const existing = file.document as Doc | null
    setDoc(existing && existing.pages ? existing : mod.emptyDoc(file.name))
  }, [file, mod, doc])

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 text-center">
        <p className="font-semibold">The editor microfrontend could not be loaded.</p>
        <p className="max-w-md text-sm text-muted-foreground">
          Make sure the editor app is running (npm run dev:editor) or deployed.
        </p>
        <Button onClick={() => location.reload()}>Retry</Button>
      </div>
    )
  }
  if (missing) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p className="font-semibold">This file doesn't exist or you don't have access.</p>
        <Button onClick={() => navigate("/dashboard")}>Back to files</Button>
      </div>
    )
  }
  if (!mod || !doc || !file) return <EditorLoading />

  const save = async (next: Doc) => {
    if (!api) return
    setStatus("saving")
    try {
      const patch: Parameters<typeof api.updateFile>[1] = { document: next, name: next.name }
      if (Date.now() - lastThumb.current > 4000) {
        lastThumb.current = Date.now()
        patch.thumbnail = await mod.thumbnail(next)
      }
      await api.updateFile(file.id, patch)
      setStatus("saved")
    } catch (e) {
      setStatus("error")
      toast.error(`Couldn't save: ${(e as Error).message}`)
    }
  }

  return (
    <EditorHost
      mod={mod}
      doc={doc}
      user={user}
      saveStatus={status}
      onChange={save}
      onBack={() => navigate(`/dashboard/projects/${file.projectId}`)}
      onShare={async () => {
        await navigator.clipboard.writeText(location.href)
        toast.success("Link copied to clipboard")
      }}
    />
  )
}
