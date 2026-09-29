/** Web Worker entry: hosts the simulation runner off the main thread. */
import type { FromRunner, ToRunner } from './protocol.ts'
import { SimRunner, timerHost } from './runner.ts'

/** A worker can run long step batches without hurting the UI. */
const SLICE_BUDGET_MS = 50

const scope = self as unknown as DedicatedWorkerGlobalScope
const runner = new SimRunner(
  timerHost((msg, transfer) => scope.postMessage(msg, transfer), SLICE_BUDGET_MS),
)
scope.onmessage = (event: MessageEvent<ToRunner>) => runner.handle(event.data)
scope.postMessage({ type: 'ready' } satisfies FromRunner)
