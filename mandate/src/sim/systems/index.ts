import type { System } from '../scheduler.ts'

/** Every system, in run order (the order within a tick is fixed — DESIGN §2). Filled from T9 on. */
export const defaultSystems: readonly System[] = []
