import { useMemo, useState } from 'react'
import { defaultColors } from '../constants'
import type { PearlColor } from '../types'
import { makeId } from '../utils/misc'

export function usePaletteEditor() {
  const [colors, setColors] = useState<PearlColor[]>(defaultColors)
  const [selectedColorId, setSelectedColorId] = useState(defaultColors[0].id)
  const [newColorName, setNewColorName] = useState('New color')
  const [newColorHex, setNewColorHex] = useState('#7c3aed')
  const [posterizeColorCount, setPosterizeColorCount] = useState(3)
  const [colorMappings, setColorMappings] = useState<Record<string, string>>({})

  const selectedColor =
    colors.find((color) => color.id === selectedColorId) ?? colors[0]
  const effectiveColorMappings = useMemo(() => {
    const next: Record<string, string> = {}
    Object.entries(colorMappings).forEach(([hex, colorId]) => {
      if (colors.some((color) => color.id === colorId)) {
        next[hex] = colorId
      }
    })
    return next
  }, [colorMappings, colors])

  const setPosterizeCount = (count: number) => {
    setPosterizeColorCount(Math.max(0, Math.min(24, Math.round(count))))
  }

  const mapDetectedColor = (detectedHex: string, pearlColorId: string) => {
    setColorMappings((current) => ({
      ...current,
      [detectedHex]: pearlColorId,
    }))
  }

  const addColor = () => {
    if (colors.some((color) => color.hex.toLowerCase() === newColorHex)) return
    const colorId = makeId()
    setColors((current) => [
      ...current,
      {
        id: colorId,
        name: newColorName.trim() || 'Pearl color',
        hex: newColorHex,
      },
    ])
    setSelectedColorId(colorId)
  }

  const updateColor = (id: string, patch: Partial<PearlColor>) => {
    setColors((current) =>
      current.map((color) =>
        color.id === id ? { ...color, ...patch } : color,
      ),
    )
  }

  const removeColor = (id: string) => {
    if (colors.length <= 1) return null
    const nextColors = colors.filter((color) => color.id !== id)
    const removedColor = colors.find((color) => color.id === id)
    setColors(nextColors)
    if (selectedColorId === id) {
      setSelectedColorId(nextColors[0].id)
    }
    return {
      removedColor,
      replacement: nextColors[0],
    }
  }

  const loadColors = (nextColors: PearlColor[]) => {
    setColors(nextColors)
    setSelectedColorId(nextColors[0]?.id ?? defaultColors[0].id)
    setColorMappings({})
  }

  return {
    addColor,
    colorMappings,
    colors,
    effectiveColorMappings,
    loadColors,
    mapDetectedColor,
    newColorHex,
    newColorName,
    posterizeColorCount,
    removeColor,
    selectedColor,
    setColorMappings,
    setNewColorHex,
    setNewColorName,
    setPosterizeCount,
    setSelectedColorId,
    updateColor,
  }
}
