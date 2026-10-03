/**
 * Shared avatar geometry (pure maths, no three.js): the head surface, where the face parts sit on
 * it, and how each hairstyle drapes. Head-local units: origin at the head's centre, y up, +z out of
 * the face, the head about 2 units tall. The 3D builder meshes these surfaces; the 2D illustration
 * projects the same points flat, so both drawings match.
 */
import type { FacialHair, HairStyle } from '../../sim/character/appearance.ts'
import type { Rig } from './rig.ts'

export interface Vec3 {
  x: number
  y: number
  z: number
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

/** Smoothstep from `a` (0) to `b` (1); works for a > b too. */
export function smooth(a: number, b: number, v: number): number {
  const t = clamp((v - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}

const bump = (v: number, centre: number, width: number) => Math.exp(-(((v - centre) / width) ** 2))

/** Polar angle for a height on the unit head (1 = crown, −1 = chin). */
export const thetaAt = (yN: number) => Math.acos(clamp(yN, -1, 1))

export type HeadShape = Rig['head']

/** A point on the head: θ from the crown (0) to the chin (π), φ round from the face (0). */
export function headPoint(h: HeadShape, theta: number, phi: number): Vec3 {
  const s = Math.sin(theta)
  const yN = Math.cos(theta)
  const cosP = Math.cos(phi)
  const front = Math.max(0, cosP)
  let x = h.rx * s * Math.sin(phi)
  let y = h.ry * yN
  let z = h.rz * s * cosP
  // Stylised skull: full at the temples, tapering to a soft jaw.
  const lower = smooth(-0.1, -1, yN)
  x *= 1 - lower * (0.27 - h.jaw * 0.13)
  z *= 1 - lower * 0.14 * (1 - front)
  x *= 1 + h.cheeks * 0.06 * bump(yN, -0.25, 0.35)
  // Chin and brow ridge come forward.
  const chin = smooth(-0.6, -0.95, yN) * front ** 3
  z += chin * (0.07 + h.chin * 0.07)
  y -= chin * h.chin * 0.05
  z += bump(yN, 0.34, 0.16) * front ** 4 * (0.035 + h.brow * 0.04)
  // A slightly flatter face and a rounder back of the skull.
  if (cosP > 0) z *= 1 - 0.05 * front * bump(yN, -0.1, 0.5)
  else z *= 1 + 0.06 * s * -cosP
  return { x, y, z }
}

const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z })
const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
})
export function normalise(v: Vec3): Vec3 {
  const l = Math.hypot(v.x, v.y, v.z) || 1
  return { x: v.x / l, y: v.y / l, z: v.z / l }
}
export const add = (a: Vec3, b: Vec3, k = 1): Vec3 => ({
  x: a.x + b.x * k,
  y: a.y + b.y * k,
  z: a.z + b.z * k,
})

/** Outward unit normal of the head surface (finite differences). */
export function headNormal(h: HeadShape, theta: number, phi: number): Vec3 {
  const t = clamp(theta, 1e-3, Math.PI - 1e-3)
  const e = 1e-3
  const dT = sub(headPoint(h, t + e, phi), headPoint(h, t - e, phi))
  const dP = sub(headPoint(h, t, phi + e), headPoint(h, t, phi - e))
  const n = normalise(cross(dP, dT))
  const p = headPoint(h, t, phi)
  return n.x * p.x + n.y * p.y + n.z * p.z < 0 ? { x: -n.x, y: -n.y, z: -n.z } : n
}

/** Where face parts sit, as (height on the unit head, angle from the face centre). */
export const ANCHORS = {
  eye: { y: 0.03, phi: (spacing: number) => 0.37 + spacing * 0.04 },
  brow: { y: 0.3 },
  nose: { y: -0.24 },
  mouth: { y: -0.53 },
  ear: { y: -0.05 },
} as const

/** Point on the face at a unit height and angle, lifted `lift` along the normal. */
export function facePoint(h: HeadShape, yN: number, phi: number, lift = 0): Vec3 {
  const t = thetaAt(yN)
  return add(headPoint(h, t, phi), headNormal(h, t, phi), lift)
}

// ---------------------------------------------------------------------------------------------
// Hair

export interface HairProfile {
  /** No hair cap at all. */
  none: boolean
  /** Unit height the hair starts at (1 = crown; lower for a receded crown). */
  start: number
  /** Unit height of the hairline over the forehead. */
  front: number
  /** Half-angle of the face opening (radians). */
  gap: number
  /** Unit height the hair reaches at the ears and at the back; below −1 hangs past the chin. */
  side: number
  back: number
  /** Base thickness (head units). */
  thickness: number
  /** Extra volume over the front of the crown (quiffs, fringes). */
  lift: number
  /** One-sided sweep (side parting). */
  sweep: number
  /** Curl bumps. */
  curl: number
  /** How far a long fall flares out over the shoulders. */
  flare: number
  /** Vertical ridges round the head (braids, locs). */
  ridges?: number
}

