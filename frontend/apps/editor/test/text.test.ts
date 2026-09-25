import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createNode } from "../src/core/doc"
import { clearTextCache, layoutText } from "../src/core/text"

const CHAR = 10
const KERNING_SAVING = 4
const context = {
  font: "",
  fontKerning: "auto" as CanvasFontKerning,
  measureText(s: string) {
    const kerned = context.fontKerning === "none" ? 0 : KERNING_SAVING
    return { width: s.length * CHAR - kerned, fontBoundingBoxAscent: 80, fontBoundingBoxDescent: 20 }
  },
}

beforeAll(() => {
  Object.assign(globalThis, { document: { createElement: () => ({ getContext: () => context }) } })
})

afterAll(() => {
  Reflect.deleteProperty(globalThis, "document")
})

describe("text layout", () => {
  it("measures tracked text like the canvas renderer, unkerned with spacing per glyph", () => {
    clearTextCache()
    const node = createNode("text", { text: "Design.", fontSize: 100, letterSpacing: -3, textAutoResize: "width" })
    expect(layoutText(node).width).toBe(7 * CHAR - 3 * 7)
  })

  it("keeps kerning when there is no letter spacing", () => {
    clearTextCache()
    const node = createNode("text", { text: "Design.", fontSize: 100, letterSpacing: 0, textAutoResize: "width" })
    expect(layoutText(node).width).toBe(7 * CHAR - KERNING_SAVING)
  })
})
