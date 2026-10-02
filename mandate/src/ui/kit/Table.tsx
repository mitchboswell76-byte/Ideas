import { useMemo, useState, type ReactNode } from 'react'
import { cx } from './cx.ts'
import { CaretDownIcon, CaretUpDownIcon, CaretUpIcon } from './icons.ts'
import { nextSort, sortRows, type SortDir, type SortValue } from './table.ts'
import './table.css'

export interface Column<T> {
  key: string
  label: ReactNode
  /** Sort value; a column without one can't be sorted. */
  value?: (row: T) => SortValue
  /** Cell content (default: `value`). */
  render?: (row: T) => ReactNode
  align?: 'left' | 'right' | 'center'
  width?: string
  /** Direction on first click (default: descending for numbers, as in FM). */
  firstDir?: SortDir
}

interface TableProps<T> {
  columns: readonly Column<T>[]
  rows: readonly T[]
  rowKey: (row: T) => string
  /** Accessible name. */
  label: string
  initialSort?: { key: string; dir: SortDir } | null
  /** Selected row key; with `onSelect`, rows are clickable. */
  selected?: string | null
  onSelect?: (row: T) => void
  /** Shown in place of the rows when there are none. */
  empty?: ReactNode
  className?: string
  /** `data-testid` on the body. */
  bodyTestId?: string
}

/** FM-style table: dense, zebra rows, sticky sortable headers, tabular numbers. */
export function Table<T>({
  columns,
  rows,
  rowKey,
  label,
  initialSort = null,
  selected,
  onSelect,
  empty,
  className,
  bodyTestId,
}: TableProps<T>) {
  const [sort, setSort] = useState(initialSort)
  const sorted = useMemo(() => {
    if (!sort) return rows
    const col = columns.find((c) => c.key === sort.key)
    return col?.value ? sortRows(rows, col.value, sort.dir) : rows
  }, [rows, columns, sort])

  return (
    <div className={cx('table-wrap', className)}>
      <table className="table" aria-label={label}>
        <thead>
          <tr>
            {columns.map((col) => {
              const active = sort?.key === col.key
              const SortIcon = !active
                ? CaretUpDownIcon
                : sort.dir === 'asc'
                  ? CaretUpIcon
                  : CaretDownIcon
              return (
                <th
                  key={col.key}
                  scope="col"
                  style={{ width: col.width, textAlign: col.align }}
                  aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                >
                  {col.value ? (
                    <button
                      type="button"
                      className={cx('table__sort', active && 'table__sort--active')}
                      onClick={() => setSort(nextSort(sort, col.key, col.firstDir))}
                    >
                      {col.label}
                      <SortIcon className="table__sort-icon" aria-hidden />
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody data-testid={bodyTestId}>
          {sorted.length === 0 && empty !== undefined ? (
            <tr className="table__empty">
              <td colSpan={columns.length}>{empty}</td>
            </tr>
          ) : (
            sorted.map((row) => {
              const key = rowKey(row)
              return (
                <tr
                  key={key}
                  aria-selected={onSelect ? key === selected : undefined}
                  tabIndex={onSelect ? 0 : undefined}
                  className={cx(onSelect && 'table__row--button')}
                  onClick={onSelect && (() => onSelect(row))}
                  onKeyDown={
                    onSelect &&
                    ((e) => {
                      if (e.key === 'Enter' && e.target === e.currentTarget) onSelect(row)
                    })
                  }
                >
                  {columns.map((col) => (
                    <td key={col.key} style={{ textAlign: col.align }}>
                      {col.render ? col.render(row) : (col.value?.(row) ?? null)}
                    </td>
                  ))}
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
