/**
 * The people a new career starts with (until character creation, T10, lets the player choose):
 * the player in their early twenties, their parents, perhaps a sibling, a friend and a rival.
 */
import { createWorld, type CreateWorldOptions, type World } from '../world.ts'
import { Rng } from '../rng.ts'
import { generateCharacter, heritageById, HERITAGES, relate } from './generate.ts'
import type { Character } from './model.ts'

const between = (rng: Rng, min: number, max: number) => rng.int(min, max)

export function createStartingCast(world: World, rng: Rng): Character {
  const playerAge = rng.int(21, 26)
  const mother = generateCharacter(world, rng, {
    gender: 'female',
    age: playerAge + rng.int(23, 36),
  })
  const sameHeritage = rng.chance(0.85)
  const father = generateCharacter(world, rng, {
    gender: 'male',
    age: playerAge + rng.int(24, 38),
    heritage: sameHeritage
      ? mother.background.heritage
      : rng.weighted(HERITAGES, (h) => h.weight).id,
    classOrigin: mother.background.classOrigin,
    nation: mother.background.birthplace.nation,
  })
  if (rng.chance(0.6)) mother.familyName = father.familyName
  const parents = rng.chance(0.5) ? [father, mother] : [mother, father]
  const player = generateCharacter(world, rng, {
    age: playerAge,
    parents,
    familyName: father.familyName,
    traitCount: rng.int(3, 4),
  })
  // Mixed families: the player's names come from either side.
  if (!sameHeritage && rng.chance(0.5)) {
    const pool = heritageById(mother.background.heritage)
    player.givenName = rng.pick(player.gender === 'male' ? pool.male : pool.female)
  }

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

  if (rng.chance(0.6)) {
    const sibling = generateCharacter(world, rng, {
      age: Math.max(10, playerAge + rng.pick([-1, 1]) * rng.int(2, 8)),
      parents,
      familyName: player.familyName,
    })
    for (const parent of [mother, father]) {
      relate(parent, sibling, { opinion: between(rng, 50, 90), tags: ['family'], kin: 'child' })
      relate(sibling, parent, { opinion: between(rng, 25, 85), tags: ['family'], kin: 'parent' })
    }
    relate(player, sibling, { opinion: between(rng, 5, 75), tags: ['family'], kin: 'sibling' })
    relate(sibling, player, { opinion: between(rng, 5, 75), tags: ['family'], kin: 'sibling' })
  }

  const friend = generateCharacter(world, rng, { age: playerAge + rng.int(-2, 2) })
  relate(player, friend, { opinion: between(rng, 45, 85), tags: ['friend'] })
  relate(friend, player, { opinion: between(rng, 45, 85), tags: ['friend'] })

  const rival = generateCharacter(world, rng, { age: playerAge + rng.int(-3, 4) })
  relate(player, rival, { opinion: between(rng, -55, -20), tags: ['rival'] })
  relate(rival, player, { opinion: between(rng, -60, -15), tags: ['rival'] })

  world.player = player.id
  return player
}

/** A new career: an empty world plus the starting cast (DESIGN §4). */
export function startWorld(options: CreateWorldOptions): World {
  const world = createWorld(options)
  createStartingCast(world, new Rng(world.rngState))
  return world
}
