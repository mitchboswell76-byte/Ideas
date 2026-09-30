import { useEffect, useState } from 'react'
import { useNarrow } from '../hooks/useMediaQuery.ts'
import { formatLongDate, formatShortDate } from '../format.ts'
import { ArrowLeftIcon, CheckIcon, EnvelopeIcon } from '../kit/icons.ts'
import { Button, Chip, Panel, PortraitFrame, Tabs, cx } from '../kit/index.ts'
import { paragraphsOf, senderOf, subjectOf } from '../mail.ts'
import { gameStore, useGame } from '../store/index.ts'
import type { LoggedNotification } from '../store/game.ts'
import { navStore, useNav } from '../store/nav.ts'
import './screens.css'

type Filter = 'all' | 'unread' | 'news' | 'alerts'

const FILTERS: Record<Filter, (m: LoggedNotification) => boolean> = {
  all: () => true,
  unread: (m) => !m.read,
  news: (m) => m.kind === 'news',
  alerts: (m) => m.kind === 'alert',
}

function Reading({ mail, onBack }: { mail: LoggedNotification; onBack?: () => void }) {
  const game = gameStore.getState()
  return (
    <Panel
      className="reading"
      title={onBack ? 'Message' : undefined}
      actions={
        <>
          {onBack && (
            <Button size="s" variant="quiet" icon={ArrowLeftIcon} onClick={onBack}>
              Back
            </Button>
          )}
          <Button
            size="s"
            variant="quiet"
            icon={EnvelopeIcon}
            onClick={() => {
              game.markRead(mail.id, false)
              navStore.getState().openMail(null)
            }}
          >
            Mark as unread
          </Button>
        </>
      }
    >
      <article className="mail">
        <header className="mail__head">
          <PortraitFrame name={senderOf(mail)} size="m" />
          <div>
            <h2 className="mail__subject">{subjectOf(mail)}</h2>
            <p className="mail__from">
              From <strong>{senderOf(mail)}</strong> · {formatLongDate(mail.date)}
            </p>
            {mail.kind === 'alert' && <Chip tone="bad">Needs attention</Chip>}
          </div>
        </header>
        <div className="mail__body serif">
          {paragraphsOf(mail.text).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </article>
    </Panel>
  )
}

/** FM inbox: message list and reading pane; one pane at a time on narrow screens. */
export function Inbox() {
  const log = useGame((s) => s.log)
  const selectedId = useNav((s) => s.mail)
  const narrow = useNarrow()
  const [filter, setFilter] = useState<Filter>('all')
  const { openMail } = navStore.getState()
  const game = gameStore.getState()

  const selected = log.find((m) => m.id === selectedId) ?? null
  const shown = log.filter(FILTERS[filter])
  const unread = log.filter((m) => !m.read).length

  // Opening a message marks it read.
  useEffect(() => {
    if (selected && !selected.read) game.markRead(selected.id)
  }, [selected, game])
  // On wide screens the newest message opens on arrival (not again after "Mark as unread").
  const [initial] = useState(() => (narrow ? null : (navStore.getState().mail ?? log[0]?.id)))
  useEffect(() => {
    if (initial != null) openMail(initial)
  }, [initial, openMail])

  const list = (
    <Panel
      className="mailbox"
      flush
      actions={
        <Button
          size="s"
          variant="quiet"
          icon={CheckIcon}
          disabled={unread === 0}
          onClick={() => game.markAllRead()}
        >
          Mark all read
        </Button>
      }
      title={
        <Tabs
          label="Filter"
          value={filter}
          onChange={setFilter}
          tabs={[
            { key: 'all', label: 'All' },
            { key: 'unread', label: 'Unread', count: unread },
            { key: 'news', label: 'News' },
            { key: 'alerts', label: 'Alerts' },
          ]}
        />
      }
    >
      {shown.length === 0 ? (
        <p className="empty">{log.length === 0 ? 'No mail yet.' : 'Nothing here.'}</p>
      ) : (
        <ul className="mail-list" aria-label="Messages">
          {shown.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                className={cx('mail-row', !m.read && 'mail-row--unread')}
                aria-current={m.id === selectedId || undefined}
                onClick={() => openMail(m.id)}
              >
                <span className={cx('unread-dot', m.read && 'unread-dot--read')} aria-hidden />
                <PortraitFrame name={senderOf(m)} size="s" />
                <span className="mail-row__main">
                  <span className="mail-row__from">{senderOf(m)}</span>
                  <span className="mail-row__subject">{subjectOf(m)}</span>
                </span>
                <span className="mail-row__date num">{formatShortDate(m.date)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )

  if (narrow) {
    return selected ? <Reading mail={selected} onBack={() => openMail(null)} /> : list
  }
  return (
    <div className="inbox">
      {list}
      {selected ? (
        <Reading mail={selected} />
      ) : (
        <Panel className="reading">
          <p className="empty">Select a message to read it.</p>
        </Panel>
      )}
    </div>
  )
}
