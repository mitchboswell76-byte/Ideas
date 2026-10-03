/**
 * The character model (DESIGN §4): who someone is, what they can do, what they believe, how they
 * are holding up and whom they know. Plain JSON data inside `world.characters`; the helpers that
 * read it live beside this file (checks, condition, generation).
 */
import type { CharacterId, ConstituencyId, CountryId, Nation } from '../world.ts'
import type { Appearance } from './appearance.ts'

export const ATTRIBUTES = [
  'charisma',
  'intellect',
  'cunning',
  'discipline',
  'empathy',
  'stamina',
] as const
export type AttributeKey = (typeof ATTRIBUTES)[number]

export const ATTRIBUTE_LABELS: Readonly<Record<AttributeKey, string>> = {
  charisma: 'Charisma',
  intellect: 'Intellect',
  cunning: 'Cunning',
  discipline: 'Discipline',
  empathy: 'Empathy',
  stamina: 'Stamina',
}

/** Attributes run 0–20 (FM scale); 10 is ordinary. */
export const ATTRIBUTE_RANGE = { min: 0, max: 20 } as const

export const SKILLS = [
  'oratory',
  'organising',
  'fundraising',
  'policy',
  'media',
  'networking',
  'intrigue',
  'leadership',
  'military',
  'business',
] as const
export type SkillKey = (typeof SKILLS)[number]

export const SKILL_LABELS: Readonly<Record<SkillKey, string>> = {
  oratory: 'Oratory',
  organising: 'Organising',
  fundraising: 'Fundraising',
  policy: 'Policy',
  media: 'Media',
  networking: 'Networking',
  intrigue: 'Intrigue',
  leadership: 'Leadership',
  military: 'Military',
  business: 'Business',
}

/** Skills run 0–100 and grow with use. */
export const SKILL_MAX = 100

/** The attribute that carries each skill in checks (DESIGN §4). */
export const SKILL_ATTRIBUTE: Readonly<Record<SkillKey, AttributeKey>> = {
  oratory: 'charisma',
  organising: 'discipline',
  fundraising: 'charisma',
  policy: 'intellect',
  media: 'charisma',
  networking: 'empathy',
  intrigue: 'cunning',
  leadership: 'discipline',
  military: 'stamina',
  business: 'cunning',
}

/**
 * Issue positions, −100 … +100. Negative is the left or liberal pole, positive the right or
 * authoritarian pole (the labels live with the UI).
 */
export const ISSUES = [
  'immigration',
  'eu',
  'climate',
  'publicServices',
  'tax',
  'defence',
  'union',
  'crime',
  'housing',
  'culture',
] as const
export type IssueKey = (typeof ISSUES)[number]

/** Issue name and its −100 / +100 poles. */
export const ISSUE_LABELS: Readonly<Record<IssueKey, { name: string; low: string; high: string }>> =
  {
    immigration: { name: 'Immigration', low: 'More open', high: 'More restrictive' },
    eu: { name: 'Europe', low: 'Closer to the EU', high: 'Further from the EU' },
    climate: { name: 'Climate', low: 'Faster net zero', high: 'Slower net zero' },
    publicServices: { name: 'NHS and public services', low: 'Expand', high: 'Reform and trim' },
    tax: { name: 'Tax', low: 'Tax and spend', high: 'Cut taxes' },
    defence: { name: 'Defence', low: 'Spend less', high: 'Spend more' },
    union: { name: 'Devolution and the Union', low: 'More devolution', high: 'Stronger Union' },
    crime: { name: 'Crime', low: 'Rehabilitate', high: 'Tougher sentences' },
    housing: { name: 'Housing', low: 'Public housebuilding', high: 'Market-led' },
    culture: { name: 'Culture and identity', low: 'Progressive', high: 'Traditional' },
  }

/** How strongly each issue follows the economic and social axes. */
export const ISSUE_LOADINGS: Readonly<Record<IssueKey, { econ: number; social: number }>> = {
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

export interface Ideology {
  /** −100 left … +100 right. */
  econ: number
  /** −100 liberal … +100 authoritarian. */
  social: number
  issues: Record<IssueKey, number>
}

export interface Condition {
  /** 0–100. */
  health: number
  /** 0–100; high stress lowers checks and risks burnout. */
  stress: number
  /** Today's remaining energy; refilled each morning to `energyMax(character)`. */
  energy: number
}

export interface Standing {
  fame: { local: number; regional: number; national: number }
  /** By voter bloc, −100 … +100 (filled by the opinion model, T13). */
  reputation: Record<string, number>
  /** 0–100. */
  credibility: number
  /** 0–100: attention from journalists, regulators and police. */
  heat: number
}

export const RELATION_TAGS = [
  'family',
  'partner',
  'friend',
  'rival',
  'mentor',
  'donor',
  'ally',
  'enemy',
] as const
export type RelationTag = (typeof RELATION_TAGS)[number]

/** How a family member is related, seen from the character who holds the relationship. */
export type Kin = 'parent' | 'child' | 'sibling' | 'partner'

export interface Relationship {
  /** −100 … +100: how this character feels about the other. */
  opinion: number
  tags: RelationTag[]
  kin?: Kin
}

export const GENDERS = ['female', 'male', 'nonbinary'] as const
export type Gender = (typeof GENDERS)[number]

export const CLASS_ORIGINS = ['working', 'middle', 'upper'] as const
export type ClassOrigin = (typeof CLASS_ORIGINS)[number]

export const EDUCATION = ['none', 'gcse', 'alevel', 'degree', 'postgrad'] as const
export type Education = (typeof EDUCATION)[number]

export const RELIGIONS = [
  'none',
  'christian',
  'muslim',
  'hindu',
  'sikh',
  'jewish',
  'buddhist',
  'other',
] as const
export type Religion = (typeof RELIGIONS)[number]

export interface Background {
  birthplace: { country: CountryId; nation?: Nation; seat?: ConstituencyId }
  /** Where they live now: the player's political home (chosen at creation). */
  home?: { nation: Nation; seat?: ConstituencyId }
  citizenship: CountryId[]
  classOrigin: ClassOrigin
  religion: Religion
  education: Education
  /** Name-pool family (data/people.json); shapes names and family resemblance, nothing else. */
  heritage: string
}

export interface Character {
  id: CharacterId
  givenName: string
  familyName: string
  gender: Gender
  birthDay: number
  /** Set when the character dies (heirs: later milestone). */
  deathDay?: number
  /** What they do for a living, e.g. "Nurse" (careers replace this from T15). */
  occupation: string
  attributes: Record<AttributeKey, number>
  skills: Record<SkillKey, number>
  /** Trait ids (data/traits.json). */
  traits: string[]
  ideology: Ideology
  condition: Condition
  standing: Standing
  /** Keyed by the other character's id. */
  relationships: Partial<Record<CharacterId, Relationship>>
  background: Background
  appearance: Appearance
  /** Personal colour id (`PERSONAL_COLOURS`; `--you` for the player), chosen at creation. */
  colour?: string
}

export function fullName(c: Pick<Character, 'givenName' | 'familyName'>): string {
  return `${c.givenName} ${c.familyName}`
}

export function isAlive(c: Pick<Character, 'deathDay'>): boolean {
  return c.deathDay === undefined
}

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))
