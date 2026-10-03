/**
 * Avatar rig (DESIGN §4): turns saved appearance + age + expression + role into the numbers both
 * renderers draw from — the stylised 3D builder and the flat 2D illustration — so the two always
 * agree. Pure (no three.js, no DOM); ageing, expressions and outfits are decided here.
 */
import {
  CLOTHES_COLOURS,
  EYE_COLOURS,
  HAIR_COLOURS,
  SKIN_TONES,
  type Accessory,
  type Appearance,
  type Expression,
  type FacialHair,
  type Glasses,
  type HairStyle,
  type Outfit,
  type Pose,
} from '../../sim/character/appearance.ts'
import type { Gender } from '../../sim/character/model.ts'
import { hashString } from '../../sim/hash.ts'
import { luminance, mix, shade } from './colour.ts'

export interface RigInput {
  appearance: Appearance
  age: number
  gender: Gender
  expression?: Expression
  pose?: Pose
  /** Overrides the saved outfit (a role's clothes, e.g. an MP's suit). */
  outfit?: Outfit
  /** Added to the saved accessories. */
  accessories?: readonly Accessory[]
  /** Rosette colour. */
  partyColour?: string
}

export type TopKind =
  'tshirt' | 'hoodie' | 'knit' | 'shirt' | 'blouse' | 'jacket' | 'school' | 'vest'

export interface Clothes {
  kind: TopKind
  /** Torso colour (the shirt or top itself). */
  top: string
  /** Jacket / jumper / vest worn over `top`, with a V opening. */
  over: string | null
  /** Shirt collar points. */
  collar: string | null
  tie: string | null
  /** Sleeve colour; forearms bare for T-shirts. */
  sleeve: string
  shortSleeves: boolean
  legs: string
  skirt: boolean
  shoes: string
}

export interface Rig {
  /** Stable cache key for renders of this rig. */
  key: string
  gender: Gender
  age: number
  expression: Expression
  pose: Pose
  colours: {
    skin: string
    skinShade: string
    lip: string
    hair: string
    brow: string
    iris: string
    facialHair: string
  }
  head: {
    /** Half-width, half-height, half-depth in head units. */
    rx: number
    ry: number
    rz: number
    jaw: number
    cheeks: number
    chin: number
    brow: number
    /** Uniform scale (children's heads are a little smaller). */
    scale: number
  }
  eyes: { spacing: number; size: number; open: number; lidTilt: number }
  brows: { raise: number; tilt: number; thickness: number; arch: number }
  nose: { size: number; width: number }
  mouth: { width: number; curve: number; lips: number; open: number }
  ears: { size: number }
  hair: {
    style: HairStyle
    /** 0 = full hairline, 1 = receded to the crown. */
    recession: number
  }
  facialHair: FacialHair
  glasses: Glasses
  /** 0–1: forehead and smile lines. */
  lines: number
  body: {
    /** Overall height multiplier (children are smaller). */
    scale: number
    /** Shoulder width multiplier. */
    width: number
    /** Girth multiplier. */
    girth: number
    /** Forward lean of head and shoulders with age (radians). */
    stoop: number
  }
  clothes: Clothes
  accessories: Accessory[]
  partyColour: string
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))
const ramp = (n: number, from: number, to: number) => clamp((n - from) / (to - from), 0, 1)

const GREY = '#cfd1d2'
const DENIM = '#34476b'
const HI_VIS = '#d6e33a'
const WHITE_SHIRT = '#f1f3f5'
const SCHOOL_JUMPERS = ['#1f2c48', '#6b1f2e', '#22483a', '#32363c'] as const

const EXPRESSIONS: Readonly<
  Record<
    Expression,
    { curve: number; open: number; eyes: number; raise: number; tilt: number; width: number }
  >
> = {
  neutral: { curve: 0.12, open: 0, eyes: 1, raise: 0, tilt: 0, width: 0 },
  smile: { curve: 1.1, open: 0, eyes: 0.8, raise: 0.04, tilt: 0.1, width: 0.3 },
  grim: { curve: -0.3, open: 0, eyes: 0.88, raise: -0.05, tilt: -0.25, width: -0.15 },
  worried: { curve: -0.45, open: 0.08, eyes: 1.1, raise: 0.08, tilt: 0.75, width: -0.1 },
  angry: { curve: -0.65, open: 0.3, eyes: 0.78, raise: -0.07, tilt: -0.8, width: 0.1 },
}

