/**
 * Character upkeep (DESIGN §4): energy refills each morning, birthdays reach the player's inbox,
 * and each month stress eases and health drifts with age.
 */
import { BURNOUT_STRESS, energyMax, monthlyCondition } from '../character/condition.ts'
import { isAlive, type Character } from '../character/model.ts'
import { ageOn, isAnniversary } from '../clock.ts'
import type { System } from '../scheduler.ts'
import type { World } from '../world.ts'

/** Days between burnout warnings. */
const BURNOUT_WARNING_GAP = 90
const BURNOUT_FLAG = 'burnoutWarnedDay'

function living(world: World): Character[] {
  return Object.values(world.characters).filter(isAlive)
}

/** What the player calls a parent. */
function parentName(parent: Character): string {
  return parent.gender === 'female' ? 'Mum' : parent.gender === 'male' ? 'Dad' : parent.givenName
}

function birthdayCard(world: World, player: Character, age: number) {
  const parents = Object.entries(player.relationships)
    .filter(([, r]) => r?.kin === 'parent')
    .map(([id]) => world.characters[id as Character['id']])
    .filter((p): p is Character => !!p && isAlive(p))
    .sort(
      (a, b) =>
        (b.relationships[player.id]?.opinion ?? 0) - (a.relationships[player.id]?.opinion ?? 0),
    )
  const from = parents[0]
  if (!from) return { kind: 'info' as const, subject: 'Birthday', text: `You are ${age} today.` }
  return {
    kind: 'info' as const,
    from: `${from.givenName} ${from.familyName}`,
    subject: 'Happy birthday',
    text: `Happy birthday, love. ${age} already! Call when you get a minute.\n\n${parentName(from)}`,
    ref: from.id,
  }
}

export const characterSystem: System = {
  id: 'character',
  cadence: 'daily',
  run(world, ctx) {
    for (const c of living(world)) c.condition.energy = energyMax(c)
    const player = world.player ? world.characters[world.player] : undefined
    if (player && isAlive(player) && isAnniversary(player.birthDay, ctx.day)) {
      ctx.emit(birthdayCard(world, player, ageOn(player.birthDay, ctx.day)))
    }
  },
  on: {
    monthStarted({ day }, world, ctx) {
      for (const c of living(world)) monthlyCondition(c, ageOn(c.birthDay, day), ctx.rng)
      const player = world.player ? world.characters[world.player] : undefined
      if (!player || player.condition.stress < BURNOUT_STRESS) return
      const last = world.flags[BURNOUT_FLAG]
      if (typeof last === 'number' && day - last < BURNOUT_WARNING_GAP) return
      world.flags[BURNOUT_FLAG] = day
      ctx.emit({
        kind: 'alert',
        from: 'Your GP',
        subject: 'Burnout warning',
        text: `Your stress is at ${player.condition.stress}. Rest, or your health will suffer.`,
        ref: player.id,
      })
    },
  },
}
