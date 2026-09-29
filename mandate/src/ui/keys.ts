/** Keyboard speed controls (DESIGN §2): Space pauses/resumes, 1–5 set the speed. */
import type { RunSpeed } from '../runtime/protocol.ts'

export type SpeedKeyAction = { type: 'toggle' } | { type: 'speed'; speed: RunSpeed }

export interface KeyInput {
  key: string
  code: string
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
  repeat: boolean
  target: EventTarget | null
}

function isEditable(target: EventTarget | null): boolean {
  if (typeof target !== 'object' || target === null) return false
  const el = target as { tagName?: unknown; isContentEditable?: unknown }
  if (el.isContentEditable === true) return true
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT'
}

/** What a keydown should do, or `null` to leave it alone (typing, shortcuts, held keys). */
export function speedKeyAction(event: KeyInput): SpeedKeyAction | null {
  if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return null
  if (isEditable(event.target)) return null
  if (event.code === 'Space' || event.key === ' ') return { type: 'toggle' }
  // Physical digit keys, so layouts where digits need Shift (e.g. AZERTY) still work.
  const digit = /^(?:Digit|Numpad)([1-5])$/.exec(event.code)?.[1] ?? /^[1-5]$/.exec(event.key)?.[0]
  return digit ? { type: 'speed', speed: Number(digit) as RunSpeed } : null
}
