import { useEffect, useRef, useState } from 'react'
import type { Crop, DetectedColor, PearlColor } from '../types'
import { hexToRgb } from '../utils/color'
import { nearestHex, quantizeImageData } from '../utils/posterize'

type UseRasterizedImageOptions = {
  colors: PearlColor[]
  columns: number
  crop: Crop
  colorMappings: Record<string, string>
  imageUrl: string
  posterizeColorCount: number
  rows: number
}

export function useRasterizedImage({
  colors,
  columns,
  crop,
  colorMappings,
  imageUrl,
  posterizeColorCount,
  rows,
}: UseRasterizedImageOptions) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [cells, setCells] = useState<string[]>([])
  const [croppedImageDataUrl, setCroppedImageDataUrl] = useState('')
  const [posterizedImageDataUrl, setPosterizedImageDataUrl] = useState('')
  const [detectedColors, setDetectedColors] = useState<DetectedColor[]>([])
  const { height: cropHeight, width: cropWidth, x: cropX, y: cropY } = crop

  useEffect(() => {
    if (!imageUrl || colors.length === 0) return

    const image = new Image()
    image.onload = () => {
      const canvas = canvasRef.current
      if (!canvas) return

      const posterizedSize = getPosterizedCanvasSize(cropWidth, cropHeight)
      canvas.width = posterizedSize.width
      canvas.height = posterizedSize.height
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (!context) return

      context.clearRect(0, 0, posterizedSize.width, posterizedSize.height)
      context.drawImage(
        image,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        posterizedSize.width,
        posterizedSize.height,
      )

      setCroppedImageDataUrl(
        createCroppedImageDataUrl(image, cropX, cropY, cropWidth, cropHeight),
      )

      const imageData = context.getImageData(
        0,
        0,
        posterizedSize.width,
        posterizedSize.height,
      )
      const posterized = quantizeImageData(imageData, posterizeColorCount)
      setDetectedColors(posterized.colors)
      setPosterizedImageDataUrl(
        createPosterizedImageDataUrl(
          posterized.indexes,
          posterized.colors,
          posterizedSize.width,
          posterizedSize.height,
        ),
      )

      const rendered = Array.from({ length: columns * rows }, (_, cellIndex) => {
        const dominantColor = getDominantDetectedColor(
          posterized.indexes,
          posterized.colors,
          posterizedSize.width,
          posterizedSize.height,
          columns,
          rows,
          cellIndex,
        )
        const mappedColorId = colorMappings[dominantColor.hex]
        return (
          colors.find((color) => color.id === mappedColorId)?.hex ??
          nearestHex(dominantColor.hex, colors).hex
        )
      })
      setCells(rendered)
    }
    image.src = imageUrl
  }, [
    colorMappings,
    colors,
    columns,
    cropHeight,
    cropWidth,
    cropX,
    cropY,
    imageUrl,
    posterizeColorCount,
    rows,
  ])

  return {
    canvasRef,
    cells,
    croppedImageDataUrl,
    detectedColors,
    posterizedImageDataUrl,
    setCells,
    setCroppedImageDataUrl,
    setDetectedColors,
    setPosterizedImageDataUrl,
  }
}

const createPosterizedImageDataUrl = (
  indexes: Uint16Array,
  colors: DetectedColor[],
  width: number,
  height: number,
) => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) return ''

  const imageData = context.createImageData(width, height)
  indexes.forEach((colorIndex, index) => {
    const rgb = hexToRgb(colors[colorIndex]?.hex ?? '#ffffff')
    const offset = index * 4
    imageData.data[offset] = rgb.r
    imageData.data[offset + 1] = rgb.g
    imageData.data[offset + 2] = rgb.b
    imageData.data[offset + 3] = 255
  })
  context.putImageData(imageData, 0, 0)
  return canvas.toDataURL('image/png')
}

const getPosterizedCanvasSize = (cropWidth: number, cropHeight: number) => {
  const maxSize = 420
  const ratio = cropWidth / cropHeight
  return {
    width: Math.max(1, Math.round(ratio >= 1 ? maxSize : maxSize * ratio)),
    height: Math.max(1, Math.round(ratio >= 1 ? maxSize / ratio : maxSize)),
  }
}

const getDominantDetectedColor = (
  indexes: Uint16Array,
  colors: DetectedColor[],
  sourceWidth: number,
  sourceHeight: number,
  columns: number,
  rows: number,
  cellIndex: number,
) => {
  const column = cellIndex % columns
  const row = Math.floor(cellIndex / columns)
  const xStart = Math.floor((column / columns) * sourceWidth)
  const xEnd = Math.max(xStart + 1, Math.ceil(((column + 1) / columns) * sourceWidth))
  const yStart = Math.floor((row / rows) * sourceHeight)
  const yEnd = Math.max(yStart + 1, Math.ceil(((row + 1) / rows) * sourceHeight))
  const counts = new Map<number, number>()

  for (let y = yStart; y < yEnd; y += 1) {
    for (let x = xStart; x < xEnd; x += 1) {
      const colorIndex = indexes[y * sourceWidth + x]
      counts.set(colorIndex, (counts.get(colorIndex) ?? 0) + 1)
    }
  }

  let dominantIndex = 0
  let dominantCount = -1
  counts.forEach((count, colorIndex) => {
    if (count > dominantCount) {
      dominantCount = count
      dominantIndex = colorIndex
    }
  })

  return colors[dominantIndex] ?? colors[0] ?? { id: 'fallback', hex: '#ffffff', count: 0 }
}

const createCroppedImageDataUrl = (
  image: HTMLImageElement,
  cropX: number,
  cropY: number,
  cropWidth: number,
  cropHeight: number,
) => {
  const croppedCanvas = document.createElement('canvas')
  const croppedContext = croppedCanvas.getContext('2d')
  const croppedMaxSize = 1200
  const cropRatio = cropWidth / cropHeight
  croppedCanvas.width =
    cropRatio >= 1 ? croppedMaxSize : Math.round(croppedMaxSize * cropRatio)
  croppedCanvas.height =
    cropRatio >= 1 ? Math.round(croppedMaxSize / cropRatio) : croppedMaxSize
  croppedContext?.drawImage(
    image,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    croppedCanvas.width,
    croppedCanvas.height,
  )
  return croppedCanvas.toDataURL('image/jpeg', 0.82)
}