/** Suits come in sober colours: navy, charcoal, black, grey, burgundy, green, plum, cobalt. */
const FORMAL: readonly string[] = [0, 1, 2, 3, 7, 8, 10, 12].map((i) => CLOTHES_COLOURS[i])

function formal(colour: string): string {
  if (FORMAL.includes(colour)) return colour
  const i = (CLOTHES_COLOURS as readonly string[]).indexOf(colour)
  return FORMAL[Math.max(0, i) % FORMAL.length]
}

/** A tie that shows against a white shirt and the jacket. */
function tieColour(accent: string, jacket: string): string {
  return accent === jacket || luminance(accent) > 0.5 ? CLOTHES_COLOURS[11] : accent
}

/** Children wear school uniform unless dressed casually. */
function childOutfit(outfit: Outfit, age: number): Outfit {
  return age < 16 && outfit !== 'tshirt' && outfit !== 'hoodie' ? 'school' : outfit
}

/** Whether a hex is light enough to read as a shirt. */
const isLight = (hex: string) => luminance(hex) > 0.45

export function outfitClothes(outfit: Outfit, main: string, accent: string, age: number): Clothes {
  const darkMain = isLight(main) ? CLOTHES_COLOURS[0] : main
  const suit = formal(darkMain)
  const shirt = isLight(accent) ? accent : WHITE_SHIRT
  const shoes = '#1d1e21'
  switch (outfit) {
    case 'tshirt':
      return {
        kind: 'tshirt',
        top: main,
        over: null,
        collar: null,
        tie: null,
        sleeve: main,
        shortSleeves: true,
        legs: DENIM,
        skirt: false,
        shoes,
      }
    case 'hoodie':
      return {
        kind: 'hoodie',
        top: main,
        over: null,
        collar: null,
        tie: null,
        sleeve: main,
        shortSleeves: false,
        legs: DENIM,
        skirt: false,
        shoes,
      }
    case 'knit':
      return {
        kind: 'knit',
        top: shirt,
        over: main,
        collar: shirt,
        tie: null,
        sleeve: main,
        shortSleeves: false,
        legs: shade(darkMain, 0.8),
        skirt: false,
        shoes,
      }
    case 'shirt':
      return {
        kind: 'shirt',
        top: shirt,
        over: null,
        collar: shirt,
        tie: null,
        sleeve: shirt,
        shortSleeves: false,
        legs: darkMain,
        skirt: false,
        shoes,
      }
    case 'blouse':
      return {
        kind: 'blouse',
        top: accent,
        over: null,
        collar: null,
        tie: null,
        sleeve: accent,
        shortSleeves: false,
        legs: darkMain,
        skirt: false,
        shoes,
      }
    case 'suit':
      return {
        kind: 'jacket',
        top: WHITE_SHIRT,
        over: suit,
        collar: WHITE_SHIRT,
        tie: tieColour(accent, suit),
        sleeve: suit,
        shortSleeves: false,
        legs: suit,
        skirt: false,
        shoes,
      }
    case 'suitOpen':
      return {
        kind: 'jacket',
        top: shirt,
        over: suit,
        collar: shirt,
        tie: null,
        sleeve: suit,
        shortSleeves: false,
        legs: suit,
        skirt: false,
        shoes,
      }
    case 'skirtSuit':
      return {
        kind: 'jacket',
        top: accent === suit ? WHITE_SHIRT : accent,
        over: suit,
        collar: null,
        tie: null,
        sleeve: suit,
        shortSleeves: false,
        legs: suit,
        skirt: true,
        shoes,
      }
    case 'workwear':
      return {
        kind: 'vest',
        top: darkMain,
        over: HI_VIS,
        collar: null,
        tie: null,
        sleeve: darkMain,
        shortSleeves: false,
        legs: '#2a2e35',
        skirt: false,
        shoes: '#2a2321',
      }
    case 'school': {
      const jumper =
        SCHOOL_JUMPERS.find((c) => c === darkMain) ?? SCHOOL_JUMPERS[age % SCHOOL_JUMPERS.length]
      return {
        kind: 'school',
        top: WHITE_SHIRT,
        over: jumper,
        collar: WHITE_SHIRT,
        tie: tieColour(accent, jumper),
        sleeve: jumper,
        shortSleeves: false,
        legs: '#4a4e55',
        skirt: false,
        shoes,
      }
    }
  }
}

