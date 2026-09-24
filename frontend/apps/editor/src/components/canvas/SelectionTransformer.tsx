import { useEffect, useRef, type RefObject } from "react"
import Konva from "konva"
import { Transformer } from "react-konva"
import { useEditor } from "../../core/store"
import { descendants, rotateDeep, topLevel } from "../../core/doc"
import type { Doc } from "../../core/types"
import { ACCENT } from "./Overlay"

const ROTATION_SNAPS = Array.from({ length: 24 }, (_, i) => i * 15)

function findKonva(stage: Konva.Stage, id: string) {
  return stage.findOne(
    (n: Konva.Node) => n.getAttr("nodeId") === id && n.getClassName() === "Group" && n.getLayer()?.name() === "content",
  ) as Konva.Group | undefined
}

function bakeLeaf(d: Doc, id: string, k: Konva.Node) {
  const n = d.nodes[id]
  const sx = Math.abs(k.scaleX())
  const sy = Math.abs(k.scaleY())
  const width = Math.max(1, Math.round(n.width * sx))
  const height = n.type === "line" ? 0 : Math.max(1, Math.round(n.height * sy))
  const cx = k.x()
  const cy = k.y()
  const delta = k.rotation() - n.rotation
  n.width = width
  n.height = height
  n.x = Math.round(cx - width / 2)
  n.y = Math.round(cy - height / 2)
  n.rotation = Math.round(k.rotation() * 100) / 100
  if (n.type === "text" && (sx !== 1 || sy !== 1)) {
    n.textAutoResize = Math.abs(sy - 1) < 0.001 && n.textAutoResize !== "fixed" ? "height" : "fixed"
  }
  if (n.type === "frame") {
    if (n.layout) {
      if (sx !== 1) n.layout.hugWidth = false
      if (sy !== 1) n.layout.hugHeight = false
    }
    if (delta) for (const c of n.children ?? []) rotateDeep(d, c, { x: cx, y: cy }, delta)
  }
}

function bakeGroup(d: Doc, id: string, k: Konva.Node) {
  const t = k.getTransform()
  const sx = Math.abs(k.scaleX())
  const sy = Math.abs(k.scaleY())
  const rot = k.rotation()
  for (const cid of descendants(d, id)) {
    const n = d.nodes[cid]
    if (n.type === "group") continue
    const c = t.point({ x: n.x + n.width / 2, y: n.y + n.height / 2 })
    const r = ((n.rotation % 180) + 180) % 180
    const swap = r > 45 && r < 135
    n.width = Math.max(1, n.width * (swap ? sy : sx))
    n.height = n.type === "line" ? 0 : Math.max(1, n.height * (swap ? sx : sy))
    n.x = c.x - n.width / 2
    n.y = c.y - n.height / 2
    n.rotation = Math.round((n.rotation + rot) * 100) / 100
    if (n.type === "text" && sx !== 1) n.textAutoResize = "fixed"
  }
}

export function SelectionTransformer({ stageRef }: { stageRef: RefObject<Konva.Stage | null> }) {
  const tr = useRef<Konva.Transformer>(null)
  const selection = useEditor((s) => s.selection)
  const doc = useEditor((s) => s.doc)
  const tool = useEditor((s) => s.tool)
  const editing = useEditor((s) => s.editingTextId)
  const txBase = useEditor((s) => s.txBase)
  const transforming = useEditor((s) => s.transforming)

  const ids = topLevel(doc, selection).filter(
    (id) => doc.nodes[id] && doc.nodes[id].type !== "line" && !doc.nodes[id].locked,
  )
  const single = ids.length === 1 ? doc.nodes[ids[0]] : null
  const isText = single?.type === "text"
  const visible = tool === "move" && !editing && (!txBase || transforming)

  useEffect(() => {
    const t = tr.current
    const stage = stageRef.current
    if (!t || !stage) return
    if (transforming) return
    const nodes = visible ? ids.map((id) => findKonva(stage, id)).filter((n): n is Konva.Group => !!n) : []
    t.nodes(nodes)
    t.getLayer()?.batchDraw()
  })

  const onStart = () => {
    const s = useEditor.getState()
    s.begin()
    s.set({ transforming: true, hoverId: null })
  }

  const onEnd = () => {
    const t = tr.current
    const s = useEditor.getState()
    const nodes = t?.nodes() ?? []
    const snapshot = nodes.map((k) => ({
      id: k.getAttr("nodeId") as string,
      k,
      attrs: { x: k.x(), y: k.y(), scaleX: k.scaleX(), scaleY: k.scaleY(), rotation: k.rotation() },
    }))
    s.preview((d) => {
      for (const { id, k } of snapshot) {
        if (!d.nodes[id]) continue
        if (d.nodes[id].type === "group") bakeGroup(d, id, k)
        else bakeLeaf(d, id, k)
      }
    })
    for (const { id, k } of snapshot) {
      const n = useEditor.getState().doc.nodes[id]
      if (!n) continue
      if (n.type === "group") k.setAttrs({ x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 })
      else
        k.setAttrs({
          x: n.x + n.width / 2,
          y: n.y + n.height / 2,
          offsetX: n.width / 2,
          offsetY: n.height / 2,
          scaleX: 1,
          scaleY: 1,
          rotation: n.rotation,
          width: n.width,
          height: n.height,
        })
    }
    s.end()
    s.set({ transforming: false })
  }

  return (
    <Transformer
      ref={tr}
      visible={visible}
      rotateEnabled
      rotationSnaps={ROTATION_SNAPS}
      rotationSnapTolerance={4}
      rotateAnchorOffset={22}
      rotateAnchorCursor="grab"
      anchorSize={8}
      anchorCornerRadius={2}
      anchorStroke={ACCENT}
      anchorStrokeWidth={1.5}
      anchorFill="#ffffff"
      borderStroke={ACCENT}
      borderStrokeWidth={1.5}
      keepRatio={false}
      flipEnabled={false}
      ignoreStroke
      padding={0}
      enabledAnchors={
        isText
          ? ["middle-left", "middle-right", "top-left", "top-right", "bottom-left", "bottom-right"]
          : [
              "top-left",
              "top-center",
              "top-right",
              "middle-right",
              "bottom-right",
              "bottom-center",
              "bottom-left",
              "middle-left",
            ]
      }
      anchorStyleFunc={(anchor) => {
        const name = anchor.name()
        if (name.includes("rotater")) {
          anchor.cornerRadius(8)
          anchor.fill(ACCENT)
          anchor.stroke("#ffffff")
          anchor.width(10)
          anchor.height(10)
          anchor.offsetX(5)
          anchor.offsetY(5)
          return
        }
        if (name.includes("center") || name.includes("middle")) {
          const horizontal = name.includes("top") || name.includes("bottom")
          anchor.width(horizontal ? 14 : 4)
          anchor.height(horizontal ? 4 : 14)
          anchor.offsetX(horizontal ? 7 : 2)
          anchor.offsetY(horizontal ? 2 : 7)
          anchor.cornerRadius(2)
        }
      }}
      boundBoxFunc={(oldBox, newBox) => (Math.abs(newBox.width) < 1 || Math.abs(newBox.height) < 1 ? oldBox : newBox)}
      onTransformStart={onStart}
      onTransformEnd={onEnd}
    />
  )
}
