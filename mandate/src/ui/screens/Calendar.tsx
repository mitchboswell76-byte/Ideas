import { useMemo, useState } from 'react'
import {
  addMonths,
  fixturesFor,
  monthGrid,
  yearMonthOf,
  type CalendarEntry,
  type YearMonth,
} from '../calendar.ts'
import { formatLongDate } from '../format.ts'
import { CaretLeftIcon, CaretRightIcon } from '../kit/icons.ts'
import { Button, IconButton, Panel, cx } from '../kit/index.ts'
import { subjectOf } from '../mail.ts'
import { useGame } from '../store/index.ts'
import { navStore } from '../store/nav.ts'
import './screens.css'

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
/** Entries shown in a day cell before "+n more". */
const CELL_ENTRIES = 2

/** FM calendar: a month grid with the diary for the selected day alongside. */
export function Calendar() {
  const today = useGame((s) => s.date) ?? '1970-01-01'
  const log = useGame((s) => s.log)
  const [month, setMonth] = useState<YearMonth>(() => yearMonthOf(today))
  const [picked, setPicked] = useState<string | null>(null)
  const selected = picked ?? today
  const weeks = useMemo(() => monthGrid(month), [month])

  // Everything visible: fixtures of the neighbouring months too (leading/trailing days).
  const byDay = useMemo(() => {
    const entries: CalendarEntry[] = [-1, 0, 1].flatMap((n) => fixturesFor(addMonths(month, n)))
    for (const m of log)
      entries.push({ iso: m.date, kind: 'mail', label: subjectOf(m), mailId: m.id })
    const map = new Map<string, CalendarEntry[]>()
    for (const e of entries) map.set(e.iso, [...(map.get(e.iso) ?? []), e])
    return map
  }, [month, log])

  const openEntry = (e: CalendarEntry) => {
    if (e.mailId === undefined) return
    navStore.getState().openMail(e.mailId)
    navStore.getState().go('inbox')
  }
  const dayEntries = byDay.get(selected) ?? []

  return (
    <div className="calendar">
      <Panel
        className="calendar__month"
        flush
        title={`${MONTHS[month.m - 1]} ${month.y}`}
        actions={
          <>
            <IconButton
              icon={CaretLeftIcon}
              label="Previous month"
              onClick={() => setMonth(addMonths(month, -1))}
            />
            <Button
              size="s"
              onClick={() => {
                setMonth(yearMonthOf(today))
                setPicked(null)
              }}
            >
              Today
            </Button>
            <IconButton
              icon={CaretRightIcon}
              label="Next month"
              onClick={() => setMonth(addMonths(month, 1))}
            />
          </>
        }
      >
        <div className="month">
          <div className="month__row month__row--head" aria-hidden>
            {WEEKDAYS.map((d) => (
              <span key={d} className="month__weekday">
                {d}
              </span>
            ))}
          </div>
          {weeks.map((week) => (
            <div key={week[0]!.iso} className="month__row">
              {week.map((day) => {
                const entries = byDay.get(day.iso) ?? []
                return (
                  <button
                    key={day.iso}
                    type="button"
                    aria-pressed={day.iso === selected}
                    aria-label={`${formatLongDate(day.iso)}${entries.length ? `, ${entries.length} entries` : ''}`}
                    className={cx(
                      'month__day',
                      !day.inMonth && 'month__day--outside',
                      day.iso < today && 'month__day--past',
                      day.iso === today && 'month__day--today',
                    )}
                    onClick={() => setPicked(day.iso)}
                  >
                    <span className="month__date num">{day.d}</span>
                    {entries.slice(0, CELL_ENTRIES).map((e, i) => (
                      <span key={i} className={cx('month__entry', `month__entry--${e.kind}`)}>
                        {e.label}
                      </span>
                    ))}
                    {entries.length > CELL_ENTRIES && (
                      <span className="month__more">+{entries.length - CELL_ENTRIES} more</span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </Panel>
      <Panel className="calendar__day" title={formatLongDate(selected)}>
        {dayEntries.length === 0 ? (
          <p className="muted">
            {selected === today ? 'Nothing else today.' : 'Nothing in the diary.'}
          </p>
        ) : (
          <ul className="mini-list">
            {dayEntries.map((e, i) => (
              <li key={i}>
                {e.kind === 'mail' ? (
                  <button type="button" className="mini-list__row" onClick={() => openEntry(e)}>
                    <span className="mini-list__main">
                      <span className="mini-list__title">{e.label}</span>
                      <span className="mini-list__meta">Inbox</span>
                    </span>
                  </button>
                ) : (
                  <span className="mini-list__row mini-list__row--static">
                    <span className="mini-list__main">
                      <span className="mini-list__title">{e.label}</span>
                      <span className="mini-list__meta">Election</span>
                    </span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
