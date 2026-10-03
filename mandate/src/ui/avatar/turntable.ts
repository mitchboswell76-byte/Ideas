/**
 * The creator's turntable (DESIGN §4: the Sims' Create-a-Sim): one live WebGL canvas showing the
 * full figure, turned by dragging and zoomed between the whole body and the face. Plain three.js
 * (no react-three-fiber, so it shares the portrait chunk) and rendered on demand: a frame is drawn
 * only when the look, the angle, the zoom or the size changes. Rebuilds wait for the next frame,
 * so dragging a slider builds the avatar at most once per frame.
 */
import { NoToneMapping, PerspectiveCamera, Scene, SRGBColorSpace, WebGLRenderer } from 'three'
import { buildAvatar, type Avatar } from './build.ts'
import { lights } from './render.ts'
import type { Rig } from './rig.ts'

const FOV = 16
const HALF_FOV = Math.tan((FOV * Math.PI) / 360)
/** Starting turn: a little to their left, as in the portraits. */
export const DEFAULT_ANGLE = 0.35
const ZOOM_MS = 260
/** Rebuilds slower than this pace themselves (see `draw`)… */
const BUILD_GAP_FROM_MS = 8
/** …leaving at least this long before the next. */
const BUILD_GAP_MS = 120

export interface TurntableOptions {
  /** Device pixels per CSS pixel (lower on the Low preset). */
  pixelRatio: number
  /** Multisampling; off on the Low preset, where it costs the most. */
  antialias: boolean
  /** Called when WebGL gives up (context lost): show the 2D illustration instead. */
  onFail: () => void
}

export class Turntable {
  private readonly renderer: WebGLRenderer
  private readonly scene = new Scene()
  private readonly camera = new PerspectiveCamera(FOV, 1, 1, 400)
  private avatar: Avatar | null = null
  private pendingRig: Rig | null = null
  private angle = DEFAULT_ANGLE
  private zoom = 0
  private zoomAnim: { from: number; to: number; start: number } | null = null
  private frame = 0
  private disposed = false
  /** No rebuild before this time: slow builds leave a gap so input and paint keep flowing. */
  private nextBuildAt = 0
  private readonly canvas: HTMLCanvasElement
  private readonly options: TurntableOptions

  constructor(canvas: HTMLCanvasElement, options: TurntableOptions) {
    this.canvas = canvas
    this.options = options
    this.renderer = new WebGLRenderer({
      canvas,
      alpha: true,
      antialias: options.antialias,
      powerPreference: 'low-power',
    })
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.outputColorSpace = SRGBColorSpace
    this.renderer.toneMapping = NoToneMapping
    this.renderer.setPixelRatio(options.pixelRatio)
    lights(this.scene)
    canvas.addEventListener('webglcontextlost', this.onLost)
  }

  private readonly onLost = (e: Event) => {
    e.preventDefault()
    this.options.onFail()
  }

  setRig(rig: Rig): void {
    this.pendingRig = rig
    this.request()
  }

  /** Radians about the vertical axis. */
  setAngle(angle: number): void {
    this.angle = angle
    this.request()
  }

  get currentAngle(): number {
    return this.angle
  }

  /** 0 = whole body, 1 = face. Animated unless `animate` is false (reduced motion). */
  zoomTo(zoom: number, animate: boolean): void {
    const to = Math.max(0, Math.min(1, zoom))
    this.zoomAnim =
      animate && this.avatar ? { from: this.zoom, to, start: performance.now() } : null
    if (!this.zoomAnim) this.zoom = to
    this.request()
  }

  resize(width: number, height: number): void {
    if (width < 1 || height < 1) return
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.request()
  }

  private request(): void {
    if (this.frame || this.disposed) return
    this.frame = requestAnimationFrame(this.draw)
  }

  private readonly draw = (now: number) => {
    this.frame = 0
    let rebuilt = false
    const started = performance.now()
    if (this.pendingRig && now < this.nextBuildAt) {
      // Still inside the last rebuild's gap: try again next frame.
      this.request()
    } else if (this.pendingRig) {
      this.avatar?.dispose()
      if (this.avatar) this.scene.remove(this.avatar.root)
      this.avatar = buildAvatar(this.pendingRig, 'full')
      this.scene.add(this.avatar.root)
      this.pendingRig = null
      rebuilt = true
    }
    if (!this.avatar) return
    if (this.zoomAnim) {
      const t = Math.min(1, (now - this.zoomAnim.start) / ZOOM_MS)
      const eased = 1 - (1 - t) ** 3
      this.zoom = this.zoomAnim.from + (this.zoomAnim.to - this.zoomAnim.from) * eased
      if (t >= 1) this.zoomAnim = null
      else this.request()
    }
    this.avatar.root.rotation.y = this.angle
    this.place(this.avatar)
    this.renderer.render(this.scene, this.camera)
    if (rebuilt) {
      // A rebuild (meshes plus their upload in the render) that takes half a frame or more holds
      // the next one back, so dragging a slider on a slow laptop updates the figure several
      // times a second while the page stays smooth.
      const ended = performance.now()
      const cost = ended - started
      this.nextBuildAt = cost > BUILD_GAP_FROM_MS ? ended + Math.max(2 * cost, BUILD_GAP_MS) : 0
    }
  }

  /** Frame the whole figure, the face, or a blend of the two. */
  private place({ headCentre: c, headScale: hs }: Avatar): void {
    const fit = (top: number, bottom: number) => {
      const h = top - bottom
      const byHeight = h / 2 / HALF_FOV
      const byWidth = (h * 0.62) / 2 / HALF_FOV / Math.max(0.3, this.camera.aspect)
      return { mid: (top + bottom) / 2, distance: Math.max(byHeight, byWidth) * 1.06 }
    }
    const body = fit(c.y + 1.5 * hs, -0.3)
    // Head and shoulders, a little looser than the portrait bust.
    const face = fit(c.y + 1.7 * hs, c.y - 2.4 * hs)
    const z = this.zoom
    const mid = body.mid + (face.mid - body.mid) * z
    const distance = body.distance + (face.distance - body.distance) * z
    this.camera.position.set(0, mid + 0.8 * (1 - z) + 0.3 * z, distance)
    this.camera.lookAt(0, mid, 0)
  }

  dispose(): void {
    this.disposed = true
    if (this.frame) cancelAnimationFrame(this.frame)
    this.canvas.removeEventListener('webglcontextlost', this.onLost)
    this.avatar?.dispose()
    this.renderer.dispose()
  }
}
