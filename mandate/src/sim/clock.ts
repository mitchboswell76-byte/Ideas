/**
 * Calendar maths on integer day numbers (days since 1970-01-01, proleptic Gregorian).
 * Pure integer arithmetic (Howard Hinnant's civil-date algorithms) — no `Date`, no time zones.
 */

/** Game start date: the data `asOf` date (DESIGN §2). */
export const START_DATE = '2026-10-01'

export interface CivilDate {
  y: number
  /** 1–12 */
  m: number
  /** 1–31 */
  d: number
}

/** ISO weekday numbers. */
export const MONDAY = 1
export const THURSDAY = 4
export const SUNDAY = 7

export function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
}

export function daysInMonth(y: number, m: number): number {
  if (m === 2) return isLeapYear(y) ? 29 : 28
  return m === 4 || m === 6 || m === 9 || m === 11 ? 30 : 31
}

export function dayFromCivil(y: number, m: number, d: number): number {
  const yy = m <= 2 ? y - 1 : y
  const era = Math.floor(yy / 400)
  const yoe = yy - era * 400
  const mp = (m + 9) % 12
  const doy = Math.floor((153 * mp + 2) / 5) + d - 1
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy
  return era * 146097 + doe - 719468
}

export function civil(day: number): CivilDate {
  const z = day + 719468
  const era = Math.floor(z / 146097)
  const doe = z - era * 146097
  const yoe = Math.floor(
    (doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365,
  )
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100))
  const mp = Math.floor((5 * doy + 2) / 153)
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1
  const m = mp < 10 ? mp + 3 : mp - 9
  const y = yoe + era * 400 + (m <= 2 ? 1 : 0)
  return { y, m, d }
}

/** Parse `YYYY-MM-DD`. Throws on malformed or impossible dates. */
export function dayFromIso(iso: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) throw new RangeError(`Bad ISO date: ${iso}`)
  const y = Number(match[1])
  const m = Number(match[2])
  const d = Number(match[3])
  if (m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m))
    throw new RangeError(`Bad ISO date: ${iso}`)
  return dayFromCivil(y, m, d)
}

export function toIso(day: number): string {
  const { y, m, d } = civil(day)
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** ISO weekday: 1 = Monday … 7 = Sunday. (Day 0, 1970-01-01, was a Thursday.) */
export function weekday(day: number): number {
  return ((((day + 3) % 7) + 7) % 7) + 1
}

/** The nth (1-based) given weekday of a month, e.g. the first Thursday in May. */
export function nthWeekdayOfMonth(y: number, m: number, wd: number, n: number): number {
  const first = dayFromCivil(y, m, 1)
  const day = first + ((wd - weekday(first) + 7) % 7) + (n - 1) * 7
  if (civil(day).m !== m) throw new RangeError(`No weekday #${n} of ${wd} in ${y}-${m}`)
  return day
}

/**
 * Whole years completed on `day` for someone born on `birthDay`. A 29 February birthday
 * falls on 1 March in non-leap years.
 */
export function ageOn(birthDay: number, day: number): number {
  const b = civil(birthDay)
  const c = civil(day)
  let years = c.y - b.y
  if (c.m < b.m || (c.m === b.m && c.d < b.d)) years--
  return years
}

/** True on each birthday after the day of birth. */
export function isAnniversary(birthDay: number, day: number): boolean {
  return day > birthDay && ageOn(birthDay, day) > ageOn(birthDay, day - 1)
}
