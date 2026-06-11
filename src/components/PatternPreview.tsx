import type { PearlColor } from '../types'

type PatternPreviewProps = {
  cells: string[]
  columns: number
  croppedImageDataUrl: string
  imageOpacity: number
  onPaintCell: (index: number) => void
  rows: number
  selectedColor: PearlColor | undefined
}

export function PatternPreview({
  cells,
  columns,
  croppedImageDataUrl,
  imageOpacity,
  onPaintCell,
  rows,
  selectedColor,
}: PatternPreviewProps) {
  return (
    <div className="pattern-column">
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
            <button
              type="button"
              className="pearl"
              key={`${cell}-${index}`}
              style={{ backgroundColor: cell }}
              aria-label={`Paint row ${Math.floor(index / columns) + 1}, column ${
                (index % columns) + 1
              } ${selectedColor ? selectedColor.name : 'selected color'}`}
              onClick={() => onPaintCell(index)}
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
    </div>
  )
}