const PROFILES: Readonly<Record<HairStyle, Omit<HairProfile, 'none' | 'start'>>> = {
  bald: { front: 1, gap: 0, side: 1, back: 1, thickness: 0, lift: 0, sweep: 0, curl: 0, flare: 0 },
  buzz: {
    front: 0.6,
    gap: 0.55,
    side: 0.2,
    back: -0.5,
    thickness: 0.025,
    lift: 0,
    sweep: 0,
    curl: 0,
    flare: 0,
  },
  short: {
    front: 0.56,
    gap: 0.55,
    side: 0.2,
    back: -0.5,
    thickness: 0.07,
    lift: 0.05,
    sweep: 0,
    curl: 0,
    flare: 0,
  },
  sidePart: {
    front: 0.56,
    gap: 0.55,
    side: 0.18,
    back: -0.5,
    thickness: 0.08,
    lift: 0.04,
    sweep: 0.1,
    curl: 0,
    flare: 0,
  },
  quiff: {
    front: 0.58,
    gap: 0.55,
    side: 0.22,
    back: -0.48,
    thickness: 0.06,
    lift: 0.26,
    sweep: 0,
    curl: 0,
    flare: 0,
  },
  curly: {
    front: 0.55,
    gap: 0.55,
    side: 0.15,
    back: -0.55,
    thickness: 0.13,
    lift: 0.04,
    sweep: 0,
    curl: 0.05,
    flare: 0,
  },
  afro: {
    front: 0.5,
    gap: 0.58,
    side: 0.02,
    back: -0.6,
    thickness: 0.4,
    lift: 0.08,
    sweep: 0,
    curl: 0.035,
    flare: 0,
  },
  pixie: {
    front: 0.36,
    gap: 0.6,
    side: 0.0,
    back: -0.62,
    thickness: 0.08,
    lift: 0.05,
    sweep: 0.08,
    curl: 0,
    flare: 0,
  },
  bob: {
    front: 0.4,
    gap: 0.62,
    side: -0.8,
    back: -0.85,
    thickness: 0.09,
    lift: 0.03,
    sweep: 0.05,
    curl: 0,
    flare: 0.04,
  },
  long: {
    front: 0.4,
    gap: 0.62,
    side: -2.0,
    back: -2.4,
    thickness: 0.08,
    lift: 0.03,
    sweep: 0.05,
    curl: 0,
    flare: 0.16,
  },
  ponytail: {
    front: 0.5,
    gap: 0.6,
    side: 0.0,
    back: -0.6,
    thickness: 0.05,
    lift: 0,
    sweep: 0,
    curl: 0,
    flare: 0,
  },
  bun: {
    front: 0.5,
    gap: 0.6,
    side: 0.02,
    back: -0.58,
    thickness: 0.05,
    lift: 0,
    sweep: 0,
    curl: 0,
    flare: 0,
  },
  braids: {
    front: 0.5,
    gap: 0.64,
    side: -1.7,
    back: -2.1,
    thickness: 0.08,
    lift: 0,
    sweep: 0,
    curl: 0,
    flare: 0.12,
    ridges: 0.05,
  },
  locs: {
    front: 0.48,
    gap: 0.64,
    side: -1.3,
    back: -1.6,
    thickness: 0.11,
    lift: 0.04,
    sweep: 0,
    curl: 0,
    flare: 0.14,
    ridges: 0.08,
  },
}

/** The style's profile after the hairline has receded (`recession` 0–1). */
export function hairProfile(style: HairStyle, recession: number): HairProfile {
  const p = PROFILES[style]
  if (style === 'bald') return { ...p, none: true, start: 1 }
  // Long, tied and textured styles hide a receding line; it shows on short cuts.
  const r = ['short', 'sidePart', 'quiff', 'buzz', 'curly'].includes(style)
    ? recession
    : recession * 0.4
  if (r >= 0.75) {
    // Horseshoe: the crown is bare, hair only round the sides and back.
    return {
      ...p,
      none: false,
      start: 0.42,
      front: 0.42,
      gap: 1.35,
      side: Math.min(p.side, -0.2),
      lift: 0,
      sweep: 0,
    }
  }
  return {
    ...p,
    none: false,
    start: 1,
    front: p.front + r * (0.9 - p.front),
    gap: p.gap + r * 0.35,
    lift: p.lift * (1 - r),
  }
}

/** Unit height the hair ends at, at angle φ (the face opening at the front). */
export function hairEnd(p: HairProfile, phi: number): number {
  const a = Math.abs(phi)
  const sideBack = p.side + (p.back - p.side) * smooth(Math.PI / 2, Math.PI, a)
  return p.front + (sideBack - p.front) * smooth(p.gap, p.gap + 0.4, a)
}

/** Thickness of the hair at a point (volume, sweep and curls). */
export function hairThickness(p: HairProfile, theta: number, phi: number): number {
  const yN = Math.cos(theta)
  const front = Math.max(0, Math.cos(phi))
  let t = p.thickness
  t += p.lift * front ** 2 * bump(yN, 0.78, 0.28)
  t += p.sweep * (0.5 + 0.5 * Math.sin(phi)) * bump(yN, 0.75, 0.35)
  t += p.curl * (0.5 + 0.5 * Math.sin(phi * 11) * Math.sin(theta * 13))
  if (p.ridges) t += p.ridges * Math.abs(Math.sin(phi * 14))
  return t
}

