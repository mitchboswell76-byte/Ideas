import { useMemo, useState } from 'react'
import type { Bloc, CountryInfo } from '../../../data/types.ts'
import { WORLD_MAP } from '../../../data/worldMap.ts'
import { useMapState, worldMapStore } from '../../store/map.ts'
import { MapTip } from '../MapTip.tsx'
import { StoreMapView } from '../StoreMapView.tsx'
import type { Point } from '../viewport.ts'
import { fillOf, HOME_COUNTRY, LABEL_PX, labelsThatFit, modeLine, type WorldMode } from './modes.ts'

const SHAPES = WORLD_MAP.shapes
const SHAPE_BY_ID = new Map(SHAPES.map((s) => [s.id, s]))
const boxOf = (id: string) => SHAPE_BY_ID.get(id)?.focus

interface WorldMapProps {
  countries: ReadonlyMap<string, CountryInfo>
  mode: WorldMode
  bloc: Bloc | null
}

/**
 * The world map (DESIGN §17: Paradox map modes). Click a country to open its card; hover for its
 * name and the mode's value. Selection and view live in `worldMapStore`.
 */
export function WorldMap({ countries, mode, bloc }: WorldMapProps) {
  const selected = useMapState(worldMapStore, (s) => s.selected)
  const [hover, setHover] = useState<{ id: string; at: Point } | null>(null)

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
    <StoreMapView
      store={worldMapStore}
      className="wmap"
      mapWidth={WORLD_MAP.width}
      mapHeight={WORLD_MAP.height}
      label="World map"
      boxOf={boxOf}
      onHover={(id, at) => setHover(id && at ? { id, at } : null)}
      overlay={
        <>
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
    </StoreMapView>
  )
}
