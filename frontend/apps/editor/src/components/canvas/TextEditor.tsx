import { useEffect, useLayoutEffect, useRef } from "react"
import { useEditor } from "../../core/store"
import { removeNode } from "../../core/doc"
import { layoutText } from "../../core/text"
import { rgba } from "../../core/color"

export function TextEditor() {
  const editingId = useEditor((s) => s.editingTextId)
  const node = useEditor((s) => (s.editingTextId ? s.doc.nodes[s.editingTextId] : null))
  const cam = useEditor((s) => s.camera)
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!editingId) return
    useEditor.getState().begin()
    const el = ref.current
    if (el) {
      el.focus()
      el.select()
    }
  }, [editingId])

  useLayoutEffect(() => {
    const el = ref.current
    if (el) {
      el.style.height = "0px"
      el.style.height = `${el.scrollHeight}px`
    }
  })

  if (!editingId || !node) return null

  const finish = () => {
    const s = useEditor.getState()
    const id = s.editingTextId
    if (!id) return
    s.end()
    s.set({ editingTextId: null })
    const n = s.doc.nodes[id]
    if (n && !(n.text ?? "").trim()) {
      s.commit((d) => removeNode(d, id))
      s.select([])
    }
  }

  const layout = layoutText(node)
  const fill = node.fills.find((f) => f.visible)
  const zoom = cam.zoom
  const auto = node.textAutoResize === "width"

  return (
    <textarea
      ref={ref}
      value={node.text ?? ""}
      spellCheck={false}
      onChange={(e) => {
        const text = e.target.value
        useEditor.getState().preview((d) => {
          if (d.nodes[editingId]) d.nodes[editingId].text = text
        })
      }}
      onBlur={finish}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === "Escape" || (e.key === "Enter" && (e.metaKey || e.ctrlKey))) {
          e.preventDefault()
          ref.current?.blur()
        }
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute m-0 resize-none overflow-hidden border-0 bg-transparent p-0 outline-none"
      style={{
        left: node.x * zoom + cam.x,
        top: node.y * zoom + cam.y,
        width: auto ? Math.max(layout.width * zoom + 40, 20) : node.width * zoom,
        minHeight: layout.lineHeight * zoom,
        transform: node.rotation ? `rotate(${node.rotation}deg)` : undefined,
        transformOrigin: `${(node.width * zoom) / 2}px ${(node.height * zoom) / 2}px`,
        fontFamily: `"${node.fontFamily}", Inter, sans-serif`,
        fontSize: (node.fontSize ?? 16) * zoom,
        fontWeight: node.fontWeight,
        fontStyle: node.italic ? "italic" : "normal",
        lineHeight: `${layout.lineHeight * zoom}px`,
        letterSpacing: layout.letterSpacing * zoom,
        textAlign: auto ? "left" : node.textAlign,
        textTransform:
          node.textCase === "upper"
            ? "uppercase"
            : node.textCase === "lower"
              ? "lowercase"
              : node.textCase === "title"
                ? "capitalize"
                : "none",
        textDecoration: node.textDecoration === "none" ? undefined : node.textDecoration,
        color: fill ? rgba(fill.color, fill.opacity) : "#000",
        caretColor: "#b26bff",
        whiteSpace: auto ? "pre" : "pre-wrap",
        wordBreak: "break-word",
        opacity: node.opacity,
      }}
    />
  )
}
