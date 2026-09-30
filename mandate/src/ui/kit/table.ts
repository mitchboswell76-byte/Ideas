/** Sorting for FM-style tables. Pure. */

export type SortDir = 'asc' | 'desc'
export type SortValue = string | number | null | undefined

const collator = new Intl.Collator('en-GB', { numeric: true, sensitivity: 'base' })

function compare(a: SortValue, b: SortValue): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return collator.compare(String(a), String(b))
}

const isBlank = (v: SortValue): v is null | undefined | '' =>
  v === null || v === undefined || v === '' || (typeof v === 'number' && Number.isNaN(v))

/**
 * A sorted copy. Stable (ties keep their order), numbers compare as numbers, text naturally
 * ("Seat 2" before "Seat 10"), and blanks go last in either direction.
 */
export function sortRows<T>(rows: readonly T[], value: (row: T) => SortValue, dir: SortDir): T[] {
  const sign = dir === 'asc' ? 1 : -1
  return rows
    .map((row, index) => ({ row, index, v: value(row) }))
    .sort((a, b) => {
      const blankA = isBlank(a.v)
      const blankB = isBlank(b.v)
      if (blankA || blankB) return blankA === blankB ? a.index - b.index : blankA ? 1 : -1
      return sign * compare(a.v, b.v) || a.index - b.index
    })
    .map((e) => e.row)
}

/** Clicking a header: a new column sorts `first`; the same column flips. */
export function nextSort(
  current: { key: string; dir: SortDir } | null,
  key: string,
  first: SortDir = 'desc',
): { key: string; dir: SortDir } {
  if (current?.key !== key) return { key, dir: first }
  return { key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
}
