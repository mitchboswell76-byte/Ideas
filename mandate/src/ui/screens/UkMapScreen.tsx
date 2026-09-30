import { useMemo, type CSSProperties } from 'react'
import type { CensusField, Ge2024Party, SeatType } from '../../data/types.ts'
import {
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
  formatCount,
  formatPercent,
  Table,
  Tabs,
  type Column,
  type TabItem,
} from '../kit/index.ts'
import '../map/map-screen.css'
import { PlaceList } from '../map/PlaceList.tsx'
import {
  CENSUS_FIELDS,
  PARTY_COLOURS,
  partyName,
  REGION_NAME,
  SEAT_BY_ID,
  SEAT_DATA,
  SEAT_LIST,
  SEATS,
} from '../map/uk/data.ts'
import {
  breaksFor,
  formatField,
  majorityShare,
  turnoutShare,
  UK_LATER_MODES,
  UK_MODE_LABELS,
  UK_MODES,
  type ModeSpec,
  type UkMode,
} from '../map/uk/modes.ts'
import { UkHexMap } from '../map/uk/UkHexMap.tsx'
import { useEscapeDeselect } from '../map/useEscapeDeselect.ts'
import { ukMapStore, useMapState } from '../store/map.ts'
import './screens.css'
import './uk-map.css'

type ModeKey = UkMode | (typeof UK_LATER_MODES)[number]

const MODE_ICONS: Record<ModeKey, Icon> = {
  party: FlagIcon,
  majority: ChartLineIcon,
  turnout: UsersIcon,
  demographics: MapTrifoldIcon,
  swing: ChartLineIcon,
}

const TABS: TabItem<ModeKey>[] = [...UK_MODES, ...UK_LATER_MODES].map((key) => {
  const ModeIcon = MODE_ICONS[key]
  return {
    key,
    label: (
      <>
        <ModeIcon aria-hidden />
        {UK_MODE_LABELS[key]}
      </>
    ),
    disabled: key === 'swing' ? 'Arrives with polling (T13)' : undefined,
  }
})

const FIELDS = Object.entries(CENSUS_FIELDS) as [CensusField, string][]
const isField = (v: string): v is CensusField => v in CENSUS_FIELDS

const PLACES = [...SEATS]
  .sort((a, b) => a.name.localeCompare(b.name, 'en'))
  .map((s) => ({ id: s.id, name: s.name, meta: REGION_NAME.get(s.region) ?? '' }))

const focusOn = (id: string) => ukMapStore.getState().focusOn(id)

/**
 * The Map screen (T7): the 650 Westminster seats as a hex map with Paradox-style modes, and the
 * constituency card or seat list beside it. Swing arrives with polling (T13); 3D seat columns with
 * election night (T18).
 */
export function UkMapScreen() {
  const mode = useMapState(ukMapStore, (s) => s.mode)
  const option = useMapState(ukMapStore, (s) => s.option)
  const selected = useMapState(ukMapStore, (s) => s.selected)
  const field: CensusField = isField(option) ? option : 'age65plus'
  useEscapeDeselect(ukMapStore)

  const spec = useMemo<ModeSpec>(
    () => ({ mode, field, breaks: breaksFor(SEAT_LIST, mode, field), colours: PARTY_COLOURS }),
    [mode, field],
  )

  return (
    <div className="map-screen map-screen--tall">
      <div className="map-screen__bar">
        <Tabs
          label="Map mode"
          tabs={TABS}
          value={mode}
          onChange={(key) => ukMapStore.getState().setMode(key as UkMode)}
        />
        {mode === 'demographics' && (
          <label className="map-screen__option">
            Measure
            <select value={field} onChange={(e) => ukMapStore.getState().setOption(e.target.value)}>
              {FIELDS.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <UkHexMap spec={spec} fieldLabel={CENSUS_FIELDS[field]} />
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
}

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
    width: '96px',
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
        .map(([party, votes]) => ({ party, votes, share: (100 * votes) / (result.valid ?? total) }))
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
      {!result.verified && (
        <p className="seat-card__note">
          Winner only: entered by hand and not yet checked against the official results.
        </p>
      )}
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
      <p className="muted place-card__later">
        MP and result as of 4 July 2024; later by-elections and defections are not shown.
        {hasCensus && ' Census 2021 (Scotland 2022).'}
      </p>
    </Card>
  )
}
