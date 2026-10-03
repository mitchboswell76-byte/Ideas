/**
 * Character creation (T10, DESIGN §4–5): the player's choices as one plain `CharacterSpec`, the
 * rules it must keep, a random spec (quick start and the creator's "Randomise everything") and the
 * player character built from it. Pure and deterministic, like the rest of the sim.
 */
import { ageOn } from '../clock.ts'
import type { Rng } from '../rng.ts'
import {
  NATIONS,
  newId,
  type ConstituencyId,
  type CountryId,
  type Nation,
  type World,
} from '../world.ts'
import { appearanceProblems, randomAppearance, type Appearance } from './appearance.ts'
import { PERSONAL_COLOURS } from './colours.ts'
import { energyMax, healthCap } from './condition.ts'
import {
  CLASS_WEIGHTS,
  heritageById,
  HERITAGES,
  NATION_WEIGHTS,
  NEUTRAL_NAMES,
  pickKey,
  randomEducation,
  randomIdeology,
  randomOccupation,
  rollSkills,
  withTraitBonuses,
} from './generate.ts'
import {
  ATTRIBUTES,
  CLASS_ORIGINS,
  clamp,
  EDUCATION,
  GENDERS,
  ISSUES,
  RELIGIONS,
  type AttributeKey,
  type Character,
  type ClassOrigin,
  type Education,
  type Gender,
  type Ideology,
  type Religion,
} from './model.ts'
import { canAddTrait, pickTraits, traitDef } from './traits.ts'

/** Age on the game start date. Life mode plays the years before it (T11); both start adults. */
export const START_AGE = { min: 18, max: 70 } as const

export const START_MODES = ['quick', 'life'] as const
export type StartMode = (typeof START_MODES)[number]

/** Politics at the family dinner table: where the parents stand. */
export const HOUSEHOLDS = ['left', 'centre', 'right', 'apolitical'] as const
export type Household = (typeof HOUSEHOLDS)[number]

/**
 * Attribute point-buy (the CK3 ruler designer's budget): each attribute starts at 10 and may be
 * set between `min` and `max`; the base values may add up to at most `points` (an average of 10).
 * Trait bonuses come on top.
 */
export const ATTRIBUTE_BUY = { min: 4, max: 16, start: 10, points: 60 } as const

export const TRAIT_COUNT = { min: 3, max: 5 } as const
export const NAME_MAX = 24
export const OCCUPATION_MAX = 40
export const MAX_SIBLINGS = 2

export const UK: CountryId = 'cty_GBR'

/** Youngest age for each education level an adult can start with. */
export const EDUCATION_MIN_AGE: Readonly<Partial<Record<Education, number>>> = {
  gcse: 16,
  alevel: 18,
  degree: 21,
  postgrad: 22,
}

export interface CharacterSpec {
  givenName: string
  familyName: string
  gender: Gender
  /** Age on the game start date. */
  age: number
  startMode: StartMode
  /** Country of birth; the nation (and perhaps the seat) when born in the UK. */
  birthplace: { country: CountryId; nation?: Nation; seat?: ConstituencyId }
  /** Where they live at the start: their political home. */
  home: { nation: Nation; seat?: ConstituencyId }
  /** Family roots (data/people.json): names, family resemblance, religion odds. */
  heritage: string
  classOrigin: ClassOrigin
  religion: Religion
  education: Education
  occupation: string
  household: Household
  siblings: number
  /** Base values before trait bonuses (`ATTRIBUTE_BUY`). */
  attributes: Record<AttributeKey, number>
  traits: string[]
  ideology: Ideology
  appearance: Appearance
  /** `PERSONAL_COLOURS` id. */
  colour: string
}

const DAYS_PER_YEAR = 365.2425

const COUNTRY_ID = /^cty_[A-Z0-9]{3}$/
const SEAT_ID = /^con_[A-Z]\d{8}$/

export function attributePointsSpent(attributes: Readonly<Record<AttributeKey, number>>): number {
  return ATTRIBUTES.reduce((s, a) => s + attributes[a], 0)
}

/** The education levels open to someone of `age` at the start. */
export function educationOptions(age: number): Education[] {
  return EDUCATION.filter((e) => e !== 'none' && age >= (EDUCATION_MIN_AGE[e] ?? 0))
}

/** The part of the creator a problem belongs to. */
export type SpecSection =
  'identity' | 'origins' | 'family' | 'look' | 'abilities' | 'beliefs' | 'start'

export interface SpecProblem {
  section: SpecSection
  /** Player-facing. */
  message: string
}

/**
 * Everything wrong with a spec, in player-facing words; empty when it can start a career. The
 * creator lists these; the runner refuses a spec that has any.
 */
