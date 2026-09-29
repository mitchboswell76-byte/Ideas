/**
 * The diorama camera (DESIGN §17): a narrow-FOV perspective camera at a fixed isometric angle, a
 * front-on title framing that matches the 2D wordmark, and the fly-in between them. Tune the look
 * with the constants at the top.
 */
import { CatmullRomCurve3, MathUtils, Vector3, type PerspectiveCamera } from 'three'

export const FOV = 30
/**
 * The title is shot through a long lens, so the voxel wordmark reads as flat pixels like the 2D
 * one; the lens widens to `FOV` as the camera flies in, and the letters open out into 3D.
 */
export const TITLE_FOV = 10
export const PITCH_DEG = 40
export const YAW_DEG = 40
export const ISO_DISTANCE = 95
/**
 * Where the settled camera looks: left of and behind the monument, so the monument sits in the
 * open lower-right of the stage rather than under the front page.
 */
export const ISO_TARGET = new Vector3(-22, 3, 5)
export const FLY_SECONDS = 3.2

/** The title wordmark spans this share of the viewport width (keep in step with `title.css`). */
export const WORDMARK_VIEW_FRACTION = 0.6

/** Monument layout, in voxels: the wordmark stands on a plinth, centred on x = 0. */
export const WORDMARK = {
  width: 41,
  height: 7,
  depth: 2,
  base: 1,
  /** Centre of the empty tracking column between N and D, which the camera flies through. */
  slotX: -3,
} as const

const wordCentreY = WORDMARK.base + WORDMARK.height / 2
const wordFrontZ = WORDMARK.depth / 2

export type Shot = 'title' | 'fly' | 'iso'

export function isoPosition(): Vector3 {
  const pitch = MathUtils.degToRad(PITCH_DEG)
  const yaw = MathUtils.degToRad(YAW_DEG)
  return new Vector3(
    Math.cos(pitch) * Math.sin(yaw),
    Math.sin(pitch),
    Math.cos(pitch) * Math.cos(yaw),
  )
    .multiplyScalar(ISO_DISTANCE)
    .add(ISO_TARGET)
}

function setFov(camera: PerspectiveCamera, fov: number): void {
  if (camera.fov === fov) return
  camera.fov = fov
  camera.updateProjectionMatrix()
}

export function placeIso(camera: PerspectiveCamera): void {
  setFov(camera, FOV)
  camera.position.copy(isoPosition())
  camera.lookAt(ISO_TARGET)
}

/** Front-on, with the wordmark's front face filling `WORDMARK_VIEW_FRACTION` of the width. */
export function placeTitle(camera: PerspectiveCamera, aspect: number): void {
  setFov(camera, TITLE_FOV)
  const halfTan = Math.tan(MathUtils.degToRad(TITLE_FOV / 2))
  const distance = WORDMARK.width / (WORDMARK_VIEW_FRACTION * 2 * halfTan * Math.max(aspect, 0.1))
  camera.position.set(0, wordCentreY, wordFrontZ + distance)
  camera.lookAt(0, wordCentreY, 0)
}

/** CSS-style cubic-bezier easing, solved for x by Newton's method. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  const bez = (t: number, p1: number, p2: number) =>
    3 * (1 - t) * (1 - t) * t * p1 + 3 * (1 - t) * t * t * p2 + t * t * t
  const slope = (t: number, p1: number, p2: number) =>
    3 * (1 - t) * (1 - t) * p1 + 6 * (1 - t) * t * (p2 - p1) + 3 * t * t * (1 - p2)
  return (x) => {
    if (x <= 0) return 0
    if (x >= 1) return 1
    let t = x
    for (let i = 0; i < 8; i++) {
      const d = slope(t, x1, x2)
      if (Math.abs(d) < 1e-6) break
      t -= (bez(t, x1, x2) - x) / d
      t = MathUtils.clamp(t, 0, 1)
    }
    return bez(t, y1, y2)
  }
}

/** Gentle start, quick through the letters, long slow settle at the end. */
export const flyEase = cubicBezier(0.55, 0, 0.12, 1)

export interface FlyPath {
  path: CatmullRomCurve3
  /** Where the camera looked when the flight began. */
  startLook: Vector3
}

/**
 * Straight at the letters, through the gap between N and D, up and round the back, and down into
 * the isometric view from the front-right.
 */
export function flyPath(from: Vector3): FlyPath {
  const y = wordCentreY
  const path = new CatmullRomCurve3(
    [
      from.clone(),
      new Vector3(WORDMARK.slotX, y, 10),
      new Vector3(WORDMARK.slotX, y, -9),
      new Vector3(-16, 24, -44),
      new Vector3(40, 50, -22),
      isoPosition(),
    ],
    false,
    'centripetal',
  )
  return { path, startLook: new Vector3(0, y, 0) }
}

const tangent = new Vector3()
const ahead = new Vector3()

/**
 * Camera pose at eased progress `e` (0–1): look along the path while flying through the letters,
 * then turn towards the monument for the settle.
 */
export function flyPose(
  fly: FlyPath,
  e: number,
  camera: PerspectiveCamera,
  position: Vector3,
  look: Vector3,
): void {
  setFov(camera, MathUtils.lerp(TITLE_FOV, FOV, MathUtils.smoothstep(e, 0, 0.45)))
  fly.path.getPointAt(e, position)
  fly.path.getTangentAt(Math.min(e, 0.999), tangent)
  ahead.copy(position).addScaledVector(tangent, 12)
  look.lerpVectors(fly.startLook, ahead, MathUtils.smoothstep(e, 0, 0.1))
  look.lerp(ISO_TARGET, MathUtils.smoothstep(e, 0.35, 0.85))
}

/** Fog starts just past what the camera is looking at, so the subject is always clear. */
export function fogRange(distance: number): [near: number, far: number] {
  return [distance + 25, distance + 225]
}
