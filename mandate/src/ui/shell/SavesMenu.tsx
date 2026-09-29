import { useRef, useState } from 'react'
import { downloadSave, readSaveFile, saveFileName, SAVE_FILE_EXTENSION } from '../saves/file.ts'
import { AUTOSAVE_SLOT, newSlotId, QUICKSAVE_SLOT, type SlotMeta } from '../saves/slots.ts'
import { formatBytes, formatSavedAt, formatShortDate } from '../format.ts'
import { Button } from '../kit/index.ts'
import { gameStore, useGame } from '../store/index.ts'

const RESERVED = new Set([AUTOSAVE_SLOT, QUICKSAVE_SLOT])

function SlotRow({ slot }: { slot: SlotMeta }) {
  const [confirming, setConfirming] = useState(false)
  const hasGame = useGame((s) => s.date !== null)
  const game = gameStore.getState()
  return (
    <li className="slot">
      <div className="slot__text">
        <span className="slot__name">
          {slot.name}
          {RESERVED.has(slot.id) && <span className="slot__tag">Reserved</span>}
        </span>
        <span className="slot__date">{formatShortDate(slot.gameDate)}</span>
        <span className="slot__meta">
          Saved {formatSavedAt(slot.savedAt)} · {formatBytes(slot.size)} · v{slot.gameVersion}
        </span>
      </div>
      <div className="slot__actions">
        <Button arrow onClick={() => void game.loadFrom(slot.id)} className="slot__load">
          Load
        </Button>
        {slot.id !== AUTOSAVE_SLOT && (
          <Button disabled={!hasGame} onClick={() => void game.saveTo(slot.id, slot.name)}>
            Overwrite
          </Button>
        )}
        {confirming ? (
          <>
            <Button variant="danger" icon="trash" onClick={() => void game.deleteSlot(slot.id)}>
              Delete for good
            </Button>
            <Button variant="quiet" onClick={() => setConfirming(false)}>
              Keep
            </Button>
          </>
        ) : (
          <Button
            icon="trash"
            aria-label={`Delete ${slot.name}`}
            onClick={() => setConfirming(true)}
          />
        )}
      </div>
    </li>
  )
}

export function SavesMenu() {
  const slots = useGame((s) => s.slots)
  /** On the title screen there is nothing to save yet, only saves to load. */
  const hasGame = useGame((s) => s.date !== null)
  const fileInput = useRef<HTMLInputElement>(null)
  const game = gameStore.getState()
  const manualCount = slots.filter((s) => !RESERVED.has(s.id)).length

  const exportSave = async (): Promise<void> => {
    const save = await game.saveBytes()
    if (save) downloadSave(save.bytes, saveFileName(save.date))
  }
  const importSave = async (file: File | undefined): Promise<void> => {
    if (file) await game.loadBytes(await readSaveFile(file))
    if (fileInput.current) fileInput.current.value = ''
  }

  return (
    <div className="saves">
      <div className="saves__actions">
        <Button
          icon="ballotBox"
          disabled={!hasGame}
          onClick={() => void game.saveTo(newSlotId(), `Save ${manualCount + 1}`)}
        >
          New save
        </Button>
        <Button disabled={!hasGame} onClick={() => void game.quickSave()}>
          Quicksave
        </Button>
        <Button icon="exportFile" disabled={!hasGame} onClick={() => void exportSave()}>
          Export {SAVE_FILE_EXTENSION}
        </Button>
        <Button icon="importFile" onClick={() => fileInput.current?.click()}>
          Import
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept={SAVE_FILE_EXTENSION}
          hidden
          data-testid="import-input"
          onChange={(e) => void importSave(e.target.files?.[0])}
        />
      </div>
      <p className="saves__note">
        Saves live in this browser. Export a {SAVE_FILE_EXTENSION} file to keep a copy elsewhere.
      </p>
      {slots.length === 0 ? (
        <p className="saves__empty">No saves yet.</p>
      ) : (
        <ul className="slot-list" data-testid="slot-list">
          {slots.map((slot) => (
            <SlotRow key={slot.id} slot={slot} />
          ))}
        </ul>
      )}
    </div>
  )
}