export function specProblems(spec: CharacterSpec): SpecProblem[] {
  const out: SpecProblem[] = []
  const add = (section: SpecSection, message: string) => out.push({ section, message })
  for (const [label, name] of [
    ['First name', spec.givenName],
    ['Surname', spec.familyName],
  ] as const) {
    const n = typeof name === 'string' ? name.trim() : ''
    if (!n) add('identity', `${label} is empty`)
    else if (n.length > NAME_MAX) add('identity', `${label} is longer than ${NAME_MAX} letters`)
  }
  if (!GENDERS.includes(spec.gender)) add('identity', 'Choose a gender')
  if (!Number.isInteger(spec.age) || spec.age < START_AGE.min || spec.age > START_AGE.max)
    add('identity', `Age must be ${START_AGE.min}–${START_AGE.max}`)
  if (!START_MODES.includes(spec.startMode)) add('start', 'Choose how to start')

  const born = spec.birthplace
  if (!born || !COUNTRY_ID.test(born.country)) add('origins', 'Choose where you were born')
  else if (born.country === UK && !NATIONS.includes(born.nation as Nation))
    add('origins', 'Choose the part of the UK you were born in')
  if (born?.seat !== undefined && !SEAT_ID.test(born.seat)) add('origins', 'Unknown birthplace')
  if (!spec.home || !NATIONS.includes(spec.home.nation)) add('origins', 'Choose where you live')
  else if (spec.home.seat !== undefined && !SEAT_ID.test(spec.home.seat))
    add('origins', 'Unknown constituency')

  if (!HERITAGES.some((h) => h.id === spec.heritage)) add('family', 'Choose your family roots')
  if (!CLASS_ORIGINS.includes(spec.classOrigin)) add('family', 'Choose your upbringing')
  if (!RELIGIONS.includes(spec.religion)) add('family', 'Choose a religion')
  if (!educationOptions(spec.age).includes(spec.education))
    add(
      'family',
      EDUCATION.includes(spec.education)
        ? `Too young for that education (${EDUCATION_MIN_AGE[spec.education]}+)`
        : 'Choose your education',
    )
  const job = typeof spec.occupation === 'string' ? spec.occupation.trim() : ''
  if (!job || job.length > OCCUPATION_MAX) add('family', 'Choose an occupation')
  if (!HOUSEHOLDS.includes(spec.household)) add('family', 'Choose your family’s politics')
  if (!Number.isInteger(spec.siblings) || spec.siblings < 0 || spec.siblings > MAX_SIBLINGS)
    add('family', `Siblings must be 0–${MAX_SIBLINGS}`)

  const attrs = spec.attributes ?? {}
  if (
    ATTRIBUTES.some(
      (a) =>
        !Number.isInteger(attrs[a]) || attrs[a] < ATTRIBUTE_BUY.min || attrs[a] > ATTRIBUTE_BUY.max,
    )
  )
    add('abilities', `Attributes must be ${ATTRIBUTE_BUY.min}–${ATTRIBUTE_BUY.max}`)
  else {
    const over = attributePointsSpent(attrs) - ATTRIBUTE_BUY.points
    if (over > 0)
      add('abilities', `${over} attribute ${over === 1 ? 'point' : 'points'} over budget`)
  }

  const traits = Array.isArray(spec.traits) ? spec.traits : []
  if (traits.length < TRAIT_COUNT.min || traits.length > TRAIT_COUNT.max)
    add('abilities', `Choose ${TRAIT_COUNT.min}–${TRAIT_COUNT.max} traits`)
  traits.forEach((id, i) => {
    const def = traitDef(id)
    if (!def || def.creation === false) add('abilities', 'Unknown trait')
    else if (!canAddTrait(traits.slice(0, i), id))
      add('abilities', `${def.name} clashes with another trait`)
  })

  const ideo = spec.ideology
  const inRange = (n: unknown) => typeof n === 'number' && Math.abs(n) <= 100
  if (
    !ideo ||
    !inRange(ideo.econ) ||
    !inRange(ideo.social) ||
    !ISSUES.every((k) => inRange(ideo.issues?.[k]))
  )
    add('beliefs', 'Beliefs are out of range')
  if (!spec.appearance) add('look', 'Look is missing')
  else for (const m of appearanceProblems(spec.appearance)) add('look', m)
  if (!PERSONAL_COLOURS.some((c) => c.id === spec.colour))
    add('identity', 'Choose a personal colour')
  return out
}

/** Base attributes that use the whole budget: random transfers between attributes from 10s. */
export function randomAttributes(rng: Rng): Record<AttributeKey, number> {
  const out = Object.fromEntries(ATTRIBUTES.map((a) => [a, ATTRIBUTE_BUY.start])) as Record<
    AttributeKey,
    number
  >
  for (let i = 0; i < 24; i++) {
    const up = rng.pick(ATTRIBUTES)
    const down = rng.pick(ATTRIBUTES)
    if (up !== down && out[up] < ATTRIBUTE_BUY.max - 2 && out[down] > ATTRIBUTE_BUY.min + 2) {
      out[up]++
      out[down]--
    }
  }
  return out
}

