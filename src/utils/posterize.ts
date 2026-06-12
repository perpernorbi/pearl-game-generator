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

const fixedColors = [
  { id: 'detected-black', hex: '#000000', rgb: { r: 0, g: 0, b: 0 } },
  { id: 'detected-white', hex: '#ffffff', rgb: { r: 255, g: 255, b: 255 } },
]

export const quantizeImageData = (
  imageData: ImageData,
  colorCount: number,
): QuantizedImage => {
  const additionalCount = Math.max(0, Math.min(24, Math.round(colorCount)))
  const pixels = extractPixels(imageData)
  if (pixels.length === 0) {
    return {
      colors: fixedColors.map((color) => ({
        id: color.id,
        hex: color.hex,
        count: 0,
      })),
      indexes: new Uint16Array(imageData.width * imageData.height),
    }
  }

  const additionalPixels = pixels.filter((pixel) => !isNearFixedColor(pixel))
  const trainingPixels = additionalPixels.length > 0 ? additionalPixels : pixels
  const additionalCentroids = initializeCentroids(trainingPixels, additionalCount)
  for (let iteration = 0; iteration < 8; iteration += 1) {
    if (additionalCentroids.length === 0) break
    const sums = additionalCentroids.map(() => ({ r: 0, g: 0, b: 0, count: 0 }))
    trainingPixels.forEach((pixel) => {
      const index = nearestIndex(pixel, additionalCentroids)
      sums[index].r += pixel.r
      sums[index].g += pixel.g
      sums[index].b += pixel.b
      sums[index].count += 1
    })

    sums.forEach((sum, index) => {
      if (sum.count === 0) return
      additionalCentroids[index] = {
        r: Math.round(sum.r / sum.count),
        g: Math.round(sum.g / sum.count),
        b: Math.round(sum.b / sum.count),
      }
    })
  }

  const palette = [
    ...fixedColors.map((color) => color.rgb),
    ...additionalCentroids,
  ]
  const indexes = new Uint16Array(imageData.width * imageData.height)
  const counts = new Array<number>(palette.length).fill(0)
  pixels.forEach((pixel, index) => {
    const colorIndex = nearestIndex(pixel, palette)
    indexes[index] = colorIndex
    counts[colorIndex] += 1
  })

  const additionalOrder = mergeDuplicateEntries(
    palette
    .map((color, index) => ({ color, count: counts[index], index }))
    .filter((entry) => entry.index >= fixedColors.length)
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count),
  )
  const remap = new Map<number, number>()
  fixedColors.forEach((_, index) => remap.set(index, index))
  additionalOrder.forEach((entry, index) => {
    entry.indexes.forEach((sourceIndex) => {
      remap.set(sourceIndex, fixedColors.length + index)
    })
  })
  indexes.forEach((value, index) => {
    indexes[index] = remap.get(value) ?? 0
  })

  return {
    colors: [
      ...fixedColors.map((color, index) => ({
        id: color.id,
        hex: color.hex,
        count: counts[index],
      })),
      ...additionalOrder.map((entry, index) => ({
        id: `detected-${index}`,
        hex: toHex(entry.color),
        count: entry.count,
      })),
    ],
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
  if (colorCount === 0) return []
  const sorted = [...pixels].sort(
    (a, b) => a.r + a.g + a.b - (b.r + b.g + b.b),
  )
  return Array.from({ length: colorCount }, (_, index) => {
    const pixelIndex = Math.floor(((index + 0.5) / colorCount) * sorted.length)
    return sorted[Math.min(sorted.length - 1, pixelIndex)]
  })
}

const isNearFixedColor = (pixel: Rgb) =>
  fixedColors.some((color) => distance(pixel, color.rgb) < 32 ** 2 * 3)

const mergeDuplicateEntries = (
  entries: Array<{ color: Rgb; count: number; index: number }>,
) => {
  const merged: Array<{ color: Rgb; count: number; indexes: number[] }> = []
  entries.forEach((entry) => {
    const hex = toHex(entry.color)
    const existing = merged.find((candidate) => toHex(candidate.color) === hex)
    if (existing) {
      existing.count += entry.count
      existing.indexes.push(entry.index)
      return
    }
    merged.push({ color: entry.color, count: entry.count, indexes: [entry.index] })
  })
  return merged
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
