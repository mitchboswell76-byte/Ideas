/**
 * Avatar parameters (DESIGN §4): everything the stylised 3D generator and the 2D illustration need
 * to draw a character, as small JSON. Sliders run −1 … +1 (0 is average); parts are catalogue ids;
 * colours are indexes into the palettes below. Real politicians (T12) get hand-set values here: no
 * photos, no photo-derived likenesses.
 */
import type { Rng } from '../rng.ts'
import type { Gender } from './model.ts'

/** Light → deep. */
export const SKIN_TONES = [
  '#f6dcc9',
  '#eec5a6',
  '#e0ab85',
  '#cc9268',
  '#b07650',
  '#8f5c3b',
  '#6e442b',
  '#4f3020',
] as const

export const HAIR_COLOURS = [
  '#1d1b1b',
  '#3a2a21',
  '#5c3e2b',
  '#86613f',
  '#a9895c',
  '#d6b57a',
  '#7a3a24',
  '#b0562b',
] as const
export const HAIR_COLOUR_NAMES = [
  'Black',
  'Dark brown',
  'Brown',
  'Light brown',
  'Dark blonde',
  'Blonde',
  'Auburn',
  'Ginger',
] as const

export const EYE_COLOURS = [
  '#2f1f14',
  '#5a3a20',
  '#86683a',
  '#4c7449',
  '#4a74a3',
  '#7b8893',
] as const

/** No brown or olive (DESIGN §17): clothes keep to the same pleasant range as the UI. */
export const CLOTHES_COLOURS = [
  '#1f2c48',
  '#32363c',
  '#18191b',
  '#6c717a',
  '#eceff2',
  '#a8c4e4',
  '#ebe3d2',
  '#6b1f2e',
  '#22483a',
  '#1f5b62',
  '#4a2e50',
  '#a3282d',
  '#2b4f9f',
  '#d798aa',
] as const

/** Part catalogue entry: generation weights for women and men (non-binary characters average them). */
export interface PartDef<Id extends string = string> {
  id: Id
  label: string
  female: number
  male: number
  /** Suits textured hair; weighted up by heritage (data/people.json `textured`). */
  textured?: boolean
}

export const HAIR_STYLES = [
  { id: 'bald', label: 'Shaved', female: 0.005, male: 0.06 },
  { id: 'buzz', label: 'Buzz cut', female: 0.02, male: 0.14 },
  { id: 'short', label: 'Short', female: 0.05, male: 0.24 },
  { id: 'sidePart', label: 'Side parting', female: 0.03, male: 0.16 },
  { id: 'quiff', label: 'Quiff', female: 0.01, male: 0.1 },
  { id: 'curly', label: 'Short curls', female: 0.06, male: 0.08, textured: true },
  { id: 'afro', label: 'Afro', female: 0.03, male: 0.03, textured: true },
  { id: 'pixie', label: 'Pixie', female: 0.1, male: 0 },
  { id: 'bob', label: 'Bob', female: 0.18, male: 0.01 },
  { id: 'long', label: 'Long', female: 0.22, male: 0.02 },
  { id: 'ponytail', label: 'Ponytail', female: 0.12, male: 0.01 },
  { id: 'bun', label: 'Bun', female: 0.1, male: 0.01 },
  { id: 'braids', label: 'Braids', female: 0.04, male: 0.01, textured: true },
  { id: 'locs', label: 'Locs', female: 0.02, male: 0.03, textured: true },
] as const satisfies readonly PartDef[]
export type HairStyle = (typeof HAIR_STYLES)[number]['id']

export const FACIAL_HAIR = [
  { id: 'none', label: 'None', female: 1, male: 0.55 },
  { id: 'stubble', label: 'Stubble', female: 0, male: 0.15 },
  { id: 'moustache', label: 'Moustache', female: 0, male: 0.04 },
  { id: 'goatee', label: 'Goatee', female: 0, male: 0.06 },
  { id: 'beard', label: 'Short beard', female: 0, male: 0.12 },
  { id: 'fullBeard', label: 'Full beard', female: 0, male: 0.08 },
] as const satisfies readonly PartDef[]
export type FacialHair = (typeof FACIAL_HAIR)[number]['id']

export const GLASSES = [
  { id: 'none', label: 'None', female: 0.72, male: 0.72 },
  { id: 'round', label: 'Round', female: 0.1, male: 0.08 },
  { id: 'rect', label: 'Rectangular', female: 0.12, male: 0.14 },
  { id: 'browline', label: 'Browline', female: 0.06, male: 0.06 },
] as const satisfies readonly PartDef[]
export type Glasses = (typeof GLASSES)[number]['id']

export const BROW_STYLES = [
  { id: 'straight', label: 'Straight', female: 0.25, male: 0.4 },
  { id: 'arched', label: 'Arched', female: 0.45, male: 0.1 },
  { id: 'soft', label: 'Soft', female: 0.25, male: 0.25 },
  { id: 'heavy', label: 'Heavy', female: 0.05, male: 0.25 },
] as const satisfies readonly PartDef[]
export type BrowStyle = (typeof BROW_STYLES)[number]['id']

