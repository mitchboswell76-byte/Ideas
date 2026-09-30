import { describe, expect, it, vi } from 'vitest'
import { createSimBridge, type WorkerLike } from '../src/runtime/bridge.ts'
import type { FromRunner } from '../src/runtime/protocol.ts'
import { SimRunner, timerHost } from '../src/runtime/runner.ts'

type Behaviour = 'ready' | 'error' | 'silent'

/** Stands in for a Web Worker: hosts a runner in-process behind structured-cloned messages. */
class FakeWorker implements WorkerLike {
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: ErrorEvent) => void) | null = null
  terminated = false
  private readonly runner = new SimRunner(
    timerHost((msg, transfer) => this.deliver(structuredClone(msg, { transfer })), 50),
    [],
  )

  constructor(behaviour: Behaviour) {
    if (behaviour === 'ready') this.deliver({ type: 'ready' })
    if (behaviour === 'error') {
      const event = { message: 'Failed to fetch worker script', preventDefault() {} }
      setTimeout(() => this.onerror?.(event as ErrorEvent))
    }
  }

  postMessage(message: unknown, transfer: Transferable[]): void {
    const copy = structuredClone(message, { transfer }) as Parameters<SimRunner['handle']>[0]
    setTimeout(() => this.runner.handle(copy))
  }

  terminate(): void {
    this.terminated = true
    this.runner.dispose()
  }

  private deliver(data: FromRunner): void {
    setTimeout(() => this.onmessage?.({ data } as MessageEvent))
  }
}

describe('SimBridge', () => {
  it('runs in the worker once it reports ready, flushing messages sent before that', async () => {
    const worker = new FakeWorker('ready')
    const bridge = createSimBridge({ createWorker: () => worker })
    const seen: FromRunner[] = []
    bridge.subscribe((msg) => seen.push(msg))
    const started = bridge.request({ type: 'newGame', options: { seed: 'b' } })
    bridge.send({ type: 'step', days: 2 })
    expect(await bridge.ready).toBe('worker')
    expect(await started).toEqual({ day: expect.any(Number), date: '2026-10-01' })
    await vi.waitFor(() => expect(seen.at(-1)).toMatchObject({ summary: { date: '2026-10-03' } }))
    expect(seen.some((m) => m.type === 'ready' || m.type === 'result')).toBe(false)
    bridge.dispose()
    expect(worker.terminated).toBe(true)
  })

  it('falls back to the main thread when the worker cannot be created', async () => {
    const onFallback = vi.fn()
    const bridge = createSimBridge({
      createWorker: () => {
        throw new Error('blocked by CSP')
      },
      onFallback,
    })
    expect(await bridge.ready).toBe('main')
    expect(onFallback).toHaveBeenCalledWith(new Error('blocked by CSP'))
    expect(await bridge.request({ type: 'newGame', options: { seed: 'm' } })).toMatchObject({
      date: '2026-10-01',
    })
    bridge.dispose()
  })

  it('falls back when the worker errors before it is ready', async () => {
    const worker = new FakeWorker('error')
    const onFallback = vi.fn()
    const bridge = createSimBridge({ createWorker: () => worker, onFallback })
    expect(await bridge.ready).toBe('main')
    expect(worker.terminated).toBe(true)
    expect(onFallback.mock.calls[0]?.[0]).toEqual(new Error('Failed to fetch worker script'))
    bridge.dispose()
  })

  it('falls back when the worker never says ready', async () => {
    const worker = new FakeWorker('silent')
    const bridge = createSimBridge({
      createWorker: () => worker,
      readyTimeoutMs: 20,
      onFallback: () => {},
    })
    expect(await bridge.ready).toBe('main')
    expect(worker.terminated).toBe(true)
    bridge.dispose()
  })

  it('uses the main thread where Worker does not exist, or when told to', async () => {
    const onFallback = vi.fn()
    expect(typeof Worker).toBe('undefined') // Node
    const implicit = createSimBridge({ onFallback })
    const explicit = createSimBridge({ createWorker: null, onFallback })
    expect(await implicit.ready).toBe('main')
    expect(await explicit.ready).toBe('main')
    expect(onFallback).not.toHaveBeenCalled()
    implicit.dispose()
    explicit.dispose()
  })

  it('delivers runner messages on the main thread as copies', async () => {
    const bridge = createSimBridge({ createWorker: null })
    const seen: FromRunner[] = []
    bridge.subscribe((msg) => seen.push(msg))
    await bridge.request({ type: 'newGame', options: { seed: 'c' } })
    bridge.send({ type: 'speed', speed: 5 })
    await vi.waitFor(() => expect(seen.filter((m) => m.type === 'tick').length).toBeGreaterThan(2))
    bridge.send({ type: 'speed', speed: 0 })
    await vi.waitFor(() => expect(seen.at(-1)).toMatchObject({ type: 'status', speed: 0 }))
    const clock = await bridge.request({ type: 'query', what: 'clock', args: undefined })
    clock.day = -1 // mutating the copy must not touch the running world
    const again = await bridge.request({ type: 'query', what: 'clock', args: undefined })
    expect(again.day).toBeGreaterThan(0)
    bridge.dispose()
  })

  it('rejects with the runner error, and transfers load bytes', async () => {
    const bridge = createSimBridge({ createWorker: null })
    await expect(bridge.request({ type: 'save', savedAt: 'now' })).rejects.toThrow(
      'No game is running',
    )
    const bytes = new Uint8Array([1, 2, 3])
    await expect(bridge.request({ type: 'load', bytes })).rejects.toThrow('Not a valid save file')
    expect(bytes.byteLength).toBe(0) // detached: ownership moved to the runner
    bridge.dispose()
  })

  it('rejects pending requests on dispose', async () => {
    const bridge = createSimBridge({
      createWorker: () => new FakeWorker('silent'),
      onFallback() {},
    })
    const pending = bridge.request({ type: 'newGame', options: { seed: 'd' } })
    bridge.dispose()
    await expect(pending).rejects.toThrow('Simulation has shut down')
  })
})
