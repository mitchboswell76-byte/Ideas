/**
 * The UK hex map's geometry (hexjson "odd-r": pointy-top hexes, odd rows shifted right, rows
 * growing upwards). Pure: centres, hex paths, neighbours, and the border lines between groups
 * (nations, regions) and round the coast, each drawn once.
 */
import type { Region, Seat } from '../../../data/types.ts'

const SQRT3 = Math.sqrt(3)
/** Map units round the hexes. */
const PAD = 1

export interface HexCell {
  id: string
  q: number
  r: number
  cx: number
  cy: number
  /** SVG path of the hex. */
  d: string
}

export interface HexLabel {
  name: string
  x: number
  y: number
}

export interface HexMap {
  width: number
  height: number
  cells: HexCell[]
  /** Coastline: edges with no neighbouring seat. */
  outline: string
  /** Borders between nations. */
  nations: string
  /** Borders between regions (within England; nations are regions of their own). */
  regions: string
  /** One label per region, at the middle of its seats. */
  regionLabels: HexLabel[]
}

/** Works for negative rows too (`-1 & 1` is 1). */
export const isOddRow = (r: number) => (r & 1) === 1

/** Centre of a cell before shifting into the map frame; y grows downwards. */
export function rawCentre(q: number, r: number): { x: number; y: number } {
  return { x: SQRT3 * (q + (isOddRow(r) ? 0.5 : 0)), y: -1.5 * r }
}

/** The six neighbouring cells of an odd-r cell. */
export function hexNeighbours(q: number, r: number): [number, number][] {
  const shift = isOddRow(r) ? 1 : 0
  return [
    [q + 1, r],
    [q - 1, r],
    [q - 1 + shift, r - 1],
    [q + shift, r - 1],
    [q - 1 + shift, r + 1],
    [q + shift, r + 1],
  ]
}

const round2 = (v: number) => Math.round(v * 100) / 100

/** Corners of a pointy-top hex of circumradius 1. */
function corners(cx: number, cy: number): [number, number][] {
  const out: [number, number][] = []
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30)
    out.push([round2(cx + Math.cos(a)), round2(cy + Math.sin(a))])
  }
  return out
}

export function hexPath(cx: number, cy: number): string {
  const [first, ...rest] = corners(cx, cy)
  return `M${first![0]} ${first![1]}${rest.map(([x, y]) => `L${x} ${y}`).join('')}Z`
}

const key = (q: number, r: number) => `${q},${r}`

/**
 * Edges where a cell meets a different group or no cell at all, as one path. Each internal edge is
 * drawn once. `groupOf` returning null means "every cell is one group" (coastline only).
 */
export function edgesBetween(
  cells: readonly HexCell[],
  groupOf: ((id: string) => string) | null,
  offset: { x: number; y: number },
): string {
  const at = new Map(cells.map((c) => [key(c.q, c.r), c]))
  let d = ''
  for (const cell of cells) {
    const own = corners(cell.cx, cell.cy)
    for (const [nq, nr] of hexNeighbours(cell.q, cell.r)) {
      const other = at.get(key(nq, nr))
      if (other) {
        if (!groupOf || groupOf(other.id) === groupOf(cell.id)) continue
        if (other.id < cell.id) continue // drawn from the other side
      } else if (groupOf) {
        continue // coast belongs to the outline
      }
      const n = rawCentre(nq, nr)
      const nx = n.x + offset.x
      const ny = n.y + offset.y
      const shared = own.filter(([x, y]) => Math.abs(Math.hypot(x - nx, y - ny) - 1) < 0.02)
      if (shared.length !== 2) throw new Error(`Hex ${cell.id}: no shared edge towards ${nq},${nr}`)
      const [[x0, y0], [x1, y1]] = shared as [[number, number], [number, number]]
      d += `M${x0} ${y0}L${x1} ${y1}`
    }
  }
  return d
}

export function buildHexMap(seats: readonly Seat[], regions: readonly Region[]): HexMap {
  const raw = seats.map((s) => ({ seat: s, ...rawCentre(s.q, s.r) }))
  const minX = Math.min(...raw.map((p) => p.x)) - SQRT3 / 2
  const maxX = Math.max(...raw.map((p) => p.x)) + SQRT3 / 2
  const minY = Math.min(...raw.map((p) => p.y)) - 1
  const maxY = Math.max(...raw.map((p) => p.y)) + 1
  const offset = { x: PAD - minX, y: PAD - minY }
  const cells: HexCell[] = raw.map(({ seat, x, y }) => {
    const cx = round2(x + offset.x)
    const cy = round2(y + offset.y)
    return { id: seat.id, q: seat.q, r: seat.r, cx, cy, d: hexPath(cx, cy) }
  })

  const byId = new Map(seats.map((s) => [s.id, s]))
  const regionName = new Map(regions.map((r) => [r.id, r.name]))
  const regionOf = (id: string) => byId.get(id)!.region

  return {
    width: round2(maxX - minX + 2 * PAD),
    height: round2(maxY - minY + 2 * PAD),
    cells,
    outline: edgesBetween(cells, null, offset),
    nations: edgesBetween(cells, (id) => byId.get(id)!.nation, offset),
    regions: edgesBetween(cells, (id) => byId.get(id)!.region, offset),
    regionLabels: regionLabelCells(cells, regionOf).map(({ group, cell }) => ({
      name: regionName.get(group) ?? group,
      x: cell.cx,
      y: cell.cy,
    })),
  }
}

/**
 * Where each group's label goes: its cell deepest inside the group (furthest from the coast and
 * from other groups), nearest the middle on a tie. A ring-shaped region like the South East, whose
 * middle is London, gets its label on its own ground.
 */
export function regionLabelCells(
  cells: readonly HexCell[],
  groupOf: (id: string) => string,
): { group: string; cell: HexCell }[] {
  const at = new Map(cells.map((c) => [key(c.q, c.r), c]))
  const groups = new Map<string, HexCell[]>()
  for (const c of cells) groups.set(groupOf(c.id), [...(groups.get(groupOf(c.id)) ?? []), c])
  const out: { group: string; cell: HexCell }[] = []
  for (const [group, members] of groups) {
    const edge = members.filter((c) =>
      hexNeighbours(c.q, c.r).some(([q, r]) => {
        const n = at.get(key(q, r))
        return !n || groupOf(n.id) !== group
      }),
    )
    const mx = members.reduce((a, c) => a + c.cx, 0) / members.length
    const my = members.reduce((a, c) => a + c.cy, 0) / members.length
    let best = members[0]!
    let bestDepth = -1
    let bestOff = Infinity
    for (const c of members) {
      const depth = Math.min(...edge.map((e) => Math.hypot(e.cx - c.cx, e.cy - c.cy)))
      const off = Math.hypot(c.cx - mx, c.cy - my)
      if (depth > bestDepth + 1e-6 || (Math.abs(depth - bestDepth) < 1e-6 && off < bestOff)) {
        best = c
        bestDepth = depth
        bestOff = off
      }
    }
    out.push({ group, cell: best })
  }
  return out.sort((a, b) => a.group.localeCompare(b.group))
}
