/**
 * The people a new career starts with: the player (from the creator's `CharacterSpec`, or a random
 * one), their parents, any siblings, a friend and a rival. The family is generated around the
 * player: same roots and class, the household's politics, and a resemblance to the chosen face.
 */
import { createWorld, type CreateWorldOptions, type World } from '../world.ts'
import { Rng } from '../rng.ts'
import { clamp, type Character } from './model.ts'
import { SKIN_TONES } from './appearance.ts'
import {
  createPlayer,
  HOUSEHOLD_LEAN,
  randomSpec,
  specProblems,
  type CharacterSpec,
  type StartMode,
} from './create.ts'
import { generateCharacter, heritageById, HERITAGES, ideologyAt, relate } from './generate.ts'

const between = (rng: Rng, min: number, max: number) => rng.int(min, max)

const DAYS_PER_YEAR = 365.2425

/** Parents past 78 may have died (from 60 at the earliest). */
function maybeDied(rng: Rng, parent: Character, age: number, today: number): void {
  if (age < 78 || !rng.chance(Math.min(0.95, (age - 75) / 20))) return
  const yearsAgo = rng.int(0, Math.min(age - 60, 25))
  parent.deathDay = today - Math.floor(yearsAgo * DAYS_PER_YEAR) - rng.int(1, 364)
}

export function createStartingCast(world: World, rng: Rng, spec: CharacterSpec): Character {
  const today = world.clock.day
  const nation = spec.birthplace.nation ?? spec.home.nation
  const player = createPlayer(world, rng, spec)
  const playerAge = spec.age

  const motherAge = playerAge + rng.int(23, 36)
  const mother = generateCharacter(world, rng, {
    gender: 'female',
    age: motherAge,
    heritage: spec.heritage,
    classOrigin: spec.classOrigin,
    nation,
  })
  const sameHeritage = rng.chance(0.85)
  const fatherAge = playerAge + rng.int(24, 38)
  const father = generateCharacter(world, rng, {
    gender: 'male',
    age: fatherAge,
    heritage: sameHeritage ? spec.heritage : rng.weighted(HERITAGES, (h) => h.weight).id,
    classOrigin: spec.classOrigin,
    nation,
  })
  // The surname came from somewhere: usually the father's, sometimes both parents share it.
  father.familyName = player.familyName
  if (rng.chance(0.6)) mother.familyName = player.familyName
  else if (mother.familyName === player.familyName)
    mother.familyName = rng.pick(heritageById(spec.heritage).family)
  const parents = rng.chance(0.5) ? [father, mother] : [mother, father]

  // The player's face is chosen, so the parents take after it, not the other way round.
  const look = player.appearance
  for (const parent of parents) {
    parent.appearance.skin = clamp(look.skin + rng.pick([-1, 0, 0, 1]), 0, SKIN_TONES.length - 1)
  }
  rng.pick(parents).appearance.hair.colour = look.hair.colour
  rng.pick(parents).appearance.eyes.colour = look.eyes.colour

  const lean = HOUSEHOLD_LEAN[spec.household]
  for (const parent of parents) {
    if (lean)
      parent.ideology = ideologyAt(
        rng,
        lean.econ + rng.normal(0, 18),
        lean.social + rng.normal(0, 18),
      )
    parent.background.religion = rng.chance(0.8) ? spec.religion : parent.background.religion
  }
  maybeDied(rng, mother, motherAge, today)
  maybeDied(rng, father, fatherAge, today)

  for (const parent of [mother, father]) {
    relate(parent, player, { opinion: between(rng, 55, 90), tags: ['family'], kin: 'child' })
    relate(player, parent, { opinion: between(rng, 25, 85), tags: ['family'], kin: 'parent' })
  }
  const together = between(rng, 10, 80)
  relate(mother, father, { opinion: together, tags: ['family', 'partner'], kin: 'partner' })
  relate(father, mother, {
    opinion: together + rng.int(-10, 10),
    tags: ['family', 'partner'],
    kin: 'partner',
  })

  const siblings: Character[] = []
  for (let i = 0; i < spec.siblings; i++) {
    const sibling = generateCharacter(world, rng, {
      age: Math.max(10, playerAge + rng.pick([-1, 1]) * rng.int(1, 8)),
      parents,
      familyName: player.familyName,
    })
    for (const parent of [mother, father]) {
      relate(parent, sibling, { opinion: between(rng, 50, 90), tags: ['family'], kin: 'child' })
      relate(sibling, parent, { opinion: between(rng, 25, 85), tags: ['family'], kin: 'parent' })
    }
    for (const other of [player, ...siblings]) {
      relate(other, sibling, { opinion: between(rng, 5, 75), tags: ['family'], kin: 'sibling' })
      relate(sibling, other, { opinion: between(rng, 5, 75), tags: ['family'], kin: 'sibling' })
    }
    siblings.push(sibling)
  }

  const friend = generateCharacter(world, rng, { age: playerAge + rng.int(-2, 2), nation })
  relate(player, friend, { opinion: between(rng, 45, 85), tags: ['friend'] })
  relate(friend, player, { opinion: between(rng, 45, 85), tags: ['friend'] })

  const rival = generateCharacter(world, rng, { age: playerAge + rng.int(-3, 4), nation })
  relate(player, rival, { opinion: between(rng, -55, -20), tags: ['rival'] })
  relate(rival, player, { opinion: between(rng, -60, -15), tags: ['rival'] })

  world.player = player.id
  world.meta.startMode = spec.startMode
  return player
}

export interface NewGameOptions extends CreateWorldOptions {
  /** The creator's character; omitted, the player is random (tests, soak, quick start). */
  player?: CharacterSpec
}

/** A new career: an empty world plus the starting cast (DESIGN §4). Throws on an invalid spec. */
export function startWorld({ player, ...options }: NewGameOptions): World {
  if (player) {
    const problems = specProblems(player)
    if (problems.length > 0)
      throw new Error(`Can't start this career: ${problems.map((p) => p.message).join('; ')}`)
  }
  const world = createWorld(options)
  const rng = new Rng(world.rngState)
  createStartingCast(world, rng, player ?? randomSpec(rng))
  return world
}

export type { CharacterSpec, StartMode }
