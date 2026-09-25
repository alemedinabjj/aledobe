import { createNode, createPage, defaultAutoLayout, effect, finalize, insertNode, solid } from "./doc"
import type { Doc } from "./types"

export function sampleDoc(name = "Welcome to Aledobe"): Doc {
  const page = createPage("Cover")
  page.background = "#1A1726"
  const doc: Doc = { name, pages: [page, createPage("Components")], nodes: {} }
  doc.pages[1].background = "#1A1726"

  const frame = createNode("frame", {
    name: "Landing",
    x: 0,
    y: 0,
    width: 1200,
    height: 720,
    cornerRadius: 24,
    fills: [
      {
        ...solid("#0B0914"),
        type: "linear",
        angle: 135,
        stops: [
          { position: 0, color: "#140B2B", opacity: 1 },
          { position: 1, color: "#07060D", opacity: 1 },
        ],
      },
    ],
  })
  insertNode(doc, frame, page.id)

  const glow = createNode("ellipse", {
    name: "Glow",
    x: 640,
    y: -120,
    width: 620,
    height: 620,
    fills: [solid("#A855F7", 0.55)],
    effects: [{ ...effect("layer-blur"), blur: 220 }],
  })
  insertNode(doc, glow, frame.id)

  const badge = createNode("frame", {
    name: "Badge",
    x: 80,
    y: 150,
    cornerRadius: 999,
    fills: [solid("#A855F7", 0.14)],
    strokes: [solid("#C084FC", 0.5)],
    layout: { ...defaultAutoLayout(), paddingLeft: 14, paddingRight: 14, paddingTop: 6, paddingBottom: 6 },
  })
  insertNode(doc, badge, frame.id)
  insertNode(
    doc,
    createNode("text", {
      name: "Badge label",
      text: "✦  Free forever · Open canvas",
      fontSize: 14,
      fontWeight: 500,
      fills: [solid("#E9D5FF")],
    }),
    badge.id,
  )

  insertNode(
    doc,
    createNode("text", {
      name: "Headline",
      x: 80,
      y: 200,
      text: "Design together.\nShip faster.",
      fontFamily: "Space Grotesk",
      fontSize: 60,
      fontWeight: 700,
      lineHeight: 102,
      letterSpacing: -3,
      fills: [solid("#FFFFFF")],
    }),
    frame.id,
  )
  insertNode(
    doc,
    createNode("text", {
      name: "Subtitle",
      x: 80,
      y: 380,
      width: 520,
      textAutoResize: "height",
      text: "Frames, auto layout, vector tools, components-ready layers and export — all in your browser. Double-click any text to edit it.",
      fontSize: 20,
      lineHeight: 150,
      fills: [solid("#B9B3CC")],
    }),
    frame.id,
  )

  const cta = createNode("frame", {
    name: "Button / Primary",
    x: 80,
    y: 520,
    cornerRadius: 12,
    fills: [solid("#A855F7")],
    effects: [{ ...effect("drop-shadow"), color: "#A855F7", opacity: 0.6, blur: 32, y: 10 }],
    layout: { ...defaultAutoLayout(), paddingLeft: 26, paddingRight: 26, paddingTop: 16, paddingBottom: 16 },
  })
  insertNode(doc, cta, frame.id)
  insertNode(
    doc,
    createNode("text", {
      name: "Label",
      text: "Start designing",
      fontSize: 17,
      fontWeight: 600,
      fills: [solid("#FFFFFF")],
    }),
    cta.id,
  )

  const ghost = createNode("frame", {
    name: "Button / Ghost",
    x: 300,
    y: 520,
    cornerRadius: 12,
    fills: [],
    strokes: [solid("#FFFFFF", 0.18)],
    layout: { ...defaultAutoLayout(), paddingLeft: 26, paddingRight: 26, paddingTop: 16, paddingBottom: 16 },
  })
  insertNode(doc, ghost, frame.id)
  insertNode(
    doc,
    createNode("text", { name: "Label", text: "Watch demo", fontSize: 17, fontWeight: 500, fills: [solid("#FFFFFF")] }),
    ghost.id,
  )

  const card = createNode("frame", {
    name: "Card",
    x: 700,
    y: 170,
    width: 400,
    height: 400,
    rotation: -6,
    cornerRadius: 28,
    fills: [solid("#1B1530", 0.9)],
    strokes: [solid("#FFFFFF", 0.08)],
    effects: [{ ...effect("drop-shadow"), blur: 60, y: 30, opacity: 0.5 }],
  })
  insertNode(doc, card, frame.id)
  insertNode(
    doc,
    createNode("rect", {
      name: "Preview",
      x: 728,
      y: 198,
      width: 344,
      height: 200,
      cornerRadius: 18,
      fills: [
        {
          ...solid("#7C3AED"),
          type: "linear",
          angle: 120,
          stops: [
            { position: 0, color: "#7C3AED", opacity: 1 },
            { position: 1, color: "#E879F9", opacity: 1 },
          ],
        },
      ],
    }),
    card.id,
  )
  insertNode(
    doc,
    createNode("star", { name: "Star", x: 870, y: 250, width: 60, height: 60, fills: [solid("#FFFFFF", 0.9)] }),
    card.id,
  )
  insertNode(
    doc,
    createNode("text", {
      name: "Card title",
      x: 728,
      y: 420,
      text: "Neon system",
      fontSize: 26,
      fontWeight: 700,
      fontFamily: "Space Grotesk",
      fills: [solid("#FFFFFF")],
    }),
    card.id,
  )
  insertNode(
    doc,
    createNode("text", {
      name: "Card body",
      x: 728,
      y: 460,
      text: "Tokens, spacing and type scale.",
      fontSize: 16,
      fills: [solid("#9E97B6")],
    }),
    card.id,
  )
  insertNode(
    doc,
    createNode("ellipse", { name: "Avatar", x: 728, y: 505, width: 36, height: 36, fills: [solid("#22D3EE")] }),
    card.id,
  )
  insertNode(
    doc,
    createNode("ellipse", {
      name: "Avatar",
      x: 752,
      y: 505,
      width: 36,
      height: 36,
      fills: [solid("#F472B6")],
      strokes: [solid("#1B1530")],
      strokeWidth: 3,
      strokeAlign: "outside",
    }),
    card.id,
  )

  for (const node of Object.values(doc.nodes)) node.rotation = node.rotation || 0
  finalize(doc)
  return doc
}
