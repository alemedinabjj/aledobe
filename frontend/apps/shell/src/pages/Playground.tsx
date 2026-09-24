import { useMemo } from "react"
import { useNavigate } from "react-router"
import { toast } from "@aledobe/ui"
import { EditorHost, EditorLoading, useEditorModule } from "../components/EditorHost"

export default function Playground() {
  const { mod } = useEditorModule()
  const navigate = useNavigate()
  const doc = useMemo(() => mod?.sampleDoc(), [mod])
  if (!mod || !doc) return <EditorLoading />
  return (
    <EditorHost
      mod={mod}
      doc={doc}
      user={{ name: "Guest" }}
      saveStatus="unsaved"
      onBack={() => navigate("/")}
      onShare={() => toast("Sign in to save and share your designs.")}
    />
  )
}
