import type { EventBus, SimEventMap } from './bus.ts'
import { MONDAY, civil, weekday } from './clock.ts'
import type { CommandHandler } from './command.ts'
import type { Rng } from './rng.ts'
import type { World } from './world.ts'

/**
 * How often a system runs (DESIGN §2): weekly on Mondays, monthly on the 1st, yearly on 1 January.
 * Date-specific yearly things (birthdays, May elections) use a daily system with its own check.
 */
export type Cadence = 'daily' | 'weekly' | 'monthly' | 'yearly'

export function isDue(cadence: Cadence, day: number): boolean {
  switch (cadence) {
    case 'daily':
      return true
    case 'weekly':
      return weekday(day) === MONDAY
    case 'monthly':
      return civil(day).d === 1
    case 'yearly': {
      const { m, d } = civil(day)
      return m === 1 && d === 1
    }
  }
}

/** Auto-pause categories (DESIGN §2); the player's settings decide which actually pause. */
export type PauseReason = 'election' | 'choice' | 'investigation' | 'activityDone'

/** Something for the UI, delivered with the tick summary. */
export interface Notification {
  /** `info` → toast, `news` → ticker, `alert` → needs attention. */
  kind: 'info' | 'news' | 'alert'
  text: string
  /** Inbox sender, e.g. a character's name or "Party office" (default by kind). */
  from?: string
  /** Inbox subject line (default: the start of `text`). */
  subject?: string
  pause?: PauseReason
  /** ID of the entity it concerns, for click-through. */
  ref?: string
}

export interface SystemContext {
  readonly rng: Rng
  readonly bus: EventBus<SimEventMap>
  /** The day being simulated. */
  readonly day: number
  emit(notification: Notification): void
}

export type SystemListeners = {
  [K in keyof SimEventMap]?: (payload: SimEventMap[K], world: World, ctx: SystemContext) => void
}

/**
 * A unit of simulation. Scheduled systems set `cadence` + `run`; any system may also react to bus
 * events (`on`) and handle UI commands (`commands`). Due systems run in registration order.
 */
export interface System {
  readonly id: string
  readonly cadence?: Cadence
  run?(world: World, ctx: SystemContext): void
  readonly on?: SystemListeners
  readonly commands?: Readonly<Record<string, CommandHandler>>
}
