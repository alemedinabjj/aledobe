export interface RGB {
  r: number
  g: number
  b: number
}

export interface HSV {
  h: number
  s: number
  v: number
}

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export function normalizeHex(input: string): string | null {
  let hex = input.trim().replace(/^#/, "")
  if (/^[0-9a-f]{1}$/i.test(hex)) hex = hex.repeat(6)
  if (/^[0-9a-f]{2}$/i.test(hex)) hex = hex.repeat(3)
  if (/^[0-9a-f]{3}$/i.test(hex)) hex = hex.replace(/./g, (c) => c + c)
  if (!/^[0-9a-f]{6}$/i.test(hex)) return null
  return `#${hex.toUpperCase()}`
}

export function hexToRgb(hex: string): RGB {
  const clean = normalizeHex(hex) ?? "#000000"
  const value = parseInt(clean.slice(1), 16)
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 }
}

export function rgbToHex({ r, g, b }: RGB): string {
  const to = (n: number) =>
    Math.round(clamp(n, 0, 255))
      .toString(16)
      .padStart(2, "0")
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase()
}

export function rgbToHsv({ r, g, b }: RGB): HSV {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6
    else if (max === gn) h = (bn - rn) / d + 2
    else h = (rn - gn) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return { h, s: max === 0 ? 0 : d / max, v: max }
}

export function hsvToRgb({ h, s, v }: HSV): RGB {
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let rgb: [number, number, number] = [0, 0, 0]
  if (h < 60) rgb = [c, x, 0]
  else if (h < 120) rgb = [x, c, 0]
  else if (h < 180) rgb = [0, c, x]
  else if (h < 240) rgb = [0, x, c]
  else if (h < 300) rgb = [x, 0, c]
  else rgb = [c, 0, x]
  return { r: (rgb[0] + m) * 255, g: (rgb[1] + m) * 255, b: (rgb[2] + m) * 255 }
}

export const hexToHsv = (hex: string) => rgbToHsv(hexToRgb(hex))
export const hsvToHex = (hsv: HSV) => rgbToHex(hsvToRgb(hsv))

export function rgba(hex: string, alpha = 1) {
  const { r, g, b } = hexToRgb(hex)
  return alpha >= 1 ? hex : `rgba(${r}, ${g}, ${b}, ${+alpha.toFixed(3)})`
}

export function randomPastel() {
  return hsvToHex({ h: Math.random() * 360, s: 0.35, v: 0.95 })
}
