/**
 * Headless soak test: runs the simulation for many in-game years at max speed and checks
 * for numeric blow-ups and tick-time budget. The engine lands in T2; until then this only
 * confirms the tooling runs.
 */
import { GAME_VERSION } from '../src/sim/version.ts'

console.log(`Mandate ${GAME_VERSION} soak: engine not built yet (T2) — nothing to run.`)
