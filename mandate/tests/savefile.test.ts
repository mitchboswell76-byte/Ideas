import { afterEach, describe, expect, it } from 'vitest'
import { saveFileName } from '../src/ui/saves/file.ts'
import {
  hostDownloads,
  hostDownloadsNow,
  hostErrorCode,
  resetHostDownloads,
  type HostDownloads,
} from '../src/ui/saves/host.ts'

const global = globalThis as { claude?: unknown }

afterEach(() => {
  delete global.claude
  resetHostDownloads()
})

describe('save file names', () => {
  it('names exports by format, with an optional slugged name', () => {
    expect(saveFileName('2026-10-04', 'mandate')).toBe('mandate-2026-10-04.mandate')
    expect(saveFileName('2026-10-04', 'json')).toBe('mandate-2026-10-04.json')
    expect(saveFileName('2026-10-04', 'json', 'Siân O’Neill')).toBe(
      'mandate-sian-o-neill-2026-10-04.json',
    )
    expect(saveFileName('2026-10-04', 'json', '  !! ')).toBe('mandate-2026-10-04.json')
  })
})

describe('Artifact viewer downloads', () => {
  it('is null in a normal browser tab', async () => {
    expect(hostDownloadsNow()).toBeUndefined()
    expect(await hostDownloads()).toBeNull()
    expect(hostDownloadsNow()).toBeNull()
  })

  it('asks the viewer once and remembers the answer', async () => {
    const downloads: HostDownloads = { save: async () => ({ status: 'saved' }) }
    const asked: string[] = []
    global.claude = {
      use: async (name: string) => {
        asked.push(name)
        return downloads
      },
    }
    expect(await hostDownloads()).toBe(downloads)
    expect(await hostDownloads()).toBe(downloads)
    expect(hostDownloadsNow()).toBe(downloads)
    expect(asked).toEqual(['downloads'])
  })

  it('treats a viewer that fails to answer as no capability', async () => {
    global.claude = { use: () => Promise.reject(new Error('boom')) }
    expect(await hostDownloads()).toBeNull()
  })

  it('reads rejection codes', () => {
    expect(hostErrorCode({ code: 'declined', message: 'no' })).toBe('declined')
    expect(hostErrorCode(new Error('x'))).toBeUndefined()
    expect(hostErrorCode(null)).toBeUndefined()
  })
})
