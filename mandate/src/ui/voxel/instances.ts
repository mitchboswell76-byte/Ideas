/**
 * Filled cells as instance data, for voxels that change colour or move (flickering accents, hex
 * vote layers, crowds). Static voxels should go through `greedyMesh` instead.
 */
import type { VoxelGrid } from './grid.ts'

export interface VoxelCells {
  /** Cell centres, xyz per cell, in voxel units. */
  centres: Float32Array
  /** Palette index per cell. */
  values: Uint8Array
  count: number
}

export function voxelCells(grid: VoxelGrid): VoxelCells {
  const count = grid.count()
  const centres = new Float32Array(count * 3)
  const values = new Uint8Array(count)
  let i = 0
  for (let z = 0; z < grid.sz; z++) {
    for (let y = 0; y < grid.sy; y++) {
      for (let x = 0; x < grid.sx; x++) {
        const value = grid.get(x, y, z)
        if (value === 0) continue
        centres.set([x + 0.5, y + 0.5, z + 0.5], i * 3)
        values[i++] = value
      }
    }
  }
  return { centres, values, count }
}
