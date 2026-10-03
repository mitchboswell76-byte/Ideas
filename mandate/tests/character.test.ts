import { describe, expect, it } from 'vitest'
import {
  CLOTHES_COLOURS,
  EYE_COLOURS,
  HAIR_COLOURS,
  HAIR_STYLES,
  SKIN_TONES,
} from '../src/sim/character/appearance.ts'
import { startWorld } from '../src/sim/character/cast.ts'
import { checkOdds, practise } from '../src/sim/character/checks.ts'
import { addStress, energyMax, monthlyCondition } from '../src/sim/character/condition.ts'
import { generateCharacter, HERITAGES } from '../src/sim/character/generate.ts'
import { ISSUES, SKILLS, ATTRIBUTES, type Character } from '../src/sim/character/model.ts'
import { canAddTrait, pickTraits, TRAITS, traitDef } from '../src/sim/character/traits.ts'
import { ageOn, dayFromIso } from '../src/sim/clock.ts'
import { Engine } from '../src/sim/engine.ts'
import { hashJson } from '../src/sim/hash.ts'
import { Rng, seedState } from '../src/sim/rng.ts'
import { migrate } from '../src/sim/save.ts'
import { createWorld } from '../src/sim/world.ts'
import { queries } from '../src/runtime/queries.ts'

const rngFor = (seed: string) => new Rng(seedState(seed))

function npc(seed: string, opts = {}): Character {
  const world = createWorld({ seed })
  return generateCharacter(world, rngFor(seed), opts)
}

describe('traits', () => {
  it('data is consistent: unique ids, opposites point back', () => {
    const ids = new Set(TRAITS.map((t) => t.id))
    expect(ids.size).toBe(TRAITS.length)
    for (const t of TRAITS) {
      if (t.opposite) expect(traitDef(t.opposite)?.opposite).toBe(t.id)
    }
  })

  it('never holds a trait with its opposite', () => {
    expect(canAddTrait(['charming'], 'awkward')).toBe(false)
    expect(canAddTrait(['awkward'], 'charming')).toBe(false)
    expect(canAddTrait(['charming'], 'charming')).toBe(false)
    expect(canAddTrait(['charming'], 'bookish')).toBe(true)
    expect(canAddTrait([], 'nonsense')).toBe(false)
    for (let i = 0; i < 200; i++) {
      const picked = pickTraits(rngFor(`t${i}`), 5)
      for (const id of picked) {
        expect(
          canAddTrait(
            picked.filter((p) => p !== id),
            id,
          ),
        ).toBe(true)
        expect(traitDef(id)?.creation).not.toBe(false)
      }
    }
  })
})

describe('generateCharacter', () => {
  it('stays in range across many seeds', () => {
    for (let i = 0; i < 150; i++) {
      const c = npc(`g${i}`)
      for (const a of ATTRIBUTES) expect(c.attributes[a]).toBeGreaterThanOrEqual(0)
      for (const a of ATTRIBUTES) expect(c.attributes[a]).toBeLessThanOrEqual(20)
      for (const s of SKILLS) expect(c.skills[s]).toBeGreaterThanOrEqual(0)
      for (const s of SKILLS) expect(c.skills[s]).toBeLessThanOrEqual(100)
      for (const issue of ISSUES)
        expect(Math.abs(c.ideology.issues[issue])).toBeLessThanOrEqual(100)
      expect(Math.abs(c.ideology.econ)).toBeLessThanOrEqual(100)
      expect(c.condition.health).toBeGreaterThan(0)
      expect(c.condition.energy).toBe(energyMax(c))
      const look = c.appearance
      expect(SKIN_TONES[look.skin]).toBeDefined()
      expect(HAIR_COLOURS[look.hair.colour]).toBeDefined()
      expect(EYE_COLOURS[look.eyes.colour]).toBeDefined()
      expect(CLOTHES_COLOURS[look.clothes.main]).toBeDefined()
      expect(CLOTHES_COLOURS[look.clothes.accent]).toBeDefined()
      expect(look.clothes.main).not.toBe(look.clothes.accent)
      expect(HAIR_STYLES.some((h) => h.id === look.hair.style)).toBe(true)
      expect(c.givenName).not.toBe('')
      expect(c.familyName).not.toBe('')
    }
  })

  it('honours age, gender and family name', () => {
    const world = createWorld({ seed: 'age' })
    const c = generateCharacter(world, rngFor('age'), {
      age: 34,
      gender: 'female',
      familyName: 'Okafor',
    })
    expect(ageOn(c.birthDay, world.clock.day)).toBe(34)
    expect(c.gender).toBe('female')
    expect(c.familyName).toBe('Okafor')
    expect(world.characters[c.id]).toBe(c)
  })

  it('children: school uniform, no facial hair', () => {
    for (let i = 0; i < 30; i++) {
      const c = npc(`kid${i}`, { age: 9, gender: 'male' })
      expect(c.appearance.outfit).toBe('school')
      expect(c.appearance.facialHair).toBe('none')
      expect(c.background.education).toBe('none')
      expect(c.occupation).toBe('School pupil')
    }
  })

  it('heritage data has one weight per palette entry', () => {
    for (const h of HERITAGES) {
      expect(h.skin).toHaveLength(SKIN_TONES.length)
      expect(h.hair).toHaveLength(HAIR_COLOURS.length)
      expect(h.eyes).toHaveLength(EYE_COLOURS.length)
      expect(h.female.length).toBeGreaterThan(10)
      expect(h.male.length).toBeGreaterThan(10)
    }
  })
})

