/**
 * Health, stress and energy (DESIGN §4): the daily energy budget, how traits change stress, and
 * the monthly drift of health with age and strain.
 */
import type { Rng } from '../rng.ts'
import { clamp, type Character } from './model.ts'
import { traitDefs } from './traits.ts'

/** Daily energy for an average character (DESIGN §4: "about 10 points"). */
export const BASE_ENERGY = 10

/** Stress at or above this at the start of a month warns the player of burnout. */
export const BURNOUT_STRESS = 85

/** Monthly stress shed with no help from traits. */
export const BASE_RECOVERY = 8

export function energyMax(c: Character): number {
  let energy = BASE_ENERGY + Math.round((c.attributes.stamina - 10) / 4)
  for (const t of traitDefs(c.traits)) energy += t.effects.energy ?? 0
  return clamp(energy, 4, 16)
}

/** Product of the traits' stress multipliers (1 = ordinary). */
export function stressFactor(c: Character): number {
  return traitDefs(c.traits).reduce((f, t) => f * (t.effects.stress ?? 1), 1)
}

/** Add stress (scaled by traits when positive). Returns the change actually applied. */
export function addStress(c: Character, amount: number): number {
  const before = c.condition.stress
  const scaled = amount > 0 ? amount * stressFactor(c) : amount
  c.condition.stress = clamp(Math.round(before + scaled), 0, 100)
  return c.condition.stress - before
}

export function monthlyRecovery(c: Character): number {
  return Math.max(
    1,
    traitDefs(c.traits).reduce((r, t) => r + (t.effects.recovery ?? 0), BASE_RECOVERY),
  )
}

/** Health ceiling: falls slowly after 50. */
export function healthCap(age: number): number {
  return clamp(100 - Math.max(0, age - 50) * 0.6, 40, 100)
}

/**
 * A month passes: stress eases, health mends towards the age cap when young, and wears down
 * with age and heavy stress. Mutates `c`.
 */
export function monthlyCondition(c: Character, age: number, rng: Rng): void {
  const cond = c.condition
  const strained = cond.stress >= BURNOUT_STRESS
  cond.stress = clamp(cond.stress - monthlyRecovery(c), 0, 100)
  let health = cond.health
  if (strained) health -= 2
  if (age >= 45 && rng.chance(Math.min(0.5, (age - 45) / 120))) health -= rng.int(1, 3)
  else if (health < healthCap(age)) health += 1
  cond.health = clamp(Math.min(health, healthCap(age)), 1, 100)
}
