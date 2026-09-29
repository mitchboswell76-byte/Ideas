import { useRef } from 'react'
import { PAUSE_REASONS, type Speed } from '../runtime/protocol.ts'
import type { PauseReason } from '../sim/scheduler.ts'
import { GAME_VERSION } from '../sim/version.ts'
import { useSpeedKeys } from './hooks/useSpeedKeys.ts'
import { downloadSave, readSaveFile, saveFileName, SAVE_FILE_EXTENSION } from './saves/file.ts'
import { newSlotId } from './saves/slots.ts'
import { gameStore, useGame } from './store/index.ts'

const SPEEDS: readonly Speed[] = [0, 1, 2, 3, 4, 5]

const PAUSE_LABELS: Record<PauseReason, string> = {
  election: 'Elections',
  choice: 'Choices',
  investigation: 'Investigations',
  activityDone: 'Activity finished',
}

const MODE_LABELS = { starting: 'Starting…', worker: 'Worker', main: 'Main thread' } as const

function formatGameDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function formatSavedAt(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
}

function Clock() {
  const date = useGame((s) => s.date)
  const speed = useGame((s) => s.speed)
  const pausedBy = useGame((s) => s.pausedBy)
  const mode = useGame((s) => s.mode)
  const { setSpeed, step } = gameStore.getState()
  return (
    <section className="panel" aria-label="Clock">
      <div className="clock-row">
        <output className="game-date" data-testid="game-date" data-iso={date ?? ''}>
          {formatGameDate(date)}
        </output>
        <span className="badge" data-testid="sim-mode">
          {MODE_LABELS[mode]}
        </span>
      </div>
      <div className="speed-row" role="group" aria-label="Speed">
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={speed === s}
            onClick={() => setSpeed(s)}
            title={s === 0 ? 'Pause (Space)' : `Speed ${s} (${s})`}
          >
            {s === 0 ? '❚❚' : s}
          </button>
        ))}
        <button type="button" disabled={speed !== 0} onClick={() => step(1)}>
          +1 day
        </button>
        <button type="button" disabled={speed !== 0} onClick={() => step(7)}>
          +1 week
        </button>
      </div>
      {pausedBy && <p className="note">Auto-paused: {PAUSE_LABELS[pausedBy]}</p>}
    </section>
  )
}

function AutoPause() {
  const autoPause = useGame((s) => s.autoPause)
  return (
    <fieldset className="panel">
      <legend>Auto-pause on</legend>
      {PAUSE_REASONS.map((reason) => (
        <label key={reason} className="check">
          <input
            type="checkbox"
            checked={autoPause[reason]}
            onChange={(e) => gameStore.getState().setAutoPause(reason, e.target.checked)}
          />
          {PAUSE_LABELS[reason]}
        </label>
      ))}
    </fieldset>
  )
}

function Saves() {
  const slots = useGame((s) => s.slots)
  const fileInput = useRef<HTMLInputElement>(null)
  const game = gameStore.getState()

  const exportSave = async (): Promise<void> => {
    const save = await game.saveBytes()
    if (save) downloadSave(save.bytes, saveFileName(save.date))
  }
  const importSave = async (file: File | undefined): Promise<void> => {
    if (file) await game.loadBytes(await readSaveFile(file))
    if (fileInput.current) fileInput.current.value = ''
  }

  return (
    <section className="panel" aria-label="Saves">
      <h2>Saves</h2>
      <div className="button-row">
        <button type="button" onClick={() => void game.quickSave()}>
          Quicksave
        </button>
        <button
          type="button"
          onClick={() => void game.saveTo(newSlotId(), `Save ${slots.length + 1}`)}
        >
          New save
        </button>
        <button type="button" onClick={() => void exportSave()}>
          Export {SAVE_FILE_EXTENSION}
        </button>
        <button type="button" onClick={() => fileInput.current?.click()}>
          Import…
        </button>
        <input
          ref={fileInput}
          type="file"
          accept={SAVE_FILE_EXTENSION}
          hidden
          data-testid="import-input"
          onChange={(e) => void importSave(e.target.files?.[0])}
        />
      </div>
      {slots.length === 0 ? (
        <p className="note">No saves yet.</p>
      ) : (
        <ul className="slot-list" data-testid="slot-list">
          {slots.map((slot) => (
            <li key={slot.id}>
              <span>
                <strong>{slot.name}</strong> · {formatGameDate(slot.gameDate)}
                <small>
                  Saved {formatSavedAt(slot.savedAt)} · {(slot.size / 1024).toFixed(1)} KB
                </small>
              </span>
              <span className="button-row">
                <button type="button" onClick={() => void game.loadFrom(slot.id)}>
                  Load
                </button>
                <button type="button" onClick={() => void game.saveTo(slot.id, slot.name)}>
                  Overwrite
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Delete “${slot.name}”?`)) void game.deleteSlot(slot.id)
                  }}
                >
                  Delete
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Messages() {
  const fatal = useGame((s) => s.fatal)
  const lastError = useGame((s) => s.lastError)
  const log = useGame((s) => s.log)
  return (
    <>
      {fatal && (
        <p className="panel error" role="alert">
          The simulation stopped: {fatal}
        </p>
      )}
      {lastError && (
        <p className="panel error" role="alert">
          {lastError}{' '}
          <button type="button" onClick={() => gameStore.getState().dismissError()}>
            Dismiss
          </button>
        </p>
      )}
      {log.length > 0 && (
        <section className="panel" aria-label="Notifications">
          <h2>Notifications</h2>
          <ul>
            {log.slice(0, 10).map((n, i) => (
              <li key={`${n.date}-${i}`}>
                {n.date}: {n.text}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}

/** Placeholder runtime controls until the app shell lands (T4). */
export function App() {
  useSpeedKeys()
  return (
    <main className="dev-shell">
      <header>
        <h1>Mandate</h1>
        <p className="build">Build {GAME_VERSION} · runtime controls (placeholder until T4)</p>
      </header>
      <Clock />
      <Messages />
      <AutoPause />
      <Saves />
    </main>
  )
}
