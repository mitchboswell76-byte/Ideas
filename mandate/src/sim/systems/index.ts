import type { System } from '../scheduler.ts'
import { characterSystem } from './character.ts'

/** Every system, in run order (the order within a tick is fixed — DESIGN §2). */
export const defaultSystems: readonly System[] = [characterSystem]
