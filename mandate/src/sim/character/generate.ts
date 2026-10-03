/**
 * Random characters for NPCs (the player comes from a `CharacterSpec`, create.ts). Deterministic: all
 * randomness comes from the `rng` passed in. Names and looks come from data/characters/people.json.
 */
import people from '../../data/characters/people.json'
import { ageOn } from '../clock.ts'
import type { Rng } from '../rng.ts'
import { newId, type Nation, type World } from '../world.ts'
import { randomAppearance, type LookWeights } from './appearance.ts'
import { energyMax, healthCap } from './condition.ts'
import {
  ATTRIBUTES,
  clamp,
  ISSUE_LOADINGS,
  ISSUES,
  SKILL_ATTRIBUTE,
  SKILLS,
  type AttributeKey,
  type Character,
  type ClassOrigin,
  type Education,
  type Gender,
  type Ideology,
  type IssueKey,
  type Relationship,
  type Religion,
  type SkillKey,
} from './model.ts'
import { pickTraits, traitDefs } from './traits.ts'

export interface Heritage extends LookWeights {
  id: string
  /** Player-facing name (the creator's "Family roots"). */
  label: string
  weight: number
  female: readonly string[]
  male: readonly string[]
  family: readonly string[]
  religion: Partial<Record<Religion, number>>
}

export const HERITAGES: readonly Heritage[] = people.heritages as Heritage[]
export const NEUTRAL_NAMES: readonly string[] = people.neutralNames
/** Jobs by stage of life (`young`, `retired`) and by class. */
export const OCCUPATIONS: Readonly<Record<string, readonly string[]>> = people.occupations
export const CLASS_WEIGHTS = people.classes as Record<ClassOrigin, number>
export const NATION_WEIGHTS = people.nations as Record<Nation, number>

const DAYS_PER_YEAR = 365.2425

/** Pick a key of a weight table. */
export function pickKey<K extends string>(rng: Rng, weights: Partial<Record<K, number>>): K {
  return rng.weighted(Object.entries(weights) as [K, number][], ([, w]) => w)[0]
}

export function heritageById(id: string): Heritage {
  return HERITAGES.find((h) => h.id === id) ?? HERITAGES[0]
}

const EDUCATION_BY_CLASS: Readonly<Record<ClassOrigin, Partial<Record<Education, number>>>> = {
  working: { gcse: 35, alevel: 30, degree: 30, postgrad: 5 },
  middle: { gcse: 10, alevel: 25, degree: 50, postgrad: 15 },
  upper: { gcse: 2, alevel: 10, degree: 55, postgrad: 33 },
}

export function randomEducation(rng: Rng, age: number, cls: ClassOrigin): Education {
  if (age < 16) return 'none'
  if (age < 18) return 'gcse'
  if (age < 21) return 'alevel'
  return pickKey(rng, EDUCATION_BY_CLASS[cls])
}

export function randomOccupation(rng: Rng, age: number, cls: ClassOrigin): string {
  if (age < 16) return 'School pupil'
  if (age >= 67) return rng.pick(OCCUPATIONS.retired)
  if (age < 25) return rng.pick(OCCUPATIONS.young)
  return rng.pick(OCCUPATIONS[rng.chance(0.8) ? cls : pickKey(rng, CLASS_WEIGHTS)])
}

const CLASS_LEAN: Readonly<Record<ClassOrigin, number>> = { working: -15, middle: 0, upper: 20 }

const axis = (n: number) => clamp(Math.round(n), -100, 100)

export function randomIdeology(
  rng: Rng,
  cls: ClassOrigin,
  age: number,
  parents: readonly Character[] = [],
): Ideology {
  const inherit = parents.length > 0 && rng.chance(0.5)
  const mean = (pick: (i: Ideology) => number) =>
    parents.reduce((s, p) => s + pick(p.ideology), 0) / Math.max(1, parents.length)
  const econ = inherit
    ? mean((i) => i.econ) + rng.normal(0, 20)
    : CLASS_LEAN[cls] + rng.normal(0, 35)
  const social = inherit
    ? mean((i) => i.social) + rng.normal(0, 20)
    : (age - 45) * 0.8 + rng.normal(0, 35)
  return ideologyAt(rng, econ, social)
}

/** Beliefs at a point on the compass, each issue scattered around what the two axes suggest. */
export function ideologyAt(rng: Rng, econ: number, social: number): Ideology {
  const e = axis(econ)
  const s = axis(social)
  const issues = {} as Record<IssueKey, number>
  for (const issue of ISSUES) {
    const l = ISSUE_LOADINGS[issue]
    issues[issue] = axis(l.econ * e + l.social * s + rng.normal(0, 28))
  }
  return { econ: e, social: s, issues }
}