/**
 * The age a portrait shows: exact for children, in five-year steps for adults, so portraits are
 * redrawn every few years rather than on every birthday (ageing is slow; renders are not free).
 */
export function lookAge(age: number): number {
  const a = Math.max(0, Math.floor(age))
  return a < 20 ? a : a - (a % 5)
}

/** Build the rig. Deterministic: equal inputs give equal rigs (and keys). */
export function buildRig(input: RigInput): Rig {
  const { appearance: a, gender } = input
  const age = lookAge(input.age)
  const expression = input.expression ?? 'neutral'
  const pose = input.pose ?? 'stand'
  const e = EXPRESSIONS[expression]

  const grey = ramp(age, a.ageing.greyAt, a.ageing.greyAt + 22) * 0.9
  const baseHair = HAIR_COLOURS[a.hair.colour] ?? HAIR_COLOURS[1]
  const hair = mix(baseHair, GREY, grey)
  const skin = SKIN_TONES[a.skin] ?? SKIN_TONES[2]
  const darkHair = luminance(baseHair) < 0.05
  const brow = mix(darkHair ? baseHair : mix(baseHair, '#3a2a21', 0.35), GREY, grey * 0.6)

  // Children: smaller bodies, relatively larger heads; adults stoop a little past 65.
  const growth = ramp(age, 3, 18)
  const bodyScale = 0.52 + 0.48 * growth
  const frame = gender === 'male' ? 1.06 : gender === 'female' ? 0.94 : 1
  const outfit = childOutfit(input.outfit ?? a.outfit, age)
  const main = CLOTHES_COLOURS[a.clothes.main] ?? CLOTHES_COLOURS[0]
  const accent = CLOTHES_COLOURS[a.clothes.accent] ?? CLOTHES_COLOURS[4]
  const accessories = [...new Set([...a.accessories, ...(input.accessories ?? [])])]

  const rig: Omit<Rig, 'key'> = {
    gender,
    age,
    expression,
    pose,
    colours: {
      skin,
      skinShade: shade(skin, 0.86),
      lip: mix(shade(skin, 0.78), '#9b4256', 0.32),
      hair,
      brow,
      iris: EYE_COLOURS[a.eyes.colour] ?? EYE_COLOURS[0],
      facialHair: mix(mix(baseHair, '#2b211c', 0.15), GREY, grey),
    },
    head: {
      rx: 0.84 * (1 + a.head.width * 0.07),
      ry: 1.04,
      rz: 0.94,
      jaw: a.head.jaw,
      cheeks: a.head.cheeks,
      chin: a.head.chin,
      brow: a.head.brow,
      scale: 0.86 + 0.14 * growth,
    },
    eyes: {
      spacing: a.eyes.spacing,
      size: a.eyes.size + (1 - growth) * 0.5,
      open: e.eyes,
      lidTilt: e.tilt,
    },
    brows: {
      raise: e.raise,
      tilt: e.tilt,
      thickness: a.brows.thickness + (a.brows.style === 'heavy' ? 0.6 : 0),
      arch: a.brows.style === 'arched' ? 1 : a.brows.style === 'soft' ? 0.5 : 0.15,
    },
    nose: { size: a.nose.size - (1 - growth) * 0.4, width: a.nose.width },
    mouth: { width: a.mouth.width + e.width, curve: e.curve, lips: a.mouth.lips, open: e.open },
    ears: { size: a.ears.size },
    hair: {
      style: a.hair.style,
      recession: a.ageing.recede * ramp(age, 22, 60),
    },
    facialHair: age < 16 ? 'none' : a.facialHair,
    glasses: a.glasses,
    lines: ramp(age, 38, 80),
    body: {
      scale: bodyScale * (1 + a.body.height * 0.06) * (gender === 'female' ? 0.96 : 1),
      width: frame * (1 + a.body.build * 0.06) * (0.85 + 0.15 * growth),
      girth: 1 + a.body.build * 0.12,
      stoop: ramp(age, 65, 90) * 0.14,
    },
    clothes: outfitClothes(outfit, main, accent, age),
    accessories,
    partyColour: input.partyColour ?? '#7a7f87',
  }
  return { ...rig, key: rigKey(rig) }
}

function rigKey(rig: Omit<Rig, 'key'>): string {
  const json = JSON.stringify(rig, (_, v: unknown) =>
    typeof v === 'number' ? Math.round(v * 1000) / 1000 : v,
  )
  return `${hashString(json).toString(36)}${hashString(json, 7).toString(36)}`
}
