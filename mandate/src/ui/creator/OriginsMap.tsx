/**
 * The creator's map (T10: birthplace on the world or UK map, home on the UK map). Click a seat or
 * a country to choose it; your home seat is filled with your colour and your birthplace outlined.
 * Lazy: it pulls in the map geometry.
 */
import { useEffect, useMemo, useState } from 'react'
import { COUNTRIES } from '../../data/world.ts'
import { WORLD_MAP } from '../../data/worldMap.ts'
import { MapTip } from '../map/MapTip.tsx'
import { StoreMapView } from '../map/StoreMapView.tsx'
import { GEOMETRY, SEAT_BY_ID } from '../map/uk/data.ts'
import type { Point } from '../map/viewport.ts'
import { createMapStore, type MapStore } from '../store/map.ts'
import '../map/map.css'

const UK_GEO = GEOMETRY.map
const UK_SHAPES = new Map(UK_GEO.shapes.map((s) => [s.id, s]))
const WORLD_SHAPES = new Map(WORLD_MAP.shapes.map((s) => [s.id, s]))
const COUNTRY_NAME = new Map(COUNTRIES.map((c) => [c.id, c.name]))
const worldBox = (id: string) => WORLD_SHAPES.get(id)?.focus
/** Further out than the map screen's, so the chosen seat shows its surroundings. */
const CREATOR_FOCUS_ZOOM = 7

/** Kept between visits to the tab, like the game's own maps. */
const ukStore = createMapStore('pick', {})
const worldStore = createMapStore('pick', {})

/**
 * Call `onPick` when a click selects a place (the sea clears it, which picks nothing). Framing a
 * place selects it too, but that is not a pick.
 */
function usePicks(store: MapStore, onPick: (id: string) => void) {
  useEffect(
    () =>
      store.subscribe((s, prev) => {
        if (s.selected && s.selected !== prev.selected && s.focus === prev.focus) onPick(s.selected)
      }),
    [store, onPick],
  )
}

/** Frame `id` whenever it changes (chosen from a search list or by randomising). */
function useFrame(store: MapStore, id: string | undefined) {
  useEffect(() => {
    if (id) store.getState().focusOn(id)
  }, [store, id])
}

interface UkPickProps {
  /** ONS codes. */
  home?: string
  born?: string
  /** Which one a click sets (framed when it changes). */
  target: 'home' | 'born'
  onPick: (ons: string) => void
}

export function UkPickMap({ home, born, target, onPick }: UkPickProps) {
  const [hover, setHover] = useState<{ id: string; at: Point } | null>(null)
  usePicks(ukStore, onPick)
  useFrame(ukStore, target === 'home' ? home : born)
  const fills = useMemo(
    () => (
      <g className="ukmap__fills origins__fills">
        {UK_GEO.shapes.map((c) => (
          <path key={c.id} data-id={c.id} d={c.d} />
        ))}
      </g>
    ),
    [],
  )
  const lines = useMemo(
    () => UK_GEO.lines.map((l) => <path key={l.kind} className={`ukmap__${l.kind}`} d={l.d} />),
    [],
  )
  const homeShape = home ? UK_SHAPES.get(home) : undefined
  const bornShape = born ? UK_SHAPES.get(born) : undefined
  const hoverShape = hover ? UK_SHAPES.get(hover.id) : undefined
  return (
    <StoreMapView
      store={ukStore}
      className="ukmap origins__map"
      mapWidth={UK_GEO.width}
      mapHeight={UK_GEO.height}
      label="Map of the 650 constituencies: click one to choose it"
      boxOf={UK_GEO.box}
      maxZoom={UK_GEO.maxZoom}
      focusZoom={CREATOR_FOCUS_ZOOM}
      onHover={(id, at) => setHover(id && at ? { id, at } : null)}
      overlay={
        hover && (
          <MapTip
            at={hover.at}
            title={SEAT_BY_ID.get(hover.id)?.name ?? hover.id}
            line={target === 'home' ? 'Click to live here' : 'Click to be born here'}
          />
        )
      }
    >
      {() => (
        <>
          {fills}
          {homeShape && <path className="origins__home" d={homeShape.d} />}
          {lines}
          {hoverShape && <path className="ukmap__hover" d={hoverShape.d} />}
          {bornShape && <path className="origins__born" d={bornShape.d} />}
        </>
      )}
    </StoreMapView>
  )
}

interface WorldPickProps {
  /** Natural Earth id of the birth country. */
  country?: string
  onPick: (id: string) => void
}

export function WorldPickMap({ country, onPick }: WorldPickProps) {
  const [hover, setHover] = useState<{ id: string; at: Point } | null>(null)
  usePicks(worldStore, onPick)
  useFrame(worldStore, country)
  const fills = useMemo(
    () => (
      <g className="wmap__countries origins__fills">
        {WORLD_MAP.shapes.map((s) => (
          <path key={s.id} data-id={s.id} d={s.d} />
        ))}
      </g>
    ),
    [],
  )
  const chosen = country ? WORLD_SHAPES.get(country) : undefined
  const hoverShape = hover ? WORLD_SHAPES.get(hover.id) : undefined
  return (
    <StoreMapView
      store={worldStore}
      className="wmap origins__map"
      mapWidth={WORLD_MAP.width}
      mapHeight={WORLD_MAP.height}
      label="World map: click a country to be born there"
      boxOf={worldBox}
      onHover={(id, at) => setHover(id && at ? { id, at } : null)}
      overlay={
        hover && (
          <MapTip
            at={hover.at}
            title={COUNTRY_NAME.get(hover.id) ?? hover.id}
            line="Click to be born here"
          />
        )
      }
    >
      {() => (
        <>
          {fills}
          {chosen && <path className="origins__home" d={chosen.d} />}
          <path className="wmap__borders" d={WORLD_MAP.borders} />
          <path className="wmap__coast" d={WORLD_MAP.coast} />
          {hoverShape && <path className="wmap__hover" d={hoverShape.d} />}
        </>
      )}
    </StoreMapView>
  )
}

export default function OriginsMap(props: { mode: 'uk' | 'world' } & UkPickProps & WorldPickProps) {
  return props.mode === 'world' ? <WorldPickMap {...props} /> : <UkPickMap {...props} />
}
