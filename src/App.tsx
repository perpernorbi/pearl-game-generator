import { useMemo, useState } from 'react'
import './App.css'
import { ColorPanel } from './components/ColorPanel'
import { LeftPanel } from './components/LeftPanel'
import { PatternPreview } from './components/PatternPreview'
import { defaultColors } from './constants'
import { useCrop } from './hooks/useCrop'
import { useRasterizedImage } from './hooks/useRasterizedImage'
import { useSavedWorks } from './hooks/useSavedWorks'
import type { OverlaySource, PearlColor, SavedWork } from './types'
import { downloadSvgFile, printTemplatePages } from './utils/export'
import { makeId } from './utils/misc'
import { decodeSavedCells, encodeCells } from './utils/savedWorks'
import { createPhysicalTemplateSvg, createTemplateSvg } from './utils/svg'

function App() {
  const [imageUrl, setImageUrl] = useState('')
  const [columns, setColumns] = useState(29)
  const [rows, setRows] = useState(29)
  const [physicalWidth, setPhysicalWidth] = useState(145)
  const [physicalHeight, setPhysicalHeight] = useState(145)
  const [colors, setColors] = useState<PearlColor[]>(defaultColors)
  const [selectedColorId, setSelectedColorId] = useState(defaultColors[0].id)
  const [newColorName, setNewColorName] = useState('New color')
  const [newColorHex, setNewColorHex] = useState('#7c3aed')
  const [posterizeColorCount, setPosterizeColorCount] = useState(5)
  const [colorMappings, setColorMappings] = useState<Record<string, string>>({})
  const [overlaySource, setOverlaySource] = useState<OverlaySource>('original')
  const [imageOpacity, setImageOpacity] = useState(35)
  const [projectName, setProjectName] = useState('Pearl template')
  const [message, setMessage] = useState('')

  const cropAspect = columns / rows
  const {
    cropPercent,
    cropStageRef,
    safeCrop,
    setCropForGrid,
    setCropForImage,
    setImageSize,
    startCropDrag,
    updateCropDrag,
    endCropDrag,
  } = useCrop()
  const {
    deleteSavedWork,
    renameSavedWork,
    savedWorks,
    saveWork: saveSavedWork,
  } = useSavedWorks(setMessage)
  const selectedColor =
    colors.find((color) => color.id === selectedColorId) ?? colors[0]
  const effectiveColorMappings = useMemo(() => {
    const next: Record<string, string> = {}
    Object.entries(colorMappings).forEach(([hex, colorId]) => {
      if (colors.some((color) => color.id === colorId)) {
        next[hex] = colorId
      }
    })
    return next
  }, [colorMappings, colors])
  const {
    canvasRef,
    cells,
    croppedImageDataUrl,
    detectedColors,
    posterizedImageDataUrl,
    setCells,
    setCroppedImageDataUrl,
    setDetectedColors,
    setPosterizedImageDataUrl,
  } = useRasterizedImage({
    colorMappings: effectiveColorMappings,
    colors,
    columns,
    crop: safeCrop,
    imageUrl,
    posterizeColorCount,
    rows,
  })
  const overlayImageDataUrl =
    overlaySource === 'posterized' ? posterizedImageDataUrl : croppedImageDataUrl

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
        croppedImageDataUrl: overlayImageDataUrl,
        imageOpacity,
        projectName,
        rows,
      }),
    [cells, colorCounts, columns, overlayImageDataUrl, imageOpacity, projectName, rows],
  )

  const printSvgMarkup = useMemo(
    () =>
      createTemplateSvg({
        cells,
        colorCounts,
        columns,
        croppedImageDataUrl: '',
        imageOpacity,
        projectName,
        rows,
      }),
    [cells, colorCounts, columns, imageOpacity, projectName, rows],
  )

  const printPhysicalSvgMarkup = useMemo(
    () =>
      createPhysicalTemplateSvg({
        cells,
        columns,
        croppedImageDataUrl: '',
        imageOpacity,
        physicalHeight,
        physicalWidth,
        projectName,
        rows,
      }),
    [cells, columns, imageOpacity, physicalHeight, physicalWidth, projectName, rows],
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
      const nextImageSize = { width: image.width, height: image.height }
      setCropForImage(nextImageSize, cropAspect)
      setMessage(`Loaded ${file.name}`)
    }
    image.src = url
  }

  const setPosterizeCount = (count: number) => {
    setPosterizeColorCount(Math.max(1, Math.min(24, Math.round(count))))
  }

  const mapDetectedColor = (detectedHex: string, pearlColorId: string) => {
    setColorMappings((current) => ({
      ...current,
      [detectedHex]: pearlColorId,
    }))
  }

  const setGridColumns = (nextColumns: number) => {
    const normalizedColumns = Math.max(1, nextColumns)
    setColumns(normalizedColumns)
    setPhysicalHeight(roundDimension(physicalWidth * (rows / normalizedColumns)))
    setCropForGrid(normalizedColumns, rows)
  }

  const setGridRows = (nextRows: number) => {
    const normalizedRows = Math.max(1, nextRows)
    setRows(normalizedRows)
    setPhysicalHeight(roundDimension(physicalWidth * (normalizedRows / columns)))
    setCropForGrid(columns, normalizedRows)
  }

  const setTemplatePhysicalWidth = (nextWidth: number) => {
    const normalizedWidth = normalizeDimension(nextWidth)
    setPhysicalWidth(roundDimension(normalizedWidth))
    setPhysicalHeight(roundDimension(normalizedWidth * (rows / columns)))
  }

  const setTemplatePhysicalHeight = (nextHeight: number) => {
    const normalizedHeight = normalizeDimension(nextHeight)
    setPhysicalHeight(roundDimension(normalizedHeight))
    setPhysicalWidth(roundDimension(normalizedHeight * (columns / rows)))
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
    downloadSvgFile(svgMarkup, projectName)
  }

  const printTemplate = () => {
    printTemplatePages(projectName, printSvgMarkup, printPhysicalSvgMarkup)
  }

  const saveCurrentWork = () => {
    saveSavedWork({
      id: makeId(),
      name: projectName.trim() || 'Pearl template',
      savedAt: new Date().toISOString(),
      columns,
      rows,
      colors,
      cellData: encodeCells(cells, colors),
      physicalHeight,
      physicalWidth,
      version: 2,
    })
  }

  const loadSavedWork = (work: SavedWork) => {
    setProjectName(work.name)
    setColumns(work.columns)
    setRows(work.rows)
    const loadedWidth = work.physicalWidth ?? physicalWidth
    setPhysicalWidth(roundDimension(loadedWidth))
    setPhysicalHeight(
      roundDimension(work.physicalHeight ?? loadedWidth * (work.rows / work.columns)),
    )
    setColors(work.colors)
    setSelectedColorId(work.colors[0]?.id ?? defaultColors[0].id)
    setCells(decodeSavedCells(work))
    setCroppedImageDataUrl('')
    setDetectedColors([])
    setPosterizedImageDataUrl('')
    setColorMappings({})
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
          <button type="button" onClick={saveCurrentWork} disabled={cells.length === 0}>
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
          onSetColumns={setGridColumns}
          onSetPhysicalHeight={setTemplatePhysicalHeight}
          onSetPhysicalWidth={setTemplatePhysicalWidth}
          onSetProjectName={setProjectName}
          onSetRows={setGridRows}
          onStartCropDrag={(action, event) =>
            startCropDrag(action, event, cropAspect)
          }
          onUpdateCropDrag={updateCropDrag}
          onUpload={handleUpload}
          projectName={projectName}
          physicalHeight={physicalHeight}
          physicalWidth={physicalWidth}
          rows={rows}
          savedWorks={savedWorks}
          stageRef={cropStageRef}
        />

        <section className="preview-area">
          <div className="preview-layout">
            <PatternPreview
              cells={cells}
              columns={columns}
              croppedImageDataUrl={overlayImageDataUrl}
              imageOpacity={imageOpacity}
              onPaintCell={paintCell}
              rows={rows}
              selectedColor={selectedColor}
            />

            <ColorPanel
              colorCounts={colorCounts}
              colorMappings={effectiveColorMappings}
              colors={colors}
              detectedColors={detectedColors}
              imageOpacity={imageOpacity}
              newColorHex={newColorHex}
              newColorName={newColorName}
              onAddColor={addColor}
              onMapDetectedColor={mapDetectedColor}
              onRemoveColor={removeColor}
              onSelectColor={setSelectedColorId}
              onSetImageOpacity={setImageOpacity}
              onSetNewColorHex={setNewColorHex}
              onSetNewColorName={setNewColorName}
              onSetOverlaySource={setOverlaySource}
              onSetPosterizeColorCount={setPosterizeCount}
              onUpdateColor={updateColor}
              overlaySource={overlaySource}
              posterizeColorCount={posterizeColorCount}
              selectedColor={selectedColor}
            />
          </div>
        </section>
      </section>

      <canvas ref={canvasRef} hidden />
    </main>
  )
}

const normalizeDimension = (value: number) =>
  Number.isFinite(value) ? Math.max(1, value) : 1

const roundDimension = (value: number) => Math.round(value * 10) / 10

export default App
