/**
 * Voxel volumes (DESIGN §17). Pure data — no three.js, DOM or React — so builders and meshers can be
 * unit-tested in Node and reused by every voxel scene (title monument, maps, avatars, Commons).
 *
 * Axes: x right, y up, z towards the viewer. Voxel (x, y, z) fills the unit cube from (x, y, z) to
 * (x + 1, y + 1, z + 1). Each cell holds a palette index; 0 is empty.
 */
import type { Bitmap } from '../pixel/font.ts'

export class VoxelGrid {
  readonly sx: number
  readonly sy: number
  readonly sz: number
  readonly data: Uint8Array

  constructor(sx: number, sy: number, sz: number) {
    this.sx = sx
    this.sy = sy
    this.sz = sz
    this.data = new Uint8Array(sx * sy * sz)
  }

  inBounds(x: number, y: number, z: number): boolean {
    return x >= 0 && y >= 0 && z >= 0 && x < this.sx && y < this.sy && z < this.sz
  }

  /** Palette index at a cell; outside the grid reads as empty. */
  get(x: number, y: number, z: number): number {
    return this.inBounds(x, y, z) ? this.data[x + this.sx * (y + this.sy * z)]! : 0
  }

  set(x: number, y: number, z: number, value: number): void {
    if (!this.inBounds(x, y, z))
      throw new RangeError(`Voxel (${x}, ${y}, ${z}) is outside the grid`)
    this.data[x + this.sx * (y + this.sy * z)] = value
  }

  /** Fill a box of cells, `[x0, x1)` etc., clipped to the grid. */
  fill(
    x0: number,
    y0: number,
    z0: number,
    x1: number,
    y1: number,
    z1: number,
    value: number,
  ): void {
    for (let z = Math.max(0, z0); z < Math.min(this.sz, z1); z++) {
      for (let y = Math.max(0, y0); y < Math.min(this.sy, y1); y++) {
        for (let x = Math.max(0, x0); x < Math.min(this.sx, x1); x++) this.set(x, y, z, value)
      }
    }
  }

  /** Number of filled cells. */
  count(): number {
    let n = 0
    for (const v of this.data) if (v !== 0) n++
    return n
  }
}

export interface FromBitmapOptions {
  /** Voxels deep (z). Default 1. */
  depth?: number
  /** Palette index for ink. Default 1. */
  value?: number
}

/**
 * Extrude a bitmap (glyphs, icons, `textBitmap` output) into an upright wall of voxels. Bitmap rows
 * run top to bottom, so row 0 becomes the top layer.
 */
export function fromBitmap(
  bitmap: Bitmap,
  { depth = 1, value = 1 }: FromBitmapOptions = {},
): VoxelGrid {
  const grid = new VoxelGrid(bitmap.width, bitmap.height, depth)
  bitmap.rows.forEach((row, r) => {
    const y = bitmap.height - 1 - r
    row.forEach((ink, x) => {
      if (ink) for (let z = 0; z < depth; z++) grid.set(x, y, z, value)
    })
  })
  return grid
}
