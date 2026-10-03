import { useId, useState, type KeyboardEvent } from 'react'
import { MagnifyingGlassIcon } from '../kit/icons.ts'
import { matchesSearch } from '../map/search.ts'
import '../kit/controls.css'

export interface PickItem {
  id: string
  name: string
  meta?: string
}

interface SearchPickProps {
  label: string
  placeholder: string
  items: readonly PickItem[]
  onPick: (id: string) => void
  /** Most matches listed. */
  limit?: number
}

/**
 * Type to find a seat or a country (the keyboard way to the map's places): matches appear under
 * the box; Enter takes the first, the arrows move through them.
 */
export function SearchPick({ label, placeholder, items, onPick, limit = 6 }: SearchPickProps) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const listId = useId()
  const matches = query.trim()
    ? items.filter((i) => matchesSearch(i.name, query)).slice(0, limit)
    : []
  const pick = (id: string) => {
    onPick(id)
    setQuery('')
    setActive(0)
  }
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const step = e.key === 'ArrowDown' ? 1 : -1
      setActive((a) => (matches.length ? (a + step + matches.length) % matches.length : 0))
    } else if (e.key === 'Enter' && matches[active]) {
      e.preventDefault()
      pick(matches[active].id)
    } else if (e.key === 'Escape') setQuery('')
  }
  return (
    <div className="search-pick">
      <label className="search-field">
        <MagnifyingGlassIcon className="search-field__icon" aria-hidden />
        <input
          type="search"
          value={query}
          placeholder={placeholder}
          aria-label={label}
          role="combobox"
          aria-expanded={matches.length > 0}
          aria-controls={listId}
          aria-activedescendant={matches[active] ? `${listId}-${active}` : undefined}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
          }}
          onKeyDown={onKeyDown}
        />
      </label>
      {matches.length > 0 && (
        <ul className="search-pick__list" id={listId} role="listbox" aria-label={label}>
          {matches.map((m, i) => (
            <li
              key={m.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className="search-pick__item"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => pick(m.id)}
            >
              <span>{m.name}</span>
              {m.meta && <span className="search-pick__meta">{m.meta}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