describe('starting cast', () => {
  it('is deterministic per seed', () => {
    expect(hashJson(startWorld({ seed: 'cast' }))).toBe(hashJson(startWorld({ seed: 'cast' })))
    expect(hashJson(startWorld({ seed: 'cast' }))).not.toBe(hashJson(startWorld({ seed: 'other' })))
  })

  it('gives the player parents, a friend and a rival, linked both ways', () => {
    for (let i = 0; i < 20; i++) {
      const world = startWorld({ seed: `c${i}` })
      const player = world.characters[world.player!]!
      const age = ageOn(player.birthDay, world.clock.day)
      expect(age).toBeGreaterThanOrEqual(21)
      expect(age).toBeLessThanOrEqual(26)
      const rels = Object.entries(player.relationships)
      expect(rels.filter(([, r]) => r?.kin === 'parent')).toHaveLength(2)
      expect(rels.some(([, r]) => r?.tags.includes('friend'))).toBe(true)
      expect(rels.some(([, r]) => r?.tags.includes('rival') && r.opinion < 0)).toBe(true)
      for (const [id] of rels) {
        expect(world.characters[id as Character['id']]?.relationships[player.id]).toBeDefined()
      }
      for (const [id, r] of rels) {
        if (r?.kin !== 'parent') continue
        const parent = world.characters[id as Character['id']]!
        expect(ageOn(parent.birthDay, world.clock.day) - age).toBeGreaterThanOrEqual(23)
      }
    }
  })
})

describe('checks', () => {
  const base = (): Character => {
    const c = npc('check', { traitCount: 0 })
    c.traits = []
    c.attributes.charisma = 10
    c.skills.oratory = 50
    c.condition.stress = 0
    c.condition.health = 100
    return c
  }

  it('an average character has even odds at difficulty 50', () => {
    const odds = checkOdds(base(), 'oratory', 50)
    expect(odds.chance).toBe(50)
    expect(odds.modifiers.map((m) => m.label)).toEqual([
      'Base',
      'Difficulty',
      'Oratory 50',
      'Charisma 10',
    ])
  })

  it('traits, stress and poor health show up as modifiers; odds stay within 5–95', () => {
    const c = base()
    c.traits = ['charming']
    c.condition.stress = 80
    c.condition.health = 30
    const odds = checkOdds(c, 'oratory', 50)
    expect(odds.modifiers).toContainEqual({ label: 'Charming', value: 5 })
    expect(odds.modifiers).toContainEqual({ label: 'Stress', value: -10 })
    expect(odds.modifiers).toContainEqual({ label: 'Poor health', value: -4 })
    expect(odds.chance).toBe(41)
    expect(checkOdds(c, 'oratory', 500).chance).toBe(5)
    expect(checkOdds(c, 'oratory', -500).chance).toBe(95)
  })

  it('practice has diminishing returns', () => {
    const c = base()
    c.skills.policy = 0
    const first = practise(c, 'policy', 5)
    c.skills.policy = 80
    const late = practise(c, 'policy', 5)
    expect(first).toBeGreaterThan(late)
    expect(late).toBeGreaterThan(0)
    c.skills.policy = 100
    expect(practise(c, 'policy', 50)).toBe(0)
  })
})

describe('condition', () => {
  it('energy follows stamina and traits', () => {
    const c = npc('energy', { traitCount: 0 })
    c.traits = []
    c.attributes.stamina = 10
    expect(energyMax(c)).toBe(10)
    c.attributes.stamina = 18
    expect(energyMax(c)).toBe(12)
    c.traits = ['workaholic']
    expect(energyMax(c)).toBe(14)
  })

  it('traits scale stress; months ease it', () => {
    const c = npc('stress', { traitCount: 0, age: 30 })
    c.traits = ['anxious']
    c.condition.stress = 0
    expect(addStress(c, 20)).toBe(25)
    c.traits = ['resilient']
    c.condition.stress = 50
    monthlyCondition(c, 30, rngFor('m'))
    expect(c.condition.stress).toBe(39)
  })
})

describe('character system', () => {
  it('refills energy, sends a birthday card, and eases stress monthly', () => {
    const world = startWorld({ seed: 'sys', startDate: '2026-10-01' })
    const player = world.characters[world.player!]!
    // Birthday tomorrow.
    player.birthDay = dayFromIso('2003-10-02')
    player.condition.energy = 0
    player.condition.stress = 60
    const engine = new Engine(world)
    const summary = engine.tick()
    expect(player.condition.energy).toBe(energyMax(player))
    const card = summary.notifications.find((n) => n.subject === 'Happy birthday')
    expect(card?.text).toContain('23 already')
    expect(summary.player).toMatchObject({ id: player.id, age: 23 })
    engine.runDays(31)
    expect(player.condition.stress).toBeLessThan(60)
  })
})

describe('queries and saves', () => {
  it('character view lists relations with both opinions', () => {
    const world = startWorld({ seed: 'view' })
    const view = queries.player(world)!
    expect(view.isPlayer).toBe(true)
    expect(view.relations.length).toBeGreaterThanOrEqual(4)
    const parent = view.relations.find((r) => r.kin === 'parent')!
    expect(parent.theirOpinion).not.toBeNull()
    expect(view.odds.oratory.chance).toBeGreaterThanOrEqual(5)
    expect(queries.character(world, { id: 'chr_nobody' })).toBeNull()
  })

  it('v1 saves migrate to an empty cast', () => {
    const world = createWorld({ seed: 'old' }) as unknown as Record<string, unknown>
    const v1 = {
      version: 1,
      savedAt: '2026-01-01T00:00:00Z',
      world: { ...world, characters: { chr_000001: { id: 'chr_000001', name: 'x', birthDay: 0 } } },
    }
    const save = migrate(v1)
    expect(save.version).toBe(2)
    expect(save.world.characters).toEqual({})
    expect(save.world.player).toBeNull()
  })
})
