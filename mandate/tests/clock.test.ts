import { describe, expect, it } from 'vitest'
import {
  MONDAY,
  THURSDAY,
  ageOn,
  civil,
  dayFromCivil,
  dayFromIso,
  isAnniversary,
  isLeapYear,
  nthWeekdayOfMonth,
  toIso,
  weekday,
} from '../src/sim/clock.ts'

describe('clock', () => {
  it('anchors day 0 at 1970-01-01', () => {
    expect(dayFromIso('1970-01-01')).toBe(0)
    expect(toIso(-1)).toBe('1969-12-31')
  })

  it('round-trips ISO dates across century and leap-year edges', () => {
    for (const iso of [
      '1900-02-28',
      '1900-03-01',
      '2000-02-29',
      '2024-02-29',
      '2024-12-31',
      '2026-10-01',
      '2100-02-28',
      '2100-03-01',
      '1066-10-14',
    ]) {
      expect(toIso(dayFromIso(iso))).toBe(iso)
    }
    // Every day in a 450-year span round-trips through civil().
    for (let day = dayFromIso('1800-01-01'); day < dayFromIso('2250-01-01'); day += 1) {
      const { y, m, d } = civil(day)
      if (dayFromCivil(y, m, d) !== day) throw new Error(`civil round-trip failed on ${day}`)
    }
  })

  it('rejects impossible dates', () => {
    expect(() => dayFromIso('2026-02-29')).toThrow(RangeError)
    expect(() => dayFromIso('2026-13-01')).toThrow(RangeError)
    expect(() => dayFromIso('1 Oct 2026')).toThrow(RangeError)
  })

  it('knows leap years', () => {
    expect([1900, 2000, 2024, 2026, 2100].map(isLeapYear)).toEqual([
      false,
      true,
      true,
      false,
      false,
    ])
  })

  it('computes weekdays', () => {
    expect(weekday(dayFromIso('2026-10-01'))).toBe(THURSDAY)
    expect(weekday(dayFromIso('2024-07-04'))).toBe(THURSDAY) // UK general election 2024
    expect(weekday(dayFromIso('1969-12-29'))).toBe(MONDAY)
  })

  it('finds the first Thursday in May (local elections)', () => {
    expect(toIso(nthWeekdayOfMonth(2026, 5, THURSDAY, 1))).toBe('2026-05-07')
    expect(toIso(nthWeekdayOfMonth(2027, 5, THURSDAY, 1))).toBe('2027-05-06')
    expect(() => nthWeekdayOfMonth(2026, 2, MONDAY, 5)).toThrow(RangeError)
  })

  it('ages people on their birthday, and leap-day births on 1 March', () => {
    const born = dayFromIso('2000-10-01')
    expect(ageOn(born, dayFromIso('2026-09-30'))).toBe(25)
    expect(ageOn(born, dayFromIso('2026-10-01'))).toBe(26)
    expect(isAnniversary(born, dayFromIso('2026-10-01'))).toBe(true)
    expect(isAnniversary(born, born)).toBe(false)

    const leap = dayFromIso('2004-02-29')
    expect(isAnniversary(leap, dayFromIso('2027-02-28'))).toBe(false)
    expect(isAnniversary(leap, dayFromIso('2027-03-01'))).toBe(true)
    expect(isAnniversary(leap, dayFromIso('2028-02-29'))).toBe(true)
    expect(isAnniversary(leap, dayFromIso('2028-03-01'))).toBe(false)
  })
})