/** Outfits; roles pick one (student → councillor → MP suit, DESIGN §4). */
export const OUTFITS = [
  { id: 'school', label: 'School uniform', female: 0, male: 0 },
  { id: 'tshirt', label: 'T-shirt', female: 0.12, male: 0.16 },
  { id: 'hoodie', label: 'Hoodie', female: 0.1, male: 0.14 },
  { id: 'knit', label: 'Jumper', female: 0.16, male: 0.14 },
  { id: 'shirt', label: 'Shirt', female: 0.1, male: 0.18 },
  { id: 'blouse', label: 'Blouse', female: 0.2, male: 0 },
  { id: 'suit', label: 'Suit and tie', female: 0.02, male: 0.16 },
  { id: 'suitOpen', label: 'Suit, open collar', female: 0.14, male: 0.08 },
  { id: 'skirtSuit', label: 'Skirt suit', female: 0.12, male: 0 },
  { id: 'workwear', label: 'Hi-vis workwear', female: 0.04, male: 0.14 },
] as const satisfies readonly PartDef[]
export type Outfit = (typeof OUTFITS)[number]['id']

export const ACCESSORIES = ['rosette', 'lanyard', 'poppy', 'hardHat', 'placard'] as const
export type Accessory = (typeof ACCESSORIES)[number]

export const EXPRESSIONS = ['neutral', 'smile', 'grim', 'worried', 'angry'] as const
export type Expression = (typeof EXPRESSIONS)[number]

export const POSES = ['stand', 'armsFolded', 'podium', 'wave'] as const
export type Pose = (typeof POSES)[number]

export interface Appearance {
  /** SKIN_TONES index. */
  skin: number
  /** Face shape sliders, −1 … +1. */
  head: { width: number; jaw: number; cheeks: number; chin: number; brow: number }
  eyes: { size: number; spacing: number; colour: number }
  brows: { style: BrowStyle; thickness: number }
  nose: { size: number; width: number }
  mouth: { width: number; lips: number }
  ears: { size: number }
  hair: { style: HairStyle; colour: number }
  facialHair: FacialHair
  glasses: Glasses
  /** −1 … +1, relative to the average for the character's frame. */
  body: { height: number; build: number }
  outfit: Outfit
  /** CLOTHES_COLOURS indexes. */
  clothes: { main: number; accent: number }
  accessories: Accessory[]
  /** Genes for ageing: the age greying starts, and how strongly the hairline recedes (0–1). */
  ageing: { greyAt: number; recede: number }
}

/** Generation weights for one heritage (from data/people.json). */
export interface LookWeights {
  /** One weight per SKIN_TONES entry. */
  skin: readonly number[]
  /** One weight per HAIR_COLOURS entry. */
  hair: readonly number[]
  /** One weight per EYE_COLOURS entry. */
  eyes: readonly number[]
  /** Multiplier for textured hairstyles. */
  textured: number
}

const round2 = (n: number) => Math.round(n * 100) / 100
const slider = (rng: Rng, sd = 0.4) => round2(Math.max(-1, Math.min(1, rng.normal(0, sd))))

function weightFor(part: PartDef, gender: Gender, textured = 1): number {
  const base =
    gender === 'female'
      ? part.female
      : gender === 'male'
        ? part.male
        : (part.female + part.male) / 2
  return part.textured ? base * textured : base
}

export function pickPart<P extends PartDef>(
  rng: Rng,
  parts: readonly P[],
  gender: Gender,
  textured = 1,
): P['id'] {
  return rng.weighted(parts, (p) => weightFor(p, gender, textured)).id
}

function pickIndex(rng: Rng, weights: readonly number[]): number {
  return rng.weighted(
    weights.map((w, i) => [w, i] as const),
    ([w]) => w,
  )[1]
}

export interface AppearanceOptions {
  gender: Gender
  look: LookWeights
  /** Age now; glasses get likelier with age. */
  age: number
  /** Children resemble their parents: skin between theirs, hair and eyes from one of them. */
  parents?: readonly Appearance[]
}

