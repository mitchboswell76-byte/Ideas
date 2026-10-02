import type { Command } from './command.ts'

/**
 * In-sim events systems can react to. Add a key here when a system needs to announce something
 * (e.g. `activityCompleted`); listeners are declared on the system (`System.on`).
 */
export interface SimEventMap {
  dayStarted: { day: number }
  /** Monday. */
  weekStarted: { day: number }
  /** 1st of the month. */
  monthStarted: { day: number }
  /** 1 January. */
  yearStarted: { day: number }
  commandApplied: { command: Command }
}

export type Listener<P> = (payload: P) => void

/**
 * Typed synchronous publish/subscribe. Listeners run immediately, in subscription order, so
 * dispatch is deterministic. The bus holds no game state: subscriptions are code and are
 * recreated when a save is loaded.
 */
export class EventBus<M extends object = SimEventMap> {
  private readonly listeners = new Map<keyof M, Listener<unknown>[]>()

  /** Subscribe; returns an unsubscribe function. */
  on<K extends keyof M>(type: K, listener: Listener<M[K]>): () => void {
    const fn = listener as Listener<unknown>
    const list = this.listeners.get(type)
    if (list) list.push(fn)
    else this.listeners.set(type, [fn])
    return () => {
      const current = this.listeners.get(type)
      const i = current ? current.indexOf(fn) : -1
      if (current && i >= 0) current.splice(i, 1)
    }
  }

  emit<K extends keyof M>(type: K, payload: M[K]): void {
    const list = this.listeners.get(type)
    if (!list) return
    // Copy so listeners may unsubscribe (or subscribe) while being dispatched.
    for (const fn of list.slice()) fn(payload)
  }
}
