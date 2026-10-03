/**
 * Skill checks and skill growth (DESIGN §4). A check's chance is built from named modifiers so the
 * UI can show the whole breakdown in a CK3-style tooltip.
 */
import type { Rng } from '../rng.ts'
import {
  ATTRIBUTE_LABELS,
  clamp,
  SKILL_ATTRIBUTE,
  SKILL_LABELS,
  SKILL_MAX,
  type Character,
  type SkillKey,
} from './model.ts'
import { traitDefs } from './traits.ts'

export interface Modifier {
  /** Player-facing source, e.g. "Charisma 14" or "Charming". */
  label: string
  /** Percentage points. */
  value: number
}

export interface CheckOdds {
  /** Final chance of success, 5–95%. */
  chance: number
  modifiers: Modifier[]
}

/** Every check can fail and every check can succeed. */
export const CHECK_FLOOR = 5
export const CHECK_CEILING = 95

/** Stress above this starts to cost checks (DESIGN §4). */
export const STRESS_PENALTY_FROM = 60

/**
 * Chance of passing a check of `skill` at `difficulty` (0 easy … 100 very hard). A 10 in the
 * skill's attribute, 50 skill and no stress gives 50% against difficulty 50.
 */
export function checkOdds(c: Character, skill: SkillKey, difficulty: number): CheckOdds {
  const attribute = SKILL_ATTRIBUTE[skill]
  const modifiers: Modifier[] = [
    { label: 'Base', value: 50 },
    { label: 'Difficulty', value: Math.round(50 - difficulty) },
    {
      label: `${SKILL_LABELS[skill]} ${Math.round(c.skills[skill])}`,
      value: Math.round((c.skills[skill] - 50) * 0.4),
    },
    {
      label: `${ATTRIBUTE_LABELS[attribute]} ${c.attributes[attribute]}`,
      value: Math.round((c.attributes[attribute] - 10) * 2),
    },
  ]
  for (const t of traitDefs(c.traits)) {
    const v = t.effects.checks?.[skill]
    if (v) modifiers.push({ label: t.name, value: v })
  }
  if (c.condition.stress > STRESS_PENALTY_FROM) {
    modifiers.push({
      label: 'Stress',
      value: -Math.round((c.condition.stress - STRESS_PENALTY_FROM) / 2),
    })
  }
  if (c.condition.health < 50) {
    modifiers.push({ label: 'Poor health', value: -Math.round((50 - c.condition.health) / 5) })
  }
  const raw = modifiers.reduce((sum, m) => sum + m.value, 0)
  return { chance: clamp(raw, CHECK_FLOOR, CHECK_CEILING), modifiers }
}

export interface CheckResult extends CheckOdds {
  success: boolean
  /** How far the roll cleared (positive) or missed (negative) the chance, in points. */
  margin: number
}

export function rollCheck(
  rng: Rng,
  c: Character,
  skill: SkillKey,
  difficulty: number,
): CheckResult {
  const odds = checkOdds(c, skill, difficulty)
  const roll = rng.next() * 100
  return { ...odds, success: roll < odds.chance, margin: Math.round(odds.chance - roll) }
}

/**
 * Practising a skill raises it with diminishing returns; intellect speeds learning. `effort` is
 * roughly the points a novice gains.
 */
export function practise(c: Character, skill: SkillKey, effort: number): number {
  const current = c.skills[skill]
  const learning = 0.75 + c.attributes.intellect / 40
  const gain = effort * learning * (1 - current / (SKILL_MAX * 1.1))
  const next = clamp(Math.round((current + Math.max(0, gain)) * 10) / 10, 0, SKILL_MAX)
  c.skills[skill] = next
  return next - current
}
