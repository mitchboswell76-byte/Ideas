/** Month grids and calendar entries for the Calendar screen (FM). Pure; sim calendar, no `Date`. */
import {
  THURSDAY,
  civil,
  dayFromCivil,
  dayFromIso,
  daysInMonth,
  nthWeekdayOfMonth,
  toIso,
  weekday,
} from '../sim/clock.ts'

export interface CalendarDay {
  /** Sim day number. */
  day: number
  iso: string
  /** Day of the month. */
  d: number
  /** Belongs to the month shown (not a leading/trailing day of a neighbour). */
  inMonth: boolean
}

export interface YearMonth {
  y: number
  /** 1–12. */
  m: number
}

export function yearMonthOf(iso: string): YearMonth {
  const { y, m } = civil(dayFromIso(iso))
  return { y, m }
}

export function addMonths({ y, m }: YearMonth, n: number): YearMonth {
  const index = y * 12 + (m - 1) + n
  return { y: Math.floor(index / 12), m: (index % 12) + 1 }
}

/** Whole weeks, Monday first, covering the month (4 to 6 rows). */
export function monthGrid({ y, m }: YearMonth): CalendarDay[][] {
  const first = dayFromCivil(y, m, 1)
  const last = first + daysInMonth(y, m) - 1
  const start = first - (weekday(first) - 1)
  const end = last + (7 - weekday(last))
  const weeks: CalendarDay[][] = []
  for (let day = start; day <= end; day++) {
    if ((day - start) % 7 === 0) weeks.push([])
    weeks[weeks.length - 1]!.push({
      day,
      iso: toIso(day),
      d: civil(day).d,
      inMonth: civil(day).m === m,
    })
  }
  return weeks
}

export type EntryKind = 'election' | 'mail'

export interface CalendarEntry {
  iso: string
  kind: EntryKind
  label: string
  /** Inbox item id, for mail entries. */
  mailId?: number
}

/**
 * Fixed dates in a month. A placeholder until elections live in the simulation (T14/T15): just
 * the May local elections, on the first Thursday in May.
 */
export function fixturesFor({ y, m }: YearMonth): CalendarEntry[] {
  if (m !== 5) return []
  return [
    {
      iso: toIso(nthWeekdayOfMonth(y, 5, THURSDAY, 1)),
      kind: 'election',
      label: 'Local elections',
    },
  ]
}

/** Fixtures from `fromIso` (inclusive) over the next `months` months, soonest first. */
export function upcomingFixtures(fromIso: string, months = 12): CalendarEntry[] {
  const start = yearMonthOf(fromIso)
  const entries: CalendarEntry[] = []
  for (let i = 0; i <= months; i++) entries.push(...fixturesFor(addMonths(start, i)))
  return entries.filter((e) => e.iso >= fromIso)
}

/** Days from one ISO date to another (negative if `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  return dayFromIso(to) - dayFromIso(from)
}
