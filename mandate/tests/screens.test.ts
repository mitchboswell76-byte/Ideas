import { describe, expect, it } from 'vitest'
import {
  addMonths,
  daysBetween,
  fixturesFor,
  monthGrid,
  upcomingFixtures,
  yearMonthOf,
} from '../src/ui/calendar.ts'
import { paragraphsOf, senderOf, subjectOf, SUBJECT_MAX } from '../src/ui/mail.ts'

describe('calendar', () => {
  it('lays October 2026 out in Monday-first weeks', () => {
    const weeks = monthGrid({ y: 2026, m: 10 })
    expect(weeks).toHaveLength(5)
    expect(weeks.every((w) => w.length === 7)).toBe(true)
    expect(weeks[0]![0]).toMatchObject({ iso: '2026-09-28', d: 28, inMonth: false })
    expect(weeks[0]![3]).toMatchObject({ iso: '2026-10-01', d: 1, inMonth: true })
    expect(weeks[4]![6]).toMatchObject({ iso: '2026-11-01', inMonth: false })
  })

  it('needs only four rows when a month fits exactly', () => {
    const weeks = monthGrid({ y: 2027, m: 2 })
    expect(weeks).toHaveLength(4)
    expect(weeks[0]![0]!.iso).toBe('2027-02-01')
    expect(weeks[3]![6]!.iso).toBe('2027-02-28')
  })

  it('steps months across years', () => {
    expect(addMonths({ y: 2026, m: 12 }, 1)).toEqual({ y: 2027, m: 1 })
    expect(addMonths({ y: 2027, m: 1 }, -1)).toEqual({ y: 2026, m: 12 })
    expect(addMonths({ y: 2026, m: 10 }, 15)).toEqual({ y: 2028, m: 1 })
    expect(yearMonthOf('2026-10-01')).toEqual({ y: 2026, m: 10 })
  })

  it('puts local elections on the first Thursday in May', () => {
    expect(fixturesFor({ y: 2027, m: 5 })).toEqual([
      { iso: '2027-05-06', kind: 'election', label: 'Local elections' },
    ])
    expect(fixturesFor({ y: 2027, m: 4 })).toEqual([])
    expect(upcomingFixtures('2026-10-01').map((e) => e.iso)).toEqual(['2027-05-06'])
    expect(upcomingFixtures('2027-05-07', 12).map((e) => e.iso)).toEqual(['2028-05-04'])
    expect(daysBetween('2026-10-01', '2027-05-06')).toBe(217)
  })
})

describe('mail', () => {
  it('defaults the sender by kind', () => {
    expect(senderOf({ kind: 'news' })).toBe('News desk')
    expect(senderOf({ kind: 'alert', from: 'Chief Whip' })).toBe('Chief Whip')
  })

  it('takes the subject from the first sentence, cut short', () => {
    expect(subjectOf({ text: 'The count is in. Turnout was low.' })).toBe('The count is in.')
    expect(subjectOf({ text: 'First line\nSecond' })).toBe('First line')
    expect(subjectOf({ text: 'x', subject: 'Given' })).toBe('Given')
    const long = subjectOf({ text: 'word '.repeat(40) })
    expect(long.length).toBeLessThanOrEqual(SUBJECT_MAX)
    expect(long.endsWith('…')).toBe(true)
  })

  it('splits paragraphs on blank lines', () => {
    expect(paragraphsOf('One.\n\nTwo\nstill two.\n\n\n Three ')).toEqual([
      'One.',
      'Two\nstill two.',
      'Three',
    ])
  })
})
