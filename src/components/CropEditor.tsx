import type { PointerEvent, RefObject } from 'react'
import type { CropAction, CropPercent } from '../types'

const cropHandles: CropAction[] = [
  'north',
  'east',
  'south',
  'west',
  'north-east',
  'south-east',
  'south-west',
  'north-west',
]

type CropEditorProps = {
  cropPercent: CropPercent
  imageUrl: string
  onPointerCancel: (event: PointerEvent<HTMLDivElement>) => void
  onPointerMove: (event: PointerEvent<HTMLDivElement>) => void
  onPointerUp: (event: PointerEvent<HTMLDivElement>) => void
  onStartDrag: (action: CropAction, event: PointerEvent<HTMLElement>) => void
  stageRef: RefObject<HTMLDivElement | null>
}

export function CropEditor({
  cropPercent,
  imageUrl,
  onPointerCancel,
  onPointerMove,
  onPointerUp,
  onStartDrag,
  stageRef,
}: CropEditorProps) {
  if (!imageUrl) {
    return <p className="empty-note">Upload a picture to enable crop controls.</p>
  }

  return (
    <>
      <div
        className="crop-stage"
        ref={stageRef}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <img src={imageUrl} alt="Uploaded crop source" draggable="false" />
        <div
          className="crop-dim crop-dim-top"
          style={{ height: `${cropPercent.y}%` }}
        />
        <div
          className="crop-dim crop-dim-right"
          style={{
            left: `${cropPercent.x + cropPercent.width}%`,
            top: `${cropPercent.y}%`,
            height: `${cropPercent.height}%`,
          }}
        />
        <div
          className="crop-dim crop-dim-bottom"
          style={{ top: `${cropPercent.y + cropPercent.height}%` }}
        />
        <div
          className="crop-dim crop-dim-left"
          style={{
            width: `${cropPercent.x}%`,
            top: `${cropPercent.y}%`,
            height: `${cropPercent.height}%`,
          }}
        />
        <div
          className="crop-box"
          style={{
            left: `${cropPercent.x}%`,
            top: `${cropPercent.y}%`,
            width: `${cropPercent.width}%`,
            height: `${cropPercent.height}%`,
          }}
          onPointerDown={(event) => onStartDrag('move', event)}
        >
          {cropHandles.map((handle) => (
            <span
              className={`crop-handle crop-handle-${handle}`}
              key={handle}
              onPointerDown={(event) => {
                event.stopPropagation()
                onStartDrag(handle, event)
              }}
            />
          ))}
        </div>
      </div>
      <p className="empty-note">
        Drag the rectangle to move it, or drag an edge or corner to resize.
      </p>
    </>
  )
}
