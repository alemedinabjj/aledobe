import { describe, expect, it } from "vitest"
import { lineFromPoints, normalizeAngle, rotatePoint, selectionBounds, snapAngle } from "../src/core/geometry"
import { snapRect } from "../src/core/interactions"
import { createNode, createPage, insertNode } from "../src/core/doc"
import type { Doc } from "../src/core/types"

describe("geometry", () => {
  it("rotates points around a center", () => {
    const p = rotatePoint({ x: 10, y: 0 }, { x: 0, y: 0 }, 90)
    expect(p.x).toBeCloseTo(0)
    expect(p.y).toBeCloseTo(10)
  })

  it("normalizes and snaps angles", () => {
    expect(normalizeAngle(270)).toBe(-90)
    expect(snapAngle(52)).toBe(45)
  })

  it("builds a line from two points", () => {
    const l = lineFromPoints({ x: 0, y: 0 }, { x: 0, y: 100 })
    expect(l.width).toBe(100)
    expect(l.rotation).toBe(90)
  })

  it("computes the bounds of rotated selections", () => {
    const page = createPage("P")
    const doc: Doc = { name: "d", pages: [page], nodes: {} }
    const a = createNode("rect", { x: 0, y: 0, width: 100, height: 100, rotation: 45 })
    insertNode(doc, a, page.id)
    const b = selectionBounds(doc, [a.id])!
    expect(b.width).toBeCloseTo(141.42, 1)
  })

  it("snaps edges to nearby targets and reports guides", () => {
    const targets = { xs: [{ value: 100, rect: { x: 100, y: 0, width: 50, height: 50 } }], ys: [] }
    const res = snapRect({ x: 97, y: 10, width: 20, height: 20 }, targets, 5)
    expect(res.dx).toBe(3)
    expect(res.guides).toHaveLength(1)
  })
})
