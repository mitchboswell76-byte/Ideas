/**
 * Messages between the UI and the simulation runner (DESIGN §3). The runner lives in a Web Worker,
 * or on the main thread when a Worker can't be created; either way only these plain,
 * structured-cloneable messages cross the boundary.
 */
import type { Command } from '../sim/command.ts'
import type { TickSummary } from '../sim/engine.ts'
import type { PauseReason } from '../sim/scheduler.ts'
import type { CreateWorldOptions } from '../sim/world.ts'
import type { QueryArgs, QueryName, QueryResult } from './queries.ts'

/** 0 = paused. */
export type Speed = 0 | 1 | 2 | 3 | 4 | 5
export type RunSpeed = Exclude<Speed, 0>

/**
 * Real milliseconds per in-game day at each speed (DESIGN §2). Speed 5 is one tick per frame; it
 * only runs slower if ticks outgrow the frame.
 */
export const TICK_MS: Readonly<Record<RunSpeed, number>> = { 1: 1000, 2: 500, 3: 200, 4: 80, 5: 16 }

export const PAUSE_REASONS: readonly PauseReason[] = [
  'election',
  'choice',
  'investigation',
  'activityDone',
]

/** Which notification `pause` reasons actually stop the clock (the player's setting). */
export type AutoPauseSettings = Record<PauseReason, boolean>

export const DEFAULT_AUTO_PAUSE: Readonly<AutoPauseSettings> = {
  election: true,
  choice: true,
  investigation: true,
  activityDone: true,
}

/** Longest `step` accepted, in days (100 years). */
export const MAX_STEP_DAYS = 36_525

/** Request payloads; each gets exactly one `result` with the same id. */
export type Request =
  | { type: 'newGame'; options: CreateWorldOptions }
  | { type: 'save'; savedAt: string }
  | { type: 'load'; bytes: Uint8Array<ArrayBuffer> }
  | { [K in QueryName]: { type: 'query'; what: K; args: QueryArgs<K> } }[QueryName]

export interface GameDate {
  day: number
  date: string
}

export interface SaveData extends GameDate {
  /** gzip save bytes (`encodeSave`). */
  bytes: Uint8Array<ArrayBuffer>
}

/** What a successful request resolves to. */
export type Response<R extends Request> = R extends { type: 'save' }
  ? SaveData
  : R extends { type: 'newGame' | 'load' }
    ? GameDate
    : R extends { type: 'query'; what: infer K extends QueryName }
      ? QueryResult<K>
      : never

/** UI → runner. */
export type ToRunner =
  | { type: 'cmd'; cmd: Command }
  | { type: 'speed'; speed: Speed }
  | { type: 'togglePause' }
  /** Advance a number of days while paused. */
  | { type: 'step'; days: number }
  | { type: 'autoPause'; settings: AutoPauseSettings }
  | { type: 'request'; id: number; req: Request }

export interface RunnerStatus {
  speed: Speed
  /** Speed that `togglePause` resumes at. */
  resumeSpeed: RunSpeed
  /** Set when an auto-pause stopped the clock; cleared when it runs again. */
  pausedBy: PauseReason | null
}

/** Runner → UI. */
export type FromRunner =
  | { type: 'ready' }
  | { type: 'tick'; summary: TickSummary }
  | ({ type: 'status' } & RunnerStatus)
  | { type: 'result'; id: number; ok: true; data: unknown }
  | { type: 'result'; id: number; ok: false; error: string }
  /** The simulation threw; the clock is paused. */
  | { type: 'fatal'; message: string }

export function isSpeed(value: unknown): value is Speed {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 5
}
