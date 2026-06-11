import type { PearlColor } from '../types'

type Rgb = {
  r: number
  g: number
  b: number
}

export const hexToRgb = (hex: string): Rgb => {
  const value = hex.replace('#', '')
  const bigint = Number.parseInt(value, 16)
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  }
}

export const colorDistance = (pixel: Rgb, color: PearlColor) => {
  const rgb = hexToRgb(color.hex)
  return (
    (pixel.r - rgb.r) ** 2 + (pixel.g - rgb.g) ** 2 + (pixel.b - rgb.b) ** 2
  )
}

export const nearestPearl = (pixel: Rgb, colors: PearlColor[]) =>
  colors.reduce((best, color) =>
    colorDistance(pixel, color) < colorDistance(pixel, best) ? color : best,
  )
