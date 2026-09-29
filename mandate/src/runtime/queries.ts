/**
 * Detail queries the UI can ask the runner (DESIGN §3). Add an entry here rather than a new
 * message type. Results are structured-cloned to the UI, so keep them small where possible.
 */
import type { ClockState, World } from '../sim/world.ts'

/** Tables of `World` that hold entities keyed by ID. */
export type TableName =
  | 'characters'
  | 'parties'
  | 'constituencies'
  | 'countries'
  | 'outlets'
  | 'activities'
  | 'events'
  | 'ledgers'
  | 'polls'
  | 'elections'
  | 'news'

export const queries = {
  clock: (world: World): ClockState => world.clock,
  /** One entity by table and ID; `null` if absent. */
  entity: (world: World, args: { table: TableName; id: string }): unknown =>
    (world[args.table] as Record<string, unknown>)[args.id] ?? null,
  /** The whole world (debugging; prefer narrower queries in UI code). */
  world: (world: World): World => world,
} satisfies Record<string, (world: World, args: never) => unknown>

export type QueryName = keyof typeof queries
type QueryFn<K extends QueryName> = (typeof queries)[K]
export type QueryArgs<K extends QueryName> =
  Parameters<QueryFn<K>> extends [World, infer A] ? A : undefined
export type QueryResult<K extends QueryName> = ReturnType<QueryFn<K>>

export function runQuery(world: World, what: string, args: unknown): unknown {
  if (!Object.hasOwn(queries, what)) throw new Error(`Unknown query: ${what}`)
  const fn = queries[what as QueryName] as (world: World, args: unknown) => unknown
  return fn(world, args)
}
