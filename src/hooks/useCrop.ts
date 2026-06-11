import { useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { PointerEvent } from 'react'
import type {
  Crop,
  CropAction,
  CropDrag,
  CropPercent,
  ImageSize,
} from '../types'
import { clamp } from '../utils/misc'

type UseCropResult = {
  cropPercent: CropPercent
  cropStageRef: RefObject<HTMLDivElement | null>
  imageSize: ImageSize
  safeCrop: Crop
  setCropForGrid: (columns: number, rows: number) => void
  setCropForImage: (imageSize: ImageSize, aspect: number) => void
  setImageSize: (imageSize: ImageSize) => void
  startCropDrag: (
    action: CropAction,
    event: PointerEvent<HTMLElement>,
    aspect: number,
  ) => void
  updateCropDrag: (event: PointerEvent<HTMLDivElement>) => void
  endCropDrag: (event: PointerEvent<HTMLDivElement>) => void
}

export function useCrop(): UseCropResult {
  const cropStageRef = useRef<HTMLDivElement | null>(null)
  const cropDragRef = useRef<CropDrag | null>(null)
  const [imageSize, setImageSize] = useState<ImageSize>({ width: 0, height: 0 })
  const [crop, setCrop] = useState<Crop>({
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  })

  const safeCropWidth = Math.max(1, Math.min(crop.width, imageSize.width || 1))
  const safeCropHeight = Math.max(1, Math.min(crop.height, imageSize.height || 1))
  const safeCropX = Math.min(crop.x, Math.max(0, imageSize.width - safeCropWidth))
  const safeCropY = Math.min(crop.y, Math.max(0, imageSize.height - safeCropHeight))
  const safeCrop = {
    x: safeCropX,
    y: safeCropY,
    width: safeCropWidth,
    height: safeCropHeight,
  }
  const cropPercent = {
    x: imageSize.width ? (safeCropX / imageSize.width) * 100 : 0,
    y: imageSize.height ? (safeCropY / imageSize.height) * 100 : 0,
    width: imageSize.width ? (safeCropWidth / imageSize.width) * 100 : 100,
    height: imageSize.height ? (safeCropHeight / imageSize.height) * 100 : 100,
  }

  const setCropForImage = (nextImageSize: ImageSize, aspect: number) => {
    setImageSize(nextImageSize)
    setCrop(createCenteredAspectCrop(nextImageSize, aspect))
  }

  const setCropForGrid = (columns: number, rows: number) => {
    setCrop((current) =>
      normalizeCropToAspect(
        current,
        imageSize,
        Math.max(1, columns) / Math.max(1, rows),
      ),
    )
  }

  const startCropDrag = (
    action: CropAction,
    event: PointerEvent<HTMLElement>,
    aspect: number,
  ) => {
    const stage = cropStageRef.current
    if (!stage || imageSize.width === 0 || imageSize.height === 0) return

    const rect = stage.getBoundingClientRect()
    cropDragRef.current = {
      action,
      aspect,
      crop: safeCrop,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      scaleX: imageSize.width / rect.width,
      scaleY: imageSize.height / rect.height,
    }
    stage.setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  const updateCropDrag = (event: PointerEvent<HTMLDivElement>) => {
    const drag = cropDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    const minSize = Math.max(8, Math.min(imageSize.width, imageSize.height) * 0.04)
    const deltaX = (event.clientX - drag.startX) * drag.scaleX
    const deltaY = (event.clientY - drag.startY) * drag.scaleY
    const nextCrop =
      drag.action === 'move'
        ? {
            x: clamp(drag.crop.x + deltaX, 0, imageSize.width - drag.crop.width),
            y: clamp(drag.crop.y + deltaY, 0, imageSize.height - drag.crop.height),
            width: drag.crop.width,
            height: drag.crop.height,
          }
        : resizeAspectCrop(
            drag.crop,
            drag.action,
            deltaX,
            deltaY,
            imageSize,
            drag.aspect,
            minSize,
          )

    setCrop({
      x: Math.round(nextCrop.x),
      y: Math.round(nextCrop.y),
      width: Math.round(nextCrop.width),
      height: Math.round(nextCrop.height),
    })
  }

  const endCropDrag = (event: PointerEvent<HTMLDivElement>) => {
    const drag = cropDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    cropDragRef.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return {
    cropPercent,
    cropStageRef,
    endCropDrag,
    imageSize,
    safeCrop,
    setCropForGrid,
    setCropForImage,
    setImageSize,
    startCropDrag,
    updateCropDrag,
  }
}

const createCenteredAspectCrop = (imageSize: ImageSize, aspect: number): Crop => {
  const width = Math.min(imageSize.width, imageSize.height * aspect)
  const height = width / aspect
  return {
    x: Math.round((imageSize.width - width) / 2),
    y: Math.round((imageSize.height - height) / 2),
    width: Math.round(width),
    height: Math.round(height),
  }
}

const normalizeCropToAspect = (
  crop: Crop,
  imageSize: ImageSize,
  aspect: number,
): Crop => {
  if (imageSize.width === 0 || imageSize.height === 0) return crop

  const centerX = crop.x + crop.width / 2
  const centerY = crop.y + crop.height / 2
  const maxWidth = Math.min(imageSize.width, imageSize.height * aspect)
  const nextWidth = Math.min(crop.width, maxWidth)
  const nextHeight = nextWidth / aspect
  const nextX = clamp(centerX - nextWidth / 2, 0, imageSize.width - nextWidth)
  const nextY = clamp(centerY - nextHeight / 2, 0, imageSize.height - nextHeight)

  return {
    x: Math.round(nextX),
    y: Math.round(nextY),
    width: Math.round(nextWidth),
    height: Math.round(nextHeight),
  }
}

const resizeAspectCrop = (
  crop: Crop,
  action: CropAction,
  deltaX: number,
  deltaY: number,
  imageSize: ImageSize,
  aspect: number,
  minSize: number,
): Crop => {
  const hasWest = action.includes('west')
  const hasEast = action.includes('east')
  const hasNorth = action.includes('north')
  const hasSouth = action.includes('south')
  const useVerticalDriver =
    (hasNorth || hasSouth) &&
    (!hasEast && !hasWest ? true : Math.abs(deltaY) > Math.abs(deltaX))

  const anchor = {
    left: crop.x,
    right: crop.x + crop.width,
    centerX: crop.x + crop.width / 2,
    top: crop.y,
    bottom: crop.y + crop.height,
    centerY: crop.y + crop.height / 2,
  }

  let desiredWidth = crop.width
  if (useVerticalDriver) {
    const desiredHeight = hasNorth
      ? crop.height - deltaY
      : hasSouth
        ? crop.height + deltaY
        : crop.height
    desiredWidth = desiredHeight * aspect
  } else if (hasWest) {
    desiredWidth = crop.width - deltaX
  } else if (hasEast) {
    desiredWidth = crop.width + deltaX
  }

  const minWidth = Math.max(minSize, minSize * aspect)
  const maxWidthFromX = hasWest
    ? anchor.right
    : hasEast
      ? imageSize.width - anchor.left
      : 2 * Math.min(anchor.centerX, imageSize.width - anchor.centerX)
  const maxHeightFromY = hasNorth
    ? anchor.bottom
    : hasSouth
      ? imageSize.height - anchor.top
      : 2 * Math.min(anchor.centerY, imageSize.height - anchor.centerY)
  const maxWidth = Math.max(1, Math.min(maxWidthFromX, maxHeightFromY * aspect))
  const width = clamp(desiredWidth, Math.min(minWidth, maxWidth), maxWidth)
  const height = width / aspect

  const x = hasWest
    ? anchor.right - width
    : hasEast
      ? anchor.left
      : anchor.centerX - width / 2
  const y = hasNorth
    ? anchor.bottom - height
    : hasSouth
      ? anchor.top
      : anchor.centerY - height / 2

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
  }
}
