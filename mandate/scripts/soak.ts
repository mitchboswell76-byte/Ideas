/**
 * Headless soak test: runs the simulation for many in-game years at max speed and checks
 *  - tick time (p99 must stay within budget),
 *  - no NaN/Infinity anywhere in the world,
 *  - determinism + save round-trip: saving halfway, reloading and continuing must end in exactly
 *    the same world as an uninterrupted run.
 * Usage: npm run soak -- [--years 50] [--seed soak]
 */
import { civil, dayFromCivil, toIso } from '../src/sim/clock.ts'
import { Engine } from '../src/sim/engine.ts'
import { hashJson } from '../src/sim/hash.ts'
import { decodeSave, encodeSave } from '../src/sim/save.ts'
import { GAME_VERSION } from '../src/sim/version.ts'
import { createWorld } from '../src/sim/world.ts'

/** p99 tick budget in ms (speed 5 is "as fast as possible"; tighten once real systems land). */
const P99_BUDGET_MS = 4

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

function findBadNumbers(value: unknown, path = 'world', out: string[] = []): string[] {
  if (typeof value === 'number' && !Number.isFinite(value)) out.push(path)
  else if (Array.isArray(value)) value.forEach((v, i) => findBadNumbers(v, `${path}[${i}]`, out))
  else if (typeof value === 'object' && value !== null) {
    for (const [k, v] of Object.entries(value)) findBadNumbers(v, `${path}.${k}`, out)
  }
  return out
}

const years = Number(arg('years', '50'))
const seed = arg('seed', 'soak')
const failures: string[] = []

const straight = new Engine(createWorld({ seed }))
const start = civil(straight.world.clock.day)
const endDay = dayFromCivil(start.y + years, start.m, start.d)
const totalDays = endDay - straight.world.clock.day
const halfDays = Math.floor(totalDays / 2)

// 1. Uninterrupted run, timing every tick.
const times = new Float64Array(totalDays)
const t0 = performance.now()
for (let i = 0; i < totalDays; i++) {
  const t = performance.now()
  straight.tick()
  times[i] = performance.now() - t
}
const elapsed = performance.now() - t0
times.sort()
const pct = (p: number) => times[Math.min(times.length - 1, Math.floor(times.length * p))]
if (pct(0.99) > P99_BUDGET_MS)
  failures.push(`p99 tick ${pct(0.99).toFixed(3)} ms > ${P99_BUDGET_MS} ms`)

const bad = findBadNumbers(straight.world)
if (bad.length) failures.push(`non-finite numbers at ${bad.slice(0, 5).join(', ')}`)

// 2. Same seed, saved and reloaded halfway.
const split = new Engine(createWorld({ seed }))
split.runDays(halfDays)
const bytes = await encodeSave(split.world, '2000-01-01T00:00:00.000Z')
split.load((await decodeSave(bytes)).world)
split.runDays(totalDays - halfDays)
const hash = hashJson(straight.world)
if (hashJson(split.world) !== hash) failures.push('save/reload run diverged from uninterrupted run')

console.log(`Mandate ${GAME_VERSION} soak — seed "${seed}", ${years} years`)
console.log(
  `  ${toIso(straight.world.clock.startDay)} → ${toIso(straight.world.clock.day)} (${totalDays} ticks)`,
)
console.log(
  `  ${elapsed.toFixed(0)} ms total, ${Math.round(totalDays / (elapsed / 1000))} ticks/s; ` +
    `tick p50 ${pct(0.5).toFixed(3)} ms, p99 ${pct(0.99).toFixed(3)} ms, max ${pct(1).toFixed(3)} ms`,
)
console.log(`  save ${bytes.length} bytes gzipped; world hash ${hash}`)

if (failures.length) {
  for (const f of failures) console.error(`  FAIL: ${f}`)
  process.exit(1)
}
console.log('  OK')
