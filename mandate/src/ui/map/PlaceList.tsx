import { useState, type KeyboardEvent } from 'react'
import { MagnifyingGlassIcon, type Icon } from '../kit/icons.ts'
import { Panel } from '../kit/index.ts'
import { matchesSearch } from './search.ts'

export interface Place {
  id: string
  name: string
  /** Second line, e.g. the region. */
  meta: string
}

interface PlaceListProps {
  title: string
  icon: Icon
  places: readonly Place[]
  /** Plural noun for the count line, e.g. "seats". */
  noun: string
  /** Placeholder and accessible name of the search box. */
  searchLabel: string
  onPick: (id: string) => void
}

/**
 * The searchable list beside a map: the keyboard and screen-reader way to find a place (and the
 * only way to reach ones too small to click). Enter picks the first match.
 */
export function PlaceList({ title, icon, places, noun, searchLabel, onPick }: PlaceListProps) {
  const [query, setQuery] = useState('')
  const matches = places.filter((p) => matchesSearch(p.name, query))
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && matches[0]) onPick(matches[0].id)
  }
  return (
    <Panel title={title} icon={icon} flush className="place-list">
      <label className="search-field">
        <MagnifyingGlassIcon className="search-field__icon" aria-hidden />
        <input
          type="search"
          value={query}
          placeholder={searchLabel}
          aria-label={searchLabel}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
        />
      </label>
      <p className="place-list__count muted" aria-live="polite">
        {matches.length === places.length
          ? `${places.length} ${noun}`
          : `${matches.length} of ${places.length}`}
      </p>
      {matches.length === 0 ? (
        <p className="empty">Nothing matches “{query.trim()}”.</p>
      ) : (
        <ul className="mini-list place-list__items">
          {matches.map((p) => (
            <li key={p.id}>
              <button type="button" className="mini-list__row" onClick={() => onPick(p.id)}>
                <span className="mini-list__main">
                  <span className="mini-list__title">{p.name}</span>
                  <span className="mini-list__meta">{p.meta}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
