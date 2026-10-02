import { describe, expect, it } from 'vitest'
import { speedKeyAction, type KeyInput } from '../src/ui/keys.ts'

const press = (overrides: Partial<KeyInput>): KeyInput => ({
  key: '',
  code: '',
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  repeat: false,
  target: null,
  ...overrides,
})

describe('speed keys', () => {
  it('maps Space to pause/resume and 1–5 to speeds', () => {
    expect(speedKeyAction(press({ key: ' ', code: 'Space' }))).toEqual({ type: 'toggle' })
    expect(speedKeyAction(press({ key: '3', code: 'Digit3' }))).toEqual({ type: 'speed', speed: 3 })
    expect(speedKeyAction(press({ key: '5', code: 'Numpad5' }))).toEqual({
      type: 'speed',
      speed: 5,
    })
    // AZERTY: the physical 1 key types "&" without Shift.
    expect(speedKeyAction(press({ key: '&', code: 'Digit1' }))).toEqual({ type: 'speed', speed: 1 })
  })

  it('ignores other keys, shortcuts and auto-repeat', () => {
    expect(speedKeyAction(press({ key: '6', code: 'Digit6' }))).toBeNull()
    expect(speedKeyAction(press({ key: '0', code: 'Digit0' }))).toBeNull()
    expect(speedKeyAction(press({ key: 'a', code: 'KeyA' }))).toBeNull()
    expect(speedKeyAction(press({ key: '1', code: 'Digit1', ctrlKey: true }))).toBeNull()
    expect(speedKeyAction(press({ key: '2', code: 'Digit2', metaKey: true }))).toBeNull()
    expect(speedKeyAction(press({ key: ' ', code: 'Space', repeat: true }))).toBeNull()
  })

  it('leaves typing in form fields alone', () => {
    for (const tagName of ['INPUT', 'TEXTAREA', 'SELECT']) {
      const target = { tagName } as unknown as EventTarget
      expect(speedKeyAction(press({ key: '1', code: 'Digit1', target }))).toBeNull()
    }
    const editable = { tagName: 'DIV', isContentEditable: true } as unknown as EventTarget
    expect(speedKeyAction(press({ key: ' ', code: 'Space', target: editable }))).toBeNull()
    const button = { tagName: 'BUTTON' } as unknown as EventTarget
    expect(speedKeyAction(press({ key: ' ', code: 'Space', target: button }))).toEqual({
      type: 'toggle',
    })
  })
})
