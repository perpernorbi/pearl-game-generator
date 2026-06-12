import type {
  ColorCount,
  DetectedColor,
  OverlaySource,
  PearlColor,
} from '../types'
import { ImageGuideControls } from './ImageGuideControls'
import { PearlColorEditor } from './PearlColorEditor'
import { PosterizeMapping } from './PosterizeMapping'

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
  return (
    <section className="counts">
      <ImageGuideControls
        imageOpacity={imageOpacity}
        onSetImageOpacity={onSetImageOpacity}
        onSetOverlaySource={onSetOverlaySource}
        overlaySource={overlaySource}
      />
      <PosterizeMapping
        colorMappings={colorMappings}
        colors={colors}
        detectedColors={detectedColors}
        onMapDetectedColor={onMapDetectedColor}
        onSetPosterizeColorCount={onSetPosterizeColorCount}
        posterizeColorCount={posterizeColorCount}
      />
      <PearlColorEditor
        colorCounts={colorCounts}
        colors={colors}
        newColorHex={newColorHex}
        newColorName={newColorName}
        onAddColor={onAddColor}
        onRemoveColor={onRemoveColor}
        onSelectColor={onSelectColor}
        onSetNewColorHex={onSetNewColorHex}
        onSetNewColorName={onSetNewColorName}
        onUpdateColor={onUpdateColor}
        selectedColor={selectedColor}
      />
    </section>
  )
}
