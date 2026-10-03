/**
 * The World: one plain, JSON-serialisable object of normalised tables (DESIGN §3).
 * Entity shapes here are minimal placeholders until the systems that own them extend them
 * (parties/outlets T12, polls T13, elections T14, activities T15, news T17). Characters (T9) live
 * in `character/model.ts`.
 */
import type { Character } from './character/model.ts'
import { START_DATE, dayFromIso } from './clock.ts'
import { seedState, type RngState } from './rng.ts'
import { GAME_VERSION } from './version.ts'

export type CharacterId = `chr_${string}`
export type PartyId = `pty_${string}`
export type ConstituencyId = `con_${string}`
export type CountryId = `cty_${string}`
export type OutletId = `out_${string}`
export type ActivityId = `act_${string}`
export type EventInstanceId = `evt_${string}`
export type LedgerId = `led_${string}`
export type PollId = `pol_${string}`
export type ElectionId = `ele_${string}`
export type NewsId = `nws_${string}`

/** ID prefix → ID type, for `newId`. */
export interface IdTypes {
  chr: CharacterId
  pty: PartyId
  con: ConstituencyId
  cty: CountryId
  out: OutletId
  act: ActivityId
  evt: EventInstanceId
  led: LedgerId
  pol: PollId
  ele: ElectionId
  nws: NewsId
}

/** Keys are prefixed IDs (never integer-like), so insertion order — and iteration — is deterministic. */
export type Table<K extends string, V> = Record<K, V>

export type Nation = 'england' | 'scotland' | 'wales' | 'northern-ireland'

export type { Character }

export interface Party {
  id: PartyId
  name: string
  shortName: string
  colour: string
}

export interface Constituency {
  id: ConstituencyId
  name: string
  nation: Nation
}

export interface Country {
  id: CountryId
  name: string
}

export interface Outlet {
  id: OutletId
  name: string
}

export interface Activity {
  id: ActivityId
  defId: string
  ownerId: CharacterId
  startDay: number
  endDay: number
}

export interface EventInstance {
  id: EventInstanceId
  defId: string
  day: number
}

export interface Ledger {
  id: LedgerId
  ownerId: string
  /** £ */
  balance: number
}

export interface Poll {
  id: PollId
  day: number
  pollster: string
  /** Vote share (%) by party. */
  shares: Partial<Record<PartyId, number>>
}

export interface Election {
  id: ElectionId
  kind: string
  day: number
}

export interface NewsItem {
  id: NewsId
  day: number
  headline: string
}

export interface ClockState {
  /** Day number of the game start date. */
  startDay: number
  /** The most recently simulated day (day numbers: days since 1970-01-01). */
  day: number
}

export interface World {
  meta: { seed: string; createdWith: string }
  clock: ClockState
  rngState: RngState
  player: CharacterId | null
  /** Next-number counters for generated IDs, by prefix. */
  idCounters: Partial<Record<keyof IdTypes, number>>
  /** Story flags for events (`once`, chains). */
  flags: Record<string, string | number | boolean>
  characters: Table<CharacterId, Character>
  parties: Table<PartyId, Party>
  constituencies: Table<ConstituencyId, Constituency>
  countries: Table<CountryId, Country>
  outlets: Table<OutletId, Outlet>
  activities: Table<ActivityId, Activity>
  events: Table<EventInstanceId, EventInstance>
  ledgers: Table<LedgerId, Ledger>
  polls: Table<PollId, Poll>
  elections: Table<ElectionId, Election>
  news: Table<NewsId, NewsItem>
}

export interface CreateWorldOptions {
  seed: string | number
  /** `YYYY-MM-DD`; defaults to the data `asOf` date. */
  startDate?: string
}

export function createWorld({ seed, startDate = START_DATE }: CreateWorldOptions): World {
  const startDay = dayFromIso(startDate)
  return {
    meta: { seed: String(seed), createdWith: GAME_VERSION },
    clock: { startDay, day: startDay },
    rngState: seedState(seed),
    player: null,
    idCounters: {},
    flags: {},
    characters: {},
    parties: {},
    constituencies: {},
    countries: {},
    outlets: {},
    activities: {},
    events: {},
    ledgers: {},
    polls: {},
    elections: {},
    news: {},
  }
}

/** Deterministic generated ID, e.g. `chr_000001`. (Data-defined IDs like `pty_lab` don't use this.) */
export function newId<P extends keyof IdTypes>(world: World, prefix: P): IdTypes[P] {
  const n = (world.idCounters[prefix] ?? 0) + 1
  world.idCounters[prefix] = n
  return `${prefix}_${String(n).padStart(6, '0')}` as IdTypes[P]
}
