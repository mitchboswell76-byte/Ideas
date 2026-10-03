import { describe, expect, it } from 'vitest'
import { startWorld } from '../src/sim/character/cast.ts'
import {
  ATTRIBUTE_BUY,
  attributePointsSpent,
  educationOptions,
  randomSpec,
  specProblems,
  type CharacterSpec,
} from '../src/sim/character/create.ts'
import { ATTRIBUTES, type Character } from '../src/sim/character/model.ts'
import { answersFor, QUIZ, scoreQuiz } from '../src/sim/character/quiz.ts'
import { ageOn } from '../src/sim/clock.ts'
import { hashJson } from '../src/sim/hash.ts'
import { Rng, seedState } from '../src/sim/rng.ts'
import { creatorStore } from '../src/ui/creator/store.ts'

const rngFor = (seed: string) => new Rng(seedState(seed))
const spec = (seed = 'spec', patch: Partial<CharacterSpec> = {}): CharacterSpec => ({
  ...randomSpec(rngFor(seed)),
  ...patch,
})
const sections = (s: CharacterSpec) => specProblems(s).map((p) => p.section)

function kin(world: ReturnType<typeof startWorld>, player: Character, k: string): Character[] {
  return Object.entries(player.relationships)
    .filter(([, r]) => r?.kin === k)
    .map(([id]) => world.characters[id as Character['id']]!)
}

describe('character spec rules', () => {
  it('random specs are always valid', () => {
    for (let i = 0; i < 200; i++) expect(specProblems(spec(`r${i}`))).toEqual([])
  })

  it('random attributes spend the whole budget within the limits', () => {
    for (let i = 0; i < 50; i++) {
      const a = spec(`a${i}`).attributes
      expect(attributePointsSpent(a)).toBe(ATTRIBUTE_BUY.points)
      for (const k of ATTRIBUTES) {
        expect(a[k]).toBeGreaterThanOrEqual(ATTRIBUTE_BUY.min)
        expect(a[k]).toBeLessThanOrEqual(ATTRIBUTE_BUY.max)
      }
    }
  })

  it('names each problem and the section to fix it in', () => {
    const base = spec()
    expect(sections({ ...base, givenName: '  ' })).toEqual(['identity'])
    expect(sections({ ...base, familyName: 'x'.repeat(30) })).toEqual(['identity'])
    expect(sections({ ...base, age: 17 })).toContain('identity')
    expect(sections({ ...base, colour: 'brown' })).toEqual(['identity'])
    expect(sections({ ...base, birthplace: { country: 'cty_GBR' } })).toEqual(['origins'])
    expect(
      sections({ ...base, home: { nation: 'england', seat: 'con_nowhere' as never } }),
    ).toEqual(['origins'])
    expect(sections({ ...base, age: 19, education: 'degree' })).toEqual(['family'])
    expect(sections({ ...base, occupation: '' })).toEqual(['family'])
    expect(sections({ ...base, siblings: 3 })).toEqual(['family'])
    const over = { ...base.attributes, charisma: 16, intellect: 16, cunning: 16 }
    expect(specProblems({ ...base, attributes: over })[0]?.message).toMatch(/over budget/)
    expect(sections({ ...base, attributes: { ...base.attributes, stamina: 3 } })).toEqual([
      'abilities',
    ])
    expect(sections({ ...base, traits: ['ambitious', 'content', 'calm'] })).toEqual(['abilities'])
    expect(sections({ ...base, traits: ['ambitious', 'calm'] })).toEqual(['abilities'])
    expect(sections({ ...base, traits: ['ambitious', 'calm', 'localHero'] })).toEqual(['abilities'])
    expect(sections({ ...base, ideology: { ...base.ideology, econ: 140 } })).toEqual(['beliefs'])
    const look = structuredClone(base.appearance)
    look.hair.style = 'mohican' as never
    look.body.height = 3
    expect(sections({ ...base, appearance: look })).toEqual(['look', 'look'])
  })

  it('opens education by age', () => {
    expect(educationOptions(18)).toEqual(['gcse', 'alevel'])
    expect(educationOptions(21)).toEqual(['gcse', 'alevel', 'degree'])
    expect(educationOptions(40)).toEqual(['gcse', 'alevel', 'degree', 'postgrad'])
  })
})

