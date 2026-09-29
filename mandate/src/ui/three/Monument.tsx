/**
 * "The opening monument" (DESIGN §17): the voxel MANDATE wordmark on a plinth, with ground
 * lettering and floating cubes on a dot-grid plain. It is the title screen seen in 3D and the stage
 * backdrop until the world map (T6) replaces it. Original design; fewer than ten draw calls.
 */
import { useFrame, type ThreeElements } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  BoxGeometry,
  CanvasTexture,
  Color,
  InstancedMesh,
  LinearMipmapLinearFilter,
  MeshLambertMaterial,
  NearestFilter,
  Object3D,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three'
import { textBitmap } from '../pixel/font.ts'
import { mulberry32 } from '../random.ts'
import {
  ACCENT_SHARE,
  FLICKER_PER_STEP,
  FLICKER_STEPS_PER_SECOND,
  TITLE_ACCENTS,
} from '../title/accents.ts'
import { greedyMesh } from '../voxel/greedy.ts'
import { fromBitmap, VoxelGrid } from '../voxel/grid.ts'
import { voxelCells } from '../voxel/instances.ts'
import { WORDMARK } from './camera.ts'
import { voxelGeometry } from './geometry.ts'
import type { SceneTokens } from './tokens.ts'
import { steppedSeconds } from './useStepper.ts'

const GROUND_SIZE = 640
/** World units between ground dots; each dot is 2 of the texture's 16 pixels. */
const GRID_SPACING = 3
const DOT_TEXTURE = 16

function Ground({ tokens }: { tokens: SceneTokens }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = DOT_TEXTURE
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = tokens.ground
    ctx.fillRect(0, 0, DOT_TEXTURE, DOT_TEXTURE)
    ctx.fillStyle = tokens.gridDot
    ctx.fillRect(0, 0, 2, 2)
    const tex = new CanvasTexture(canvas)
    tex.colorSpace = SRGBColorSpace
    tex.wrapS = tex.wrapT = RepeatWrapping
    tex.repeat.set(GROUND_SIZE / GRID_SPACING, GROUND_SIZE / GRID_SPACING)
    tex.magFilter = NearestFilter
    tex.minFilter = LinearMipmapLinearFilter
    tex.anisotropy = 4
    return tex
  }, [tokens.ground, tokens.gridDot])
  useEffect(() => () => texture.dispose(), [texture])
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={-0.01}>
      <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
      <meshBasicMaterial map={texture} />
    </mesh>
  )
}

/** A greedy-meshed static voxel model in one colour per palette index. */
type StaticVoxelsProps = Omit<ThreeElements['mesh'], 'geometry'> & {
  grid: VoxelGrid
  palette: readonly Color[]
}

function StaticVoxels({ grid, palette, ...rest }: StaticVoxelsProps) {
  const mesh = useMemo(() => greedyMesh(grid), [grid])
  const geometry = useMemo(() => voxelGeometry(mesh, palette), [mesh, palette])
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <mesh geometry={geometry} {...rest}>
      <meshLambertMaterial vertexColors />
    </mesh>
  )
}

const dummy = new Object3D()
const accentColours = TITLE_ACCENTS.map((hex) => new Color(hex))

type Accents = Map<number, number>

const shade = new Color()

/**
 * Neutral voxels vary a few per cent in brightness, so the wordmark reads as individual blocks
 * without gaps (which shimmer at low resolution).
 */
function paintWordmark(
  mesh: InstancedMesh,
  accents: Accents,
  neutral: Color,
  jitter: Float32Array,
): void {
  for (let i = 0; i < mesh.count; i++) {
    const a = accents.get(i)
    mesh.setColorAt(
      i,
      a === undefined ? shade.copy(neutral).multiplyScalar(jitter[i]!) : accentColours[a]!,
    )
  }
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
}

/** Swap a few lit voxels for others, keeping the lit share steady. */
function flicker(accents: Accents, count: number): void {
  const lit = [...accents.keys()]
  for (let k = 0; k < FLICKER_PER_STEP && lit.length > 0; k++) {
    const off = lit.splice(Math.floor(Math.random() * lit.length), 1)[0]!
    accents.delete(off)
    accents.set(Math.floor(Math.random() * count), Math.floor(Math.random() * accentColours.length))
  }
}

