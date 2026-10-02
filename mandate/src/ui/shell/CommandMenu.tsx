import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { filterCommands, type Command } from '../commands.ts'
import { MagnifyingGlassIcon } from '../kit/icons.ts'
import { cx } from '../kit/index.ts'
import type { RunSpeed } from '../../runtime/protocol.ts'
import { AUTOSAVE_SLOT, newSlotId, QUICKSAVE_SLOT } from '../saves/slots.ts'
import { gameStore, useGame } from '../store/index.ts'
import { navStore, type ScreenName } from '../store/nav.ts'
import { themeStore, useTheme } from '../store/theme.ts'
import { SCREEN_TITLES } from './labels.ts'
import './command.css'

const SPEEDS: readonly RunSpeed[] = [1, 2, 3, 4, 5]

function useCommands(): Command[] {
  const speed = useGame((s) => s.speed)
  const slots = useGame((s) => s.slots)
  const { theme } = useTheme()
  return useMemo(() => {
    const game = gameStore.getState()
    const go = (screen: ScreenName): Command => ({
      id: `go-${screen}`,
      label: SCREEN_TITLES[screen],
      group: 'Go to',
      run: () => navStore.getState().go(screen),
    })
    const manual = slots.filter((s) => s.id !== AUTOSAVE_SLOT && s.id !== QUICKSAVE_SLOT).length
    const other = theme === 'dark' ? 'light' : 'dark'
    return [
      ...(['home', 'inbox', 'calendar', 'map', 'world', 'saves', 'settings'] as const).map(go),
      {
        id: 'pause',
        label: speed === 0 ? 'Resume' : 'Pause',
        group: 'Time',
        keys: 'Space',
        keywords: 'pause resume clock',
        run: () => game.togglePause(),
      },
      ...SPEEDS.map((s) => ({
        id: `speed-${s}`,
        label: `Speed ${s}`,
        group: 'Time',
        keys: String(s),
        run: () => game.setSpeed(s),
      })),
      { id: 'day', label: 'Advance one day', group: 'Time', run: () => game.step(1) },
      { id: 'week', label: 'Advance one week', group: 'Time', run: () => game.step(7) },
      {
        id: 'quicksave',
        label: 'Quicksave',
        group: 'Game',
        run: () => void game.quickSave(),
      },
      {
        id: 'new-save',
        label: 'New save',
        group: 'Game',
        run: () => void game.saveTo(newSlotId(), `Save ${manual + 1}`),
      },
      {
        id: 'theme',
        label: `Switch to the ${other} theme`,
        group: 'Game',
        keywords: 'theme dark light colours',
        run: () => themeStore.getState().setTheme(other),
      },
    ]
  }, [speed, slots, theme])
}

/**
 * The command menu (Linear / Raycast): type to filter, arrows to move, Enter to run. A native
 * modal dialog, so focus stays inside and Esc closes it.
 */
export function CommandMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const commands = useCommands()
  const shown = useMemo(() => filterCommands(commands, query), [commands, query])

  useEffect(() => {
    const el = dialog.current
    if (!el) return
    if (open && !el.open) {
      setQuery('')
      setActive(0)
      el.showModal()
    } else if (!open && el.open) el.close()
  }, [open])

  useEffect(() => {
    list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const run = (c: Command | undefined) => {
    if (!c) return
    onClose()
    c.run()
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const step = e.key === 'ArrowDown' ? 1 : -1
      setActive((a) => (shown.length ? (a + step + shown.length) % shown.length : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      run(shown[active])
    }
  }

  return (
    <dialog
      ref={dialog}
      className="cmdk"
      aria-label="Command menu"
      onClose={onClose}
      onClick={(e) => e.target === dialog.current && onClose()}
    >
      <div className="cmdk__search">
        <MagnifyingGlassIcon className="cmdk__icon" aria-hidden />
        <input
          className="cmdk__input"
          type="text"
          placeholder="Type a command or screen…"
          aria-label="Search commands"
          aria-controls="cmdk-list"
          aria-activedescendant={shown[active] ? `cmdk-${shown[active].id}` : undefined}
          value={query}
          autoFocus
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
          }}
          onKeyDown={onKeyDown}
        />
      </div>
      <ul className="cmdk__list" id="cmdk-list" role="listbox" ref={list}>
        {shown.length === 0 && <li className="cmdk__empty">No matching commands</li>}
        {shown.map((c, i) => {
          const heading = !query.trim() && shown[i - 1]?.group !== c.group
          return (
            <li key={c.id} role="presentation">
              {heading && <p className="cmdk__group">{c.group}</p>}
              <div
                id={`cmdk-${c.id}`}
                role="option"
                aria-selected={i === active}
                data-index={i}
                className={cx('cmdk__item', i === active && 'cmdk__item--active')}
                onMouseMove={() => setActive(i)}
                onClick={() => run(c)}
              >
                <span>{c.label}</span>
                {query.trim() && <span className="cmdk__meta">{c.group}</span>}
                {c.keys && <kbd className="cmdk__key">{c.keys}</kbd>}
              </div>
            </li>
          )
        })}
      </ul>
      <p className="cmdk__foot">
        <span>
          <kbd>↑</kbd> <kbd>↓</kbd> move
        </span>
        <span>
          <kbd>Enter</kbd> run
        </span>
        <span>
          <kbd>Esc</kbd> close
        </span>
      </p>
    </dialog>
  )
}
