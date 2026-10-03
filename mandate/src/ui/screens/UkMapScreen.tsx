import { useMemo, useState, type CSSProperties } from 'react'
import type { CensusField, Ge2024Party, SeatType } from '../../data/types.ts'
import {
  ArrowsLeftRightIcon,
  ChartLineIcon,
  CrosshairIcon,
  FlagIcon,
  MapPinIcon,
  MapTrifoldIcon,
  UsersIcon,
  type Icon,
} from '../kit/icons.ts'
import {
  Button,
  Card,
  Chip,
  cx,
  formatCount,
  formatPercent,
  Segmented,
  Table,
  Tabs,
  type Column,
  type SegmentItem,
  type TabItem,
} from '../kit/index.ts'
import '../map/map-screen.css'
import { MapKey, type KeyHighlight } from '../map/MapKey.tsx'
import { MapOnlyToggle } from '../map/MapOnlyToggle.tsx'
import { PlaceList } from '../map/PlaceList.tsx'
import {
  CENSUS_FIELDS,
  PARTY_COLOURS,
  partyName,
  PLACES as CITIES,
  REGION_NAME,
  SEAT_BY_ID,
  SEAT_DATA,
  SEAT_LIST,
  SEATS,
} from '../map/uk/data.ts'
import {
  breaksFor,
  CHANGE_PARTIES,
  coverageOf,
  formatField,
  majorityShare,
  mapKeyFor,
  parseChangeMeasure,
  signed,
  turnoutShare,
  UK_MODE_LABELS,
  UK_MODES,
  type ModeSpec,
  type UkMode,
} from '../map/uk/modes.ts'
import { UkMap } from '../map/uk/UkMap.tsx'
import { useEscapeDeselect } from '../map/useEscapeDeselect.ts'
import {
  ukLayoutStore,
  ukMapStore,
  useMapOnly,
  useMapState,
  useUkLayout,
  type UkLayout,
} from '../store/map.ts'
import './screens.css'
import './uk-map.css'

const MODE_ICONS: Record<UkMode, Icon> = {
  party: FlagIcon,
  majority: ChartLineIcon,
  turnout: UsersIcon,
  demographics: MapTrifoldIcon,
  change: ArrowsLeftRightIcon,
}

const TABS: TabItem<UkMode>[] = UK_MODES.map((key) => {
  const ModeIcon = MODE_ICONS[key]
  return {
    key,
    label: (
      <>
        <ModeIcon aria-hidden />
        {UK_MODE_LABELS[key]}
      </>
    ),
  }
})

const FIELDS = Object.entries(CENSUS_FIELDS) as [CensusField, string][]
const isField = (v: string): v is CensusField => v in CENSUS_FIELDS

/** Census measures grouped by where they have figures, widest coverage first. */
const FIELD_GROUPS = (() => {
  const groups = new Map<string, [CensusField, string][]>()
  for (const entry of FIELDS) {
    const where = coverageOf(SEAT_LIST, entry[0])
    groups.set(where, [...(groups.get(where) ?? []), entry])
  }
  return [...groups].sort((a, b) => b[1].length - a[1].length)
})()

const PLACES = [...SEATS]
  .sort((a, b) => a.name.localeCompare(b.name, 'en'))
  .map((s) => ({ id: s.id, name: s.name, meta: REGION_NAME.get(s.region) ?? '' }))

const focusOn = (id: string) => ukMapStore.getState().focusOn(id)

const LAYOUTS: SegmentItem<UkLayout>[] = [
  { key: 'map', label: 'Map' },
  { key: 'hex', label: 'Hexes' },
]

/** Jump to a city on the real map, where London's seats are slivers from afar. */
function CityZoom() {
  return (
    <label className="map-screen__option">
      Zoom to
      <select
        value=""
        onChange={(e) => {
          const city = CITIES.find((c) => c.name === e.target.value)
          if (city) ukMapStore.getState().frame(city.box)
        }}
      >
        <option value="" disabled>
          City…
        </option>
        {CITIES.map((c) => (
          <option key={c.name} value={c.name}>
            {c.name}
          </option>
        ))}
      </select>
    </label>
  )
}

/** The Since 2019 picker: who gained, the Con–Lab swing, or one party's change in share. */
function MeasurePicker({ value }: { value: string }) {
  return (
    <label className="map-key__measure">
      <span className="visually-hidden">Measure</span>
      <select value={value} onChange={(e) => ukMapStore.getState().setOption(e.target.value)}>
        <option value="gains">Seats that changed hands</option>
        <option value="swing">Swing, Conservative to Labour</option>
        <optgroup label="Change in vote share">
          {CHANGE_PARTIES.map((p) => (
            <option key={p} value={p}>
              {partyName(p)}
            </option>
          ))}
        </optgroup>
      </select>
    </label>
  )
}

