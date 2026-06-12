import type { DetectedColor } from '../types'
import { hexToRgb } from './color'

type Rgb = {
  r: number
  g: number
  b: number
}

type QuantizedImage = {
  colors: DetectedColor[]
  indexes: Uint16Array
}

const toHex = ({ r, g, b }: Rgb) =>
  `#${[r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('')}`

const distance = (a: Rgb, b: Rgb) =>
  (a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2

export const quantizeImageData = (
  imageData: ImageData,
  colorCount: number,
): QuantizedImage => {
  const targetCount = Math.max(1, Math.min(24, Math.round(colorCount)))
  const pixels = extractPixels(imageData)
  if (pixels.length === 0) {
    return {
      colors: [{ id: 'detected-0', hex: '#ffffff', count: 0 }],
      indexes: new Uint16Array(imageData.width * imageData.height),
    }
  }

  const centroids = initializeCentroids(pixels, targetCount)
  for (let iteration = 0; iteration < 8; iteration += 1) {
    const sums = centroids.map(() => ({ r: 0, g: 0, b: 0, count: 0 }))
    pixels.forEach((pixel) => {
      const index = nearestIndex(pixel, centroids)
      sums[index].r += pixel.r
      sums[index].g += pixel.g
      sums[index].b += pixel.b
      sums[index].count += 1
    })

    sums.forEach((sum, index) => {
      if (sum.count === 0) return
      centroids[index] = {
        r: Math.round(sum.r / sum.count),
        g: Math.round(sum.g / sum.count),
        b: Math.round(sum.b / sum.count),
      }
    })
  }

  const indexes = new Uint16Array(imageData.width * imageData.height)
  const counts = new Array<number>(centroids.length).fill(0)
  pixels.forEach((pixel, index) => {
    const colorIndex = nearestIndex(pixel, centroids)
    indexes[index] = colorIndex
    counts[colorIndex] += 1
  })

  const order = centroids
    .map((color, index) => ({ color, count: counts[index], index }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count)
  const remap = new Map(order.map((entry, index) => [entry.index, index]))
  indexes.forEach((value, index) => {
    indexes[index] = remap.get(value) ?? 0
  })

  return {
    colors: order.map((entry, index) => ({
      id: `detected-${index}`,
      hex: toHex(entry.color),
      count: entry.count,
    })),
    indexes,
  }
}

const extractPixels = (imageData: ImageData): Rgb[] => {
  const pixels: Rgb[] = []
  for (let index = 0; index < imageData.data.length; index += 4) {
    const alpha = imageData.data[index + 3] / 255
    pixels.push({
      r: Math.round(imageData.data[index] * alpha + 255 * (1 - alpha)),
      g: Math.round(imageData.data[index + 1] * alpha + 255 * (1 - alpha)),
      b: Math.round(imageData.data[index + 2] * alpha + 255 * (1 - alpha)),
    })
  }
  return pixels
}

const initializeCentroids = (pixels: Rgb[], colorCount: number) => {
  const sorted = [...pixels].sort(
    (a, b) => a.r + a.g + a.b - (b.r + b.g + b.b),
  )
  return Array.from({ length: colorCount }, (_, index) => {
    const pixelIndex = Math.floor(((index + 0.5) / colorCount) * sorted.length)
    return sorted[Math.min(sorted.length - 1, pixelIndex)]
  })
}

export const nearestHex = <TColor extends { hex: string }>(
  hex: string,
  colors: TColor[],
) => {
  const rgb = hexToRgb(hex)
  return colors.reduce((best, color) =>
    distance(rgb, hexToRgb(color.hex)) < distance(rgb, hexToRgb(best.hex))
      ? color
      : best,
  )
}

const nearestIndex = (pixel: Rgb, centroids: Rgb[]) => {
  let bestIndex = 0
  let bestDistance = Number.POSITIVE_INFINITY
  centroids.forEach((centroid, index) => {
    const currentDistance = distance(pixel, centroid)
    if (currentDistance < bestDistance) {
      bestDistance = currentDistance
      bestIndex = index
    }
  })
  return bestIndex
}