/** Skills from talent (the carrying attribute) and experience (age). */
export function rollSkills(
  rng: Rng,
  attributes: Readonly<Record<AttributeKey, number>>,
  age: number,
): Record<SkillKey, number> {
  const experience = clamp((age - 14) / 30, 0, 1)
  const skills = {} as Record<SkillKey, number>
  for (const s of SKILLS) {
    const talent = (attributes[SKILL_ATTRIBUTE[s]] - 10) * 1.5
    const served = s === 'military' ? (rng.chance(0.05) ? 30 : -15) : 0
    skills[s] = clamp(Math.round(rng.normal(6 + 26 * experience, 8) + talent + served), 0, 70)
  }
  return skills
}

/** Attributes plus the creation bonuses of the traits held (0–20). */
export function withTraitBonuses(
  base: Readonly<Record<AttributeKey, number>>,
  traits: readonly string[],
): Record<AttributeKey, number> {
  const defs = traitDefs(traits)
  const out = {} as Record<AttributeKey, number>
  for (const a of ATTRIBUTES) {
    const bonus = defs.reduce((s, t) => s + (t.effects.attributes?.[a] ?? 0), 0)
    out[a] = clamp(Math.round(base[a] + bonus), 0, 20)
  }
  return out
}

export interface GenerateOptions {
  /** Age now, or a range; ignored when `birthDay` is set. Default 18–70. */
  age?: number | readonly [number, number]
  birthDay?: number
  gender?: Gender
  heritage?: string
  familyName?: string
  classOrigin?: ClassOrigin
  nation?: Nation
  /** Children take after them: heritage, class, nation, looks, often beliefs. */
  parents?: readonly Character[]
  occupation?: string
  traitCount?: number
}

/** Create a random character and add it to `world.characters`. */
export function generateCharacter(world: World, rng: Rng, opts: GenerateOptions = {}): Character {
  const today = world.clock.day
  const parents = opts.parents ?? []
  const [p1] = parents
  const range = opts.age ?? [18, 70]
  const targetAge = typeof range === 'number' ? range : rng.int(range[0], range[1])
  const birthDay = opts.birthDay ?? today - Math.floor(targetAge * DAYS_PER_YEAR) - rng.int(0, 364)
  const age = Math.max(0, ageOn(birthDay, today))

  const gender = opts.gender ?? pickKey(rng, { female: 497, male: 497, nonbinary: 6 })
  const heritage = heritageById(
    opts.heritage ?? p1?.background.heritage ?? pickKey(rng, weightsOf(HERITAGES)),
  )
  const givenPool =
    gender === 'female'
      ? heritage.female
      : gender === 'male'
        ? heritage.male
        : rng.chance(0.5)
          ? NEUTRAL_NAMES
          : rng.pick([heritage.female, heritage.male])
  const cls = opts.classOrigin ?? p1?.background.classOrigin ?? pickKey(rng, CLASS_WEIGHTS)
  const nation = opts.nation ?? p1?.background.birthplace.nation ?? pickKey(rng, NATION_WEIGHTS)
  const religion = p1 && rng.chance(0.75) ? p1.background.religion : pickKey(rng, heritage.religion)

  const traits = pickTraits(rng, opts.traitCount ?? rng.int(2, 4))
  const base = {} as Record<AttributeKey, number>
  for (const a of ATTRIBUTES) base[a] = clamp(rng.normal(10, 3), 1, 18)
  const attributes = withTraitBonuses(base, traits)
  const skills = rollSkills(rng, attributes, age)

  const character: Character = {
    id: newId(world, 'chr'),
    givenName: rng.pick(givenPool),
    familyName: opts.familyName ?? p1?.familyName ?? rng.pick(heritage.family),
    gender,
    birthDay,
    occupation: opts.occupation ?? randomOccupation(rng, age, cls),
    attributes,
    skills,
    traits,
    ideology: randomIdeology(rng, cls, age, parents),
    condition: {
      health: clamp(Math.round(Math.min(rng.normal(86, 7), healthCap(age))), 30, 100),
      stress: rng.int(5, 30),
      energy: 0,
    },
    standing: {
      fame: { local: 0, regional: 0, national: 0 },
      reputation: {},
      credibility: 50,
      heat: 0,
    },
    relationships: {},
    background: {
      birthplace: { country: 'cty_GBR', nation },
      citizenship: ['cty_GBR'],
      classOrigin: cls,
      religion,
      education: randomEducation(rng, age, cls),
      heritage: heritage.id,
    },
    appearance: randomAppearance(rng, {
      gender,
      look: heritage,
      age,
      parents: parents.map((p) => p.appearance),
    }),
  }
  character.condition.energy = energyMax(character)
  world.characters[character.id] = character
  return character
}

function weightsOf(items: readonly { id: string; weight: number }[]): Record<string, number> {
  return Object.fromEntries(items.map((i) => [i.id, i.weight]))
}

/** Set how `from` sees `to` (one direction; call twice for a mutual relationship). */
export function relate(from: Character, to: Character, rel: Relationship): void {
  from.relationships[to.id] = rel
}
