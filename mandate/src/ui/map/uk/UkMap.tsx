import { useMemo, useState } from 'react'
import { ukMapStore, useMapState, type UkLayout } from '../../store/map.ts'
import { MapTip } from '../MapTip.tsx'
import { StoreMapView } from '../StoreMapView.tsx'
import type { Point } from '../viewport.ts'
import { GEOMETRY, partyName, REGION_NAME, SEAT_BY_ID, SEAT_DATA } from './data.ts'
import { SEAT_LABEL_PX, seatLabelsThatFit } from './labels.ts'
import { fillOf, keyOf, modeLine, type ModeSpec } from './modes.ts'

/** Hatching for seats with no figure: lines this far apart on screen, whatever the zoom. */
const HATCH_PX = 5

/** Region names show while the map is zoomed out; seats take over as you zoom in. */
const REGION_LABEL_MAX_ZOOM = 2.5
const REGION_LABEL_PX = 10.5

const seatName = (id: string) => SEAT_BY_ID.get(id)?.name ?? id

/**
 * The 650 seats with Paradox-style map modes, on their real boundaries or as equal hexes
 * (hexjson layout, Open Innovations). Click a seat for its card; hover for its name and the mode's
 * value; zoom in on the real map and seat names appear.
 */
export function UkMap({
  layout,
  spec,
  lit,
}: {
  layout: UkLayout
  spec: ModeSpec
  /** The key entry picked out (a party, a step, `none`): every other seat fades. */
  lit: string | null
}) {
  const geo = GEOMETRY[layout]
  const selected = useMapState(ukMapStore, (s) => s.selected)
  const [hover, setHover] = useState<{ id: string; at: Point } | null>(null)
  const shapeById = useMemo(() => new Map(geo.shapes.map((s) => [s.id, s])), [geo])

  const fills = useMemo(
    () => (
      <g className={`ukmap__fills ukmap__fills--${layout}`}>
        {geo.shapes.map((c) => {
          const seat = SEAT_DATA.get(c.id)!
          return (
            <path
              key={c.id}
              data-id={c.id}
              data-key={keyOf(seat, spec)}
              d={c.d}
              style={{ fill: fillOf(seat, spec) }}
            />
          )
        })}
      </g>
    ),
    [geo, layout, spec],
  )
  const lines = useMemo(
    () => geo.lines.map((l) => <path key={l.kind} className={`ukmap__${l.kind}`} d={l.d} />),
    [geo],
  )
  const hoverShape = hover && shapeById.get(hover.id)
  const selectedShape = selected ? shapeById.get(selected) : undefined
  const hovered = hover ? SEAT_DATA.get(hover.id) : undefined

  return (
    <StoreMapView
      store={ukMapStore}
      className="ukmap"
      mapWidth={geo.width}
      mapHeight={geo.height}
      label="Map of the 650 constituencies"
      boxOf={geo.box}
      maxZoom={geo.maxZoom}
      focusZoom={geo.focusZoom}
      onHover={(id, at) => setHover(id && at ? { id, at } : null)}
      overlay={
        <>
          {lit && (
            <style>{`.ukmap__fills path:not([data-key="${lit}"]) { fill-opacity: 0.18 }`}</style>
          )}
          {hover && hovered && (
            <MapTip
              at={hover.at}
              title={seatName(hover.id)}
              line={modeLine(hovered, spec, partyName)}
            />
          )}
        </>
      }
    >
      {({ k, s }) => (
        <>
          <defs>
            <pattern
              id="ukmap-nodata"
              patternUnits="userSpaceOnUse"
              width={HATCH_PX / s}
              height={HATCH_PX / s}
              patternTransform="rotate(45)"
            >
              <rect className="ukmap__nodata" width={HATCH_PX / s} height={HATCH_PX / s} />
              <line
                className="ukmap__nodata-line"
                x1={0}
                y1={0}
                x2={0}
                y2={HATCH_PX / s}
                strokeWidth={1.6 / s}
              />
            </pattern>
          </defs>
          {fills}
          {lines}
          {hoverShape && <path className="ukmap__hover" d={hoverShape.d} />}
          {selectedShape && <path className="ukmap__selected" d={selectedShape.d} />}
          {k < REGION_LABEL_MAX_ZOOM ? (
            <g
              className="ukmap__labels"
              style={{ fontSize: REGION_LABEL_PX / s, strokeWidth: 3 / s }}
            >
              {geo.regionLabels.map((l) => (
                <text key={l.id} x={l.x} y={l.y}>
                  {REGION_NAME.get(l.id)}
                </text>
              ))}
            </g>
          ) : (
            <g
              className="ukmap__seat-labels"
              style={{ fontSize: SEAT_LABEL_PX / s, strokeWidth: 3 / s }}
            >
              {seatLabelsThatFit(geo.seatLabels, seatName, s).map((l) => (
                <text key={l.id} x={l.x} y={l.y}>
                  {seatName(l.id)}
                </text>
              ))}
            </g>
          )}
        </>
      )}
    </StoreMapView>
  )
}
