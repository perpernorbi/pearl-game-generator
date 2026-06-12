import type { PointerEvent, RefObject } from 'react'
import type {
  CropAction,
  CropPercent,
  SavedWork,
} from '../types'
import { CropEditor } from './CropEditor'
import { TrashIcon } from './Icons'

type LeftPanelProps = {
  columns: number
  cropPercent: CropPercent
  imageUrl: string
  isPickingPaddingColor: boolean
  message: string
  onDeleteSavedWork: (id: string) => void
  onLoadSavedWork: (work: SavedWork) => void
  onPickPaddingColor: (clientX: number, clientY: number) => void
  onRenameSavedWork: (id: string, name: string) => void
  onSetColumns: (columns: number) => void
  onSetIsPickingPaddingColor: (isPicking: boolean) => void
  onSetPaddingColor: (color: string) => void
  onSetPhysicalHeight: (height: number) => void
  onSetPhysicalWidth: (width: number) => void
  onSetProjectName: (name: string) => void
  onSetRows: (rows: number) => void
  onStartCropDrag: (
    action: CropAction,
    event: PointerEvent<HTMLElement>,
  ) => void
  onUpdateCropDrag: (event: PointerEvent<HTMLDivElement>) => void
  onEndCropDrag: (event: PointerEvent<HTMLDivElement>) => void
  onUpload: (file: File | undefined) => void
  paddingColor: string
  projectName: string
  physicalHeight: number
  physicalWidth: number
  rows: number
  savedWorks: SavedWork[]
  stageRef: RefObject<HTMLDivElement | null>
}

export function LeftPanel({
  columns,
  cropPercent,
  imageUrl,
  isPickingPaddingColor,
  message,
  onDeleteSavedWork,
  onEndCropDrag,
  onLoadSavedWork,
  onPickPaddingColor,
  onRenameSavedWork,
  onSetColumns,
  onSetIsPickingPaddingColor,
  onSetPaddingColor,
  onSetPhysicalHeight,
  onSetPhysicalWidth,
  onSetProjectName,
  onSetRows,
  onStartCropDrag,
  onUpdateCropDrag,
  onUpload,
  paddingColor,
  projectName,
  physicalHeight,
  physicalWidth,
  rows,
  savedWorks,
  stageRef,
}: LeftPanelProps) {
  return (
    <aside className="controls">
      <label className="field upload-field">
        <span>Picture upload</span>
        <input
          accept="image/*"
          type="file"
          onChange={(event) => onUpload(event.target.files?.[0])}
        />
      </label>

      <label className="field">
        <span>Template name</span>
        <input
          value={projectName}
          onChange={(event) => onSetProjectName(event.target.value)}
        />
      </label>

      <div className="field-row">
        <label className="field">
          <span>Columns</span>
          <input
            min="4"
            max="80"
            type="number"
            value={columns}
            onChange={(event) => onSetColumns(Number(event.target.value))}
          />
        </label>
        <label className="field">
          <span>Rows</span>
          <input
            min="4"
            max="80"
            type="number"
            value={rows}
            onChange={(event) => onSetRows(Number(event.target.value))}
          />
        </label>
      </div>

      <div className="field-row">
        <label className="field">
          <span>Physical width (mm)</span>
          <input
            min="1"
            step="0.1"
            type="number"
            value={physicalWidth}
            onChange={(event) => onSetPhysicalWidth(Number(event.target.value))}
          />
        </label>
        <label className="field">
          <span>Physical height (mm)</span>
          <input
            min="1"
            step="0.1"
            type="number"
            value={physicalHeight}
            onChange={(event) => onSetPhysicalHeight(Number(event.target.value))}
          />
        </label>
      </div>

      <section className="panel">
        <h2>Crop</h2>
        <CropEditor
          cropPercent={cropPercent}
          imageUrl={imageUrl}
          isPickingPaddingColor={isPickingPaddingColor}
          onPointerCancel={onEndCropDrag}
          onPointerMove={onUpdateCropDrag}
          onPointerUp={onEndCropDrag}
          onPickPaddingColor={onPickPaddingColor}
          onStartDrag={onStartCropDrag}
          stageRef={stageRef}
        />
        <div className="field-row">
          <label className="field">
            <span>Padding color</span>
            <input
              type="color"
              value={paddingColor}
              onChange={(event) => onSetPaddingColor(event.target.value)}
            />
          </label>
          <label className="field field-with-button">
            <span>Pick from image</span>
            <button
              type="button"
              className={isPickingPaddingColor ? 'active' : ''}
              disabled={!imageUrl}
              onClick={() => onSetIsPickingPaddingColor(!isPickingPaddingColor)}
            >
              {isPickingPaddingColor ? 'Picking...' : 'Pick color'}
            </button>
          </label>
        </div>
      </section>

      <section className="panel">
        <h2>Saved works</h2>
        {savedWorks.length === 0 ? (
          <p className="empty-note">No cookie-saved designs yet.</p>
        ) : (
          <div className="saved-list">
            {savedWorks.map((work) => (
              <div className="saved-item" key={work.id}>
                <label>
                  <span className="sr-only">Saved work name</span>
                  <input
                    value={work.name}
                    onChange={(event) =>
                      onRenameSavedWork(work.id, event.target.value)
                    }
                  />
                </label>
                <span>
                  {work.columns} x {work.rows}
                </span>
                <button type="button" onClick={() => onLoadSavedWork(work)}>
                  Load
                </button>
                <button
                  className="icon-button"
                  type="button"
                  aria-label={`Delete ${work.name}`}
                  title="Delete"
                  onClick={() => onDeleteSavedWork(work.id)}
                >
                  <TrashIcon />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
      {message ? <p className="status">{message}</p> : null}
    </aside>
  )
}
