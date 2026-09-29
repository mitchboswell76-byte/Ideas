import { BufferAttribute, BufferGeometry, Color } from 'three'
import type { VoxelMesh } from '../voxel/greedy.ts'

/**
 * A greedy-meshed voxel surface as a BufferGeometry with per-vertex colours from `palette`
 * (indexed by the voxel's palette value). Pair with a `vertexColors` Lambert material.
 */
export function voxelGeometry(mesh: VoxelMesh, palette: readonly Color[]): BufferGeometry {
  const colours = new Float32Array(mesh.values.length * 3)
  mesh.values.forEach((value, i) => {
    const c = palette[value] ?? palette[1] ?? new Color('#ff00ff')
    colours[i * 3] = c.r
    colours[i * 3 + 1] = c.g
    colours[i * 3 + 2] = c.b
  })
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(mesh.positions, 3))
  geometry.setAttribute('normal', new BufferAttribute(mesh.normals, 3))
  geometry.setAttribute('color', new BufferAttribute(colours, 3))
  geometry.setIndex(new BufferAttribute(mesh.indices, 1))
  geometry.computeBoundingSphere()
  return geometry
}
