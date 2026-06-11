import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

type PearlColor = {
  id: string
  name: string
  hex: string
}

type Crop = {
  x: number
  y: number
  size: number
}

type SavedWork = {
  id: string
  name: string
  savedAt: string
  columns: number
  rows: number
  colors: PearlColor[]
  cells: string[]
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

function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [imageUrl, setImageUrl] = useState('')
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const [crop, setCrop] = useState<Crop>({ x: 0, y: 0, size: 100 })
  const [columns, setColumns] = useState(29)
  const [rows, setRows] = useState(29)
  const [colors, setColors] = useState<PearlColor[]>(defaultColors)
  const [newColorName, setNewColorName] = useState('New color')
  const [newColorHex, setNewColorHex] = useState('#7c3aed')
  const [cells, setCells] = useState<string[]>([])
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

  const maxCropSize = Math.min(imageSize.width, imageSize.height)
  const safeCropSize = Math.max(1, Math.min(crop.size, maxCropSize || 1))
  const safeCropX = Math.min(crop.x, Math.max(0, imageSize.width - safeCropSize))
  const safeCropY = Math.min(crop.y, Math.max(0, imageSize.height - safeCropSize))

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
        safeCropSize,
        safeCropSize,
        0,
        0,
        columns,
        rows,
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
  }, [columns, colors, imageUrl, rows, safeCropSize, safeCropX, safeCropY])

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
  <line x1="${margin}" y1="${pageHeight - margin - 34}" x2="${
    pageWidth - margin
  }" y2="${pageHeight - margin - 34}" stroke="#d1d5db" stroke-width="0.2" />
  <text x="${margin}" y="${pageHeight - margin - 29}" font-size="4" font-family="Arial, sans-serif" fill="#111827">Pearl counts</text>
  <g font-family="Arial, sans-serif">${legend}</g>
</svg>`
  }, [cells, colorCounts, columns, projectName, rows])

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
        size,
      })
      setMessage(`Loaded ${file.name}`)
    }
    image.src = url
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
      cells,
    }
    const next = [savedWork, ...savedWorks].slice(0, 8)
    const serialized = JSON.stringify(next)
    if (encodeURIComponent(serialized).length > 3800) {
      setMessage(
        'This design is too large for a browser cookie. Try a smaller grid before saving.',
      )
      return
    }
    setCookie(COOKIE_NAME, serialized)
    setSavedWorks(next)
    setMessage('Saved this finished work to cookies.')
  }

  const loadSavedWork = (work: SavedWork) => {
    setProjectName(work.name)
    setColumns(work.columns)
    setRows(work.rows)
    setColors(work.colors)
    setCells(work.cells)
    setImageUrl('')
    setImageSize({ width: 0, height: 0 })
    setMessage(`Loaded saved work: ${work.name}`)
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
                <div className="crop-preview">
                  <img
                    src={imageUrl}
                    alt="Crop preview"
                    style={{
                      width: `${(imageSize.width / safeCropSize) * 100}%`,
                      height: `${(imageSize.height / safeCropSize) * 100}%`,
                      transform: `translate(${
                        (-safeCropX / safeCropSize) * 100
                      }%, ${(-safeCropY / safeCropSize) * 100}%)`,
                    }}
                  />
                </div>
                <label className="field">
                  <span>Left</span>
                  <input
                    max={Math.max(0, imageSize.width - safeCropSize)}
                    min="0"
                    type="range"
                    value={safeCropX}
                    onChange={(event) =>
                      setCrop((current) => ({
                        ...current,
                        x: Number(event.target.value),
                      }))
                    }
                  />
                </label>
                <label className="field">
                  <span>Top</span>
                  <input
                    max={Math.max(0, imageSize.height - safeCropSize)}
                    min="0"
                    type="range"
                    value={safeCropY}
                    onChange={(event) =>
                      setCrop((current) => ({
                        ...current,
                        y: Number(event.target.value),
                      }))
                    }
                  />
                </label>
                <label className="field">
                  <span>Crop size</span>
                  <input
                    max={maxCropSize}
                    min="8"
                    type="range"
                    value={safeCropSize}
                    onChange={(event) =>
                      setCrop((current) => ({
                        ...current,
                        size: Number(event.target.value),
                      }))
                    }
                  />
                </label>
              </>
            ) : (
              <p className="empty-note">Upload a picture to enable crop controls.</p>
            )}
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
                  <button
                    type="button"
                    key={work.id}
                    onClick={() => loadSavedWork(work)}
                  >
                    <strong>{work.name}</strong>
                    <span>
                      {work.columns} x {work.rows}
                    </span>
                  </button>
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
