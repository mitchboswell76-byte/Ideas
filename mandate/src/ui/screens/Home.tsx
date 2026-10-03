import { Portrait } from '../avatar/Portrait.tsx'
import { daysBetween, upcomingFixtures } from '../calendar.ts'
import { useCharacterView } from '../character/useCharacter.ts'
import { fullName } from '../../sim/character/model.ts'
import { formatLongDate, formatSavedAt, formatShortDate } from '../format.ts'
import {
  ArrowRightIcon,
  CalendarBlankIcon,
  FloppyDiskIcon,
  KeyboardIcon,
  TrayIcon,
  UserIcon,
} from '../kit/icons.ts'
import { Button, Chip, Panel, PortraitFrame, cx } from '../kit/index.ts'
import { senderOf, subjectOf } from '../mail.ts'
import { AUTOSAVE_LABELS } from '../shell/labels.ts'
import { gameStore, useGame } from '../store/index.ts'
import { navStore } from '../store/nav.ts'
import './screens.css'

const INBOX_ROWS = 5

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`

function speedText(speed: number): string {
  return speed === 0 ? 'Paused' : `Speed ${speed}`
}

/** A panel's "see all" link in its header. */
function SeeAll({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button size="s" variant="quiet" onClick={onClick}>
      {label}
      <ArrowRightIcon className="btn__icon" aria-hidden />
    </Button>
  )
}

function InboxList() {
  const log = useGame((s) => s.log)
  const { go, openMail } = navStore.getState()
  const open = (id: number | null) => {
    openMail(id)
    go('inbox')
  }
  return (
    <Panel
      title="Inbox"
      icon={TrayIcon}
      flush
      actions={<SeeAll label="Open inbox" onClick={() => open(null)} />}
    >
      {log.length === 0 ? (
        <p className="list-empty">No mail yet.</p>
      ) : (
        <ul className="list">
          {log.slice(0, INBOX_ROWS).map((m) => (
            <li key={m.id}>
              <button type="button" className="list__row" onClick={() => open(m.id)}>
                <span className={cx('unread-dot', m.read && 'unread-dot--read')} aria-hidden />
                <span className="list__title">{subjectOf(m)}</span>
                <span className="list__meta">{senderOf(m)}</span>
                <span className="list__date num">{formatShortDate(m.date)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

function UpcomingList() {
  const date = useGame((s) => s.date)
  const upcoming = date ? upcomingFixtures(date) : []
  return (
    <Panel
      title="Upcoming"
      icon={CalendarBlankIcon}
      flush
      actions={<SeeAll label="Calendar" onClick={() => navStore.getState().go('calendar')} />}
    >
      {upcoming.length === 0 ? (
        <p className="list-empty">Nothing in the diary for the next year.</p>
      ) : (
        <ul className="list">
          {upcoming.map((e) => (
            <li key={e.iso} className="list__row list__row--static">
              <span className="list__title">{e.label}</span>
              <span className="list__meta">{formatLongDate(e.iso)}</span>
              <span className="list__date num">in {plural(daysBetween(date!, e.iso), 'day')}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

function YouPanel() {
  const player = useGame((s) => s.player)
  const view = useCharacterView(null)
  const c = view?.character
  const open = () => navStore.getState().openProfile(null)
  return (
    <Panel title="You" icon={UserIcon} actions={c && <SeeAll label="Profile" onClick={open} />}>
      <div className="you">
        {c ? (
          <Portrait
            person={{
              name: fullName(c),
              appearance: c.appearance,
              age: view.age,
              gender: c.gender,
            }}
            size="m"
            you
          />
        ) : (
          <PortraitFrame name="You" size="m" you />
        )}
        <div className="you__text">
          <p className="you__name">{player?.name ?? 'Nobody yet'}</p>
          {c && (
            <p className="muted">
              {player?.age} · {c.occupation}
            </p>
          )}
          <div className="chip-row">
            <Chip>No party</Chip>
            <Chip>No office</Chip>
          </div>
          {player && (
            <dl className="facts">
              <dt>Health</dt>
              <dd className="num">{player.health}</dd>
              <dt>Stress</dt>
              <dd className="num">{player.stress}</dd>
              <dt>Energy</dt>
              <dd className="num">
                {player.energy}/{player.energyMax}
              </dd>
            </dl>
          )}
        </div>
      </div>
    </Panel>
  )
}

function GamePanel() {
  const speed = useGame((s) => s.speed)
  const autosave = useGame((s) => s.autosave)
  const slots = useGame((s) => s.slots)
  const latest = slots.reduce<(typeof slots)[number] | null>(
    (a, s) => (!a || s.savedAt > a.savedAt ? s : a),
    null,
  )
  const { go } = navStore.getState()
  return (
    <Panel title="Game" icon={FloppyDiskIcon}>
      <dl className="facts">
        <dt>Clock</dt>
        <dd>{speedText(speed)}</dd>
        <dt>Autosave</dt>
        <dd>{AUTOSAVE_LABELS[autosave]}</dd>
        <dt>Last save</dt>
        <dd>{latest ? `${latest.name}, ${formatSavedAt(latest.savedAt)}` : 'None yet'}</dd>
        <dt>Saves</dt>
        <dd>{plural(slots.length, 'save')} in this browser</dd>
      </dl>
      <div className="button-row">
        <Button variant="primary" size="s" onClick={() => void gameStore.getState().quickSave()}>
          Quicksave
        </Button>
        <Button variant="secondary" size="s" onClick={() => go('saves')}>
          Saves
        </Button>
        <Button variant="secondary" size="s" onClick={() => go('settings')}>
          Settings
        </Button>
      </div>
    </Panel>
  )
}

function KeysPanel() {
  return (
    <Panel title="Keys" icon={KeyboardIcon}>
      <dl className="facts facts--keys">
        <dt>
          <kbd>Ctrl</kbd> <kbd>K</kbd>
        </dt>
        <dd>Command menu: go anywhere, save, change speed</dd>
        <dt>
          <kbd>Space</kbd>
        </dt>
        <dd>Pause or resume the clock</dd>
        <dt>
          <kbd>1</kbd>–<kbd>5</kbd>
        </dt>
        <dd>Set the speed, from a day a second to as fast as it will go</dd>
        <dt>
          <kbd>Esc</kbd>
        </dt>
        <dd>Close a card, menu or tooltip</dd>
        <dt>Tooltips</dt>
        <dd>Hold the pointer still for a second and a tooltip locks, so you can hover its terms</dd>
      </dl>
    </Panel>
  )
}

/**
 * Home (Linear's overview pattern): the date and who you are, then lists (inbox, upcoming) in the
 * main column and status panels beside them.
 */
export function Home() {
  const date = useGame((s) => s.date)
  const unread = useGame((s) => s.log.reduce((n, m) => n + (m.read ? 0 : 1), 0))
  return (
    <div className="home">
      <header className="page-head">
        <h2 className="page-head__title">{formatLongDate(date)}</h2>
        <p className="page-head__sub">
          {unread === 0 ? 'No unread mail' : `${plural(unread, 'unread message')}`} · Independent,
          no office
        </p>
      </header>
      <div className="home__main">
        <InboxList />
        <UpcomingList />
      </div>
      <aside className="home__side">
        <YouPanel />
        <GamePanel />
        <KeysPanel />
      </aside>
    </div>
  )
}
