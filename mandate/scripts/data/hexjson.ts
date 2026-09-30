/** Reads an Open Innovations hexjson file (https://open-innovations.org/projects/hexmaps/hexjson). */
export interface Hex {
  n: string
  q: number
  r: number
  region: string
}

export interface HexJson {
  layout: 'odd-r'
  hexes: Record<string, Hex>
}

export function parseHexjson(text: string): HexJson {
  const json = JSON.parse(text) as { layout?: unknown; hexes?: Record<string, Partial<Hex>> }
  if (json.layout !== 'odd-r')
    throw new Error(`hexjson: expected layout odd-r, got ${String(json.layout)}`)
  if (!json.hexes) throw new Error('hexjson: no hexes')
  const hexes: Record<string, Hex> = {}
  const cells = new Map<string, string>()
  for (const [id, h] of Object.entries(json.hexes)) {
    if (typeof h.n !== 'string' || !Number.isInteger(h.q) || !Number.isInteger(h.r) || !h.region) {
      throw new Error(`hexjson: hex ${id} is missing n, q, r or region`)
    }
    const cell = `${h.q},${h.r}`
    const clash = cells.get(cell)
    if (clash) throw new Error(`hexjson: ${id} and ${clash} share cell ${cell}`)
    cells.set(cell, id)
    hexes[id] = { n: h.n, q: h.q as number, r: h.r as number, region: h.region }
  }
  return { layout: 'odd-r', hexes }
}
