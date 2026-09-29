/**
 * Greedy meshing (DESIGN §17): turn a voxel grid into as few quads as possible. Faces between two
 * filled cells are culled, and coplanar faces of the same palette index merge into rectangles, so
 * static scenery costs one draw call and few triangles — the budget that keeps an Intel UHD 620
 * at frame rate.
 *
 * Output is plain typed arrays (no three.js) so it can be tested in Node; `ui/three` wraps it in a
 * BufferGeometry.
 */
import type { VoxelGrid } from './grid.ts'

export interface VoxelMesh {
  /** xyz per vertex, in voxel units. */
  positions: Float32Array
  /** Unit normal per vertex. */
  normals: Float32Array
  /** Palette index per vertex (all four corners of a quad share one). */
  values: Uint8Array
  /** Two triangles per quad, counter-clockwise from outside. */
  indices: Uint32Array
  quads: number
}

export function greedyMesh(grid: VoxelGrid): VoxelMesh {
  const dims = [grid.sx, grid.sy, grid.sz] as const
  const positions: number[] = []
  const normals: number[] = []
  const values: number[] = []
  const indices: number[] = []
  const cell = (p: readonly number[]): number => grid.get(p[0]!, p[1]!, p[2]!)

  // Sweep each axis d; u and v span the face plane, with u × v = +d.
  for (let d = 0; d < 3; d++) {
    const u = (d + 1) % 3
    const v = (d + 2) % 3
    const du = dims[u]
    const dv = dims[v]
    const x = [0, 0, 0]
    const q = [0, 0, 0]
    q[d] = 1
    // mask > 0: face pointing +d with that value; mask < 0: face pointing -d.
    const mask = new Int32Array(du * dv)

    for (x[d] = -1; x[d]! < dims[d];) {
      let n = 0
      for (x[v] = 0; x[v]! < dv; x[v]!++) {
        for (x[u] = 0; x[u]! < du; x[u]!++) {
          const a = cell(x)
          const b = cell([x[0]! + q[0]!, x[1]! + q[1]!, x[2]! + q[2]!])
          mask[n++] = (a !== 0) === (b !== 0) ? 0 : a !== 0 ? a : -b
        }
      }
      x[d]!++ // The face plane sits between slice x[d] - 1 and x[d].

      n = 0
      for (let j = 0; j < dv; j++) {
        for (let i = 0; i < du;) {
          const c = mask[n]!
          if (c === 0) {
            i++
            n++
            continue
          }
          let w = 1
          while (i + w < du && mask[n + w] === c) w++
          let h = 1
          grow: while (j + h < dv) {
            for (let k = 0; k < w; k++) if (mask[n + k + h * du] !== c) break grow
            h++
          }

          const origin = [0, 0, 0]
          origin[d] = x[d]!
          origin[u] = i
          origin[v] = j
          const eu = [0, 0, 0]
          eu[u] = w
          const ev = [0, 0, 0]
          ev[v] = h
          const corners = [
            origin,
            [origin[0]! + eu[0]!, origin[1]! + eu[1]!, origin[2]! + eu[2]!],
            [
              origin[0]! + eu[0]! + ev[0]!,
              origin[1]! + eu[1]! + ev[1]!,
              origin[2]! + eu[2]! + ev[2]!,
            ],
            [origin[0]! + ev[0]!, origin[1]! + ev[1]!, origin[2]! + ev[2]!],
          ]
          if (c < 0) corners.reverse()
          const base = positions.length / 3
          const normal = [0, 0, 0]
          normal[d] = c > 0 ? 1 : -1
          for (const p of corners) {
            positions.push(p[0]!, p[1]!, p[2]!)
            normals.push(normal[0]!, normal[1]!, normal[2]!)
            values.push(Math.abs(c))
          }
          indices.push(base, base + 1, base + 2, base, base + 2, base + 3)

          for (let l = 0; l < h; l++) mask.fill(0, n + l * du, n + l * du + w)
          i += w
          n += w
        }
      }
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    values: new Uint8Array(values),
    indices: new Uint32Array(indices),
    quads: indices.length / 6,
  }
}
