/**
 * Pan and zoom for the flat maps (world, UK). Pure. A view is a zoom level `k`
 * (1 = the whole map fits the frame) and the map point `x, y` at the centre of the frame, so a
 * resize keeps the same place in the middle.
 */

export interface View {
  k: number
  x: number
  y: number
}

/** The map (in map units) and the frame showing it (in CSS pixels). */
export interface Frame {
  width: number
  height: number
  mapWidth: number
  mapHeight: number
  /** Closest zoom this map allows; `MAX_ZOOM` if not set. */
  maxZoom?: number
}

export interface Point {
  x: number
  y: number
}

/** [x0, y0, x1, y1] in map units. */
export type Box = readonly [number, number, number, number]

export const MIN_ZOOM = 1
export const MAX_ZOOM = 12

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export const maxZoomOf = (frame: Frame) => frame.maxZoom ?? MAX_ZOOM

/** Pixels per map unit at k = 1: the whole map fits. */
export function baseScale(frame: Frame): number {
  return Math.min(frame.width / frame.mapWidth, frame.height / frame.mapHeight)
}

export function scaleOf(view: View, frame: Frame): number {
  return baseScale(frame) * view.k
}

export function homeView(frame: Frame): View {
  return { k: MIN_ZOOM, x: frame.mapWidth / 2, y: frame.mapHeight / 2 }
}

/** Zoom within limits, and keep the map in the frame (centred on an axis where it is smaller). */
export function clampView(view: View, frame: Frame): View {
  const k = clamp(view.k, MIN_ZOOM, maxZoomOf(frame))
  const s = baseScale(frame) * k
  const axis = (centre: number, frameSize: number, mapSize: number) => {
    const half = frameSize / 2 / s
    return 2 * half >= mapSize ? mapSize / 2 : clamp(centre, half, mapSize - half)
  }
  return {
    k,
    x: axis(view.x, frame.width, frame.mapWidth),
    y: axis(view.y, frame.height, frame.mapHeight),
  }
}

/** The SVG transform that shows `view`: `translate(tx ty) scale(s)`. */
export function transformOf(view: View, frame: Frame): { tx: number; ty: number; s: number } {
  const s = scaleOf(view, frame)
  return { tx: frame.width / 2 - view.x * s, ty: frame.height / 2 - view.y * s, s }
}

/** The map point under a frame pixel. */
export function toMap(view: View, frame: Frame, screen: Point): Point {
  const s = scaleOf(view, frame)
  return {
    x: view.x + (screen.x - frame.width / 2) / s,
    y: view.y + (screen.y - frame.height / 2) / s,
  }
}

/** Zoom by `factor` about a frame pixel, which stays over the same map point (wheel, pinch). */
export function zoomAt(view: View, frame: Frame, screen: Point, factor: number): View {
  const anchor = toMap(view, frame, screen)
  const k = clamp(view.k * factor, MIN_ZOOM, maxZoomOf(frame))
  const s = baseScale(frame) * k
  return clampView(
    {
      k,
      x: anchor.x - (screen.x - frame.width / 2) / s,
      y: anchor.y - (screen.y - frame.height / 2) / s,
    },
    frame,
  )
}

/** Drag the map by a pixel offset. */
export function panBy(view: View, frame: Frame, dx: number, dy: number): View {
  const s = scaleOf(view, frame)
  return clampView({ k: view.k, x: view.x - dx / s, y: view.y - dy / s }, frame)
}

/**
 * Frame a box with `pad` pixels round it, zooming in no further than `maxK` (small countries
 * shouldn't fill the screen as blobs).
 */
export function fitBox(box: Box, frame: Frame, pad = 48, maxK = 8): View {
  const [x0, y0, x1, y1] = box
  const base = baseScale(frame)
  const w = Math.max(x1 - x0, 1e-6)
  const h = Math.max(y1 - y0, 1e-6)
  const k = Math.min(
    maxK,
    Math.max(frame.width - 2 * pad, 1) / w / base,
    Math.max(frame.height - 2 * pad, 1) / h / base,
  )
  return clampView({ k, x: (x0 + x1) / 2, y: (y0 + y1) / 2 }, frame)
}

/** Whether two views are the same to within a fraction of a pixel. */
export function sameView(a: View, b: View): boolean {
  return Math.abs(a.k - b.k) < 1e-6 && Math.abs(a.x - b.x) < 1e-3 && Math.abs(a.y - b.y) < 1e-3
}
