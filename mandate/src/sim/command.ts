import type { SystemContext } from './scheduler.ts'
import type { World } from './world.ts'

/**
 * An instruction from the UI (e.g. start an activity, choose an event option). Plain,
 * structured-cloneable data; `type` selects the handler. Queued and applied at the start of
 * the next tick (DESIGN §3).
 */
export interface Command {
  readonly type: string
}

export type CommandHandler<C extends Command = Command> = (
  command: C,
  world: World,
  ctx: SystemContext,
) => void

/** Wrap a handler for a specific command shape so it can sit in a system's `commands` map. */
export function defineCommand<C extends Command>(handler: CommandHandler<C>): CommandHandler {
  return handler as CommandHandler
}
