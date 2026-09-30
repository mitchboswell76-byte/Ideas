import { useEffect, useState, type KeyboardEvent } from 'react'
import type { CountryInfo } from '../../data/types.ts'
import { BLOCS, COUNTRIES } from '../../data/world.ts'
import {
  CoinsIcon,
  CrosshairIcon,
  FlagIcon,
  GlobeHemisphereWestIcon,
  HandshakeIcon,
  MagnifyingGlassIcon,
  UsersIcon,
  type Icon,
} from '../kit/icons.ts'
import { Button, Card, Chip, Panel, Tabs, Tooltip, type TabItem } from '../kit/index.ts'
import { WorldMap } from '../map/world/WorldMap.tsx'
import {
  LATER_MODES,
  matchesSearch,
  MODE_LABELS,
  WORLD_MODES,
  type WorldMode,
} from '../map/world/modes.ts'
import { mapStore, useMap } from '../store/map.ts'
import './screens.css'
import './world.css'

const BY_ID: ReadonlyMap<string, CountryInfo> = new Map(COUNTRIES.map((c) => [c.id, c]))

type ModeKey = WorldMode | (typeof LATER_MODES)[number]

const MODE_ICONS: Record<ModeKey, Icon> = {
  political: FlagIcon,
  region: GlobeHemisphereWestIcon,
  blocs: HandshakeIcon,
  relations: UsersIcon,
  economy: CoinsIcon,
}

const LATER = 'Arrives with world diplomacy (M4)'

const TABS: TabItem<ModeKey>[] = [...WORLD_MODES, ...LATER_MODES].map((key) => {
  const ModeIcon = MODE_ICONS[key]
  return {
    key,
    label: (
      <>
        <ModeIcon aria-hidden />
        {MODE_LABELS[key]}
      </>
    ),
    disabled: (LATER_MODES as readonly string[]).includes(key) ? LATER : undefined,
  }
})

/**
 * The World screen (T6): Paradox map modes over a flat world map, with the country card or the
 * country list beside it. The world simulation (leaders, relations, economies) arrives in M4.
 */
export function World() {
  const mode = useMap((s) => s.mode)
  const blocId = useMap((s) => s.bloc)
  const selected = useMap((s) => s.country)
  const bloc = BLOCS.find((b) => b.id === blocId) ?? BLOCS[0]!
  const country = selected ? BY_ID.get(selected) : undefined

  useEffect(() => {
    if (!selected) return
    const onKey = (e: globalThis.KeyboardEvent) =>
      e.key === 'Escape' && mapStore.getState().select(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected])

  return (
    <div className="world-screen">
      <div className="world-screen__bar">
        <Tabs
          label="Map mode"
          tabs={TABS}
          value={mode}
          onChange={(key) => mapStore.getState().setMode(key as WorldMode)}
        />
        {mode === 'blocs' && (
          <div className="world-screen__blocs" role="group" aria-label="Bloc">
            {BLOCS.map((b) => (
              <Tooltip key={b.id} title={b.full} tip={b.about} lockable={false}>
                <Button
                  size="s"
                  variant="quiet"
                  className="world-screen__bloc"
                  aria-pressed={b.id === bloc.id}
                  onClick={() => mapStore.getState().setBloc(b.id)}
                >
                  {b.name}
                </Button>
              </Tooltip>
            ))}
          </div>
        )}
      </div>
      <WorldMap countries={BY_ID} mode={mode} bloc={mode === 'blocs' ? bloc : null} />
      <aside className="world-screen__side">
        {country ? <CountryCard country={country} /> : <CountryList />}
      </aside>
    </div>
  )
}

function CountryLink({ id }: { id: string }) {
  const c = BY_ID.get(id)
  if (!c) return null
  return (
    <button type="button" className="link-button" onClick={() => mapStore.getState().focusOn(c.id)}>
      {c.name}
    </button>
  )
}

function CountryCard({ country }: { country: CountryInfo }) {
  const blocs = BLOCS.filter((b) => country.blocs.includes(b.id))
  const neighbours = [...country.neighbours].sort((a, b) =>
    (BY_ID.get(a)?.name ?? a).localeCompare(BY_ID.get(b)?.name ?? b, 'en'),
  )
  return (
    <Card
      title={country.name}
      icon={FlagIcon}
      className="country-card"
      onClose={() => mapStore.getState().select(null)}
      footer={
        <Button
          variant="primary"
          icon={CrosshairIcon}
          onClick={() => mapStore.getState().focusOn(country.id)}
        >
          Centre on map
        </Button>
      }
    >
      {country.statusText && <p className="country-card__status">{country.statusText}</p>}
      <dl className="facts" data-testid="country-facts">
        <dt>Capital</dt>
        <dd>{country.capital}</dd>
        <dt>Region</dt>
        <dd>
          {country.region} · {country.subregion}
        </dd>
        {country.sovereign && (
          <>
            <dt>Belongs to</dt>
            <dd>
              <CountryLink id={country.sovereign} />
            </dd>
          </>
        )}
        <dt>Blocs</dt>
        <dd>
          {blocs.length ? (
            <span className="chip-row">
              {blocs.map((b) => (
                <Tooltip key={b.id} title={b.full} tip={b.about} focusable>
                  <Chip>{b.name}</Chip>
                </Tooltip>
              ))}
            </span>
          ) : (
            <span className="muted">None of the main blocs</span>
          )}
        </dd>
        <dt>Borders</dt>
        <dd>
          {neighbours.length ? (
            <span className="country-card__links">
              {neighbours.map((id) => (
                <CountryLink key={id} id={id} />
              ))}
            </span>
          ) : (
            <span className="muted">No land borders</span>
          )}
        </dd>
      </dl>
      <p className="muted country-card__later">
        Leaders, relations and the economy arrive with world diplomacy (M4).
      </p>
    </Card>
  )
}

function CountryList() {
  const [query, setQuery] = useState('')
  const matches = COUNTRIES.filter((c) => matchesSearch(c.name, query))
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && matches[0]) mapStore.getState().focusOn(matches[0].id)
  }
  return (
    <Panel title="Countries" icon={GlobeHemisphereWestIcon} flush className="country-list">
      <label className="search-field">
        <MagnifyingGlassIcon className="search-field__icon" aria-hidden />
        <input
          type="search"
          value={query}
          placeholder="Find a country"
          aria-label="Find a country"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
        />
      </label>
      <p className="country-list__count muted" aria-live="polite">
        {matches.length === COUNTRIES.length
          ? `${COUNTRIES.length} countries and territories`
          : `${matches.length} of ${COUNTRIES.length}`}
      </p>
      {matches.length === 0 ? (
        <p className="empty">No country matches “{query.trim()}”.</p>
      ) : (
        <ul className="mini-list country-list__items">
          {matches.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="mini-list__row"
                onClick={() => mapStore.getState().focusOn(c.id)}
              >
                <span className="mini-list__main">
                  <span className="mini-list__title">{c.name}</span>
                  <span className="mini-list__meta">{c.subregion}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
