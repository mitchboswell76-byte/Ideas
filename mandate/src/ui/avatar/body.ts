/**
 * Body proportions shared by the 3D builder and the 2D illustration (pure). Body units: feet at
 * y = 0, the adult shoulders at about 8.4, the character facing +z.
 */
import type { Rig } from './rig.ts'
import type { Vec3 } from './shape.ts'

/** Torso radius by height (Catmull-Rom through these knots). */
export const TORSO: readonly [number, number][] = [
  [4.9, 1.2],
  [5.6, 1.24],
  [6.6, 1.18],
  [7.6, 1.3],
  [8.35, 1.38],
  [8.8, 1.2],
  [9.05, 0.8],
  [9.16, 0.4],
  [9.2, 0],
]
export const TORSO_BOTTOM = TORSO[0][0]
export const TORSO_TOP = TORSO[TORSO.length - 1][0]

export function torsoRadius(y: number): number {
  const k = TORSO
  if (y <= k[0][0]) return k[0][1]
  if (y >= k[k.length - 1][0]) return 0
  let i = 0
  while (k[i + 1][0] < y) i++
  const p0 = k[Math.max(0, i - 1)][1]
  const p1 = k[i][1]
  const p2 = k[i + 1][1]
  const p3 = k[Math.min(k.length - 1, i + 2)][1]
  const t = (y - k[i][0]) / (k[i + 1][0] - k[i][0])
  const t2 = t * t
  const t3 = t2 * t
  return Math.max(
    0,
    0.5 *
      (2 * p1 +
        (-p0 + p2) * t +
        (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
        (-p0 + 3 * p1 - 3 * p2 + p3) * t3),
  )
}

export interface Frame {
  sx: number
  sz: number
}

export function torsoPoint(f: Frame, y: number, phi: number, out = 0): Vec3 {
  const r = torsoRadius(y)
  return {
    x: (r * f.sx + out) * Math.sin(phi),
    y,
    z: (r * f.sz + out) * Math.cos(phi),
  }
}

/** z of the torso's front surface at (x, y). */
export function torsoFront(f: Frame, x: number, y: number): number {
  const rx = torsoRadius(y) * f.sx
  const rz = torsoRadius(y) * f.sz
  return rz * Math.sqrt(Math.max(0, 1 - (x / Math.max(rx, 1e-3)) ** 2))
}

export interface Joints {
  shoulder: Vec3
  elbow: Vec3
  hand: Vec3
}

export function armJoints(pose: Rig['pose'], side: 1 | -1, width: number): Joints {
  const sx = 1.6 * width
  // Inside the torso's shoulder, so the capsule's round end makes the shoulder.
  const shoulder = { x: side * sx * 0.9, y: 8.35, z: 0 }
  const stand = {
    shoulder,
    elbow: { x: side * (sx + 0.2), y: 6.65, z: 0.05 },
    hand: { x: side * (sx + 0.25), y: 4.9, z: 0.3 },
  }
  switch (pose) {
    case 'armsFolded':
      return {
        shoulder,
        elbow: { x: side * (sx + 0.1), y: 6.75, z: 0.55 },
        hand: { x: -side * 0.85, y: 7.15, z: 1.3 },
      }
    case 'podium':
      return {
        shoulder,
        elbow: { x: side * (sx + 0.05), y: 6.8, z: 0.6 },
        hand: { x: side * 1.05, y: 6.35, z: 2.0 },
      }
    case 'wave':
      return side === -1
        ? {
            shoulder,
            elbow: { x: side * (sx + 0.9), y: 9.6, z: 0.15 },
            hand: { x: side * (sx + 1.05), y: 11.3, z: 0.4 },
          }
        : stand
    default:
      return stand
  }
}

export function bodyFrame(rig: Rig): Frame {
  return { sx: 1.3 * rig.body.width * Math.sqrt(rig.body.girth), sz: 0.72 * rig.body.girth }
}

/** Heads are drawn larger than life (Two Point proportions). */
export const headScaleOf = (rig: Rig) => rig.head.scale * 1.12

/** Height of the head's centre above the feet. */
export const headCentreY = (rig: Rig) => rig.body.scale * 9.5 + 0.67 * headScaleOf(rig)

export const neckRadius = (rig: Rig) => (rig.gender === 'female' ? 0.44 : 0.5)

/** Where the V opening of a jacket, jumper or vest bottoms out, and its half-angle at the top. */
export function vOpening(kind: Rig['clothes']['kind']): { bottom: number; top: number } {
  if (kind === 'jacket') return { bottom: 7.2, top: 0.62 }
  if (kind === 'vest') return { bottom: 6.6, top: 0.7 }
  return { bottom: 8.1, top: 0.48 }
}

/** Half-angle of the V at height y. */
export function vGap(kind: Rig['clothes']['kind'], y: number): number {
  const v = vOpening(kind)
  const t = Math.min(1, Math.max(0, (y - v.bottom) / (TORSO_TOP - 0.15 - v.bottom)))
  return v.top * (t * t * (3 - 2 * t)) ** 0.8
}

/** Collar points: inner top, outer top, tip (x for the character's left side; mirror for the right). */
export const COLLAR_POINTS: readonly [number, number][] = [
  [0.06, 9.02],
  [0.46, 8.98],
  [0.2, 8.55],
]

/** Chest badges (x on the character's left is positive). */
export const ROSETTE_AT = { x: 0.82, y: 8.68, r: 0.34 }
export const POPPY_AT = { x: 0.72, y: 8.7, r: 0.15 }
