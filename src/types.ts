export type PearlColor = {
  id: string
  name: string
  hex: string
}

export type ColorCount = PearlColor & {
  count: number
}

export type Crop = {
  x: number
  y: number
  width: number
  height: number
}

export type CropAction =
  | 'move'
  | 'north'
  | 'east'
  | 'south'
  | 'west'
  | 'north-east'
  | 'south-east'
  | 'south-west'
  | 'north-west'

export type CropDrag = {
  action: CropAction
  crop: Crop
  pointerId: number
  startX: number
  startY: number
  scaleX: number
  scaleY: number
}

export type CropPercent = {
  x: number
  y: number
  width: number
  height: number
}

export type ImageSize = {
  width: number
  height: number
}

export type SavedWork = {
  id: string
  name: string
  savedAt: string
  columns: number
  rows: number
  colors: PearlColor[]
  cellData?: string
  cells?: string[]
  version?: number
}
