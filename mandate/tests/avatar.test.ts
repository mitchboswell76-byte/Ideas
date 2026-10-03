import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  CLOTHES_COLOURS,
  EXPRESSIONS,
  HAIR_STYLES,
  OUTFITS,
  randomAppearance,
  type Appearance,
} from '../src/sim/character/appearance.ts'
import { HERITAGES } from '../src/sim/character/generate.ts'
import { Rng, seedState } from '../src/sim/rng.ts'
import { AvatarSvg } from '../src/ui/avatar/AvatarSvg.tsx'
import { luminance } from '../src/ui/avatar/colour.ts'
import { buildRig, outfitClothes } from '../src/ui/avatar/rig.ts'
import {
  hairEnd,
  hairPoint,
  hairProfile,
  headNormal,
  headPoint,
  thetaAt,
} from '../src/ui/avatar/shape.ts'
import { opinionTone, relationLabel, sortRelations } from '../src/ui/character/labels.ts'
import type { RelationView } from '../src/runtime/queries.ts'

function look(seed: string, age = 35): Appearance {
  return randomAppearance(new Rng(seedState(seed)), { gender: 'male', look: HERITAGES[0], age })
}

describe('rig', () => {
  it('is deterministic and keyed by everything that changes the picture', () => {
    const a = look('rig')
    const base = buildRig({ appearance: a, age: 40, gender: 'male' })
    expect(buildRig({ appearance: a, age: 40, gender: 'male' }).key).toBe(base.key)
    const keys = new Set([
      base.key,
      buildRig({ appearance: a, age: 45, gender: 'male' }).key,
      buildRig({ appearance: a, age: 40, gender: 'male', expression: 'smile' }).key,
      buildRig({ appearance: a, age: 40, gender: 'male', outfit: 'suit' }).key,
      buildRig({ appearance: a, age: 40, gender: 'male', partyColour: '#123456' }).key,
    ])
    expect(keys.size).toBe(5)
  })

  it('portraits age in five-year steps after childhood', () => {
    const a = look('steps')
    const key = (age: number) => buildRig({ appearance: a, age, gender: 'male' }).key
    expect(key(41)).toBe(key(44))
    expect(key(44)).not.toBe(key(45))
    expect(key(12)).not.toBe(key(13))
  })

  it('ages: hair greys after greyAt, the hairline recedes, lines appear', () => {
    const a = { ...look('age'), ageing: { greyAt: 40, recede: 1 } }
    const young = buildRig({ appearance: a, age: 25, gender: 'male' })
    const old = buildRig({ appearance: a, age: 75, gender: 'male' })
    expect(young.colours.hair).not.toBe(old.colours.hair)
    expect(luminance(old.colours.hair)).toBeGreaterThan(luminance(young.colours.hair))
    expect(old.hair.recession).toBeGreaterThan(young.hair.recession)
    expect(young.lines).toBe(0)
    expect(old.lines).toBeGreaterThan(0.5)
    expect(old.body.stoop).toBeGreaterThan(0)
  })

  it('children are smaller, beardless and in school uniform unless dressed casually', () => {
    const a = { ...look('kid'), facialHair: 'beard' as const, outfit: 'suit' as const }
    const kid = buildRig({ appearance: a, age: 9, gender: 'male' })
    expect(kid.facialHair).toBe('none')
    expect(kid.clothes.kind).toBe('school')
    expect(kid.body.scale).toBeLessThan(
      buildRig({ appearance: a, age: 30, gender: 'male' }).body.scale,
    )
    expect(
      buildRig({ appearance: { ...a, outfit: 'hoodie' }, age: 9, gender: 'male' }).clothes.kind,
    ).toBe('hoodie')
  })

  it('expressions differ in mouth and brows', () => {
    const a = look('face')
    const rigs = EXPRESSIONS.map((e) =>
      buildRig({ appearance: a, age: 30, gender: 'female', expression: e }),
    )
    const smile = rigs[1]
    const angry = rigs[4]
    expect(smile.mouth.curve).toBeGreaterThan(0)
    expect(angry.mouth.curve).toBeLessThan(0)
    expect(angry.brows.tilt).toBeLessThan(0)
    expect(rigs[3].brows.tilt).toBeGreaterThan(0)
  })

  it('suits are sober and ties show against the shirt', () => {
    for (const main of CLOTHES_COLOURS) {
      for (const accent of CLOTHES_COLOURS) {
        const c = outfitClothes('suit', main, accent, 40)
        expect(c.over && luminance(c.over)).toBeLessThan(0.3)
        expect(c.tie && luminance(c.tie)).toBeLessThanOrEqual(0.5)
        expect(c.tie).not.toBe(c.over)
      }
    }
    expect(outfitClothes('workwear', CLOTHES_COLOURS[0], CLOTHES_COLOURS[1], 30).kind).toBe('vest')
  })
})

