import { useEffect, useRef, useState } from 'react'
import { unpackSave } from '../../sim/save.ts'
import { formatBytes, formatSavedAt, formatShortDate } from '../format.ts'
import {
  DownloadSimpleIcon,
  FloppyDiskIcon,
  PlusIcon,
  TrashIcon,
  UploadSimpleIcon,
} from '../kit/icons.ts'
import { Button, Chip, IconButton, Panel, Table, type Column } from '../kit/index.ts'
import {
  downloadSave,
  IMPORT_ACCEPT,
  readSaveFile,
  saveFileName,
  SAVE_FILE_EXTENSIONS,
  type SaveFormat,
} from '../saves/file.ts'
import {
  hostDownloads,
  hostDownloadsNow,
  hostErrorCode,
  type HostDownloads,
} from '../saves/host.ts'
import { AUTOSAVE_SLOT, newSlotId, QUICKSAVE_SLOT, type SlotMeta } from '../saves/slots.ts'
import { gameStore, useGame } from '../store/index.ts'
import './screens.css'

const RESERVED = new Set([AUTOSAVE_SLOT, QUICKSAVE_SLOT])

/** The Artifact viewer's downloads capability once it has answered (`undefined` while asking). */
function useHostDownloads(): HostDownloads | null | undefined {
  const [downloads, setDownloads] = useState(hostDownloadsNow)
  useEffect(() => {
    let live = true
    void hostDownloads().then((d) => live && setDownloads(d))
    return () => {
      live = false
    }
  }, [])
  return downloads
}

/** Message for a viewer save that didn't happen; `null` when the player simply said no. */
function exportFailure(error: unknown): string | null {
  switch (hostErrorCode(error)) {
    case 'declined':
      return null
    case 'rate_limited':
      return 'An export prompt is already open'
    default:
      return 'Export is not available in this view'
  }
}

function SlotActions({ slot }: { slot: SlotMeta }) {
  const [confirming, setConfirming] = useState(false)
  const hasGame = useGame((s) => s.date !== null)
  const game = gameStore.getState()
  return (
    <span className="slot-actions">
      <Button size="s" variant="primary" onClick={() => void game.loadFrom(slot.id)}>
        Load
      </Button>
      {slot.id !== AUTOSAVE_SLOT && (
        <Button size="s" disabled={!hasGame} onClick={() => void game.saveTo(slot.id, slot.name)}>
          Overwrite
        </Button>
      )}
      {confirming ? (
        <>
          <Button size="s" variant="danger" onClick={() => void game.deleteSlot(slot.id)}>
            Delete for good
          </Button>
          <Button size="s" variant="quiet" onClick={() => setConfirming(false)}>
            Keep
          </Button>
        </>
      ) : (
        <IconButton
          size="s"
          icon={TrashIcon}
          label={`Delete ${slot.name}`}
          onClick={() => setConfirming(true)}
        />
      )}
    </span>
  )
}

const COLUMNS: readonly Column<SlotMeta>[] = [
  {
    key: 'name',
    label: 'Name',
    value: (s) => s.name,
    firstDir: 'asc',
    render: (s) => (
      <span className="slot-name">
        {s.name}
        {RESERVED.has(s.id) && <Chip>Reserved</Chip>}
      </span>
    ),
  },
  {
    key: 'date',
    label: 'Game date',
    value: (s) => s.gameDate,
    render: (s) => formatShortDate(s.gameDate),
  },
  {
    key: 'saved',
    label: 'Saved',
    value: (s) => s.savedAt,
    render: (s) => formatSavedAt(s.savedAt),
  },
  {
    key: 'size',
    label: 'Size',
    value: (s) => s.size,
    render: (s) => formatBytes(s.size),
    align: 'right',
  },
  {
    key: 'version',
    label: 'Version',
    value: (s) => s.gameVersion,
    render: (s) => `v${s.gameVersion}`,
  },
  {
    key: 'actions',
    label: <span className="visually-hidden">Actions</span>,
    render: (s) => <SlotActions slot={s} />,
    align: 'right',
  },
]

/** Save slots as an FM table, plus new save, quicksave, export and import. */
export function Saves() {
  const slots = useGame((s) => s.slots)
  /** From the main menu there is nothing to save yet, only saves to load. */
  const hasGame = useGame((s) => s.date !== null)
  const fileInput = useRef<HTMLInputElement>(null)
  const game = gameStore.getState()
  const manualCount = slots.filter((s) => !RESERVED.has(s.id)).length
  const host = useHostDownloads()
  const format: SaveFormat = host ? 'json' : 'mandate'

  const exportSave = async (): Promise<void> => {
    const save = await game.saveBytes()
    if (!save) return
    const downloads = await hostDownloads()
    if (!downloads) {
      downloadSave(save.bytes, saveFileName(save.date, 'mandate'))
      return
    }
    try {
      const data = await unpackSave(save.bytes)
      await downloads.save({ filename: saveFileName(save.date, 'json'), data })
    } catch (error) {
      const message = exportFailure(error)
      if (message) game.reportError(message)
    }
  }
  const importSave = async (file: File | undefined): Promise<void> => {
    if (file) await game.loadBytes(await readSaveFile(file))
    if (fileInput.current) fileInput.current.value = ''
  }

  return (
    <div className="saves">
      <div className="toolbar">
        <Button
          variant="primary"
          icon={PlusIcon}
          disabled={!hasGame}
          onClick={() => void game.saveTo(newSlotId(), `Save ${manualCount + 1}`)}
        >
          New save
        </Button>
        <Button icon={FloppyDiskIcon} disabled={!hasGame} onClick={() => void game.quickSave()}>
          Quicksave
        </Button>
        <Button icon={DownloadSimpleIcon} disabled={!hasGame} onClick={() => void exportSave()}>
          Export {SAVE_FILE_EXTENSIONS[format]}
        </Button>
        <Button icon={UploadSimpleIcon} onClick={() => fileInput.current?.click()}>
          Import
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept={IMPORT_ACCEPT}
          hidden
          data-testid="import-input"
          onChange={(e) => void importSave(e.target.files?.[0])}
        />
      </div>
      <p className="muted">
        Saves stay in this browser. Export a {SAVE_FILE_EXTENSIONS[format]} file to keep a copy
        elsewhere; Import reads .mandate and .json saves.
      </p>
      <Panel flush>
        <Table
          label="Save slots"
          columns={COLUMNS}
          rows={slots}
          rowKey={(s) => s.id}
          bodyTestId="slot-list"
          empty="No saves yet."
        />
      </Panel>
    </div>
  )
}
