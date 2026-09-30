/** Inbox presentation of simulation notifications (FM inbox). Pure. */
import type { Notification } from '../sim/scheduler.ts'

const DEFAULT_SENDER: Record<Notification['kind'], string> = {
  info: 'Notice',
  news: 'News desk',
  alert: 'Alert',
}

export const SUBJECT_MAX = 72

export function senderOf(n: Pick<Notification, 'kind' | 'from'>): string {
  return n.from ?? DEFAULT_SENDER[n.kind]
}

/** The given subject, or the first sentence of the text, cut to `SUBJECT_MAX` characters. */
export function subjectOf(n: Pick<Notification, 'text' | 'subject'>): string {
  if (n.subject) return n.subject
  const first = n.text.split(/\n|(?<=[.!?])\s/)[0]!.trim()
  return first.length <= SUBJECT_MAX ? first : `${first.slice(0, SUBJECT_MAX - 1).trimEnd()}…`
}

/** Body paragraphs (split on blank lines). */
export function paragraphsOf(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
}
