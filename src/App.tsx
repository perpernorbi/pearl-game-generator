import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import './App.css'

type PearlColor = {
  id: string
  name: string
  hex: string
}

type Crop = {
  x: number
  y: number
  width: number
  height: number
}

type CropAction =
  | 'move'
  | 'north'
  | 'east'
  | 'south'
  | 'west'
  | 'north-east'
  | 'south-east'
  | 'south-west'
  | 'north-west'

type CropDrag = {
  action: CropAction
  crop: Crop
  pointerId: number
  startX: number
  startY: number
  scaleX: number
  scaleY: number
}

type SavedWork = {
  id: string
  name: string
  savedAt: string
  columns: number
  rows: number
  colors: PearlColor[]
  cellData?: string
  cells?: string[]
  version?: number
}

const COOKIE_NAME = 'pearlDesignerWorks'

const defaultColors: PearlColor[] = [
  { id: 'white', name: 'White', hex: '#f8fafc' },
  { id: 'black', name: 'Black', hex: '#111827' },
  { id: 'red', name: 'Red', hex: '#dc2626' },
  { id: 'orange', name: 'Orange', hex: '#f97316' },
  { id: 'yellow', name: 'Yellow', hex: '#facc15' },
  { id: 'green', name: 'Green', hex: '#16a34a' },
  { id: 'blue', name: 'Blue', hex: '#2563eb' },
  { id: 'pink', name: 'Pink', hex: '#ec4899' },
]

const hexToRgb = (hex: string) => {
  const value = hex.replace('#', '')
  const bigint = Number.parseInt(value, 16)
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  }
}

const colorDistance = (
  pixel: { r: number; g: number; b: number },
  color: PearlColor,
) => {
  const rgb = hexToRgb(color.hex)
  return (
    (pixel.r - rgb.r) ** 2 + (pixel.g - rgb.g) ** 2 + (pixel.b - rgb.b) ** 2
  )
}

const nearestPearl = (
  pixel: { r: number; g: number; b: number },
  colors: PearlColor[],
) =>
  colors.reduce((best, color) =>
    colorDistance(pixel, color) < colorDistance(pixel, best) ? color : best,
  )

const getCookie = (name: string) => {
  const cookie = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
  return cookie ? decodeURIComponent(cookie.split('=').slice(1).join('=')) : ''
}

const setCookie = (name: string, value: string) => {
  document.cookie = `${name}=${encodeURIComponent(
    value,
  )}; max-age=31536000; path=/; SameSite=Lax`
}

const escapeXml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

const makeId = () => Math.random().toString(36).slice(2, 10)

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

const encodeCells = (cells: string[], colors: PearlColor[]) =>
  cells
    .map((cell) => {
      const index = colors.findIndex((color) => color.hex === cell)
      return (index < 0 ? 0 : index).toString(36).padStart(2, '0')
    })
    .join('')

const decodeSavedCells = (work: SavedWork) => {
  if (work.cellData) {
    const cellIndexes = work.cellData.match(/.{1,2}/g) ?? []
    return cellIndexes.map((value) => {
      const colorIndex = Number.parseInt(value, 36)
      return work.colors[colorIndex]?.hex ?? work.colors[0]?.hex ?? '#ffffff'
    })
  }

  return work.cells ?? []
}

const compactSavedWork = (work: SavedWork): SavedWork => ({
  id: work.id,
  name: work.name,
  savedAt: work.savedAt,
  columns: work.columns,
  rows: work.rows,
  colors: work.colors,
  cellData: work.cellData ?? encodeCells(decodeSavedCells(work), work.colors),
  version: 2,
})