/** A given name from the heritage's pools that suits the gender. */
export function randomGivenName(rng: Rng, heritage: string, gender: Gender): string {
  const h = heritageById(heritage)
  if (gender === 'female') return rng.pick(h.female)
  if (gender === 'male') return rng.pick(h.male)
  return rng.pick(rng.chance(0.5) ? NEUTRAL_NAMES : [...h.female, ...h.male])
}

export function randomFamilyName(rng: Rng, heritage: string): string {
  return rng.pick(heritageById(heritage).family)
}

/** Family politics, weighted towards households that talk politics at all. */
const HOUSEHOLD_WEIGHTS: Readonly<Record<Household, number>> = {
  left: 3,
  centre: 3,
  right: 3,
  apolitical: 2,
}

export interface RandomSpecOptions {
  /** Default 21–26. */
  age?: number | readonly [number, number]
  gender?: Gender
  heritage?: string
}

/** A complete, valid random spec (quick start; the creator's starting point and "Randomise"). */
export function randomSpec(rng: Rng, opts: RandomSpecOptions = {}): CharacterSpec {
  const range = opts.age ?? [21, 26]
  const age = typeof range === 'number' ? range : rng.int(range[0], range[1])
  const gender = opts.gender ?? pickKey(rng, { female: 497, male: 497, nonbinary: 6 })
  const heritage = heritageById(opts.heritage ?? rng.weighted(HERITAGES, (h) => h.weight).id)
  const classOrigin = pickKey(rng, CLASS_WEIGHTS)
  const nation = pickKey(rng, NATION_WEIGHTS)
  const education = randomEducation(rng, age, classOrigin)
  return {
    givenName: randomGivenName(rng, heritage.id, gender),
    familyName: randomFamilyName(rng, heritage.id),
    gender,
    age,
    startMode: 'quick',
    birthplace: { country: UK, nation },
    home: { nation },
    heritage: heritage.id,
    classOrigin,
    religion: pickKey(rng, heritage.religion),
    education: educationOptions(age).includes(education) ? education : 'gcse',
    occupation: randomOccupation(rng, age, classOrigin),
    household: pickKey(rng, HOUSEHOLD_WEIGHTS),
    siblings: rng.chance(0.6) ? (rng.chance(0.25) ? 2 : 1) : 0,
    attributes: randomAttributes(rng),
    traits: pickTraits(rng, rng.int(TRAIT_COUNT.min, TRAIT_COUNT.max - 1)),
    ideology: randomIdeology(rng, classOrigin, age),
    appearance: randomAppearance(rng, { gender, look: heritage, age }),
    colour: rng.pick(PERSONAL_COLOURS).id,
  }
}

/** Where a household's politics puts the parents on the compass (centre of their spread). */
export const HOUSEHOLD_LEAN: Readonly<Record<Household, { econ: number; social: number } | null>> =
  {
    left: { econ: -45, social: -10 },
    centre: { econ: 0, social: 5 },
    right: { econ: 45, social: 25 },
    apolitical: null,
  }

/** Build the player from a valid spec and add them to `world.characters`. */
export function createPlayer(world: World, rng: Rng, spec: CharacterSpec): Character {
  const today = world.clock.day
  const birthDay = today - Math.floor(spec.age * DAYS_PER_YEAR) - rng.int(0, 364)
  const age = ageOn(birthDay, today)
  const attributes = withTraitBonuses(spec.attributes, spec.traits)
  const born = spec.birthplace
  const citizenship: CountryId[] = born.country === UK ? [UK] : [UK, born.country]
  const player: Character = {
    id: newId(world, 'chr'),
    givenName: spec.givenName.trim(),
    familyName: spec.familyName.trim(),
    gender: spec.gender,
    birthDay,
    occupation: spec.occupation.trim(),
    attributes,
    skills: rollSkills(rng, attributes, age),
    traits: [...spec.traits],
    ideology: structuredClone(spec.ideology),
    condition: {
      health: clamp(Math.round(Math.min(rng.normal(88, 5), healthCap(age))), 50, 100),
      stress: rng.int(5, 25),
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
      birthplace: { ...born },
      home: { ...spec.home },
      citizenship,
      classOrigin: spec.classOrigin,
      religion: spec.religion,
      education: spec.education,
      heritage: spec.heritage,
    },
    appearance: structuredClone(spec.appearance),
    colour: spec.colour,
  }
  player.condition.energy = energyMax(player)
  world.characters[player.id] = player
  return player
}
