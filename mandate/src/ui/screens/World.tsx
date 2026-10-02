import type { CountryInfo } from '../../data/types.ts'
import { BLOCS, COUNTRIES } from '../../data/world.ts'
import {
  CoinsIcon,
  CrosshairIcon,
  FlagIcon,
  GlobeHemisphereWestIcon,
  HandshakeIcon,
  UsersIcon,
  type Icon,
} from '../kit/icons.ts'
import { Button, Card, Chip, Tabs, Tooltip, type TabItem } from '../kit/index.ts'
import '../map/map-screen.css'
import { PlaceList } from '../map/PlaceList.tsx'
import { useEscapeDeselect } from '../map/useEscapeDeselect.ts'
import { LATER_MODES, MODE_LABELS, WORLD_MODES, type WorldMode } from '../map/world/modes.ts'
import { WorldMap } from '../map/world/WorldMap.tsx'
import { useMapState, worldMapStore } from '../store/map.ts'
import './screens.css'
import './world.css'

const BY_ID: ReadonlyMap<string, CountryInfo> = new Map(COUNTRIES.map((c) => [c.id, c]))
const PLACES = COUNTRIES.map((c) => ({ id: c.id, name: c.name, meta: c.subregion }))
const focusOn = (id: string) => worldMapStore.getState().focusOn(id)

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
  const mode = useMapState(worldMapStore, (s) => s.mode)
  const blocId = useMapState(worldMapStore, (s) => s.option)
  const selected = useMapState(worldMapStore, (s) => s.selected)
  const bloc = BLOCS.find((b) => b.id === blocId) ?? BLOCS[0]!
  const country = selected ? BY_ID.get(selected) : undefined
  useEscapeDeselect(worldMapStore)

  return (
    <div className="map-screen">
      <div className="map-screen__bar">
        <Tabs
          label="Map mode"
          tabs={TABS}
          value={mode}
          onChange={(key) => worldMapStore.getState().setMode(key as WorldMode)}
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
                  onClick={() => worldMapStore.getState().setOption(b.id)}
                >
                  {b.name}
                </Button>
              </Tooltip>
            ))}
          </div>
        )}
      </div>
      <WorldMap countries={BY_ID} mode={mode} bloc={mode === 'blocs' ? bloc : null} />
      <aside className="map-screen__side">
        {country ? (
          <CountryCard country={country} />
        ) : (
          <PlaceList
            title="Countries"
            icon={GlobeHemisphereWestIcon}
            places={PLACES}
            noun="countries and territories"
            searchLabel="Find a country"
            onPick={focusOn}
          />
        )}
      </aside>
    </div>
  )
}

function CountryLink({ id }: { id: string }) {
  const c = BY_ID.get(id)
  if (!c) return null
  return (
    <button type="button" className="link-button" onClick={() => focusOn(c.id)}>
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
      onClose={() => worldMapStore.getState().select(null)}
      footer={
        <Button variant="primary" icon={CrosshairIcon} onClick={() => focusOn(country.id)}>
          Centre on map
        </Button>
      }
    >
      {country.statusText && <p className="place-card__status">{country.statusText}</p>}
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
            <span className="place-card__links">
              {neighbours.map((id) => (
                <CountryLink key={id} id={id} />
              ))}
            </span>
          ) : (
            <span className="muted">No land borders</span>
          )}
        </dd>
      </dl>
      <p className="muted place-card__later">
        Leaders, relations and the economy arrive with world diplomacy (M4).
      </p>
    </Card>
  )
}
