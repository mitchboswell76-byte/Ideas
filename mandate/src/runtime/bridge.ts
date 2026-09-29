/**
 * Main-thread side of the simulation: starts the runner in a Web Worker, or on the main thread
 * when a Worker can't be created or doesn't start (DESIGN §3). Both paths carry the same
 * structured-cloned messages, so callers can't tell the difference except through `ready`.
 */
import type { FromRunner, Request, Response, ToRunner } from './protocol.ts'

export type BridgeMode = 'worker' | 'main'

/** The parts of `Worker` the bridge uses (lets tests supply a fake). */
export interface WorkerLike {
  onmessage: ((event: MessageEvent) => void) | null
  onerror: ((event: ErrorEvent) => void) | null
  postMessage(message: unknown, transfer: Transferable[]): void
  terminate(): void
}

export interface BridgeOptions {
  /** Worker factory; `null` forces the main thread. Defaults to the bundled simulation worker. */
  createWorker?: (() => WorkerLike) | null
  /** Give up on the worker if it hasn't said `ready` by then (ms). */
  readyTimeoutMs?: number
  /** Called with the reason when falling back to the main thread. */
  onFallback?: (reason: unknown) => void
}

/** Runner messages other than requests (those go through `request`). */
export type RunnerControl = Exclude<ToRunner, { type: 'request' }>

export interface SimBridge {
  /** Resolves once the runner is up, with where it runs. */
  readonly ready: Promise<BridgeMode>
  send(msg: RunnerControl): void
  /** Resolves with the runner's result or rejects with its error. A `load` transfers its bytes. */
  request<R extends Request>(req: R): Promise<Response<R>>
  /** Runner messages (ticks, status, fatal errors). Returns an unsubscribe function. */
  subscribe(listener: (msg: FromRunner) => void): () => void
  dispose(): void
}

/** Main-thread step batches must stay short to keep the UI responsive. */
const MAIN_SLICE_BUDGET_MS = 8
const READY_TIMEOUT_MS = 5000

function defaultWorkerFactory(): (() => WorkerLike) | null {
  if (typeof Worker === 'undefined') return null
  return () => new Worker(new URL('./sim.worker.ts', import.meta.url), { type: 'module' })
}

function warnFallback(reason: unknown): void {
  console.warn('Simulation worker unavailable; running on the main thread.', reason)
}

export function createSimBridge(options: BridgeOptions = {}): SimBridge {
  const listeners = new Set<(msg: FromRunner) => void>()
  const pending = new Map<
    number,
    { resolve: (data: unknown) => void; reject: (e: Error) => void }
  >()
  const queue: [ToRunner, Transferable[]][] = []
  let deliver: ((msg: ToRunner, transfer: Transferable[]) => void) | null = null
  let closeTransport = (): void => {}
  let nextId = 1
  let disposed = false

  const receive = (msg: FromRunner): void => {
    if (msg.type === 'ready') return
    if (msg.type === 'result') {
      const waiter = pending.get(msg.id)
      pending.delete(msg.id)
      if (waiter && msg.ok) waiter.resolve(msg.data)
      else if (waiter && !msg.ok) waiter.reject(new Error(msg.error))
      return
    }
    for (const listener of listeners) listener(msg)
  }

  const post = (msg: ToRunner, transfer: Transferable[] = []): void => {
    if (disposed) return
    if (deliver) deliver(msg, transfer)
    else queue.push([msg, transfer])
  }

  const connect = (fn: (msg: ToRunner, transfer: Transferable[]) => void): void => {
    if (disposed) return closeTransport()
    deliver = fn
    for (const [msg, transfer] of queue.splice(0)) fn(msg, transfer)
  }

  const startWorker = (create: () => WorkerLike, timeoutMs: number): Promise<BridgeMode> =>
    new Promise((resolve, reject) => {
      const worker = create()
      const fail = (reason: unknown): void => {
        clearTimeout(timer)
        worker.onmessage = null
        worker.onerror = null
        worker.terminate()
        reject(reason)
      }
      const timer = setTimeout(() => fail(new Error('Simulation worker did not start')), timeoutMs)
      worker.onerror = (event) => {
        event.preventDefault()
        fail(new Error(event.message || 'Simulation worker failed to load'))
      }
      worker.onmessage = (event: MessageEvent<FromRunner>) => {
        if (event.data.type !== 'ready') return
        clearTimeout(timer)
        worker.onmessage = (e: MessageEvent<FromRunner>) => receive(e.data)
        worker.onerror = (e) => receive({ type: 'fatal', message: e.message || 'Worker error' })
        closeTransport = () => worker.terminate()
        connect((msg, transfer) => worker.postMessage(msg, transfer))
        resolve('worker')
      }
    })

  const startMain = async (): Promise<BridgeMode> => {
    const { SimRunner, timerHost } = await import('./runner.ts')
    const runner = new SimRunner(
      timerHost((msg, transfer) => {
        const copy = structuredClone(msg, { transfer })
        queueMicrotask(() => receive(copy))
      }, MAIN_SLICE_BUDGET_MS),
    )
    closeTransport = () => runner.dispose()
    connect((msg, transfer) => {
      const copy = structuredClone(msg, { transfer })
      queueMicrotask(() => runner.handle(copy))
    })
    return 'main'
  }

  const ready = (async (): Promise<BridgeMode> => {
    const create =
      options.createWorker === undefined ? defaultWorkerFactory() : options.createWorker
    if (create) {
      try {
        return await startWorker(create, options.readyTimeoutMs ?? READY_TIMEOUT_MS)
      } catch (reason) {
        const report = options.onFallback ?? warnFallback
        report(reason)
      }
    }
    return startMain()
  })()

  return {
    ready,
    send: (msg) => post(msg),
    request<R extends Request>(req: R): Promise<Response<R>> {
      if (disposed) return Promise.reject(new Error('Simulation has shut down'))
      const id = nextId++
      return new Promise<Response<R>>((resolve, reject) => {
        pending.set(id, { resolve: resolve as (data: unknown) => void, reject })
        post({ type: 'request', id, req }, req.type === 'load' ? [req.bytes.buffer] : [])
      })
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    dispose() {
      disposed = true
      closeTransport()
      listeners.clear()
      for (const waiter of pending.values()) waiter.reject(new Error('Simulation has shut down'))
      pending.clear()
    },
  }
}
