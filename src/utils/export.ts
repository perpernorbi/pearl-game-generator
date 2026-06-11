import { escapeXml } from './misc'

export const downloadSvgFile = (svgMarkup: string, projectName: string) => {
  const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${projectName.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'pearl-template'}.svg`
  link.click()
  URL.revokeObjectURL(url)
}

export const printTemplatePages = (
  projectName: string,
  fullPageSvg: string,
  physicalPageSvg: string,
) => {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return
  printWindow.document.write(`<!doctype html><html><head><title>${escapeXml(
    projectName,
  )}</title><style>@page{size:A4;margin:0}body{margin:0}svg{display:block;width:210mm;height:297mm}.page-two{break-before:page;page-break-before:always}</style></head><body>${fullPageSvg}<div class="page-two">${physicalPageSvg}</div><script>window.print()</script></body></html>`)
  printWindow.document.close()
}
