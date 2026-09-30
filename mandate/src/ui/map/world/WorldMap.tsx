import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { Bloc, CountryInfo } from '../../../data/types.ts'
import { WORLD_MAP } from '../../../data/worldMap.ts'
import { cx } from '../../kit/index.ts'
import { placeFloating } from '../../kit/place.ts'
import { mapStore, useMap } from '../../store/map.ts'
import { MapView } from '../MapView.tsx'
import { fitBox, type Frame, type Point } from '../viewport.ts'
import {
  fillOf,
  HOME_COUNTRY,
  LABEL_PX,
  labelsThatFit,
  legendFor,
  legendNote,
  modeLine,
  type WorldMode,
} from './modes.ts'

const SHAPES = WORLD_MAP.shapes
const SHAPE_BY_ID = new Map(SHAPES.map((s) => [s.id, s]))

interface WorldMapProps {
  countries: ReadonlyMap<string, CountryInfo>
  mode: WorldMode
  bloc: Bloc | null
}

/** The country id under a map element, if any. */
const idOf = (el: Element | null) => el?.closest('[data-id]')?.getAttribute('data-id') ?? null

/**
 * The world map (DESIGN §17: Paradox map modes). Click a country to open its card; hover for its
 * name and the mode's value. Selection and view live in `mapStore`.
 */
export function WorldMap({ countries, mode, bloc }: WorldMapProps) {
  const view = useMap((s) => s.view)
  const selected = useMap((s) => s.country)
  const focus = useMap((s) => s.focus)
  const [hover, setHover] = useState<{ id: string; at: Point } | null>(null)
  const [frame, setFrame] = useState<Frame | null>(null)

  // Frame a country when asked (list, card, neighbour links).
  const handled = useRef(0)
  useEffect(() => {
    if (!focus || !frame || focus.n === handled.current) return
    handled.current = focus.n
    const shape = SHAPE_BY_ID.get(focus.id)
    if (shape) mapStore.getState().setView(fitBox(shape.focus, frame))
  }, [focus, frame])

  // The heavy layers are memoised so panning only changes the transform.
  const fills = useMemo(
    () => (
      <g className="wmap__countries">
        {SHAPES.map((s) => (
          <path
            key={s.id}
            data-id={s.id}
            d={s.d}
            style={{ fill: fillOf(countries.get(s.id)!, s, mode, bloc) }}
          />
        ))}
      </g>
    ),
    [countries, mode, bloc],
  )
  const lines = useMemo(
    () => (
      <>
        <path className="wmap__borders" d={WORLD_MAP.borders} />
        <path className="wmap__coast" d={WORLD_MAP.coast} />
      </>
    ),
    [],
  )
  const home = SHAPE_BY_ID.get(HOME_COUNTRY)
  const hoverShape = hover && SHAPE_BY_ID.get(hover.id)
  const selectedShape = selected ? SHAPE_BY_ID.get(selected) : undefined
  const nameOf = (id: string) => countries.get(id)?.name ?? id
  const hovered = hover ? countries.get(hover.id) : undefined

  return (
    <MapView
      className="wmap"
      mapWidth={WORLD_MAP.width}
      mapHeight={WORLD_MAP.height}
      view={view}
      onViewChange={(v) => mapStore.getState().setView(v)}
      onFrame={setFrame}
      label="World map"
      onPick={(el) => mapStore.getState().select(idOf(el))}
      onHover={(el, at) => {
        const id = idOf(el)
        setHover(id && at ? { id, at } : null)
      }}
      overlay={
        <>
          <Legend mode={mode} bloc={bloc} />
          {hover && hovered && (
            <MapTip at={hover.at} title={hovered.name} line={modeLine(hovered, mode, bloc)} />
          )}
        </>
      }
    >
      {({ s }) => (
        <>
          {fills}
          {lines}
          {hoverShape && <path className="wmap__hover" d={hoverShape.d} />}
          {home && <path className="wmap__home" d={home.d} />}
          {selectedShape && <path className="wmap__selected" d={selectedShape.d} />}
          <g className="wmap__labels" style={{ fontSize: LABEL_PX / s, strokeWidth: 3 / s }}>
            {labelsThatFit(SHAPES, nameOf, s).map((shape) => (
              <text key={shape.id} x={shape.label[0]} y={shape.label[1]}>
                {nameOf(shape.id)}
              </text>
            ))}
          </g>
        </>
      )}
    </MapView>
  )
}

function Legend({ mode, bloc }: { mode: WorldMode; bloc: Bloc | null }) {
  const note = legendNote(mode, bloc)
  return (
    <div className="map-legend" aria-label="Map key">
      <ul className="map-legend__rows">
        {legendFor(mode, bloc).map((row) => (
          <li key={row.label} className="map-legend__row">
            <span
              className={cx('map-legend__swatch', row.outline && 'map-legend__swatch--outline')}
              style={{ '--swatch': row.swatch } as CSSProperties}
              aria-hidden
            />
            {row.label}
          </li>
        ))}
      </ul>
      {note && <p className="map-legend__note">{note}</p>}
    </div>
  )
}

/** The hover label: the kit's tooltip look, beside the pointer and kept on screen. */
function MapTip({ at, title, line }: { at: Point; title: string; line: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [place, setPlace] = useState<{ left: number; top: number } | null>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const p = placeFloating(
      { left: at.x + 14, top: at.y - 10, width: 0, height: 30 },
      { width: el.offsetWidth, height: el.offsetHeight },
      { width: window.innerWidth, height: window.innerHeight },
      4,
    )
    setPlace({ left: p.left, top: p.top })
  }, [at.x, at.y, title, line])
  return (
    <div
      ref={ref}
      className="tip map-tip"
      role="tooltip"
      style={{
        left: place?.left ?? at.x + 14,
        top: place?.top ?? at.y + 20,
        visibility: place ? 'visible' : 'hidden',
      }}
    >
      <div className="tip__title">{title}</div>
      {line && <div className="map-tip__line">{line}</div>}
    </div>
  )
}
