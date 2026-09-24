export type NodeType = "frame" | "group" | "rect" | "ellipse" | "polygon" | "star" | "line" | "path" | "text" | "image"

export type ShapeTool = "frame" | "rect" | "ellipse" | "polygon" | "star" | "line" | "arrow"

export type Tool = "move" | "hand" | ShapeTool | "pen" | "pencil" | "text" | "image"

export type BlendMode =
  | "normal"
  | "multiply"
  | "screen"
  | "overlay"
  | "darken"
  | "lighten"
  | "color-dodge"
  | "color-burn"
  | "hard-light"
  | "soft-light"
  | "difference"
  | "exclusion"
  | "hue"
  | "saturation"
  | "color"
  | "luminosity"

export interface GradientStop {
  position: number
  color: string
  opacity: number
}

export type PaintType = "solid" | "linear" | "radial"

export interface Paint {
  id: string
  type: PaintType
  color: string
  opacity: number
  visible: boolean
  stops: GradientStop[]
  angle: number
}

export type EffectType = "drop-shadow" | "inner-shadow" | "layer-blur"

export interface Effect {
  id: string
  type: EffectType
  visible: boolean
  x: number
  y: number
  blur: number
  spread: number
  color: string
  opacity: number
}

export interface Vertex {
  x: number
  y: number
  hx: number
  hy: number
}

export type StrokeAlign = "inside" | "center" | "outside"
export type StrokeCap = "none" | "arrow" | "triangle" | "circle"
export type TextAlign = "left" | "center" | "right"
export type TextAutoResize = "width" | "height" | "fixed"
export type TextDecoration = "none" | "underline" | "line-through"
export type TextCase = "none" | "upper" | "lower" | "title"
export type ImageFit = "fill" | "fit" | "stretch"

export interface AutoLayout {
  direction: "horizontal" | "vertical"
  gap: number
  paddingTop: number
  paddingRight: number
  paddingBottom: number
  paddingLeft: number
  align: "start" | "center" | "end"
  justify: "start" | "center" | "end" | "space-between"
  hugWidth: boolean
  hugHeight: boolean
}

export interface SceneNode {
  id: string
  type: NodeType
  name: string
  parentId: string
  children?: string[]
  x: number
  y: number
  width: number
  height: number
  rotation: number
  opacity: number
  visible: boolean
  locked: boolean
  expanded?: boolean
  blendMode: BlendMode
  fills: Paint[]
  strokes: Paint[]
  strokeWidth: number
  strokeAlign: StrokeAlign
  strokeDash: number
  startCap: StrokeCap
  endCap: StrokeCap
  effects: Effect[]
  cornerRadius: number
  clipContent?: boolean
  layout?: AutoLayout | null
  pointCount?: number
  innerRadius?: number
  vertices?: Vertex[]
  closed?: boolean
  text?: string
  fontFamily?: string
  fontSize?: number
  fontWeight?: number
  italic?: boolean
  lineHeight?: number
  letterSpacing?: number
  textAlign?: TextAlign
  textAutoResize?: TextAutoResize
  textDecoration?: TextDecoration
  textCase?: TextCase
  src?: string
  imageFit?: ImageFit
}

export interface Page {
  id: string
  name: string
  children: string[]
  background: string
}

export interface Doc {
  name: string
  pages: Page[]
  nodes: Record<string, SceneNode>
}

export interface Point {
  x: number
  y: number
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface Camera {
  x: number
  y: number
  zoom: number
}

export interface Guide {
  axis: "x" | "y"
  value: number
  from: number
  to: number
}

export interface Measure {
  x1: number
  y1: number
  x2: number
  y2: number
  label: string
}

export type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w"
