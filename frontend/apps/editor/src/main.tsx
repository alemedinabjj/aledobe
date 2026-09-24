import { StrictMode, useMemo, useState } from "react"
import { createRoot } from "react-dom/client"
import Editor from "./Editor"
import { sampleDoc } from "./core/sample"
import type { Doc } from "./core/types"

const KEY = "aledobe:standalone"

function load(): Doc {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    return sampleDoc()
  }
  return sampleDoc()
}

function Standalone() {
  const doc = useMemo(load, [])
  const [status, setStatus] = useState<"saved" | "offline" | "error">("offline")
  return (
    <Editor
      doc={doc}
      saveStatus={status}
      user={{ name: "Guest" }}
      onChange={(d) => {
        try {
          localStorage.setItem(KEY, JSON.stringify(d))
          setStatus("offline")
        } catch {
          setStatus("error")
        }
      }}
    />
  )
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Standalone />
  </StrictMode>,
)
