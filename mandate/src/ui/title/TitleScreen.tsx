import { useState } from 'react'
import { useReducedMotion } from '../hooks/useReducedMotion.ts'
import { Button, cx, Stamp } from '../kit/index.ts'
import { randomSeed } from '../random.ts'
import type { SlotMeta } from '../saves/slots.ts'
import { SavesMenu } from '../shell/SavesMenu.tsx'
import { Sheet } from '../shell/Sheet.tsx'
import { ViewToggle } from '../shell/ViewToggle.tsx'
import { gameStore, useGame } from '../store/index.ts'
import { Squares } from './Squares.tsx'
import { WordmarkCanvas } from './Wordmark.tsx'
import './title.css'

function latestSlot(slots: readonly SlotMeta[]): SlotMeta | null {
  return slots.reduce<SlotMeta | null>((a, s) => (!a || s.savedAt > a.savedAt ? s : a), null)
}

interface TitleScreenProps {
  /** The 3D wordmark is on screen behind this overlay. */
  worldReady: boolean
  /** A game has started and the camera is flying in: fade the overlay out. */
  leaving: boolean
}

/**
 * The title (DESIGN §17): pixel wordmark in an outline box, stacked name bottom-left, bordered
 * buttons bottom-right. Starting or loading a game hands over to the app shell.
 */
export function TitleScreen({ worldReady, leaving }: TitleScreenProps) {
  const ready = useGame((s) => s.mode !== null)
  const slots = useGame((s) => s.slots)
  const lastError = useGame((s) => s.lastError)
  const reducedMotion = useReducedMotion()
  const [busy, setBusy] = useState(false)
  const [loadOpen, setLoadOpen] = useState(false)
  const latest = latestSlot(slots)
  const game = gameStore.getState()

  const run = (action: () => Promise<void>) => {
    setBusy(true)
    void action().finally(() => setBusy(false))
  }

  return (
    <div
      className={cx('title', !worldReady && 'dot-grid', leaving && 'title--leaving')}
      data-testid="title-screen"
    >
      {!worldReady && <Squares layer="back" />}
      <div className="title__centre">
        <div className="title__frame">
          <WordmarkCanvas animate={!reducedMotion && !worldReady} hidden={worldReady} />
        </div>
      </div>
      {!worldReady && <Squares layer="front" />}

      <div className="title__top">
        <ViewToggle />
      </div>

      <div className="title__foot">
        <h1 className="title__name">
          <span>Mandate</span>
          <span>A political</span>
          <span>
            life <span className="title__since">Est. 2026</span>
          </span>
        </h1>
        <div className="title__actions">
          {lastError && (
            <Stamp tone="danger" rotate={-2}>
              {lastError}
            </Stamp>
          )}
          <Button
            arrow
            disabled={!ready || busy}
            data-testid="title-new"
            onClick={() => run(() => game.newGame(randomSeed()))}
          >
            New life
          </Button>
          <Button
            arrow
            disabled={!ready || busy || !latest}
            data-testid="title-continue"
            title={latest ? `Continue “${latest.name}”` : 'No saves yet'}
            onClick={() => latest && run(() => game.loadFrom(latest.id))}
          >
            Continue
          </Button>
          <Button
            arrow
            disabled={!ready || busy}
            aria-haspopup="dialog"
            data-testid="title-load"
            onClick={() => setLoadOpen(true)}
          >
            Load
          </Button>
          <p className="title__note">No sound. Saves stay in this browser.</p>
        </div>
      </div>

      {loadOpen && (
        <Sheet title="Load a life" onClose={() => setLoadOpen(false)}>
          <SavesMenu />
        </Sheet>
      )}
    </div>
  )
}
