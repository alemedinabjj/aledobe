import { Check, Copy } from "lucide-react"
import { useState } from "react"
import { useEditor } from "../../core/store"
import { nodeToCss, nodeToTailwind } from "../../core/css"
import { Section } from "../ui/Section"
import { IconButton } from "../ui/IconButton"

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="group relative">
      <pre className="overflow-x-auto rounded-lg border border-white/[0.06] bg-black/40 p-3 font-mono text-[11px] leading-relaxed text-violet-200/90">
        {code}
      </pre>
      <IconButton
        tip={copied ? "Copied" : "Copy"}
        className="absolute top-1.5 right-1.5 bg-black/60 opacity-0 group-hover:opacity-100"
        onClick={async () => {
          await navigator.clipboard.writeText(code)
          setCopied(true)
          setTimeout(() => setCopied(false), 1200)
        }}
      >
        {copied ? <Check /> : <Copy />}
      </IconButton>
    </div>
  )
}

export function CodePanel() {
  const selection = useEditor((s) => s.selection)
  const doc = useEditor((s) => s.doc)
  const n = selection.length === 1 ? doc.nodes[selection[0]] : null
  if (!n) {
    return (
      <p className="p-4 text-center text-[11px] leading-relaxed text-muted-foreground">
        Select a single layer to inspect its code.
      </p>
    )
  }
  const parent = doc.nodes[n.parentId] ?? null
  return (
    <>
      <Section title="CSS">
        <CodeBlock code={nodeToCss(n, parent)} />
      </Section>
      <Section title="Tailwind">
        <CodeBlock code={nodeToTailwind(n)} />
      </Section>
      {n.type === "text" && (
        <Section title="Content">
          <CodeBlock code={n.text ?? ""} />
        </Section>
      )}
    </>
  )
}
