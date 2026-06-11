import type { ColorCount } from '../types'
import { escapeXml } from './misc'

type SvgOptions = {
  cells: string[]
  colorCounts: ColorCount[]
  columns: number
  croppedImageDataUrl: string
  imageOpacity: number
  projectName: string
  rows: number
}

type PhysicalSvgOptions = Omit<SvgOptions, 'colorCounts'> & {
  physicalHeight: number
  physicalWidth: number
}

export const createTemplateSvg = ({
  cells,
  colorCounts,
  columns,
  croppedImageDataUrl,
  imageOpacity,
  projectName,
  rows,
}: SvgOptions) => {
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
}

export const createPhysicalTemplateSvg = ({
  cells,
  columns,
  croppedImageDataUrl,
  imageOpacity,
  physicalHeight,
  physicalWidth,
  projectName,
  rows,
}: PhysicalSvgOptions) => {
  const pageWidth = 210
  const pageHeight = 297
  const originX = (pageWidth - physicalWidth) / 2
  const originY = (pageHeight - physicalHeight) / 2
  const dotStepX = physicalWidth / columns
  const dotStepY = physicalHeight / rows
  const dotRadius = Math.min(dotStepX, dotStepY) * 0.38
  const backgroundImage = croppedImageDataUrl
    ? `<image href="${croppedImageDataUrl}" x="${originX.toFixed(
        3,
      )}" y="${originY.toFixed(3)}" width="${physicalWidth.toFixed(
        3,
      )}" height="${physicalHeight.toFixed(
        3,
      )}" preserveAspectRatio="none" opacity="${(imageOpacity / 100).toFixed(
        2,
      )}" />`
    : ''

  const dots = cells
    .map((cell, index) => {
      const col = index % columns
      const row = Math.floor(index / columns)
      return `<circle cx="${(originX + col * dotStepX + dotStepX / 2).toFixed(
        3,
      )}" cy="${(originY + row * dotStepY + dotStepY / 2).toFixed(
        3,
      )}" r="${dotRadius.toFixed(3)}" fill="${cell}" stroke="#1f2937" stroke-width="0.08" />`
    })
    .join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 210 297">
  <rect width="210" height="297" fill="#ffffff" />
  <text x="10" y="10" font-size="4" font-family="Arial, sans-serif" fill="#111827">${escapeXml(
    projectName,
  )} - physical size</text>
  <text x="10" y="15" font-size="3" font-family="Arial, sans-serif" fill="#4b5563">${physicalWidth.toFixed(
    1,
  )} x ${physicalHeight.toFixed(1)} mm, ${columns} x ${rows} grid</text>
  <rect x="${originX.toFixed(3)}" y="${originY.toFixed(
    3,
  )}" width="${physicalWidth.toFixed(3)}" height="${physicalHeight.toFixed(
    3,
  )}" fill="#ffffff" stroke="#111827" stroke-width="0.2" />
  <g>${dots}</g>
  ${backgroundImage}
</svg>`
}