function Wordmark({ tokens, animate }: { tokens: SceneTokens; animate: boolean }) {
  const { mesh, accents, jitter } = useMemo(() => {
    const cells = voxelCells(fromBitmap(textBitmap('MANDATE'), { depth: WORDMARK.depth }))
    const m = new InstancedMesh(new BoxGeometry(1, 1, 1), new MeshLambertMaterial(), cells.count)
    for (let i = 0; i < cells.count; i++) {
      dummy.position.fromArray(cells.centres, i * 3)
      dummy.rotation.set(0, 0, 0)
      dummy.scale.setScalar(1)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    }
    // A fixed opening scatter of lit voxels, so every visit starts the same.
    const random = mulberry32(10)
    const lit: Accents = new Map()
    while (lit.size < Math.round(cells.count * ACCENT_SHARE)) {
      lit.set(Math.floor(random() * cells.count), Math.floor(random() * accentColours.length))
    }
    const jitterRandom = mulberry32(41)
    const shades = Float32Array.from({ length: cells.count }, () => 0.93 + jitterRandom() * 0.1)
    return { mesh: m, accents: lit, jitter: shades }
  }, [])
  useEffect(
    () => () => {
      mesh.geometry.dispose()
      ;(mesh.material as MeshLambertMaterial).dispose()
    },
    [mesh],
  )

  const neutral = useRef(new Color(tokens.voxel))
  useEffect(() => {
    neutral.current = new Color(tokens.voxel)
    paintWordmark(mesh, accents, neutral.current, jitter)
  }, [mesh, accents, jitter, tokens.voxel])

  const lastFlicker = useRef(0)
  useFrame(() => {
    if (!animate) return
    const now = performance.now()
    if (now - lastFlicker.current < 1000 / FLICKER_STEPS_PER_SECOND) return
    lastFlicker.current = now
    flicker(accents, mesh.count)
    paintWordmark(mesh, accents, neutral.current, jitter)
  })

  return (
    <primitive object={mesh} position={[-WORDMARK.width / 2, WORDMARK.base, -WORDMARK.depth / 2]} />
  )
}

interface Floater {
  x: number
  y: number
  z: number
  size: number
  phase: number
  colour: Color | null
}

function placeFloaters(mesh: InstancedMesh, floaters: readonly Floater[], t: number): void {
  floaters.forEach((f, i) => {
    dummy.position.set(f.x, f.y + Math.sin(t * 1.2 + f.phase) * 0.45, f.z)
    dummy.rotation.set(0, t * 0.4 + f.phase, 0)
    dummy.scale.setScalar(f.size)
    dummy.updateMatrix()
    mesh.setMatrixAt(i, dummy.matrix)
  })
  mesh.instanceMatrix.needsUpdate = true
}

function colourFloaters(mesh: InstancedMesh, floaters: readonly Floater[], neutral: Color): void {
  floaters.forEach((f, i) => mesh.setColorAt(i, f.colour ?? neutral))
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
}

function FloatingCubes({ tokens, animate }: { tokens: SceneTokens; animate: boolean }) {
  const floaters = useMemo<Floater[]>(() => {
    const random = mulberry32(2026)
    const list: Floater[] = []
    while (list.length < 28) {
      const x = -48 + random() * 96
      const z = -34 + random() * 58
      const y = 3 + random() * 15
      // Keep the camera's line to the wordmark and its path through the letters clear.
      if (Math.abs(x) < 26 && z > -4 && y < 14) continue
      list.push({
        x,
        y,
        z,
        size: 0.6 + random() * 0.8,
        phase: random() * Math.PI * 2,
        colour:
          random() < 0.35 ? accentColours[Math.floor(random() * accentColours.length)]! : null,
      })
    }
    return list
  }, [])

  const mesh = useMemo(() => {
    const m = new InstancedMesh(
      new BoxGeometry(1, 1, 1),
      new MeshLambertMaterial(),
      floaters.length,
    )
    placeFloaters(m, floaters, 0)
    return m
  }, [floaters])
  useEffect(
    () => () => {
      mesh.geometry.dispose()
      ;(mesh.material as MeshLambertMaterial).dispose()
    },
    [mesh],
  )

  useEffect(
    () => colourFloaters(mesh, floaters, new Color(tokens.voxel)),
    [floaters, mesh, tokens.voxel],
  )

  useFrame(() => {
    if (animate) placeFloaters(mesh, floaters, steppedSeconds())
  })

  return <primitive object={mesh} />
}

const PLINTH = (() => {
  const grid = new VoxelGrid(WORDMARK.width + 6, 1, 6)
  grid.fill(0, 0, 0, grid.sx, 1, grid.sz, 1)
  return grid
})()

const GROUND_TEXT = fromBitmap(textBitmap('EST. 2026'), { depth: 1, value: 2 })
const GROUND_TEXT_SCALE = 0.5

interface MonumentProps {
  tokens: SceneTokens
  animate: boolean
  /** Ground lettering is hidden head-on, where it only reads as a row of dashes. */
  showGroundText: boolean
}

export function Monument({ tokens, animate, showGroundText }: MonumentProps) {
  const palette = useMemo(
    () => [new Color(), new Color(tokens.voxel), new Color(tokens.inkMuted)],
    [tokens.voxel, tokens.inkMuted],
  )
  return (
    <group>
      <Ground tokens={tokens} />
      <StaticVoxels
        grid={PLINTH}
        palette={palette}
        position={[-PLINTH.sx / 2, 0, -PLINTH.sz / 2]}
      />
      <StaticVoxels
        grid={GROUND_TEXT}
        visible={showGroundText}
        palette={palette}
        rotation-x={-Math.PI / 2}
        scale={GROUND_TEXT_SCALE}
        position={[
          (-GROUND_TEXT.sx * GROUND_TEXT_SCALE) / 2,
          0,
          PLINTH.sz / 2 + 3 + GROUND_TEXT.sy * GROUND_TEXT_SCALE,
        ]}
      />
      <Wordmark tokens={tokens} animate={animate} />
      <FloatingCubes tokens={tokens} animate={animate} />
    </group>
  )
}
