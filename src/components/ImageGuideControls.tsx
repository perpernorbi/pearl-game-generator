import type { OverlaySource } from '../types'

type ImageGuideControlsProps = {
  imageOpacity: number
  onSetImageOpacity: (opacity: number) => void
  onSetOverlaySource: (source: OverlaySource) => void
  overlaySource: OverlaySource
}

export function ImageGuideControls({
  imageOpacity,
  onSetImageOpacity,
  onSetOverlaySource,
  overlaySource,
}: ImageGuideControlsProps) {
  return (
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
  )
}
