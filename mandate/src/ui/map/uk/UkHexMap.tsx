import { useMemo, useState } from 'react'
import { ukMapStore, useMapState } from '../../store/map.ts'
import { Legend } from '../Legend.tsx'
import { MapTip } from '../MapTip.tsx'
import { StoreMapView } from '../StoreMapView.tsx'
import type { Point } from '../viewport.ts'
import { CELL_BY_ID, HEX, partyName, SEAT_BY_ID, SEAT_DATA, SEAT_LIST, seatBox } from './data.ts'
import { fillOf, legendFor, legendNote, modeLine, UK_MODE_LABELS, type ModeSpec } from './modes.ts'

/** Region names show while the map is zoomed out; seats take over as you zoom in. */
const REGION_LABEL_MAX_ZOOM = 2.5
const REGION_LABEL_PX = 13

/**
 * The 650-seat hex map (hexjson layout, Open Innovations) with Paradox-style map modes. Click a
 * seat for its card; hover for its name and the mode's value.
 */
export function UkHexMap({ spec, fieldLabel }: { spec: ModeSpec; fieldLabel: string }) {
  const selected = useMapState(ukMapStore, (s) => s.selected)
  const [hover, setHover] = useState<{ id: string; at: Point } | null>(null)

  const fills = useMemo(
    () => (
      <g className="ukmap__hexes">
        {HEX.cells.map((c) => (
          <path
            key={c.id}
            data-id={c.id}
            d={c.d}
            style={{ fill: fillOf(SEAT_DATA.get(c.id)!, spec) }}
          />
        ))}
      </g>
    ),
    [spec],
  )
  const lines = useMemo(
    () => (
      <>
        <path className="ukmap__regions" d={HEX.regions} />
        <path className="ukmap__nations" d={HEX.nations} />
        <path className="ukmap__outline" d={HEX.outline} />
      </>
    ),
    [],
  )
  const hoverCell = hover && CELL_BY_ID.get(hover.id)
  const selectedCell = selected ? CELL_BY_ID.get(selected) : undefined
  const hovered = hover ? SEAT_DATA.get(hover.id) : undefined
  const title = spec.mode === 'demographics' ? fieldLabel : UK_MODE_LABELS[spec.mode]

  return (
    <StoreMapView
      store={ukMapStore}
      className="ukmap"
      mapWidth={HEX.width}
      mapHeight={HEX.height}
      label="Map of the 650 constituencies"
      boxOf={seatBox}
      maxZoom={6}
      onHover={(id, at) => setHover(id && at ? { id, at } : null)}
      overlay={
        <>
          <Legend
            column
            title={title}
            rows={legendFor(SEAT_LIST, spec, partyName)}
            note={legendNote(spec)}
          />
          {hover && hovered && (
            <MapTip
              at={hover.at}
              title={SEAT_BY_ID.get(hover.id)!.name}
              line={modeLine(hovered, spec, partyName)}
            />
          )}
        </>
      }
    >
      {({ k, s }) => (
        <>
          {fills}
          {lines}
          {hoverCell && <path className="ukmap__hover" d={hoverCell.d} />}
          {selectedCell && <path className="ukmap__selected" d={selectedCell.d} />}
          {k < REGION_LABEL_MAX_ZOOM && (
            <g
              className="ukmap__labels"
              style={{ fontSize: REGION_LABEL_PX / s, strokeWidth: 3 / s }}
            >
              {HEX.regionLabels.map((l) => (
                <text key={l.name} x={l.x} y={l.y}>
                  {l.name}
                </text>
              ))}
            </g>
          )}
        </>
      )}
    </StoreMapView>
  )
}
