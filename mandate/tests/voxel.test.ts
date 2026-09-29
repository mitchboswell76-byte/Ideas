import { describe, expect, it } from 'vitest'
import { textBitmap } from '../src/ui/pixel/font.ts'
import { greedyMesh, type VoxelMesh } from '../src/ui/voxel/greedy.ts'
import { fromBitmap, VoxelGrid } from '../src/ui/voxel/grid.ts'
import { voxelCells } from '../src/ui/voxel/instances.ts'

/** Sum of quad areas per outward normal direction, keyed like "+x". */
function areaByNormal(mesh: VoxelMesh): Record<string, number> {
  const areas: Record<string, number> = {}
  for (let q = 0; q < mesh.quads; q++) {
    const v = q * 4
    const p = (i: number) => [0, 1, 2].map((k) => mesh.positions[(v + i) * 3 + k]!)
    const [a, b, c] = [p(0), p(1), p(2)]
    const e1 = [b[0]! - a[0]!, b[1]! - a[1]!, b[2]! - a[2]!]
    const e2 = [c[0]! - b[0]!, c[1]! - b[1]!, c[2]! - b[2]!]
    const area = Math.hypot(...e1) * Math.hypot(...e2)
    const n = [0, 1, 2].map((k) => mesh.normals[v * 3 + k]!)
    const axis = n.findIndex((x) => x !== 0)
    const key = `${n[axis]! > 0 ? '+' : '-'}${'xyz'[axis]}`
    areas[key] = (areas[key] ?? 0) + area
  }
  return areas
}

/** The triangle winding must agree with the stored normal (counter-clockwise from outside). */
function windingMatchesNormals(mesh: VoxelMesh): boolean {
  for (let t = 0; t < mesh.indices.length; t += 3) {
    const [i0, i1, i2] = [mesh.indices[t]!, mesh.indices[t + 1]!, mesh.indices[t + 2]!]
    const p = (i: number) => [0, 1, 2].map((k) => mesh.positions[i * 3 + k]!)
    const [a, b, c] = [p(i0), p(i1), p(i2)]
    const e1 = [b[0]! - a[0]!, b[1]! - a[1]!, b[2]! - a[2]!]
    const e2 = [c[0]! - a[0]!, c[1]! - a[1]!, c[2]! - a[2]!]
    const cross = [
      e1[1]! * e2[2]! - e1[2]! * e2[1]!,
      e1[2]! * e2[0]! - e1[0]! * e2[2]!,
      e1[0]! * e2[1]! - e1[1]! * e2[0]!,
    ]
    const n = [0, 1, 2].map((k) => mesh.normals[i0 * 3 + k]!)
    if (cross[0]! * n[0]! + cross[1]! * n[1]! + cross[2]! * n[2]! <= 0) return false
  }
  return true
}

describe('VoxelGrid', () => {
  it('reads outside the grid as empty and rejects writes outside it', () => {
    const grid = new VoxelGrid(2, 2, 2)
    grid.set(1, 1, 1, 3)
    expect(grid.get(1, 1, 1)).toBe(3)
    expect(grid.get(-1, 0, 0)).toBe(0)
    expect(grid.get(2, 0, 0)).toBe(0)
    expect(() => grid.set(2, 0, 0, 1)).toThrow(RangeError)
  })

  it('extrudes a bitmap upright with row 0 on top', () => {
    const bitmap = textBitmap('MANDATE')
    const grid = fromBitmap(bitmap, { depth: 2, value: 4 })
    expect([grid.sx, grid.sy, grid.sz]).toEqual([41, 7, 2])
    // M's top-left pixel is ink; its top row, second column is blank.
    expect(grid.get(0, 6, 0)).toBe(4)
    expect(grid.get(1, 6, 1)).toBe(0)
    // The tracking column between N and D is empty all the way up.
    for (let y = 0; y < 7; y++) expect(grid.get(17, y, 0)).toBe(0)
    const ink = bitmap.rows.flat().filter(Boolean).length
    expect(grid.count()).toBe(ink * 2)
  })
})

describe('greedyMesh', () => {
  it('meshes one voxel as six unit quads', () => {
    const grid = new VoxelGrid(1, 1, 1)
    grid.set(0, 0, 0, 1)
    const mesh = greedyMesh(grid)
    expect(mesh.quads).toBe(6)
    expect(areaByNormal(mesh)).toEqual({ '+x': 1, '-x': 1, '+y': 1, '-y': 1, '+z': 1, '-z': 1 })
    expect(windingMatchesNormals(mesh)).toBe(true)
  })

  it('merges a solid 2×2×2 block into six faces with no internal faces', () => {
    const grid = new VoxelGrid(2, 2, 2)
    grid.fill(0, 0, 0, 2, 2, 2, 1)
    const mesh = greedyMesh(grid)
    expect(mesh.quads).toBe(6)
    expect(Object.values(areaByNormal(mesh))).toEqual([4, 4, 4, 4, 4, 4])
    expect(mesh.indices.length).toBe(36)
  })

  it('does not merge faces of different colours', () => {
    const grid = new VoxelGrid(2, 1, 1)
    grid.set(0, 0, 0, 1)
    grid.set(1, 0, 0, 2)
    const mesh = greedyMesh(grid)
    expect(mesh.quads).toBe(10)
    expect(new Set(mesh.values)).toEqual(new Set([1, 2]))
    expect(windingMatchesNormals(mesh)).toBe(true)
  })

  it('merges same-coloured neighbours and covers the exact surface area', () => {
    const grid = new VoxelGrid(3, 1, 1)
    grid.fill(0, 0, 0, 3, 1, 1, 1)
    const mesh = greedyMesh(grid)
    expect(mesh.quads).toBe(6)
    expect(areaByNormal(mesh)).toEqual({ '+x': 1, '-x': 1, '+y': 3, '-y': 3, '+z': 3, '-z': 3 })
  })

  it('handles an empty grid', () => {
    expect(greedyMesh(new VoxelGrid(3, 3, 3)).quads).toBe(0)
  })

  it('keeps the wordmark surface far below one quad per voxel face', () => {
    const grid = fromBitmap(textBitmap('MANDATE'), { depth: 2 })
    const mesh = greedyMesh(grid)
    expect(windingMatchesNormals(mesh)).toBe(true)
    expect(mesh.quads).toBeLessThan(grid.count() * 6 * 0.4)
  })
})

describe('voxelCells', () => {
  it('lists each filled cell centre once', () => {
    const grid = new VoxelGrid(2, 2, 1)
    grid.set(1, 0, 0, 5)
    grid.set(0, 1, 0, 6)
    const cells = voxelCells(grid)
    expect(cells.count).toBe(2)
    expect(Array.from(cells.centres)).toEqual([1.5, 0.5, 0.5, 0.5, 1.5, 0.5])
    expect(Array.from(cells.values)).toEqual([5, 6])
  })
})
