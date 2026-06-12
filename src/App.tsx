import { useMemo, useState } from 'react'
import './App.css'
import { ColorPanel } from './components/ColorPanel'
import { LeftPanel } from './components/LeftPanel'
import { PatternPreview } from './components/PatternPreview'
import { useCrop } from './hooks/useCrop'
import { usePaletteEditor } from './hooks/usePaletteEditor'
import { usePhysicalTemplateSize } from './hooks/usePhysicalTemplateSize'
import { useRasterizedImage } from './hooks/useRasterizedImage'
import { useSavedWorks } from './hooks/useSavedWorks'
import { useSourceImage } from './hooks/useSourceImage'
import type { OverlaySource, PearlColor, SavedWork } from './types'
import { downloadSvgFile, printTemplatePages } from './utils/export'
import { makeId } from './utils/misc'
import { decodeSavedCells, encodeCells } from './utils/savedWorks'
import { createPhysicalTemplateSvg, createTemplateSvg } from './utils/svg'

function App() {
  const [overlaySource, setOverlaySource] = useState<OverlaySource>('original')
  const [imageOpacity, setImageOpacity] = useState(35)
  const [projectName, setProjectName] = useState('Pearl template')
  const [message, setMessage] = useState('')

  const {
    cropPercent,
    cropStageRef,
    endCropDrag,
    safeCrop,
    setCropForGrid,
    setCropForImage,
    setImageSize,
    startCropDrag,
    updateCropDrag,
  } = useCrop()
  const {
    columns,
    loadGridSize,
    physicalHeight,
    physicalWidth,
    rows,
    setGridColumns,
    setGridRows,
    setTemplatePhysicalHeight,
    setTemplatePhysicalWidth,
  } = usePhysicalTemplateSize({ onGridSizeChange: setCropForGrid })
  const {
    addColor,
    colors,
    effectiveColorMappings,
    loadColors,
    mapDetectedColor,
    newColorHex,
    newColorName,
    posterizeColorCount,
    removeColor: removePaletteColor,
    selectedColor,
    setNewColorHex,
    setNewColorName,
    setPosterizeCount,
    setSelectedColorId,
    updateColor: updatePaletteColor,
  } = usePaletteEditor()
  const cropAspect = columns / rows
  const {
    clearSourceImage,
    handleUpload,
    imageUrl,
    isPickingPaddingColor,
    paddingColor,
    pickPaddingColor,
    setIsPickingPaddingColor,
    setPaddingColor,
  } = useSourceImage({
    cropAspect,
    cropStageRef,
    onImageSizeChange: setCropForImage,
    onImageNameChange: setProjectName,
    setMessage,
  })
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
  const {
    deleteSavedWork,
    renameSavedWork,
    savedWorks,
    saveWork: saveSavedWork,
  } = useSavedWorks(setMessage)

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
    [cells, colorCounts, columns, imageOpacity, overlayImageDataUrl, projectName, rows],
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

  const updateColor = (id: string, patch: Partial<PearlColor>) => {
    const oldHex = colors.find((color) => color.id === id)?.hex
    updatePaletteColor(id, patch)
    if (patch.hex && oldHex) {
      setCells((current) =>
        current.map((cell) => (cell === oldHex ? patch.hex ?? cell : cell)),
      )
    }
  }

  const removeColor = (id: string) => {
    const result = removePaletteColor(id)
    if (!result?.removedColor) return
    setCells((current) =>
      current.map((cell) =>
        cell === result.removedColor?.hex ? result.replacement.hex : cell,
      ),
    )
  }

  const paintCell = (index: number) => {
    if (!selectedColor) return
    setCells((current) =>
      current.map((cell, cellIndex) =>
        cellIndex === index ? selectedColor.hex : cell,
      ),
    )
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
    const loadedWidth = work.physicalWidth ?? physicalWidth
    setProjectName(work.name)
    loadGridSize(work.columns, work.rows, loadedWidth, work.physicalHeight)
    loadColors(work.colors)
    setCells(decodeSavedCells(work))
    setCroppedImageDataUrl('')
    setDetectedColors([])
    setPosterizedImageDataUrl('')
    clearSourceImage()
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
          <button
            type="button"
            onClick={() => downloadSvgFile(svgMarkup, projectName)}
            disabled={cells.length === 0}
          >
            Download SVG
          </button>
          <button
            type="button"
            onClick={() =>
              printTemplatePages(projectName, printSvgMarkup, printPhysicalSvgMarkup)
            }
            disabled={cells.length === 0}
          >
            Print A4
          </button>
        </div>
      </header>

      <section className="workspace">
        <LeftPanel
          columns={columns}
          cropPercent={cropPercent}
          imageUrl={imageUrl}
          isPickingPaddingColor={isPickingPaddingColor}
          message={message}
          onDeleteSavedWork={deleteSavedWork}
          onEndCropDrag={endCropDrag}
          onLoadSavedWork={loadSavedWork}
          onPickPaddingColor={pickPaddingColor}
          onRenameSavedWork={renameSavedWork}
          onSetColumns={setGridColumns}
          onSetIsPickingPaddingColor={setIsPickingPaddingColor}
          onSetPaddingColor={setPaddingColor}
          onSetPhysicalHeight={setTemplatePhysicalHeight}
          onSetPhysicalWidth={setTemplatePhysicalWidth}
          onSetProjectName={setProjectName}
          onSetRows={setGridRows}
          onStartCropDrag={(action, event) =>
            startCropDrag(action, event, cropAspect)
          }
          onUpdateCropDrag={updateCropDrag}
          onUpload={handleUpload}
          paddingColor={paddingColor}
          physicalHeight={physicalHeight}
          physicalWidth={physicalWidth}
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

export default App
