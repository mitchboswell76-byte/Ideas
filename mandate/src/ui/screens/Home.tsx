import { useEffect } from 'react'
import { daysBetween, upcomingFixtures } from '../calendar.ts'
import { useNarrow } from '../hooks/useMediaQuery.ts'
import { formatLongDate, formatSavedAt, formatShortDate } from '../format.ts'
import { CalendarBlankIcon, FloppyDiskIcon, InfoIcon, TrayIcon, UserIcon } from '../kit/icons.ts'
import { Button, Card, Chip, PortraitFrame, Tile, cx } from '../kit/index.ts'
import { senderOf, subjectOf } from '../mail.ts'
import { gameStore, useGame } from '../store/index.ts'
import { navStore, useNav, type CardName } from '../store/nav.ts'
import { AUTOSAVE_LABELS } from '../shell/labels.ts'
import './screens.css'

function speedText(speed: number): string {
  return speed === 0 ? 'Paused' : `Speed ${speed}`
}

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`

function InboxCard({ onClose }: { onClose: () => void }) {
  const log = useGame((s) => s.log)
  const { go, openMail } = navStore.getState()
  const open = (id: number | null) => {
    openMail(id)
    go('inbox')
  }
  return (
    <Card
      title="Inbox"
      icon={TrayIcon}
      onClose={onClose}
      footer={
        <Button variant="primary" onClick={() => open(null)}>
          Go to Inbox
        </Button>
      }
    >
      {log.length === 0 ? (
        <p className="muted">No mail yet.</p>
      ) : (
        <ul className="mini-list">
          {log.slice(0, 6).map((m) => (
            <li key={m.id}>
              <button type="button" className="mini-list__row" onClick={() => open(m.id)}>
                <span className={cx('unread-dot', m.read && 'unread-dot--read')} aria-hidden />
                <span className="mini-list__main">
                  <span className="mini-list__title">{subjectOf(m)}</span>
                  <span className="mini-list__meta">
                    {senderOf(m)} · {formatShortDate(m.date)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function CalendarCard({ onClose }: { onClose: () => void }) {
  const date = useGame((s) => s.date)
  const upcoming = date ? upcomingFixtures(date) : []
  return (
    <Card
      title="Calendar"
      icon={CalendarBlankIcon}
      onClose={onClose}
      footer={
        <Button variant="primary" onClick={() => navStore.getState().go('calendar')}>
          Go to Calendar
        </Button>
      }
    >
      <p>
        Today is <strong>{formatLongDate(date)}</strong>.
      </p>
      {upcoming.length === 0 ? (
        <p className="muted">Nothing in the diary for the next year.</p>
      ) : (
        <ul className="mini-list">
          {upcoming.map((e) => (
            <li key={e.iso} className="mini-list__row mini-list__row--static">
              <span className="mini-list__main">
                <span className="mini-list__title">{e.label}</span>
                <span className="mini-list__meta">
                  {formatLongDate(e.iso)} · in {plural(daysBetween(date!, e.iso), 'day')}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function YouCard({ onClose }: { onClose: () => void }) {
  return (
    <Card title="You" icon={UserIcon} onClose={onClose}>
      <div className="you">
        <PortraitFrame name="You" size="l" you office="Nobody yet" />
        <div className="you__text">
          <p className="you__name">Nobody yet</p>
          <div className="chip-row">
            <Chip>No party</Chip>
            <Chip>No office</Chip>
          </div>
          <p className="muted">
            Your character, attributes and traits will appear here once you can create one.
          </p>
        </div>
      </div>
    </Card>
  )
}

function GameCard({ onClose }: { onClose: () => void }) {
  const speed = useGame((s) => s.speed)
  const autosave = useGame((s) => s.autosave)
  const slots = useGame((s) => s.slots)
  const latest = slots.reduce<(typeof slots)[number] | null>(
    (a, s) => (!a || s.savedAt > a.savedAt ? s : a),
    null,
  )
  const { go } = navStore.getState()
  return (
    <Card
      title="Game"
      icon={FloppyDiskIcon}
      onClose={onClose}
      footer={
        <>
          <Button variant="primary" onClick={() => void gameStore.getState().quickSave()}>
            Quicksave
          </Button>
          <Button onClick={() => go('saves')}>Saves</Button>
          <Button onClick={() => go('settings')}>Settings</Button>
        </>
      }
    >
      <dl className="facts">
        <dt>Clock</dt>
        <dd>{speedText(speed)}</dd>
        <dt>Autosave</dt>
        <dd>{AUTOSAVE_LABELS[autosave]}</dd>
        <dt>Last save</dt>
        <dd>{latest ? `${latest.name}, ${formatSavedAt(latest.savedAt)}` : 'None yet'}</dd>
        <dt>Save slots</dt>
        <dd>{slots.length}</dd>
      </dl>
    </Card>
  )
}

function StartCard({ onClose }: { onClose: () => void }) {
  return (
    <Card title="Getting started" icon={InfoIcon} onClose={onClose}>
      <dl className="facts facts--keys">
        <dt>
          <kbd>Space</kbd>
        </dt>
        <dd>Pause or resume the clock</dd>
        <dt>
          <kbd>1</kbd>–<kbd>5</kbd>
        </dt>
        <dd>Set the speed, from a day a second to as fast as it will go</dd>
        <dt>+1 day, +1 week</dt>
        <dd>Step time on while paused (next to the date)</dd>
        <dt>
          <kbd>Esc</kbd>
        </dt>
        <dd>Close a card or tooltip</dd>
        <dt>Tooltips</dt>
        <dd>
          Keep the pointer still for a second and a tooltip locks, so you can hover its highlighted
          terms
        </dd>
      </dl>
    </Card>
  )
}

const CARDS: Record<CardName, (props: { onClose: () => void }) => React.JSX.Element> = {
  inbox: InboxCard,
  calendar: CalendarCard,
  you: YouCard,
  game: GameCard,
  start: StartCard,
}

/** FM26 home: tiles that open their card in place, one at a time. */
export function Home() {
  const card = useNav((s) => s.card)
  const narrow = useNarrow()
  const date = useGame((s) => s.date)
  const log = useGame((s) => s.log)
  const speed = useGame((s) => s.speed)
  const slotCount = useGame((s) => s.slots.length)
  const { openCard } = navStore.getState()
  const toggle = (name: CardName) => openCard(card === name ? null : name)
  const close = () => openCard(null)

  useEffect(() => {
    if (!card) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && openCard(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [card, openCard])

  const unread = log.filter((m) => !m.read).length
  const latest = log[0]
  const next = date ? upcomingFixtures(date)[0] : undefined
  const OpenCard = card ? CARDS[card] : null

  return (
    <div className={cx('home', OpenCard && 'home--card')}>
      {!(narrow && OpenCard) && (
        <div className="tiles">
          <Tile
            title="Inbox"
            icon={TrayIcon}
            badge={unread}
            open={card === 'inbox'}
            onOpen={() => toggle('inbox')}
          >
            <span className="tile__stat">{unread}</span>
            <span>unread</span>
            {latest && <span className="tile__lead">{subjectOf(latest)}</span>}
          </Tile>
          <Tile
            title="Calendar"
            icon={CalendarBlankIcon}
            open={card === 'calendar'}
            onOpen={() => toggle('calendar')}
          >
            <span className="tile__stat">{formatShortDate(date)}</span>
            {next ? (
              <span>
                Next: <span className="tile__lead">{next.label}</span> in{' '}
                {plural(daysBetween(date!, next.iso), 'day')}
              </span>
            ) : (
              <span>Nothing in the diary</span>
            )}
          </Tile>
          <Tile title="You" icon={UserIcon} open={card === 'you'} onOpen={() => toggle('you')}>
            <span className="tile__row">
              <PortraitFrame name="You" size="s" you />
              <span className="tile__lead">Nobody yet</span>
            </span>
            <span>No party, no office, no name recognition</span>
          </Tile>
          <Tile
            title="Game"
            icon={FloppyDiskIcon}
            open={card === 'game'}
            onOpen={() => toggle('game')}
          >
            <span className="tile__stat">{speedText(speed)}</span>
            <span>{plural(slotCount, 'save')} in this browser</span>
          </Tile>
          <Tile
            title="Getting started"
            icon={InfoIcon}
            open={card === 'start'}
            onOpen={() => toggle('start')}
          >
            <span className="tile__lead">Space pauses. 1–5 set the speed.</span>
            <span>Keys, tooltips and time controls</span>
          </Tile>
        </div>
      )}
      {OpenCard && <OpenCard onClose={close} />}
    </div>
  )
}
