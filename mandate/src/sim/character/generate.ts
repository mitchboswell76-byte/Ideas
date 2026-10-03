/**
 * Random characters for NPCs and, until character creation (T10), the player. Deterministic: all
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
  weight: number
  female: readonly string[]
  male: readonly string[]
  family: readonly string[]
  religion: Partial<Record<Religion, number>>
}

export const HERITAGES: readonly Heritage[] = people.heritages as Heritage[]
const NEUTRAL_NAMES: readonly string[] = people.neutralNames
const OCCUPATIONS: Readonly<Record<string, readonly string[]>> = people.occupations

const DAYS_PER_YEAR = 365.2425

/** Pick a key of a weight table. */
function pickKey<K extends string>(rng: Rng, weights: Partial<Record<K, number>>): K {
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

function education(rng: Rng, age: number, cls: ClassOrigin): Education {
  if (age < 16) return 'none'
  if (age < 18) return 'gcse'
  if (age < 21) return 'alevel'
  return pickKey(rng, EDUCATION_BY_CLASS[cls])
}

function occupation(rng: Rng, age: number, cls: ClassOrigin): string {
  if (age < 16) return 'School pupil'
  if (age >= 67) return rng.pick(OCCUPATIONS.retired)
  if (age < 25) return rng.pick(OCCUPATIONS.young)
  return rng.pick(
    OCCUPATIONS[
      rng.chance(0.8) ? cls : pickKey(rng, people.classes as Record<ClassOrigin, number>)
    ],
  )
}

/** How strongly each issue follows the economic and social axes. */
const ISSUE_LOADINGS: Readonly<Record<IssueKey, { econ: number; social: number }>> = {
  immigration: { econ: 0.1, social: 0.8 },
  eu: { econ: 0.2, social: 0.6 },
  climate: { econ: 0.5, social: 0.3 },
  publicServices: { econ: 0.8, social: 0 },
  tax: { econ: 0.9, social: 0 },
  defence: { econ: 0.3, social: 0.5 },
  union: { econ: 0.2, social: 0.4 },
  crime: { econ: 0.1, social: 0.8 },
  housing: { econ: 0.7, social: 0.1 },
  culture: { econ: 0, social: 0.9 },
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
  const econ = axis(
    inherit ? mean((i) => i.econ) + rng.normal(0, 20) : CLASS_LEAN[cls] + rng.normal(0, 35),
  )
  const social = axis(
    inherit ? mean((i) => i.social) + rng.normal(0, 20) : (age - 45) * 0.8 + rng.normal(0, 35),
  )
  const issues = {} as Record<IssueKey, number>
  for (const issue of ISSUES) {
    const l = ISSUE_LOADINGS[issue]
    issues[issue] = axis(l.econ * econ + l.social * social + rng.normal(0, 28))
  }
  return { econ, social, issues }
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
  const cls =
    opts.classOrigin ??
    p1?.background.classOrigin ??
    pickKey(rng, people.classes as Record<ClassOrigin, number>)
  const nation =
    opts.nation ??
    p1?.background.birthplace.nation ??
    pickKey(rng, people.nations as Record<Nation, number>)
  const religion = p1 && rng.chance(0.75) ? p1.background.religion : pickKey(rng, heritage.religion)

  const traits = pickTraits(rng, opts.traitCount ?? rng.int(2, 4))
  const defs = traitDefs(traits)
  const attributes = {} as Record<AttributeKey, number>
  for (const a of ATTRIBUTES) {
    const bonus = defs.reduce((s, t) => s + (t.effects.attributes?.[a] ?? 0), 0)
    attributes[a] = clamp(Math.round(clamp(rng.normal(10, 3), 1, 18) + bonus), 0, 20)
  }
  const experience = clamp((age - 14) / 30, 0, 1)
  const skills = {} as Record<SkillKey, number>
  for (const s of SKILLS) {
    const talent = (attributes[SKILL_ATTRIBUTE[s]] - 10) * 1.5
    const served = s === 'military' ? (rng.chance(0.05) ? 30 : -15) : 0
    skills[s] = clamp(Math.round(rng.normal(6 + 26 * experience, 8) + talent + served), 0, 70)
  }

  const character: Character = {
    id: newId(world, 'chr'),
    givenName: rng.pick(givenPool),
    familyName: opts.familyName ?? p1?.familyName ?? rng.pick(heritage.family),
    gender,
    birthDay,
    occupation: opts.occupation ?? occupation(rng, age, cls),
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
      education: education(rng, age, cls),
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
