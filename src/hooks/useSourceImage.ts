import { useEffect, useState } from 'react'
import type { RefObject } from 'react'
import type { ImageSize } from '../types'

type UseSourceImageOptions = {
  cropAspect: number
  cropStageRef: RefObject<HTMLDivElement | null>
  onImageSizeChange: (imageSize: ImageSize, aspect: number) => void
  setMessage: (message: string) => void
}

export function useSourceImage({
  cropAspect,
  cropStageRef,
  onImageSizeChange,
  setMessage,
}: UseSourceImageOptions) {
  const [originalImageUrl, setOriginalImageUrl] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [paddingColor, setPaddingColor] = useState('#ffffff')
  const [isPickingPaddingColor, setIsPickingPaddingColor] = useState(false)

  useEffect(() => {
    if (!originalImageUrl) return

    const image = new Image()
    image.onload = () => {
      setImageUrl(createSquarePaddedImageDataUrl(image, paddingColor))
    }
    image.src = originalImageUrl
  }, [originalImageUrl, paddingColor])

  const handleUpload = (file: File | undefined) => {
    if (!file) return
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      setOriginalImageUrl((current) => {
        if (current) URL.revokeObjectURL(current)
        return url
      })
      const squareSize = Math.max(image.width, image.height)
      onImageSizeChange({ width: squareSize, height: squareSize }, cropAspect)
      setMessage(`Loaded ${file.name}`)
    }
    image.src = url
  }

  const pickPaddingColor = (clientX: number, clientY: number) => {
    const stage = cropStageRef.current
    if (!stage || !imageUrl) return

    const rect = stage.getBoundingClientRect()
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(rect.width))
      canvas.height = Math.max(1, Math.round(rect.height))
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (!context) return

      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      const x = Math.max(
        0,
        Math.min(canvas.width - 1, Math.floor(clientX - rect.left)),
      )
      const y = Math.max(
        0,
        Math.min(canvas.height - 1, Math.floor(clientY - rect.top)),
      )
      const pixel = context.getImageData(x, y, 1, 1).data
      setPaddingColor(
        `#${[pixel[0], pixel[1], pixel[2]]
          .map((value) => value.toString(16).padStart(2, '0'))
          .join('')}`,
      )
      setIsPickingPaddingColor(false)
    }
    image.src = imageUrl
  }

  const clearSourceImage = () => {
    if (originalImageUrl) URL.revokeObjectURL(originalImageUrl)
    setOriginalImageUrl('')
    setImageUrl('')
    setIsPickingPaddingColor(false)
  }

  return {
    clearSourceImage,
    handleUpload,
    imageUrl,
    isPickingPaddingColor,
    paddingColor,
    pickPaddingColor,
    setIsPickingPaddingColor,
    setPaddingColor,
  }
}

const createSquarePaddedImageDataUrl = (
  image: HTMLImageElement,
  backgroundColor: string,
) => {
  const size = Math.max(image.width, image.height)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (!context) return ''

  context.fillStyle = backgroundColor
  context.fillRect(0, 0, size, size)
  context.drawImage(
    image,
    (size - image.width) / 2,
    (size - image.height) / 2,
    image.width,
    image.height,
  )
  return canvas.toDataURL('image/png')
}
