import { useEffect, useRef, useState } from 'react'
import type { Crop, PearlColor } from '../types'
import { nearestPearl } from '../utils/color'

type UseRasterizedImageOptions = {
  colors: PearlColor[]
  columns: number
  crop: Crop
  imageUrl: string
  rows: number
}

export function useRasterizedImage({
  colors,
  columns,
  crop,
  imageUrl,
  rows,
}: UseRasterizedImageOptions) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [cells, setCells] = useState<string[]>([])
  const [croppedImageDataUrl, setCroppedImageDataUrl] = useState('')
  const { height: cropHeight, width: cropWidth, x: cropX, y: cropY } = crop

  useEffect(() => {
    if (!imageUrl || colors.length === 0) return

    const image = new Image()
    image.onload = () => {
      const canvas = canvasRef.current
      if (!canvas) return

      canvas.width = columns
      canvas.height = rows
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (!context) return

      context.clearRect(0, 0, columns, rows)
      context.drawImage(
        image,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        columns,
        rows,
      )

      setCroppedImageDataUrl(
        createCroppedImageDataUrl(image, cropX, cropY, cropWidth, cropHeight),
      )

      const imageData = context.getImageData(0, 0, columns, rows).data
      const rendered = Array.from({ length: columns * rows }, (_, index) => {
        const offset = index * 4
        const alpha = imageData[offset + 3] / 255
        const pixel = {
          r: Math.round(imageData[offset] * alpha + 255 * (1 - alpha)),
          g: Math.round(imageData[offset + 1] * alpha + 255 * (1 - alpha)),
          b: Math.round(imageData[offset + 2] * alpha + 255 * (1 - alpha)),
        }
        return nearestPearl(pixel, colors).hex
      })
      setCells(rendered)
    }
    image.src = imageUrl
  }, [colors, columns, cropHeight, cropWidth, cropX, cropY, imageUrl, rows])

  return {
    canvasRef,
    cells,
    croppedImageDataUrl,
    setCells,
    setCroppedImageDataUrl,
  }
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
