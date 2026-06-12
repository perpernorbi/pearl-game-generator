import { useState } from 'react'

type UsePhysicalTemplateSizeOptions = {
  initialColumns?: number
  initialRows?: number
  initialWidth?: number
  onGridSizeChange: (columns: number, rows: number) => void
}

export function usePhysicalTemplateSize({
  initialColumns = 29,
  initialRows = 29,
  initialWidth = 145,
  onGridSizeChange,
}: UsePhysicalTemplateSizeOptions) {
  const [columns, setColumns] = useState(initialColumns)
  const [rows, setRows] = useState(initialRows)
  const [physicalWidth, setPhysicalWidth] = useState(initialWidth)
  const [physicalHeight, setPhysicalHeight] = useState(
    roundDimension(initialWidth * (initialRows / initialColumns)),
  )

  const setGridColumns = (nextColumns: number) => {
    const normalizedColumns = Math.max(1, nextColumns)
    setColumns(normalizedColumns)
    setPhysicalHeight(roundDimension(physicalWidth * (rows / normalizedColumns)))
    onGridSizeChange(normalizedColumns, rows)
  }

  const setGridRows = (nextRows: number) => {
    const normalizedRows = Math.max(1, nextRows)
    setRows(normalizedRows)
    setPhysicalHeight(roundDimension(physicalWidth * (normalizedRows / columns)))
    onGridSizeChange(columns, normalizedRows)
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

  const loadGridSize = (
    nextColumns: number,
    nextRows: number,
    loadedWidth: number,
    loadedHeight?: number,
  ) => {
    setColumns(nextColumns)
    setRows(nextRows)
    setPhysicalWidth(roundDimension(loadedWidth))
    setPhysicalHeight(
      roundDimension(loadedHeight ?? loadedWidth * (nextRows / nextColumns)),
    )
    onGridSizeChange(nextColumns, nextRows)
  }

  return {
    columns,
    loadGridSize,
    physicalHeight,
    physicalWidth,
    rows,
    setGridColumns,
    setGridRows,
    setTemplatePhysicalHeight,
    setTemplatePhysicalWidth,
  }
}

export const normalizeDimension = (value: number) =>
  Number.isFinite(value) ? Math.max(1, value) : 1

export const roundDimension = (value: number) => Math.round(value * 10) / 10
