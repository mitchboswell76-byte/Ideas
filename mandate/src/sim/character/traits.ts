/** Trait definitions (data/characters/traits.json) and the rules for holding them (DESIGN §4). */
import data from '../../data/characters/traits.json'
import type { Rng } from '../rng.ts'
import type { AttributeKey, SkillKey } from './model.ts'

export type TraitGroup = 'personality' | 'lifestyle' | 'reputation'

export interface TraitEffects {
  /** Added to attributes at creation. */
  attributes?: Partial<Record<AttributeKey, number>>
  /** Percentage points added to checks of a skill. */
  checks?: Partial<Record<SkillKey, number>>
  /** Added to the daily energy budget. */
  energy?: number
  /** Multiplies stress gained. */
  stress?: number
  /** Extra stress shed each month. */
  recovery?: number
}

export interface TraitDef {
  id: string
  name: string
  group: TraitGroup
  description: string
  opposite?: string
  effects: TraitEffects
  /** Weights events from T11. */
  eventTags?: string[]
  /** Chance weight at creation. */
  weight: number
  /** `false`: only gained through life. */
  creation?: boolean
}

export const TRAITS: readonly TraitDef[] = data.traits as TraitDef[]

const BY_ID = new Map(TRAITS.map((t) => [t.id, t]))

export function traitDef(id: string): TraitDef | undefined {
  return BY_ID.get(id)
}

/** The trait defs a character holds (unknown ids, e.g. from an old save, are skipped). */
export function traitDefs(ids: readonly string[]): TraitDef[] {
  return ids.flatMap((id) => BY_ID.get(id) ?? [])
}

/** A character can't hold a trait twice or alongside its opposite. */
export function canAddTrait(held: readonly string[], id: string): boolean {
  const def = BY_ID.get(id)
  if (!def || held.includes(id)) return false
  return !held.some((h) => BY_ID.get(h)?.opposite === id || def.opposite === h)
}

/** `count` creation traits, weighted, never two opposites. */
export function pickTraits(rng: Rng, count: number, held: readonly string[] = []): string[] {
  const out = [...held]
  for (let i = 0; i < count; i++) {
    const open = TRAITS.filter(
      (t) => t.creation !== false && t.weight > 0 && canAddTrait(out, t.id),
    )
    if (open.length === 0) break
    out.push(rng.weighted(open, (t) => t.weight).id)
  }
  return out.slice(held.length)
}
