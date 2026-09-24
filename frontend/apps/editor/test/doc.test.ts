import { beforeEach, describe, expect, it } from "vitest"
import { createNode, defaultAutoLayout } from "../src/core/doc"
import { emptyDoc, useEditor } from "../src/core/store"

const s = () => useEditor.getState()

beforeEach(() => {
  const doc = emptyDoc("Test")
  useEditor.setState({ doc, pageId: doc.pages[0].id, selection: [], past: [], future: [], txBase: null })
})

describe("editor store", () => {
  it("adds nodes and supports undo / redo", () => {
    s().addNode(createNode("rect", { x: 10, y: 10 }))
    expect(Object.keys(s().doc.nodes)).toHaveLength(1)
    s().undo()
    expect(Object.keys(s().doc.nodes)).toHaveLength(0)
    s().redo()
    expect(Object.keys(s().doc.nodes)).toHaveLength(1)
  })

  it("groups and ungroups with derived bounds", () => {
    const a = createNode("rect", { x: 0, y: 0, width: 10, height: 10 })
    const b = createNode("rect", { x: 90, y: 40, width: 10, height: 10 })
    s().addNode(a)
    s().addNode(b)
    s().select([a.id, b.id])
    s().groupSelection()
    const group = s().doc.nodes[s().selection[0]]
    expect(group.type).toBe("group")
    expect([group.x, group.y, group.width, group.height]).toEqual([0, 0, 100, 50])
    s().ungroupSelection()
    expect(s().doc.nodes[group.id]).toBeUndefined()
    expect(s().doc.nodes[a.id].parentId).toBe(s().pageId)
  })

  it("lays out auto layout frames and hugs content", () => {
    const frame = createNode("frame", { x: 0, y: 0, layout: { ...defaultAutoLayout(), gap: 8 } })
    s().addNode(frame)
    s().addNode(createNode("rect", { width: 20, height: 30 }), frame.id)
    s().addNode(createNode("rect", { width: 40, height: 10 }), frame.id)
    const f = s().doc.nodes[frame.id]
    const [c1, c2] = f.children!.map((id) => s().doc.nodes[id])
    expect(c1.x).toBe(10)
    expect(c2.x).toBe(10 + 20 + 8)
    expect(f.width).toBe(10 + 20 + 8 + 40 + 10)
    expect(f.height).toBe(10 + 30 + 10)
  })

  it("aligns and distributes selections", () => {
    const ids = [0, 50, 200].map((x) => {
      const n = createNode("rect", { x, y: x / 2, width: 10, height: 10 })
      s().addNode(n)
      return n.id
    })
    s().select(ids)
    s().align("top")
    expect(ids.map((id) => s().doc.nodes[id].y)).toEqual([0, 0, 0])
    s().distribute("x")
    expect(s().doc.nodes[ids[1]].x).toBe(100)
  })

  it("duplicates, copies and pastes subtrees with fresh ids", () => {
    const frame = createNode("frame", { x: 0, y: 0, width: 100, height: 100 })
    s().addNode(frame)
    s().addNode(createNode("rect", { x: 10, y: 10 }), frame.id)
    s().select([frame.id])
    s().duplicateSelection()
    const copy = s().doc.nodes[s().selection[0]]
    expect(copy.id).not.toBe(frame.id)
    expect(copy.children).toHaveLength(1)
    expect(copy.children![0]).not.toBe(frame.children![0])
  })

  it("commits transactions as a single history entry", () => {
    const n = createNode("rect", { x: 0, y: 0 })
    s().addNode(n)
    const before = s().past.length
    s().begin()
    for (let i = 1; i <= 5; i++) s().preview((d) => (d.nodes[n.id].x = i * 10))
    s().end()
    expect(s().doc.nodes[n.id].x).toBe(50)
    expect(s().past.length).toBe(before + 1)
  })
})
