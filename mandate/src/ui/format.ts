/** Player-facing date formats (UK style), built from the sim calendar so they never vary by locale. */
import { civil, dayFromIso, weekday } from '../sim/clock.ts'

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
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

function parts(iso: string) {
  const day = dayFromIso(iso)
  const { y, m, d } = civil(day)
  return { y, d, month: MONTHS[m - 1]!, weekday: WEEKDAYS[weekday(day) - 1]! }
}

/** "Thursday 1 October 2026"; a dash when there is no game yet. */
export function formatLongDate(iso: string | null): string {
  if (!iso) return '—'
  const { y, d, month, weekday: wd } = parts(iso)
  return `${wd} ${d} ${month} ${y}`
}

/** "Thu 1 Oct 2026". */
export function formatShortDate(iso: string | null): string {
  if (!iso) return '—'
  const { y, d, month, weekday: wd } = parts(iso)
  return `${wd.slice(0, 3)} ${d} ${month.slice(0, 3)} ${y}`
}

/** "1 Oct 2026, 14:05" in the player's local time, for real-time timestamps. */
export function formatSavedAt(isoTimestamp: string): string {
  const t = new Date(isoTimestamp)
  if (Number.isNaN(t.getTime())) return '—'
  const hh = String(t.getHours()).padStart(2, '0')
  const mm = String(t.getMinutes()).padStart(2, '0')
  return `${t.getDate()} ${MONTHS[t.getMonth()]!.slice(0, 3)} ${t.getFullYear()}, ${hh}:${mm}`
}

/** "12.3 KB". */
export function formatBytes(bytes: number): string {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`
}
