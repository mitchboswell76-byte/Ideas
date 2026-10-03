/**
 * Detail queries the UI can ask the runner (DESIGN §3). Add an entry here rather than a new
 * message type. Results are structured-cloned to the UI, so keep them small where possible.
 */
import type { Appearance } from '../sim/character/appearance.ts'
import { checkOdds, type CheckOdds } from '../sim/character/checks.ts'
import { energyMax } from '../sim/character/condition.ts'
import {
  fullName,
  isAlive,
  SKILLS,
  type Character,
  type Gender,
  type Kin,
  type RelationTag,
  type SkillKey,
} from '../sim/character/model.ts'
import { ageOn } from '../sim/clock.ts'
import type { CharacterId, ClockState, World } from '../sim/world.ts'

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

/** Someone a character knows, with enough to draw a portrait and a row. */
export interface RelationView {
  id: CharacterId
  name: string
  gender: Gender
  age: number
  alive: boolean
  occupation: string
  appearance: Appearance
  /** How the viewed character feels about them. */
  opinion: number
  /** How they feel about the viewed character. */
  theirOpinion: number | null
  tags: RelationTag[]
  kin?: Kin
}

/** One character with derived numbers for the profile screen. */
export interface CharacterView {
  character: Character
  age: number
  isPlayer: boolean
  energyMax: number
  /** Odds of an ordinary (difficulty 50) check per skill, with breakdowns for tooltips. */
  odds: Record<SkillKey, CheckOdds>
  relations: RelationView[]
}

function viewCharacter(world: World, id: string): CharacterView | null {
  const c = world.characters[id as CharacterId]
  if (!c) return null
  const today = world.clock.day
  const odds = {} as Record<SkillKey, CheckOdds>
  for (const s of SKILLS) odds[s] = checkOdds(c, s, 50)
  const relations: RelationView[] = []
  for (const [otherId, rel] of Object.entries(c.relationships)) {
    const other: Character | undefined = world.characters[otherId as CharacterId]
    if (!other || !rel) continue
    relations.push({
      id: other.id,
      name: fullName(other),
      gender: other.gender,
      age: ageOn(other.birthDay, other.deathDay ?? today),
      alive: isAlive(other),
      occupation: other.occupation,
      appearance: other.appearance,
      opinion: rel.opinion,
      theirOpinion: other.relationships[c.id]?.opinion ?? null,
      tags: rel.tags,
      kin: rel.kin,
    })
  }
  return {
    character: c,
    age: ageOn(c.birthDay, c.deathDay ?? today),
    isPlayer: world.player === c.id,
    energyMax: energyMax(c),
    odds,
    relations,
  }
}

export const queries = {
  clock: (world: World): ClockState => world.clock,
  /** One entity by table and ID; `null` if absent. */
  entity: (world: World, args: { table: TableName; id: string }): unknown =>
    (world[args.table] as Record<string, unknown>)[args.id] ?? null,
  /** A character with derived numbers and their relations; `null` if absent. */
  character: (world: World, args: { id: string }): CharacterView | null =>
    viewCharacter(world, args.id),
  /** The player's character view; `null` before one exists. */
  player: (world: World): CharacterView | null =>
    world.player ? viewCharacter(world, world.player) : null,
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
