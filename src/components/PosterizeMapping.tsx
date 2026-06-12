import type { DetectedColor, PearlColor } from '../types'
import { nearestHex } from '../utils/posterize'

type PosterizeMappingProps = {
  colorMappings: Record<string, string>
  colors: PearlColor[]
  detectedColors: DetectedColor[]
  onMapDetectedColor: (detectedHex: string, pearlColorId: string) => void
  onSetPosterizeColorCount: (count: number) => void
  posterizeColorCount: number
}

export function PosterizeMapping({
  colorMappings,
  colors,
  detectedColors,
  onMapDetectedColor,
  onSetPosterizeColorCount,
  posterizeColorCount,
}: PosterizeMappingProps) {
  return (
    <div className="guide-control">
      <h2>Posterize</h2>
      <label className="field">
        <span>Additional detected colors</span>
        <input
          min="0"
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
  )
}
