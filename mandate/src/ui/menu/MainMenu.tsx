import { useEffect, useState, type ReactNode } from 'react'
import { GAME_VERSION } from '../../sim/version.ts'
import { formatShortDate } from '../format.ts'
import { ArrowRightIcon, WarningIcon, XIcon } from '../kit/icons.ts'
import { Button, IconButton, cx } from '../kit/index.ts'
import { randomSeed } from '../random.ts'
import type { SlotMeta } from '../saves/slots.ts'
import { Saves } from '../screens/Saves.tsx'
import { Settings } from '../screens/Settings.tsx'
import { gameStore, useGame } from '../store/index.ts'
import { Backdrop } from './Backdrop.tsx'
import './menu.css'

function latestSlot(slots: readonly SlotMeta[]): SlotMeta | null {
  return slots.reduce<SlotMeta | null>((a, s) => (!a || s.savedAt > a.savedAt ? s : a), null)
}

type Pane = 'load' | 'settings'

interface MenuItemProps {
  children: ReactNode
  detail?: ReactNode
  active?: boolean
  disabled?: boolean
  onClick: () => void
  testId: string
  primary?: boolean
}

function MenuItem({ children, detail, active, disabled, onClick, testId, primary }: MenuItemProps) {
  return (
    <button
      type="button"
      className={cx('menu__item', primary && 'menu__item--primary')}
      aria-pressed={active}
      disabled={disabled}
      data-testid={testId}
      onClick={onClick}
    >
      <span className="menu__item-text">
        <span className="menu__item-label">{children}</span>
        {detail && <span className="menu__item-detail">{detail}</span>}
      </span>
      <ArrowRightIcon className="menu__item-arrow" aria-hidden />
    </button>
  )
}

/**
 * Main menu (DESIGN §17): Paradox / FM left-column menu over a slowly panning political map of
 * Britain. Load and Settings open beside it. Starting or loading a game hands over to
 * the shell.
 */
export function MainMenu() {
  const ready = useGame((s) => s.mode !== 'starting')
  const slots = useGame((s) => s.slots)
  const lastError = useGame((s) => s.lastError)
  const [busy, setBusy] = useState(false)
  const [pane, setPane] = useState<Pane | null>(null)
  const latest = latestSlot(slots)
  const game = gameStore.getState()

  const run = (action: () => Promise<void>) => {
    setBusy(true)
    void action().finally(() => setBusy(false))
  }
  const toggle = (next: Pane) => setPane((p) => (p === next ? null : next))

  useEffect(() => {
    if (!pane) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPane(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pane])

  return (
    <div className={cx('menu', pane && 'menu--pane')} data-testid="title-screen">
      <Backdrop />
      <div className="menu__column">
        <h1 className="menu__wordmark">
          Mandate
          <span className="menu__tagline">A political life</span>
        </h1>
        <nav className="menu__items" aria-label="Main menu">
          <MenuItem
            primary
            testId="title-new"
            disabled={!ready || busy}
            detail="Start as nobody, somewhere in Britain"
            onClick={() => run(() => game.newGame(randomSeed()))}
          >
            New career
          </MenuItem>
          <MenuItem
            testId="title-continue"
            disabled={!ready || busy || !latest}
            detail={
              latest ? `${latest.name} · ${formatShortDate(latest.gameDate)}` : 'No saves yet'
            }
            onClick={() => latest && run(() => game.loadFrom(latest.id))}
          >
            Continue
          </MenuItem>
          <MenuItem
            testId="title-load"
            disabled={!ready || busy}
            active={pane === 'load'}
            detail={`${slots.length} ${slots.length === 1 ? 'save' : 'saves'} in this browser`}
            onClick={() => toggle('load')}
          >
            Load
          </MenuItem>
          <MenuItem
            testId="title-settings"
            active={pane === 'settings'}
            onClick={() => toggle('settings')}
          >
            Settings
          </MenuItem>
        </nav>
        {lastError && (
          <p className="menu__error" role="alert">
            <WarningIcon weight="fill" aria-hidden />
            <span>{lastError}</span>
            <Button size="s" variant="quiet" onClick={() => game.dismissError()}>
              Dismiss
            </Button>
          </p>
        )}
        <p className="menu__foot">v{GAME_VERSION} · No sound · Saves stay in this browser</p>
      </div>
      {pane && (
        <section className="menu__pane" aria-label={pane === 'load' ? 'Load' : 'Settings'}>
          <header className="menu__pane-head">
            <h2 className="menu__pane-title">{pane === 'load' ? 'Load' : 'Settings'}</h2>
            <IconButton icon={XIcon} label="Close" shortcut="Esc" onClick={() => setPane(null)} />
          </header>
          <div className="menu__pane-body">{pane === 'load' ? <Saves /> : <Settings />}</div>
        </section>
      )}
    </div>
  )
}
