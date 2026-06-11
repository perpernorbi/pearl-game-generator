import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import './App.css'
import { ColorPanel } from './components/ColorPanel'
import { LeftPanel } from './components/LeftPanel'
import { PatternPreview } from './components/PatternPreview'
import { COOKIE_NAME, defaultColors } from './constants'
import type { Crop, CropAction, CropDrag, PearlColor, SavedWork } from './types'
import { getCookie, setCookie } from './utils/cookies'
import { nearestPearl } from './utils/color'
import { clamp, escapeXml, makeId } from './utils/misc'
import {
  decodeSavedCells,
  encodeCells,
  serializeSavedWorks,
} from './utils/savedWorks'
import { createTemplateSvg } from './utils/svg'

function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const cropStageRef = useRef<HTMLDivElement | null>(null)
  const cropDragRef = useRef<CropDrag | null>(null)

  const [imageUrl, setImageUrl] = useState('')
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const [crop, setCrop] = useState<Crop>({
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  })
  const [columns, setColumns] = useState(29)
  const [rows, setRows] = useState(29)
  const [colors, setColors] = useState<PearlColor[]>(defaultColors)
  const [selectedColorId, setSelectedColorId] = useState(defaultColors[0].id)
  const [newColorName, setNewColorName] = useState('New color')
  const [newColorHex, setNewColorHex] = useState('#7c3aed')
  const [cells, setCells] = useState<string[]>([])
  const [croppedImageDataUrl, setCroppedImageDataUrl] = useState('')
  const [imageOpacity, setImageOpacity] = useState(35)
  const [projectName, setProjectName] = useState('Pearl template')
  const [savedWorks, setSavedWorks] = useState<SavedWork[]>(() => {
    try {
      const saved = getCookie(COOKIE_NAME)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [message, setMessage] = useState('')

  const safeCropWidth = Math.max(1, Math.min(crop.width, imageSize.width || 1))
  const safeCropHeight = Math.max(1, Math.min(crop.height, imageSize.height || 1))
  const safeCropX = Math.min(crop.x, Math.max(0, imageSize.width - safeCropWidth))
  const safeCropY = Math.min(crop.y, Math.max(0, imageSize.height - safeCropHeight))
  const cropPercent = {
    x: imageSize.width ? (safeCropX / imageSize.width) * 100 : 0,
    y: imageSize.height ? (safeCropY / imageSize.height) * 100 : 0,
    width: imageSize.width ? (safeCropWidth / imageSize.width) * 100 : 100,
    height: imageSize.height ? (safeCropHeight / imageSize.height) * 100 : 100,
  }
  const selectedColor =
    colors.find((color) => color.id === selectedColorId) ?? colors[0]

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
        safeCropX,
        safeCropY,
        safeCropWidth,
        safeCropHeight,
        0,
        0,
        columns,
        rows,
      )

      setCroppedImageDataUrl(
        createCroppedImageDataUrl(
          image,
          safeCropX,
          safeCropY,
          safeCropWidth,
          safeCropHeight,
        ),
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
  }, [
    columns,
    colors,
    imageUrl,
    rows,
    safeCropHeight,
    safeCropWidth,
    safeCropX,
    safeCropY,
  ])

  const colorCounts = useMemo(() => {
    const counts = new Map<string, number>()
    cells.forEach((cell) => counts.set(cell, (counts.get(cell) ?? 0) + 1))
    return colors.map((color) => ({
      ...color,
      count: counts.get(color.hex) ?? 0,
    }))
  }, [cells, colors])

  const svgMarkup = useMemo(
    () =>
      createTemplateSvg({
        cells,
        colorCounts,
        columns,
        croppedImageDataUrl,
        imageOpacity,
        projectName,
        rows,
      }),
    [cells, colorCounts, columns, croppedImageDataUrl, imageOpacity, projectName, rows],
  )

  const handleUpload = (file: File | undefined) => {
    if (!file) return
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      setImageUrl((current) => {
        if (current) URL.revokeObjectURL(current)
        return url
      })
      const size = Math.min(image.width, image.height)
      setImageSize({ width: image.width, height: image.height })
      setCrop({
        x: Math.floor((image.width - size) / 2),
        y: Math.floor((image.height - size) / 2),
        width: size,
        height: size,
      })
      setMessage(`Loaded ${file.name}`)
    }
    image.src = url
  }

  const startCropDrag = (action: CropAction, event: PointerEvent<HTMLElement>) => {
    const stage = cropStageRef.current
    if (!stage || imageSize.width === 0 || imageSize.height === 0) return

    const rect = stage.getBoundingClientRect()
    cropDragRef.current = {
      action,
      crop: {
        x: safeCropX,
        y: safeCropY,
        width: safeCropWidth,
        height: safeCropHeight,
      },
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
    let nextX = drag.crop.x
    let nextY = drag.crop.y
    let nextWidth = drag.crop.width
    let nextHeight = drag.crop.height

    if (drag.action === 'move') {
      nextX = clamp(drag.crop.x + deltaX, 0, imageSize.width - drag.crop.width)
      nextY = clamp(drag.crop.y + deltaY, 0, imageSize.height - drag.crop.height)
    } else {
      if (drag.action.includes('west')) {
        const right = drag.crop.x + drag.crop.width
        nextX = clamp(drag.crop.x + deltaX, 0, right - minSize)
        nextWidth = right - nextX
      }
      if (drag.action.includes('east')) {
        nextWidth = clamp(
          drag.crop.width + deltaX,
          minSize,
          imageSize.width - drag.crop.x,
        )
      }
      if (drag.action.includes('north')) {
        const bottom = drag.crop.y + drag.crop.height
        nextY = clamp(drag.crop.y + deltaY, 0, bottom - minSize)
        nextHeight = bottom - nextY
      }
      if (drag.action.includes('south')) {
        nextHeight = clamp(
          drag.crop.height + deltaY,
          minSize,
          imageSize.height - drag.crop.y,
        )
      }
    }

    setCrop({
      x: Math.round(nextX),
      y: Math.round(nextY),
      width: Math.round(nextWidth),
      height: Math.round(nextHeight),
    })
  }

  const endCropDrag = (event: PointerEvent<HTMLDivElement>) => {
    const drag = cropDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    cropDragRef.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const addColor = () => {
    if (colors.some((color) => color.hex.toLowerCase() === newColorHex)) return
    const colorId = makeId()
    setColors((current) => [
      ...current,
      {
        id: colorId,
        name: newColorName.trim() || 'Pearl color',
        hex: newColorHex,
      },
    ])
    setSelectedColorId(colorId)
  }

  const updateColor = (id: string, patch: Partial<PearlColor>) => {
    const oldHex = colors.find((color) => color.id === id)?.hex
    setColors((current) =>
      current.map((color) =>
        color.id === id ? { ...color, ...patch } : color,
      ),
    )
    if (patch.hex && oldHex) {
      setCells((current) =>
        current.map((cell) => (cell === oldHex ? patch.hex ?? cell : cell)),
      )
    }
  }

  const removeColor = (id: string) => {
    if (colors.length <= 1) return
    const nextColors = colors.filter((color) => color.id !== id)
    const replacement = nextColors[0]
    const removedColor = colors.find((color) => color.id === id)
    setColors(nextColors)
    if (selectedColorId === id) {
      setSelectedColorId(replacement.id)
    }
    if (removedColor) {
      setCells((current) =>
        current.map((cell) =>
          cell === removedColor.hex ? replacement.hex : cell,
        ),
      )
    }
  }

  const paintCell = (index: number) => {
    if (!selectedColor) return
    setCells((current) =>
      current.map((cell, cellIndex) =>
        cellIndex === index ? selectedColor.hex : cell,
      ),
    )
  }

  const downloadSvg = () => {
    const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${projectName.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'pearl-template'}.svg`
    link.click()
    URL.revokeObjectURL(url)
  }

  const printTemplate = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`<!doctype html><html><head><title>${escapeXml(
      projectName,
    )}</title><style>@page{size:A4;margin:0}body{margin:0}</style></head><body>${svgMarkup}<script>window.print()</script></body></html>`)
    printWindow.document.close()
  }

  const saveWork = () => {
    const savedWork: SavedWork = {
      id: makeId(),
      name: projectName.trim() || 'Pearl template',
      savedAt: new Date().toISOString(),
      columns,
      rows,
      colors,
      cellData: encodeCells(cells, colors),
      version: 2,
    }
    const next = [savedWork, ...savedWorks].slice(0, 8)
    const serialized = serializeSavedWorks(next)
    if (!serialized) {
      setMessage(
        'This design is too large for a browser cookie. Try fewer colors or a smaller grid before saving.',
      )
      return
    }
    setCookie(COOKIE_NAME, serialized)
    setSavedWorks(JSON.parse(serialized))
    setMessage('Saved this finished work to cookies.')
  }

  const loadSavedWork = (work: SavedWork) => {
    setProjectName(work.name)
    setColumns(work.columns)
    setRows(work.rows)
    setColors(work.colors)
    setSelectedColorId(work.colors[0]?.id ?? defaultColors[0].id)
    setCells(decodeSavedCells(work))
    setCroppedImageDataUrl('')
    setImageUrl('')
    setImageSize({ width: 0, height: 0 })
    setMessage(`Loaded saved work: ${work.name}`)
  }

  const persistSavedWorks = (works: SavedWork[], messageText: string) => {
    const serialized = serializeSavedWorks(works)
    if (!serialized) {
      setMessage('Could not update saved works because the cookie would be too large.')
      return
    }
    setCookie(COOKIE_NAME, serialized)
    setSavedWorks(JSON.parse(serialized))
    setMessage(messageText)
  }

  const renameSavedWork = (id: string, name: string) => {
    const next = savedWorks.map((work) =>
      work.id === id ? { ...work, name: name || 'Untitled template' } : work,
    )
    persistSavedWorks(next, 'Renamed saved work.')
  }

  const deleteSavedWork = (id: string) => {
    const work = savedWorks.find((saved) => saved.id === id)
    const next = savedWorks.filter((saved) => saved.id !== id)
    persistSavedWorks(
      next,
      work ? `Deleted saved work: ${work.name}` : 'Deleted saved work.',
    )
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Pearl game designer</p>
          <h1>Turn any picture into a printable pearl grid.</h1>
        </div>
        <div className="header-actions">
          <button type="button" onClick={saveWork} disabled={cells.length === 0}>
            Save to cookies
          </button>
          <button type="button" onClick={downloadSvg} disabled={cells.length === 0}>
            Download SVG
          </button>
          <button type="button" onClick={printTemplate} disabled={cells.length === 0}>
            Print A4
          </button>
        </div>
      </header>

      <section className="workspace">
        <LeftPanel
          columns={columns}
          cropPercent={cropPercent}
          imageUrl={imageUrl}
          message={message}
          onDeleteSavedWork={deleteSavedWork}
          onEndCropDrag={endCropDrag}
          onLoadSavedWork={loadSavedWork}
          onRenameSavedWork={renameSavedWork}
          onSetColumns={setColumns}
          onSetProjectName={setProjectName}
          onSetRows={setRows}
          onStartCropDrag={startCropDrag}
          onUpdateCropDrag={updateCropDrag}
          onUpload={handleUpload}
          projectName={projectName}
          rows={rows}
          savedWorks={savedWorks}
          stageRef={cropStageRef}
        />

        <section className="preview-area">
          <div className="preview-layout">
            <PatternPreview
              cells={cells}
              columns={columns}
              croppedImageDataUrl={croppedImageDataUrl}
              imageOpacity={imageOpacity}
              onPaintCell={paintCell}
              rows={rows}
              selectedColor={selectedColor}
            />

            <ColorPanel
              colorCounts={colorCounts}
              colors={colors}
              imageOpacity={imageOpacity}
              newColorHex={newColorHex}
              newColorName={newColorName}
              onAddColor={addColor}
              onRemoveColor={removeColor}
              onSelectColor={setSelectedColorId}
              onSetImageOpacity={setImageOpacity}
              onSetNewColorHex={setNewColorHex}
              onSetNewColorName={setNewColorName}
              onUpdateColor={updateColor}
              selectedColor={selectedColor}
            />
          </div>
        </section>
      </section>

      <canvas ref={canvasRef} hidden />
    </main>
  )
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

export default App
