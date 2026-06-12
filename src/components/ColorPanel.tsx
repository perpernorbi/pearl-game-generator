import type { KeyboardEvent } from 'react'
import type {
  ColorCount,
  DetectedColor,
  OverlaySource,
  PearlColor,
} from '../types'
import { nearestHex } from '../utils/posterize'
import { TrashIcon } from './Icons'

type ColorPanelProps = {
  colorCounts: ColorCount[]
  colorMappings: Record<string, string>
  colors: PearlColor[]
  detectedColors: DetectedColor[]
  imageOpacity: number
  newColorHex: string
  newColorName: string
  onAddColor: () => void
  onMapDetectedColor: (detectedHex: string, pearlColorId: string) => void
  onRemoveColor: (id: string) => void
  onSelectColor: (id: string) => void
  onSetImageOpacity: (opacity: number) => void
  onSetNewColorHex: (hex: string) => void
  onSetNewColorName: (name: string) => void
  onSetOverlaySource: (source: OverlaySource) => void
  onSetPosterizeColorCount: (count: number) => void
  onUpdateColor: (id: string, patch: Partial<PearlColor>) => void
  overlaySource: OverlaySource
  posterizeColorCount: number
  selectedColor: PearlColor | undefined
}

export function ColorPanel({
  colorCounts,
  colorMappings,
  colors,
  detectedColors,
  imageOpacity,
  newColorHex,
  newColorName,
  onAddColor,
  onMapDetectedColor,
  onRemoveColor,
  onSelectColor,
  onSetImageOpacity,
  onSetNewColorHex,
  onSetNewColorName,
  onSetOverlaySource,
  onSetPosterizeColorCount,
  onUpdateColor,
  overlaySource,
  posterizeColorCount,
  selectedColor,
}: ColorPanelProps) {
  const selectColorByKeyboard = (
    colorId: string,
    event: KeyboardEvent<HTMLDivElement>,
  ) => {
    if (event.target !== event.currentTarget) return
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onSelectColor(colorId)
  }

  return (
    <section className="counts">
      <div className="guide-control">
        <h2>Image guide</h2>
        <div className="segmented-control" role="group" aria-label="Overlay source">
          <button
            type="button"
            className={overlaySource === 'original' ? 'active' : ''}
            onClick={() => onSetOverlaySource('original')}
          >
            Original
          </button>
          <button
            type="button"
            className={overlaySource === 'posterized' ? 'active' : ''}
            onClick={() => onSetOverlaySource('posterized')}
          >
            Posterized
          </button>
        </div>
        <label className="field">
          <span>Overlay opacity: {imageOpacity}%</span>
          <input
            min="0"
            max="100"
            type="range"
            value={imageOpacity}
            onChange={(event) => onSetImageOpacity(Number(event.target.value))}
          />
        </label>
      </div>
      <div className="guide-control">
        <h2>Posterize</h2>
        <label className="field">
          <span>Detected color count</span>
          <input
            min="1"
            max="24"
            type="number"
            value={posterizeColorCount}
            onChange={(event) =>
              onSetPosterizeColorCount(Number(event.target.value))
            }
          />
        </label>
        {detectedColors.length > 0 ? (
          <div className="detected-colors">
            {detectedColors.map((detectedColor) => (
              <label className="detected-color-row" key={detectedColor.hex}>
                <span
                  className="detected-swatch"
                  style={{ backgroundColor: detectedColor.hex }}
                />
                <span className="detected-hex">{detectedColor.hex}</span>
                <select
                  value={
                    colorMappings[detectedColor.hex] ??
                    nearestHex(detectedColor.hex, colors).id
                  }
                  onChange={(event) =>
                    onMapDetectedColor(detectedColor.hex, event.target.value)
                  }
                >
                  {colors.map((color) => (
                    <option key={color.id} value={color.id}>
                      {color.name}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        ) : (
          <p className="empty-note">Upload an image to detect colors.</p>
        )}
      </div>
      <div className="counts-header">
        <div>
          <h2>Pearl colors and counts</h2>
          <p>Select a color, then click pearls in the grid to repaint them.</p>
        </div>
      </div>
      <div className="color-editor">
        {colors.map((color) => (
          <div
            className={`color-row ${
              selectedColor?.id === color.id ? 'color-row-selected' : ''
            }`}
            key={color.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelectColor(color.id)}
            onKeyDown={(event) => selectColorByKeyboard(color.id, event)}
          >
            <input
              aria-label={`${color.name} color`}
              type="color"
              value={color.hex}
              onChange={(event) =>
                onUpdateColor(color.id, { hex: event.target.value })
              }
            />
            <input
              aria-label={`${color.name} name`}
              value={color.name}
              onChange={(event) =>
                onUpdateColor(color.id, { name: event.target.value })
              }
            />
            <strong>
              {colorCounts.find((item) => item.id === color.id)?.count ?? 0}
            </strong>
            <button
              className="icon-button"
              type="button"
              aria-label={`Remove ${color.name}`}
              title="Remove"
              onClick={() => onRemoveColor(color.id)}
            >
              <TrashIcon />
            </button>
          </div>
        ))}
        <div className="color-row color-row-new">
          <input
            aria-label="New color"
            type="color"
            value={newColorHex}
            onChange={(event) => onSetNewColorHex(event.target.value)}
          />
          <input
            aria-label="New color name"
            value={newColorName}
            onChange={(event) => onSetNewColorName(event.target.value)}
          />
          <span />
          <button type="button" onClick={onAddColor}>
            Add color
          </button>
        </div>
      </div>
    </section>
  )
}