/**
 * The hair cap / fall as a surface over (φ, s): s runs from the hair's start at the crown (0) to
 * its end (1), along the head and then, for styles longer than the head, hanging straight down.
 */
export function hairPoint(h: HeadShape, p: HairProfile, phi: number, s: number): Vec3 {
  const end = hairEnd(p, phi)
  const t0 = thetaAt(p.start)
  const onHeadEnd = Math.max(end, 0)
  const t1 = thetaAt(onHeadEnd)
  const arc = Math.max(0, t1 - t0)
  const drop = end < 0 ? (0 - end) * h.ry : 0
  const total = arc + drop || 1
  const along = s * total
  if (along <= arc || drop === 0) {
    const theta = t0 + Math.min(along, arc)
    return add(headPoint(h, theta, phi), headNormal(h, theta, phi), hairThickness(p, theta, phi))
  }
  // Hanging part: straight down from the widest line, flaring a little past the chin.
  const eq = headPoint(h, Math.PI / 2, phi)
  const n = headNormal(h, Math.PI / 2, phi)
  const depth = along - arc
  const below = Math.max(0, depth - h.ry)
  const out = hairThickness(p, Math.PI / 2, phi) + p.flare * below
  // Braids and locs keep their ridges all the way down.
  return { x: eq.x + n.x * out, y: -depth, z: eq.z + n.z * out }
}

// ---------------------------------------------------------------------------------------------
// Face lines shared by both renderers

/** `n` samples over t ∈ [−1, 1]. */
export const sample = (n: number, f: (t: number) => Vec3): Vec3[] =>
  Array.from({ length: n }, (_, i) => f(-1 + (2 * i) / (n - 1)))

/** Eyebrow centre line, inner end first. */
export function browPoints(rig: Rig, side: 1 | -1, lift = 0.03): Vec3[] {
  const eyePhi = ANCHORS.eye.phi(rig.eyes.spacing)
  return sample(7, (t) => {
    const yN =
      ANCHORS.brow.y +
      rig.brows.raise +
      rig.brows.arch * 0.045 * (1 - t * t) -
      t * rig.brows.tilt * 0.07 -
      0.015 * t
    return facePoint(rig.head, yN, side * (eyePhi + t * 0.17), lift)
  })
}

export const browRadius = (rig: Rig) => 0.038 * (1 + rig.brows.thickness * 0.35)

/** Half-width of the mouth as an angle. */
export const mouthHalf = (rig: Rig) => 0.3 + rig.mouth.width * 0.05

/** A lip line; `offset` moves it down (negative) for the lower lip of an open mouth. */
export function mouthPoints(rig: Rig, offset: number, lift: number): Vec3[] {
  const half = mouthHalf(rig)
  const curve = rig.mouth.curve
  return sample(9, (t) =>
    facePoint(
      rig.head,
      ANCHORS.mouth.y + curve * 0.09 * t * t - curve * 0.03 + offset,
      t * half,
      lift,
    ),
  )
}

export const lipRadius = (rig: Rig) => 0.032 * (1 + rig.mouth.lips * 0.3)

export function moustachePoints(h: HeadShape): Vec3[] {
  return sample(9, (t) => facePoint(h, -0.43 + 0.03 * t * t, t * 0.3, 0.035))
}

interface BeardSpec {
  thick: number
  maxPhi: number
  chinBulge: number
}

/** Beard coverage, or null for none / a moustache alone. */
export function beardSpec(style: FacialHair): BeardSpec | null {
  switch (style) {
    case 'stubble':
      return { thick: 0.012, maxPhi: 1.5, chinBulge: 0 }
    case 'goatee':
      return { thick: 0.06, maxPhi: 0.38, chinBulge: 0 }
    case 'beard':
      return { thick: 0.07, maxPhi: 1.5, chinBulge: 0.06 }
    case 'fullBeard':
      return { thick: 0.13, maxPhi: 1.5, chinBulge: 0.22 }
    default:
      return null
  }
}

/** A point on the beard over (u, v) ∈ [0,1]²: u across the face, v from its top edge to under the chin. */
export function beardPoint(
  h: HeadShape,
  style: FacialHair,
  spec: BeardSpec,
  u: number,
  v: number,
): Vec3 {
  const phi = -spec.maxPhi + u * 2 * spec.maxPhi
  const top = style === 'goatee' ? -0.64 : -0.42 + 0.4 * smooth(0.45, 1.4, Math.abs(phi))
  const theta = thetaAt(top) + v * (Math.PI - 0.12 - thetaAt(top))
  const front = Math.max(0, Math.cos(phi))
  const bulge = spec.chinBulge * front ** 2 * smooth(-0.55, -0.98, Math.cos(theta))
  const edge = smooth(0, 0.12, Math.min(u, 1 - u)) * smooth(0, 0.08, v)
  const out = (spec.thick + bulge) * (style === 'stubble' ? 1 : 0.35 + 0.65 * edge)
  return add(headPoint(h, theta, phi), headNormal(h, theta, phi), out)
}