/** The Demographics picker: census measures grouped by where they have figures. */
function FieldPicker({ value }: { value: CensusField }) {
  return (
    <label className="map-key__measure">
      <span className="visually-hidden">Measure</span>
      <select value={value} onChange={(e) => ukMapStore.getState().setOption(e.target.value)}>
        {FIELD_GROUPS.map(([where, fields]) => (
          <optgroup key={where} label={where}>
            {fields.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  )
}

/**
 * The Map screen: the 650 Westminster seats on their real boundaries (or as equal hexes) with
 * Paradox-style modes, and the constituency card or seat list beside it. Since 2019 compares with
 * the notional 2019 result (Commons Library); 3D seat columns arrive with election night (T18).
 */
export function UkMapScreen() {
  const mode = useMapState(ukMapStore, (s) => s.mode)
  const options = useMapState(ukMapStore, (s) => s.options)
  const selected = useMapState(ukMapStore, (s) => s.selected)
  const { layout } = useUkLayout()
  const { mapOnly } = useMapOnly()
  const fieldOption = options.demographics ?? ''
  const field: CensusField = isField(fieldOption) ? fieldOption : 'age65plus'
  const measure = parseChangeMeasure(options.change ?? 'gains')
  useEscapeDeselect(ukMapStore)

  const spec = useMemo<ModeSpec>(
    () => ({
      mode,
      field,
      measure,
      breaks: breaksFor(SEAT_LIST, { mode, field, measure }),
      colours: PARTY_COLOURS,
    }),
    [mode, field, measure],
  )
  const keyData = useMemo(
    () => mapKeyFor(SEAT_LIST, spec, partyName, CENSUS_FIELDS[field]),
    [spec, field],
  )
  // A picked-out key entry belongs to the mode it was picked in.
  const context = `${mode}:${field}:${measure}`
  const [pick, setPick] = useState<KeyHighlight & { context: string }>({
    context,
    preview: null,
    pinned: null,
  })
  const highlight: KeyHighlight = pick.context === context ? pick : { preview: null, pinned: null }
  const lit = highlight.preview ?? highlight.pinned

  return (
    <div
      className={cx(
        'map-screen',
        'map-screen--tall',
        mapOnly && 'map-screen--map-only',
        mapOnly && !(selected && SEAT_BY_ID.has(selected)) && 'map-screen--bare',
      )}
    >
      <div className="map-screen__bar">
        <Tabs
          label="Map mode"
          tabs={TABS}
          value={mode}
          onChange={(key) => ukMapStore.getState().setMode(key as UkMode)}
        />
        <div className="map-screen__tools">
          <MapOnlyToggle />
          {layout === 'map' && <CityZoom />}
          <Segmented
            label="Map layout"
            items={LAYOUTS}
            value={layout}
            onChange={(next) => ukLayoutStore.getState().setLayout(next)}
          />
        </div>
      </div>
      <div className="map-screen__key">
        <MapKey
          data={keyData}
          heading={
            mode === 'demographics' ? (
              <FieldPicker value={field} />
            ) : mode === 'change' ? (
              <MeasurePicker value={measure} />
            ) : undefined
          }
          highlight={highlight}
          onHighlight={(next) => setPick({ ...next, context })}
        />
      </div>
      <UkMap layout={layout} spec={spec} lit={lit} />
      <aside className="map-screen__side">
        {selected && SEAT_BY_ID.has(selected) ? (
          <SeatCard id={selected} />
        ) : (
          <PlaceList
            title="Constituencies"
            icon={MapPinIcon}
            places={PLACES}
            noun="seats"
            searchLabel="Find a constituency"
            onPick={focusOn}
          />
        )}
      </aside>
    </div>
  )
}

const TYPE_LABELS: Record<SeatType, string> = {
  county: 'County constituency',
  borough: 'Borough constituency',
  burgh: 'Burgh constituency',
}

/** The census measures the card shows; the map's Demographics mode has all 21. */
const CARD_FIELDS: CensusField[] = [
  'population',
  'density',
  'age65plus',
  'degree',
  'ownerOccupied',
  'noCar',
]

interface VoteRow {
  party: Ge2024Party
  votes: number
  share: number
  /** Change in share since the notional 2019 result, in points (null: not published). */
  change: number | null
}

const CHANGE_SET = new Set<Ge2024Party>(CHANGE_PARTIES)

function PartyName({ party }: { party: Ge2024Party }) {
  return (
    <span className="party-name">
      <span
        className="party-name__swatch"
        style={{ '--party-colour': PARTY_COLOURS[party] } as CSSProperties}
        aria-hidden
      />
      {partyName(party)}
    </span>
  )
}

const VOTE_COLUMNS: Column<VoteRow>[] = [
  { key: 'party', label: 'Party', render: (r) => <PartyName party={r.party} /> },
  {
    key: 'votes',
    label: 'Votes',
    align: 'right',
    value: (r) => r.votes,
    render: (r) => formatCount(r.votes),
  },
  {
    key: 'share',
    label: 'Share',
    align: 'right',
    width: '58px',
    value: (r) => r.share,
    render: (r) => (
      <span className="share">
        <span
          className="share__bar"
          style={
            {
              '--party-colour': PARTY_COLOURS[r.party],
              width: `${Math.max(2, r.share)}%`,
            } as CSSProperties
          }
          aria-hidden
        />
        {formatPercent(r.share)}
      </span>
    ),
  },
  {
    key: 'change',
    label: '± 2019',
    align: 'right',
    width: '52px',
    value: (r) => r.change ?? -Infinity,
    render: (r) =>
      r.change === null ? (
        <span className="muted">–</span>
      ) : (
        <span
          className={cx('change', r.change > 0 && 'change--up', r.change < 0 && 'change--down')}
        >
          {signed(r.change, 1)}
        </span>
      ),
  },
]

function SeatCard({ id }: { id: string }) {
  const seat = SEAT_BY_ID.get(id)!
  const { result, census } = SEAT_DATA.get(id)!
  const majority = majorityShare(result)
  const turnout = turnoutShare(result)
  const total = result.votes ? Object.values(result.votes).reduce((a, b) => a + b, 0) : 0
  const rows: VoteRow[] = result.votes
    ? (Object.entries(result.votes) as [Ge2024Party, number][])
        .filter(([, v]) => v > 0)
        .map(([party, votes]) => ({
          party,
          votes,
          share: (100 * votes) / (result.valid ?? total),
          change: CHANGE_SET.has(party) ? (result.since2019.change[party] ?? null) : null,
        }))
    : []
  const hasCensus = CARD_FIELDS.some((f) => census[f] !== null)

  return (
    <Card
      title={seat.name}
      icon={MapPinIcon}
      className="seat-card"
      onClose={() => ukMapStore.getState().select(null)}
      footer={
        <Button variant="primary" icon={CrosshairIcon} onClick={() => focusOn(id)}>
          Centre on map
        </Button>
      }
    >
      <p className="place-card__status">
        {REGION_NAME.get(seat.region)}
        {seat.type && ` · ${TYPE_LABELS[seat.type]}`}
      </p>
      <dl className="facts" data-testid="seat-facts">
        <dt>MP</dt>
        <dd className="seat-card__mp">
          {result.mp ? `${result.mp.first} ${result.mp.last}` : 'Not recorded'}
          <Chip party={PARTY_COLOURS[result.winner]}>{partyName(result.winner)}</Chip>
          {result.newMp && <span className="seat-card__new">New MP</span>}
        </dd>
        <dt>Result</dt>
        <dd>
          {result.since2019.held === result.winner
            ? `${partyName(result.winner)} hold`
            : `${partyName(result.winner)} gain from ${partyName(result.since2019.held)}`}
        </dd>
        <dt>Majority</dt>
        <dd>
          {majority === null
            ? 'Not known'
            : `${formatCount(result.majority!)} (${formatPercent(majority)})`}
          {result.second && <span className="muted"> over {partyName(result.second)}</span>}
        </dd>
        <dt>Turnout</dt>
        <dd>{turnout === null ? 'Not known' : formatPercent(turnout)}</dd>
        <dt>Electorate</dt>
        <dd>{result.electorate === null ? 'Not known' : formatCount(result.electorate)}</dd>
      </dl>

      {rows.length > 0 && (
        <Table
          className="seat-card__votes"
          label={`2024 result in ${seat.name}`}
          columns={VOTE_COLUMNS}
          rows={rows}
          rowKey={(r) => r.party}
          initialSort={{ key: 'votes', dir: 'desc' }}
        />
      )}
      {hasCensus && (
        <>
          <h3 className="seat-card__heading">Census</h3>
          <dl className="facts">
            {CARD_FIELDS.filter((f) => census[f] !== null).map((f) => (
              <div key={f} className="facts__pair">
                <dt>{CENSUS_FIELDS[f]}</dt>
                <dd>{formatField(f, census[f]!)}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
      {!hasCensus && seat.nation === 'northern-ireland' && (
        <p className="muted place-card__later">
          Census: Northern Ireland&rsquo;s (NISRA) is not in the game&rsquo;s data yet.
        </p>
      )}
      <p className="muted place-card__later">
        MP and result as of 4 July 2024; later by-elections and defections are not shown. Holds,
        gains and ± 2019 are against notional 2019 results on the new boundaries (Commons Library).
        {result.source === 'manual' && ' Copied from the UK Parliament results pages.'}
        {hasCensus && ' Census 2021 (Scotland 2022).'}
      </p>
    </Card>
  )
}