describe('starting a career from a spec', () => {
  it('builds the player exactly as chosen', () => {
    const s = spec('chosen', {
      givenName: ' Ada ',
      familyName: 'Okafor',
      age: 34,
      colour: 'teal',
      traits: ['charming', 'ambitious', 'bookish'],
      birthplace: { country: 'cty_JAM' },
      home: { nation: 'wales', seat: 'con_W07000081' },
      siblings: 2,
      education: 'postgrad',
      occupation: 'Engineer',
    })
    const world = startWorld({ seed: 'w', player: s })
    const p = world.characters[world.player!]!
    expect(p.givenName).toBe('Ada')
    expect(ageOn(p.birthDay, world.clock.day)).toBe(34)
    expect(p.colour).toBe('teal')
    expect(p.traits).toEqual(['charming', 'ambitious', 'bookish'])
    expect(p.background.citizenship).toEqual(['cty_GBR', 'cty_JAM'])
    expect(p.background.home).toEqual({ nation: 'wales', seat: 'con_W07000081' })
    expect(p.background.education).toBe('postgrad')
    expect(p.ideology).toEqual(s.ideology)
    expect(p.appearance).toEqual(s.appearance)
    // Trait bonuses on top of the bought attributes (Charming +2 charisma, Bookish +2 intellect).
    expect(p.attributes.charisma).toBe(Math.min(20, s.attributes.charisma + 2))
    expect(p.attributes.intellect).toBe(Math.min(20, s.attributes.intellect + 2))
    expect(kin(world, p, 'sibling')).toHaveLength(2)
    expect(kin(world, p, 'parent')).toHaveLength(2)
    expect(world.meta.startMode).toBe('quick')
  })

  it('is deterministic for a seed and spec', () => {
    const s = spec('det')
    expect(hashJson(startWorld({ seed: 'd', player: s }))).toBe(
      hashJson(startWorld({ seed: 'd', player: s })),
    )
  })

  it('refuses an invalid spec', () => {
    expect(() => startWorld({ seed: 'x', player: spec('bad', { givenName: '' }) })).toThrow(
      /First name is empty/,
    )
  })

  it('gives the family the player’s roots, class and household politics', () => {
    let leftEcon = 0
    let rightEcon = 0
    for (let i = 0; i < 30; i++) {
      for (const household of ['left', 'right'] as const) {
        const s = spec(`fam${i}`, { household })
        const world = startWorld({ seed: `f${i}`, player: s })
        const p = world.characters[world.player!]!
        for (const parent of kin(world, p, 'parent')) {
          expect(parent.background.classOrigin).toBe(s.classOrigin)
          expect(Math.abs(parent.appearance.skin - s.appearance.skin)).toBeLessThanOrEqual(1)
          if (household === 'left') leftEcon += parent.ideology.econ
          else rightEcon += parent.ideology.econ
        }
        const colours = kin(world, p, 'parent').map((x) => x.appearance.hair.colour)
        expect(colours).toContain(s.appearance.hair.colour)
      }
    }
    expect(leftEcon / 60).toBeLessThan(-25)
    expect(rightEcon / 60).toBeGreaterThan(25)
  })

  it('older players have often lost their parents', () => {
    let dead = 0
    for (let i = 0; i < 20; i++) {
      const world = startWorld({ seed: `old${i}`, player: spec(`o${i}`, { age: 70 }) })
      const p = world.characters[world.player!]!
      for (const parent of kin(world, p, 'parent')) {
        if (parent.deathDay !== undefined) {
          dead++
          expect(parent.deathDay).toBeLessThan(world.clock.day)
          expect(ageOn(parent.birthDay, parent.deathDay)).toBeGreaterThanOrEqual(60)
        }
      }
    }
    expect(dead).toBeGreaterThan(25)
  })
})