export function randomAppearance(
  rng: Rng,
  { gender, look, age, parents }: AppearanceOptions,
): Appearance {
  const [a, b] = parents ?? []
  const skin =
    a && b ? Math.round((a.skin + b.skin) / 2 + rng.float(-0.6, 0.6)) : pickIndex(rng, look.skin)
  const fromParent = a && b ? rng.pick([a, b]) : null
  const hairColour =
    fromParent && rng.chance(0.8) ? fromParent.hair.colour : pickIndex(rng, look.hair)
  const eyeColour =
    fromParent && rng.chance(0.8) ? fromParent.eyes.colour : pickIndex(rng, look.eyes)
  const glassesPick = pickPart(rng, GLASSES, gender)
  const glasses: Glasses =
    age < 40 || glassesPick !== 'none' ? glassesPick : rng.chance(0.2) ? 'rect' : 'none'
  const main = rng.int(0, CLOTHES_COLOURS.length - 1)
  let accent = rng.int(0, CLOTHES_COLOURS.length - 1)
  if (accent === main) accent = (accent + 4) % CLOTHES_COLOURS.length
  return {
    skin: Math.max(0, Math.min(SKIN_TONES.length - 1, skin)),
    head: {
      width: slider(rng),
      jaw: slider(rng, 0.35) + (gender === 'male' ? 0.2 : gender === 'female' ? -0.2 : 0),
      cheeks: slider(rng),
      chin: slider(rng),
      brow: slider(rng, 0.35),
    },
    eyes: { size: slider(rng, 0.35), spacing: slider(rng, 0.35), colour: eyeColour },
    brows: { style: pickPart(rng, BROW_STYLES, gender), thickness: slider(rng) },
    nose: { size: slider(rng), width: slider(rng) },
    mouth: { width: slider(rng, 0.35), lips: slider(rng) },
    ears: { size: slider(rng, 0.3) },
    hair: { style: pickPart(rng, HAIR_STYLES, gender, look.textured), colour: hairColour },
    facialHair: age < 17 ? 'none' : pickPart(rng, FACIAL_HAIR, gender),
    glasses,
    body: { height: slider(rng, 0.45), build: slider(rng, 0.45) },
    outfit: age < 16 ? 'school' : pickPart(rng, OUTFITS, gender),
    clothes: { main, accent },
    accessories: [],
    ageing: {
      greyAt: Math.round(Math.max(25, Math.min(70, rng.normal(46, 7)))),
      recede: round2(gender === 'male' ? rng.next() : rng.next() * 0.2),
    },
  }
}

const SLIDERS: readonly (readonly [keyof Appearance, string])[] = [
  ['head', 'width'],
  ['head', 'jaw'],
  ['head', 'cheeks'],
  ['head', 'chin'],
  ['head', 'brow'],
  ['eyes', 'size'],
  ['eyes', 'spacing'],
  ['brows', 'thickness'],
  ['nose', 'size'],
  ['nose', 'width'],
  ['mouth', 'width'],
  ['mouth', 'lips'],
  ['ears', 'size'],
  ['body', 'height'],
  ['body', 'build'],
]

const isIndex = (n: unknown, length: number) =>
  Number.isInteger(n) && (n as number) >= 0 && (n as number) < length
const inPart = (parts: readonly PartDef[], id: unknown) => parts.some((p) => p.id === id)

/**
 * What is wrong with an appearance built outside the generator (the creator): unknown parts,
 * palette indexes out of range, sliders outside −1 … +1 (jaw may reach ±1.2, as generated).
 */
export function appearanceProblems(a: Appearance): string[] {
  const out: string[] = []
  for (const [group, key] of SLIDERS) {
    const v = (a[group] as unknown as Record<string, unknown> | undefined)?.[key]
    const limit = key === 'jaw' ? 1.2 : 1
    if (typeof v !== 'number' || !(Math.abs(v) <= limit))
      out.push(`Look: ${group} ${key} is out of range`)
  }
  if (!isIndex(a.skin, SKIN_TONES.length)) out.push('Look: unknown skin tone')
  if (!isIndex(a.eyes?.colour, EYE_COLOURS.length)) out.push('Look: unknown eye colour')
  if (!isIndex(a.hair?.colour, HAIR_COLOURS.length)) out.push('Look: unknown hair colour')
  if (!inPart(HAIR_STYLES, a.hair?.style)) out.push('Look: unknown hairstyle')
  if (!inPart(BROW_STYLES, a.brows?.style)) out.push('Look: unknown brows')
  if (!inPart(FACIAL_HAIR, a.facialHair)) out.push('Look: unknown facial hair')
  if (!inPart(GLASSES, a.glasses)) out.push('Look: unknown glasses')
  if (!inPart(OUTFITS, a.outfit)) out.push('Look: unknown outfit')
  if (!isIndex(a.clothes?.main, CLOTHES_COLOURS.length)) out.push('Look: unknown clothes colour')
  if (!isIndex(a.clothes?.accent, CLOTHES_COLOURS.length)) out.push('Look: unknown clothes colour')
  if (!Array.isArray(a.accessories) || a.accessories.some((x) => !ACCESSORIES.includes(x)))
    out.push('Look: unknown accessory')
  const { greyAt, recede } = a.ageing ?? {}
  if (!(typeof greyAt === 'number' && greyAt >= 20 && greyAt <= 90))
    out.push('Look: greying age is out of range')
  if (!(typeof recede === 'number' && recede >= 0 && recede <= 1))
    out.push('Look: hairline is out of range')
  return out
}
