/** The command menu's model (Linear / Raycast Ctrl+K): commands, matching and the open shortcut. Pure. */
import { matchesSearch } from './map/search.ts'

export interface Command {
  id: string
  label: string
  group: string
  /** Shortcut to show beside it (it still works on its own). */
  keys?: string
  /** Extra words that find it ("pause" finds Resume too). */
  keywords?: string
  run: () => void
}

/**
 * Commands whose label, group or keywords contain every word of the query (accents and case
 * ignored), labels that start with the query first; group order is kept otherwise.
 */
export function filterCommands(commands: readonly Command[], query: string): Command[] {
  const words = query.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return [...commands]
  const hits = commands.filter((c) => {
    const text = `${c.label} ${c.group} ${c.keywords ?? ''}`
    return words.every((w) => matchesSearch(text, w))
  })
  const starts = (c: Command) =>
    matchesSearch(c.label.slice(0, query.trim().length), query) ? 0 : 1
  return hits
    .map((c, i) => ({ c, i, rank: starts(c) }))
    .sort((a, b) => a.rank - b.rank || a.i - b.i)
    .map((x) => x.c)
}

export interface ShortcutInput {
  key: string
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
  shiftKey: boolean
}

/** Ctrl+K, or ⌘K on a Mac. */
export function isCommandShortcut(e: ShortcutInput): boolean {
  return (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'k'
}