describe('beliefs quiz', () => {
  it('scores no answers as the centre', () => {
    const i = scoreQuiz({})
    expect(i.econ).toBe(0)
    expect(i.social).toBe(0)
    expect(Object.values(i.issues).every((v) => v === 0)).toBe(true)
  })

  it('moves the axes and issues the way the statements say', () => {
    const tax = scoreQuiz({ taxTooHigh: 2 })
    expect(tax.econ).toBeGreaterThan(0)
    expect(tax.issues.tax).toBeGreaterThan(30)
    const rejoin = scoreQuiz({ rejoin: 2 })
    expect(rejoin.issues.eu).toBeLessThan(-30)
    expect(rejoin.social).toBeLessThan(0)
    const hard = scoreQuiz({ immigration: 2, sentences: 2, traditions: 2, liveAndLetLive: -2 })
    expect(hard.social).toBeGreaterThan(50)
  })

  it('reaches the edges and stays in range', () => {
    const left = Object.fromEntries(QUIZ.map((s) => [s.id, (s.econ ?? 0) < 0 ? 2 : -2] as const))
    expect(scoreQuiz(left).econ).toBeLessThan(-70)
    for (let i = 0; i < 50; i++) {
      const rng = rngFor(`q${i}`)
      const answers = Object.fromEntries(QUIZ.map((s) => [s.id, rng.int(-2, 2)] as const))
      const r = scoreQuiz(answers as never)
      for (const v of [r.econ, r.social, ...Object.values(r.issues)]) {
        expect(Math.abs(v)).toBeLessThanOrEqual(100)
      }
    }
  })

  it('guesses answers that land near the beliefs they came from', () => {
    // Coarse by nature: 14 statements, five answers each, and issues that stray from the axes.
    let error = 0
    for (let i = 0; i < 100; i++) {
      const target = spec(`g${i}`).ideology
      const back = scoreQuiz(answersFor(target))
      const off = Math.abs(back.econ - target.econ) + Math.abs(back.social - target.social)
      expect(off).toBeLessThan(110)
      error += off / 2
    }
    expect(error / 100).toBeLessThan(25)
  })
})

describe('creator store', () => {
  it('starts and randomises to valid drafts', () => {
    const s = creatorStore.getState()
    s.begin()
    expect(specProblems(creatorStore.getState().spec)).toEqual([])
    expect(creatorStore.getState().spec.home.seat).toMatch(/^con_/)
    s.randomise('all')
    expect(specProblems(creatorStore.getState().spec)).toEqual([])
  })

  it('keeps traits to the rules', () => {
    const s = creatorStore.getState()
    s.update({ traits: ['ambitious'] })
    s.toggleTrait('content')
    expect(creatorStore.getState().spec.traits).toEqual(['ambitious'])
    for (const t of ['calm', 'bookish', 'charming', 'resilient', 'teetotal']) s.toggleTrait(t)
    expect(creatorStore.getState().spec.traits).toHaveLength(5)
    s.toggleTrait('ambitious')
    expect(creatorStore.getState().spec.traits).not.toContain('ambitious')
  })

  it('drops education a younger character could not have', () => {
    const s = creatorStore.getState()
    s.update({ age: 40, education: 'postgrad' })
    s.update({ age: 19 })
    expect(creatorStore.getState().spec.education).toBe('alevel')
  })

  it('rescores beliefs as answers change', () => {
    const s = creatorStore.getState()
    for (const q of QUIZ) s.setAnswer(q.id, undefined)
    expect(creatorStore.getState().spec.ideology.econ).toBe(0)
    s.setAnswer('taxTooHigh', 2)
    expect(creatorStore.getState().spec.ideology.econ).toBeGreaterThan(0)
  })
})
