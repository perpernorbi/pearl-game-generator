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
  message: string
  onDeleteSavedWork: (id: string) => void
  onLoadSavedWork: (work: SavedWork) => void
  onRenameSavedWork: (id: string, name: string) => void
  onSetColumns: (columns: number) => void
  onSetProjectName: (name: string) => void
  onSetRows: (rows: number) => void
  onStartCropDrag: (
    action: CropAction,
    event: PointerEvent<HTMLElement>,
  ) => void
  onUpdateCropDrag: (event: PointerEvent<HTMLDivElement>) => void
  onEndCropDrag: (event: PointerEvent<HTMLDivElement>) => void
  onUpload: (file: File | undefined) => void
  projectName: string
  rows: number
  savedWorks: SavedWork[]
  stageRef: RefObject<HTMLDivElement | null>
}

export function LeftPanel({
  columns,
  cropPercent,
  imageUrl,
  message,
  onDeleteSavedWork,
  onEndCropDrag,
  onLoadSavedWork,
  onRenameSavedWork,
  onSetColumns,
  onSetProjectName,
  onSetRows,
  onStartCropDrag,
  onUpdateCropDrag,
  onUpload,
  projectName,
  rows,
  savedWorks,
  stageRef,
}: LeftPanelProps) {
  return (
    <aside className="controls">
      <label className="field">
        <span>Template name</span>
        <input
          value={projectName}
          onChange={(event) => onSetProjectName(event.target.value)}
        />
      </label>

      <label className="field upload-field">
        <span>Picture upload</span>
        <input
          accept="image/*"
          type="file"
          onChange={(event) => onUpload(event.target.files?.[0])}
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

      <section className="panel">
        <h2>Crop</h2>
        <CropEditor
          cropPercent={cropPercent}
          imageUrl={imageUrl}
          onPointerCancel={onEndCropDrag}
          onPointerMove={onUpdateCropDrag}
          onPointerUp={onEndCropDrag}
          onStartDrag={onStartCropDrag}
          stageRef={stageRef}
        />
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
