import type { PearlColor, SavedWork } from '../types'

export const encodeCells = (cells: string[], colors: PearlColor[]) =>
  cells
    .map((cell) => {
      const index = colors.findIndex((color) => color.hex === cell)
      return (index < 0 ? 0 : index).toString(36).padStart(2, '0')
    })
    .join('')

export const decodeSavedCells = (work: SavedWork) => {
  if (work.cellData) {
    const cellIndexes = work.cellData.match(/.{1,2}/g) ?? []
    return cellIndexes.map((value) => {
      const colorIndex = Number.parseInt(value, 36)
      return work.colors[colorIndex]?.hex ?? work.colors[0]?.hex ?? '#ffffff'
    })
  }

  return work.cells ?? []
}

export const compactSavedWork = (work: SavedWork): SavedWork => ({
  id: work.id,
  name: work.name,
  savedAt: work.savedAt,
  columns: work.columns,
  rows: work.rows,
  colors: work.colors,
  cellData: work.cellData ?? encodeCells(decodeSavedCells(work), work.colors),
  physicalHeight: work.physicalHeight,
  physicalWidth: work.physicalWidth,
  version: 2,
})

export const serializeSavedWorks = (works: SavedWork[]) => {
  const next = works.map(compactSavedWork)
  while (
    next.length > 1 &&
    encodeURIComponent(JSON.stringify(next)).length > 3800
  ) {
    next.pop()
  }

  const serialized = JSON.stringify(next)
  return encodeURIComponent(serialized).length > 3800 ? null : serialized
}