const serializeSavedWorks = (works: SavedWork[]) => {
  const next = works.map(compactSavedWork)
  while (next.length > 1 && encodeURIComponent(JSON.stringify(next)).length > 3800) {
    next.pop()
  }

  const serialized = JSON.stringify(next)
  return encodeURIComponent(serialized).length > 3800 ? null : serialized
}

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

  useEffect(() => {
    if (!imageUrl || colors.length === 0) {
      return
    }

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

      const croppedCanvas = document.createElement('canvas')
      const croppedContext = croppedCanvas.getContext('2d')
      const croppedMaxSize = 1200
      const cropRatio = safeCropWidth / safeCropHeight
      croppedCanvas.width =
        cropRatio >= 1 ? croppedMaxSize : Math.round(croppedMaxSize * cropRatio)
      croppedCanvas.height =
        cropRatio >= 1 ? Math.round(croppedMaxSize / cropRatio) : croppedMaxSize
      croppedContext?.drawImage(
        image,
        safeCropX,
        safeCropY,
        safeCropWidth,
        safeCropHeight,
        0,
        0,
        croppedCanvas.width,
        croppedCanvas.height,
      )
      setCroppedImageDataUrl(croppedCanvas.toDataURL('image/jpeg', 0.82))

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
  }, [columns, colors, imageUrl, rows, safeCropHeight, safeCropWidth, safeCropX, safeCropY])

  const colorCounts = useMemo(() => {
    const counts = new Map<string, number>()
    cells.forEach((cell) => counts.set(cell, (counts.get(cell) ?? 0) + 1))
    return colors.map((color) => ({
      ...color,
      count: counts.get(color.hex) ?? 0,
    }))
  }, [cells, colors])

  const svgMarkup = useMemo(() => {
    const pageWidth = 210
    const pageHeight = 297
    const margin = 14
    const legendHeight = 42
    const availableWidth = pageWidth - margin * 2
    const availableHeight = pageHeight - margin * 2 - legendHeight
    const dotStep = Math.min(availableWidth / columns, availableHeight / rows)
    const dotRadius = dotStep * 0.38
    const gridWidth = dotStep * columns
    const originX = (pageWidth - gridWidth) / 2
    const originY = margin + 10
    const backgroundImage = croppedImageDataUrl
      ? `<image href="${croppedImageDataUrl}" x="${originX.toFixed(
          3,
        )}" y="${originY.toFixed(3)}" width="${gridWidth.toFixed(
          3,
        )}" height="${(dotStep * rows).toFixed(
          3,
        )}" preserveAspectRatio="none" opacity="${(imageOpacity / 100).toFixed(
          2,
        )}" />`
      : ''

    const dots = cells
      .map((cell, index) => {
        const col = index % columns
        const row = Math.floor(index / columns)
        return `<circle cx="${(originX + col * dotStep + dotStep / 2).toFixed(
          3,
        )}" cy="${(originY + row * dotStep + dotStep / 2).toFixed(
          3,
        )}" r="${dotRadius.toFixed(3)}" fill="${cell}" stroke="#1f2937" stroke-width="0.08" />`
      })
      .join('')

    const legend = colorCounts
      .filter((color) => color.count > 0)
      .map((color, index) => {
        const x = margin + (index % 4) * 46
        const y = pageHeight - margin - 24 + Math.floor(index / 4) * 9
        return `<g><circle cx="${x}" cy="${y}" r="2.8" fill="${color.hex}" stroke="#111827" stroke-width="0.2" /><text x="${
          x + 5
        }" y="${y + 1.5}" font-size="3.5" fill="#111827">${escapeXml(
          color.name,
        )}: ${color.count}</text></g>`
      })
      .join('')

    return `<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 210 297">
  <rect width="210" height="297" fill="#ffffff" />
  <text x="${margin}" y="12" font-size="6" font-family="Arial, sans-serif" fill="#111827">${escapeXml(
    projectName,
  )}</text>
  <text x="${margin}" y="18" font-size="3.5" font-family="Arial, sans-serif" fill="#4b5563">${columns} x ${rows} grid, ${cells.length} pearls</text>
  <g>${dots}</g>
  ${backgroundImage}
  <line x1="${margin}" y1="${pageHeight - margin - 34}" x2="${
    pageWidth - margin
  }" y2="${pageHeight - margin - 34}" stroke="#d1d5db" stroke-width="0.2" />
  <text x="${margin}" y="${pageHeight - margin - 29}" font-size="4" font-family="Arial, sans-serif" fill="#111827">Pearl counts</text>
  <g font-family="Arial, sans-serif">${legend}</g>
</svg>`
  }, [cells, colorCounts, columns, croppedImageDataUrl, imageOpacity, projectName, rows])

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
    setColors((current) => [
      ...current,
      {
        id: makeId(),
        name: newColorName.trim() || 'Pearl color',
        hex: newColorHex,
      },
    ])
  }

  const updateColor = (id: string, patch: Partial<PearlColor>) => {
    setColors((current) =>
      current.map((color) =>
        color.id === id ? { ...color, ...patch } : color,
      ),
    )
  }

  const removeColor = (id: string) => {
    if (colors.length <= 1) return
    setColors((current) => current.filter((color) => color.id !== id))
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
    persistSavedWorks(next, work ? `Deleted saved work: ${work.name}` : 'Deleted saved work.')
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
        <aside className="controls">
          <label className="field">
            <span>Template name</span>
            <input
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
            />
          </label>

          <label className="field upload-field">
            <span>Picture upload</span>
            <input
              accept="image/*"
              type="file"
              onChange={(event) => handleUpload(event.target.files?.[0])}
            />
          </label>

          <div className="field-row">
            <label className="field">
              <span>Columns</span>
              <input
                min="4"
                max="80"
                type="number"
                value={columns}
                onChange={(event) => setColumns(Number(event.target.value))}
              />
            </label>
            <label className="field">
              <span>Rows</span>
              <input
                min="4"
                max="80"
                type="number"
                value={rows}
                onChange={(event) => setRows(Number(event.target.value))}
              />
            </label>
          </div>

          <section className="panel">
            <h2>Crop</h2>
            {imageUrl ? (
              <>
                <div
                  className="crop-stage"
                  ref={cropStageRef}
                  onPointerMove={updateCropDrag}
                  onPointerUp={endCropDrag}
                  onPointerCancel={endCropDrag}
                >
                  <img
                    src={imageUrl}
                    alt="Uploaded crop source"
                    draggable="false"
                  />
                  <div className="crop-dim crop-dim-top" style={{ height: `${cropPercent.y}%` }} />
                  <div
                    className="crop-dim crop-dim-right"
                    style={{
                      left: `${cropPercent.x + cropPercent.width}%`,
                      top: `${cropPercent.y}%`,
                      height: `${cropPercent.height}%`,
                    }}
                  />
                  <div
                    className="crop-dim crop-dim-bottom"
                    style={{ top: `${cropPercent.y + cropPercent.height}%` }}
                  />
                  <div
                    className="crop-dim crop-dim-left"
                    style={{
                      width: `${cropPercent.x}%`,
                      top: `${cropPercent.y}%`,
                      height: `${cropPercent.height}%`,
                    }}
                  />
                  <div
                    className="crop-box"
                    style={{
                      left: `${cropPercent.x}%`,
                      top: `${cropPercent.y}%`,
                      width: `${cropPercent.width}%`,
                      height: `${cropPercent.height}%`,
                    }}
                    onPointerDown={(event) => startCropDrag('move', event)}
                  >
                    {[
                      'north',
                      'east',
                      'south',
                      'west',
                      'north-east',
                      'south-east',
                      'south-west',
                      'north-west',
                    ].map((handle) => (
                      <span
                        className={`crop-handle crop-handle-${handle}`}
                        key={handle}
                        onPointerDown={(event) => {
                          event.stopPropagation()
                          startCropDrag(handle as CropAction, event)
                        }}
                      />
                    ))}
                  </div>
                </div>
                <p className="empty-note">
                  Drag the rectangle to move it, or drag an edge or corner to resize.
                </p>
              </>
            ) : (
              <p className="empty-note">Upload a picture to enable crop controls.</p>
            )}
          </section>

          <section className="panel">
            <h2>Image guide</h2>
            <label className="field">
              <span>Background opacity: {imageOpacity}%</span>
              <input
                min="0"
                max="100"
                type="range"
                value={imageOpacity}
                onChange={(event) => setImageOpacity(Number(event.target.value))}
              />
            </label>
          </section>

          <section className="panel">
            <h2>Pearl colors</h2>
            <div className="palette-list">
              {colors.map((color) => (
                <div className="palette-item" key={color.id}>
                  <input
                    aria-label={`${color.name} color`}
                    type="color"
                    value={color.hex}
                    onChange={(event) =>
                      updateColor(color.id, { hex: event.target.value })
                    }
                  />
                  <input
                    aria-label={`${color.name} name`}
                    value={color.name}
                    onChange={(event) =>
                      updateColor(color.id, { name: event.target.value })
                    }
                  />
                  <span>{colorCounts.find((item) => item.id === color.id)?.count ?? 0}</span>
                  <button type="button" onClick={() => removeColor(color.id)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <div className="add-color">
              <input
                aria-label="New color"
                type="color"
                value={newColorHex}
                onChange={(event) => setNewColorHex(event.target.value)}
              />
              <input
                aria-label="New color name"
                value={newColorName}
                onChange={(event) => setNewColorName(event.target.value)}
              />
              <button type="button" onClick={addColor}>
                Add color
              </button>
            </div>
          </section>

          <section className="panel">
            <h2>Saved works</h2>
            {savedWorks.length === 0 ? (
              <p className="empty-note">No cookie-saved designs yet.</p>
            ) : (
              <div className="saved-list">
                {savedWorks.map((work) => (
                  <div className="saved-item" key={work.id}>
                    <label>
                      <span className="sr-only">Saved work name</span>
                      <input
                        value={work.name}
                        onChange={(event) =>
                          renameSavedWork(work.id, event.target.value)
                        }
                      />
                    </label>
                    <span>
                      {work.columns} x {work.rows}
                    </span>
                    <button type="button" onClick={() => loadSavedWork(work)}>
                      Load
                    </button>
                    <button type="button" onClick={() => deleteSavedWork(work.id)}>
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
          {message ? <p className="status">{message}</p> : null}
        </aside>

        <section className="preview-area">
          <div className="preview-toolbar">
            <div>
              <h2>Template preview</h2>
              <p>
                {columns} x {rows} grid, {cells.length} pearls
              </p>
            </div>
          </div>

          {cells.length > 0 ? (
            <div
              className="pearl-grid"
              style={{
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                aspectRatio: `${columns} / ${rows}`,
              }}
            >
              {croppedImageDataUrl ? (
                <img
                  className="grid-image-guide"
                  src={croppedImageDataUrl}
                  alt=""
                  style={{ opacity: imageOpacity / 100 }}
                />
              ) : null}
              {cells.map((cell, index) => (
                <span
                  className="pearl"
                  key={`${cell}-${index}`}
                  style={{ backgroundColor: cell }}
                  title={`Row ${Math.floor(index / columns) + 1}, column ${
                    (index % columns) + 1
                  }`}
                />
              ))}
            </div>
          ) : (
            <div className="empty-preview">
              <p>Upload an image to generate the pearl pattern.</p>
            </div>
          )}

          {cells.length > 0 ? (
            <section className="counts">
              <h2>Pearl counts</h2>
              <div>
                {colorCounts
                  .filter((color) => color.count > 0)
                  .map((color) => (
                    <span key={color.id}>
                      <i style={{ backgroundColor: color.hex }} />
                      {color.name}: {color.count}
                    </span>
                  ))}
              </div>
            </section>
          ) : null}
        </section>
      </section>

      <canvas ref={canvasRef} hidden />
    </main>
  )
}

export default App
