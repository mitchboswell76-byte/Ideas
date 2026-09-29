import { describe, expect, it } from 'vitest'
import { EventBus } from '../src/sim/bus.ts'

interface TestEvents {
  ping: { n: number }
  pong: { text: string }
}

describe('event bus', () => {
  it('delivers typed payloads in subscription order', () => {
    const bus = new EventBus<TestEvents>()
    const log: string[] = []
    bus.on('ping', ({ n }) => log.push(`first ${n}`))
    bus.on('ping', ({ n }) => log.push(`second ${n}`))
    bus.on('pong', ({ text }) => log.push(text))
    bus.emit('ping', { n: 1 })
    bus.emit('pong', { text: 'hi' })
    expect(log).toEqual(['first 1', 'second 1', 'hi'])
  })

  it('unsubscribes, including from inside a dispatch', () => {
    const bus = new EventBus<TestEvents>()
    const log: number[] = []
    const off = bus.on('ping', ({ n }) => {
      log.push(n)
      off()
    })
    bus.on('ping', ({ n }) => log.push(n * 10))
    bus.emit('ping', { n: 1 })
    bus.emit('ping', { n: 2 })
    expect(log).toEqual([1, 10, 20])
    off() // idempotent
  })

  it('ignores events with no listeners', () => {
    expect(() => new EventBus<TestEvents>().emit('pong', { text: 'x' })).not.toThrow()
  })
})
