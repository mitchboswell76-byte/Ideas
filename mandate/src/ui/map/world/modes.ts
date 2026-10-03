/**
 * World map modes (Paradox-style, DESIGN §17): what each country is filled with, its tooltip line
 * and the legend. Pure; colours are CSS tokens (`map.css`) so both themes work.
 */
import type { Bloc, CountryInfo, WorldRegion, WorldShape } from '../../../data/types.ts'
import { WORLD_REGIONS } from '../../../data/types.ts'
import type { KeyItem, MapKeyData } from '../legend.ts'

export const WORLD_MODES = ['political', 'region', 'blocs'] as const
export type WorldMode = (typeof WORLD_MODES)[number]

/** Modes shown but not available until the world simulation exists. */
export const LATER_MODES = ['relations', 'economy'] as const

export const MODE_LABELS: Record<WorldMode | (typeof LATER_MODES)[number], string> = {
  political: 'Political',
  region: 'Region',
  blocs: 'Blocs',
  relations: 'Relations',
  economy: 'Economy',
}

/** The player's home country (the UK) until other start countries exist (M6). */
export const HOME_COUNTRY = '826'

export const regionToken = (region: WorldRegion) => `var(--map-region-${region.toLowerCase()})`

export function fillOf(
  country: CountryInfo,
  shape: WorldShape,
  mode: WorldMode,
  bloc: Bloc | null,
): string {
  switch (mode) {
    case 'political':
      return `var(--map-land-${shape.colour})`
    case 'region':
      return regionToken(country.region)
    case 'blocs':
      return bloc && country.blocs.includes(bloc.id) ? 'var(--map-member)' : 'var(--map-other)'
  }
}

/** The tooltip line under the country's name. */
export function modeLine(country: CountryInfo, mode: WorldMode, bloc: Bloc | null): string {
  switch (mode) {
    case 'political':
      return country.statusText ?? `Capital: ${country.capital}`
    case 'region':
      return `${country.region} · ${country.subregion}`
    case 'blocs':
      if (!bloc) return ''
      return `${bloc.name}: ${country.blocs.includes(bloc.id) ? 'member' : 'not a member'}`
  }
}

export function legendFor(mode: WorldMode, bloc: Bloc | null): KeyItem[] {
  const home: KeyItem = {
    id: 'home',
    swatch: 'var(--map-home)',
    label: 'Your country',
    outline: true,
  }
  switch (mode) {
    case 'political':
      return [home]
    case 'region':
      return [...WORLD_REGIONS.map((r) => ({ id: r, swatch: regionToken(r), label: r })), home]
    case 'blocs':
      return [
        {
          id: 'member',
          swatch: 'var(--map-member)',
          label: bloc ? `${bloc.name} member` : 'Member',
        },
        { id: 'other', swatch: 'var(--map-other)', label: 'Not a member' },
        home,
      ]
  }
}

/** The docked map key for a mode. */
export function mapKeyFor(mode: WorldMode, bloc: Bloc | null): MapKeyData {
  const title =
    mode === 'political' ? 'Countries' : mode === 'region' ? 'UN regions' : (bloc?.full ?? 'Blocs')
  return { title, scale: null, items: legendFor(mode, bloc), note: legendNote(mode, bloc) }
}

/** A note under the legend, e.g. members too small for the map. */
export function legendNote(mode: WorldMode, bloc: Bloc | null): string | null {
  if (mode === 'political') return 'Colours only tell neighbours apart.'
  if (mode !== 'blocs' || !bloc) return null
  const shown = bloc.members.length - bloc.offMap.length
  const also = bloc.alsoIncludes.length ? ` Also: ${bloc.alsoIncludes.join(', ')}.` : ''
  if (!bloc.offMap.length) return `${bloc.members.length} members.${also}`
  return (
    `${shown} of ${bloc.members.length} members shown; too small for this map: ` +
    `${bloc.offMap.join(', ')}.${also}`
  )
}

/** Approximate width of a label at `LABEL_PX` in Schibsted Grotesk (weight 500), per character. */
const CHAR_PX = 6.7
export const LABEL_PX = 12

/**
 * Countries whose name fits inside their largest part at `pxPerUnit` (map units → pixels), so
 * names appear as you zoom in (Paradox). Largest first.
 */
export function labelsThatFit(
  shapes: readonly WorldShape[],
  nameOf: (id: string) => string,
  pxPerUnit: number,
): WorldShape[] {
  return shapes
    .filter((s) => {
      const [x0, y0, x1, y1] = s.focus
      const width = (x1 - x0) * pxPerUnit
      const height = (y1 - y0) * pxPerUnit
      return height >= LABEL_PX * 1.4 && width >= nameOf(s.id).length * CHAR_PX + 8
    })
    .sort((a, b) => area(b) - area(a))
}

const area = (s: WorldShape) => (s.focus[2] - s.focus[0]) * (s.focus[3] - s.focus[1])