describe('shape', () => {
  const head = buildRig({ appearance: look('shape'), age: 30, gender: 'male' }).head

  it('the head is mirror-symmetric with outward normals', () => {
    for (const t of [0.3, 1.2, 2.5]) {
      for (const phi of [0.2, 1, 2.6]) {
        const p = headPoint(head, t, phi)
        const q = headPoint(head, t, -phi)
        expect(q.x).toBeCloseTo(-p.x, 9)
        expect(q.y).toBeCloseTo(p.y, 9)
        const n = headNormal(head, t, phi)
        expect(Math.hypot(n.x, n.y, n.z)).toBeCloseTo(1, 6)
        expect(n.x * p.x + n.y * p.y + n.z * p.z).toBeGreaterThan(0)
      }
    }
  })

  it('hair sits on or outside the head and leaves the face open', () => {
    for (const { id } of HAIR_STYLES) {
      const p = hairProfile(id, 0)
      if (p.none) continue
      expect(hairEnd(p, 0)).toBeGreaterThan(0.3)
      for (const phi of [0, 1, 2, 3]) {
        for (const s of [0, 0.5, 1]) {
          const h = hairPoint(head, p, phi, s)
          expect(Number.isFinite(h.x + h.y + h.z)).toBe(true)
          if (h.y > 0) {
            const t = thetaAt(h.y / head.ry)
            const skin = headPoint(head, t, phi)
            expect(Math.hypot(h.x, h.z)).toBeGreaterThanOrEqual(Math.hypot(skin.x, skin.z) - 0.05)
          }
        }
      }
    }
  })

  it('a receded short cut becomes a horseshoe; long styles hang past the chin', () => {
    expect(hairProfile('short', 0.9).start).toBeLessThan(1)
    expect(hairProfile('short', 0.9).gap).toBeGreaterThan(1)
    expect(hairEnd(hairProfile('long', 0), Math.PI)).toBeLessThan(-1)
    expect(hairEnd(hairProfile('short', 0), Math.PI)).toBeGreaterThan(-1)
  })
})

describe('2D illustration', () => {
  it('draws every outfit, hairstyle and expression without bad numbers', () => {
    const rng = new Rng(seedState('svg'))
    for (let i = 0; i < 40; i++) {
      const gender = i % 2 ? 'female' : 'male'
      const a = randomAppearance(rng, { gender, look: HERITAGES[i % HERITAGES.length], age: 30 })
      a.hair.style = HAIR_STYLES[i % HAIR_STYLES.length].id
      a.outfit = OUTFITS[i % OUTFITS.length].id
      const rig = buildRig({
        appearance: a,
        age: 8 + i * 2,
        gender,
        expression: EXPRESSIONS[i % EXPRESSIONS.length],
        accessories: i % 3 ? ['rosette', 'poppy'] : ['hardHat', 'lanyard'],
      })
      const svg = renderToStaticMarkup(createElement(AvatarSvg, { rig }))
      expect(svg).toContain('<svg')
      expect(svg).not.toMatch(/NaN|Infinity|undefined/)
    }
  })
})

describe('character labels', () => {
  const rel = (over: Partial<RelationView>): RelationView => ({
    id: 'chr_000009',
    name: 'Sam Example',
    gender: 'female',
    age: 30,
    alive: true,
    occupation: 'Teacher',
    appearance: look('rel'),
    opinion: 0,
    theirOpinion: 0,
    tags: [],
    ...over,
  })

  it('names kin by gender and others by tag', () => {
    expect(relationLabel(rel({ kin: 'parent', tags: ['family'] }))).toBe('Mother')
    expect(relationLabel(rel({ kin: 'sibling', gender: 'nonbinary', tags: ['family'] }))).toBe(
      'Sibling',
    )
    expect(relationLabel(rel({ tags: ['rival'] }))).toBe('Rival')
    expect(relationLabel(rel({ tags: [] }))).toBe('Acquaintance')
  })

  it('sorts family first, then friends; tones opinions', () => {
    const sorted = sortRelations([
      rel({ id: 'chr_r', tags: ['rival'], opinion: -40 }),
      rel({ id: 'chr_f', tags: ['friend'], opinion: 60 }),
      rel({ id: 'chr_p', kin: 'parent', tags: ['family'], opinion: 10 }),
    ])
    expect(sorted.map((r) => r.id)).toEqual(['chr_p', 'chr_f', 'chr_r'])
    expect(opinionTone(50)).toBe('good')
    expect(opinionTone(-50)).toBe('bad')
    expect(opinionTone(5)).toBe('neutral')
  })
})

describe('structural sharing', () => {
  it('keeps unchanged subtrees and replaces changed ones', async () => {
    const { share } = await import('../src/ui/character/share.ts')
    const prev = { a: { x: 1 }, b: { y: [1, 2] }, c: 3 }
    const next = { a: { x: 1 }, b: { y: [1, 3] }, c: 3 }
    const out = share(prev, next)
    expect(out).toEqual(next)
    expect(out.a).toBe(prev.a)
    expect(out.b).not.toBe(prev.b)
    expect(share(prev, structuredClone(prev))).toBe(prev)
    expect(share(null, next)).toBe(next)
  })
})
