import { describe, expect, it } from 'vitest'
import { filterCommands, isCommandShortcut, type Command } from '../src/ui/commands.ts'

const cmd = (id: string, label: string, group: string, keywords?: string): Command => ({
  id,
  label,
  group,
  keywords,
  run: () => {},
})

const COMMANDS = [
  cmd('go-home', 'Home', 'Go to'),
  cmd('go-map', 'Map', 'Go to'),
  cmd('pause', 'Resume', 'Time', 'pause resume clock'),
  cmd('speed-3', 'Speed 3', 'Time'),
  cmd('theme', 'Switch to the light theme', 'Game', 'theme dark light colours'),
  cmd('quick', 'Quicksave', 'Game'),
]

const ids = (q: string) => filterCommands(COMMANDS, q).map((c) => c.id)

describe('command menu', () => {
  it('lists everything, in group order, for an empty query', () => {
    expect(ids('  ')).toEqual(COMMANDS.map((c) => c.id))
  })

  it('matches labels, groups and keywords, every word, ignoring case', () => {
    expect(ids('PAUSE')).toEqual(['pause'])
    expect(ids('go map')).toEqual(['go-map'])
    expect(ids('dark')).toEqual(['theme'])
    expect(ids('time 3')).toEqual(['speed-3'])
    expect(ids('nothing like this')).toEqual([])
  })

  it('puts labels that start with the query first', () => {
    // "s" is in Resume, Speed 3, Switch…, Quicksave; the two starting with it lead.
    expect(ids('s')).toEqual(['speed-3', 'theme', 'pause', 'quick'])
  })

  it('opens on Ctrl+K or ⌘K only', () => {
    const key = (
      k: string,
      mods: Partial<Record<'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey', boolean>>,
    ) =>
      isCommandShortcut({
        key: k,
        ctrlKey: false,
        metaKey: false,
        altKey: false,
        shiftKey: false,
        ...mods,
      })
    expect(key('k', { ctrlKey: true })).toBe(true)
    expect(key('K', { metaKey: true })).toBe(true)
    expect(key('k', {})).toBe(false)
    expect(key('k', { ctrlKey: true, shiftKey: true })).toBe(false)
    expect(key('j', { ctrlKey: true })).toBe(false)
  })
})
