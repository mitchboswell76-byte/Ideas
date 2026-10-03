import { EventBus, type SimEventMap } from './bus.ts'
import { energyMax } from './character/condition.ts'
import { fullName } from './character/model.ts'
import { ageOn, toIso } from './clock.ts'
import type { Command, CommandHandler } from './command.ts'
import { Rng } from './rng.ts'
import { isDue, type Notification, type System, type SystemContext } from './scheduler.ts'
import { defaultSystems } from './systems/index.ts'
import type { World } from './world.ts'

/** The player's headline numbers, sent with every tick (details come from queries). */
export interface PlayerSummary {
  id: string
  name: string
  age: number
  health: number
  stress: number
  energy: number
  energyMax: number
  /** Personal colour id (`PERSONAL_COLOURS`), for `--you`. */
  colour: string | null
}

/** What the UI receives after each tick. */
export interface TickSummary {
  day: number
  date: string
  notifications: Notification[]
  player: PlayerSummary | null
}

export function summarisePlayer(world: World): PlayerSummary | null {
  const c = world.player ? world.characters[world.player] : undefined
  if (!c) return null
  const { health, stress, energy } = c.condition
  return {
    id: c.id,
    name: fullName(c),
    age: ageOn(c.birthDay, world.clock.day),
    health,
    stress,
    energy,
    energyMax: energyMax(c),
    colour: c.colour ?? null,
  }
}

type AnyListener = (payload: unknown, world: World, ctx: SystemContext) => void

/**
 * Runs the simulation one day at a time. Pure and deterministic: the same World, systems and
 * commands always produce the same result. Runs in a Web Worker, on the main thread or in Node.
 */
export class Engine {
  world: World
  readonly bus = new EventBus<SimEventMap>()
  private readonly systems: readonly System[]
  private readonly handlers = new Map<string, CommandHandler>()
  private queue: Command[] = []
  private notifications: Notification[] = []
  private rng: Rng
  private ctx: SystemContext
  private readonly emit = (notification: Notification): void => {
    this.notifications.push(notification)
  }

  constructor(world: World, systems: readonly System[] = defaultSystems) {
    this.world = world
    this.systems = systems
    const ids = new Set<string>()
    for (const system of systems) {
      if (ids.has(system.id)) throw new Error(`Duplicate system id: ${system.id}`)
      ids.add(system.id)
      if ((system.cadence === undefined) !== (system.run === undefined)) {
        throw new Error(`System ${system.id} needs both cadence and run, or neither`)
      }
      for (const [type, handler] of Object.entries(system.commands ?? {})) {
        if (this.handlers.has(type)) throw new Error(`Command ${type} has two handlers`)
        this.handlers.set(type, handler)
      }
      for (const [type, listener] of Object.entries(system.on ?? {})) {
        const fn = listener as unknown as AnyListener
        this.bus.on(type as keyof SimEventMap, (payload) => fn(payload, this.world, this.ctx))
      }
    }
    this.rng = new Rng(world.rngState)
    this.ctx = this.context(world.clock.day)
  }

  /** Queue a command; it is applied at the start of the next tick. */
  enqueue(command: Command): void {
    this.queue.push(command)
  }

  /**
   * Advance to the next day and simulate it: apply queued commands, publish the day/week/month/
   * year bus events, then run the systems due today in registration order.
   */
  tick(): TickSummary {
    const world = this.world
    const day = world.clock.day + 1
    world.clock.day = day
    this.ctx = this.context(day)

    const commands = this.queue
    this.queue = []
    for (const command of commands) this.apply(command)

    this.bus.emit('dayStarted', { day })
    if (isDue('weekly', day)) this.bus.emit('weekStarted', { day })
    if (isDue('monthly', day)) this.bus.emit('monthStarted', { day })
    if (isDue('yearly', day)) this.bus.emit('yearStarted', { day })

    for (const system of this.systems) {
      if (system.cadence && system.run && isDue(system.cadence, day)) system.run(world, this.ctx)
    }

    const notifications = this.notifications
    this.notifications = []
    return { day, date: toIso(day), notifications, player: summarisePlayer(world) }
  }

  /** Run several ticks; returns one summary covering them all. */
  runDays(days: number): TickSummary {
    const notifications: Notification[] = []
    for (let i = 0; i < days; i++) notifications.push(...this.tick().notifications)
    const day = this.world.clock.day
    return { day, date: toIso(day), notifications, player: summarisePlayer(this.world) }
  }

  /** Swap in another World (e.g. a loaded save). Pending commands are dropped. */
  load(world: World): void {
    this.world = world
    this.rng = new Rng(world.rngState)
    this.ctx = this.context(world.clock.day)
    this.queue = []
    this.notifications = []
  }

  private apply(command: Command): void {
    const handler = this.handlers.get(command.type)
    if (!handler) {
      this.emit({ kind: 'alert', text: `Unknown command: ${command.type}` })
      return
    }
    handler(command, this.world, this.ctx)
    this.bus.emit('commandApplied', { command })
  }

  private context(day: number): SystemContext {
    return { rng: this.rng, bus: this.bus, day, emit: this.emit }
  }
}
