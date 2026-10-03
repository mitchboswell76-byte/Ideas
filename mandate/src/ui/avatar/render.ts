/**
 * Offscreen portrait renderer (DESIGN §4, §17): one small WebGL canvas, shared, that draws an
 * avatar once and hands back an image URL. Portraits on screen are plain <img>s, never a live 3D
 * canvas per panel. Loaded lazily with three.js; renders run one per frame so a screen full of
 * portraits never stalls the UI.
 */
import {
  AmbientLight,
  DirectionalLight,
  HemisphereLight,
  NoToneMapping,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three'
import { buildAvatar } from './build.ts'
import type { Framing } from './portraits.ts'
import type { Rig } from './rig.ts'

export interface RenderSize {
  width: number
  height: number
}

let renderer: WebGLRenderer | null = null

function getRenderer(): WebGLRenderer {
  if (renderer) return renderer
  const canvas = document.createElement('canvas')
  renderer = new WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
    powerPreference: 'low-power',
  })
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = SRGBColorSpace
  renderer.toneMapping = NoToneMapping
  canvas.addEventListener('webglcontextlost', () => {
    renderer = null
  })
  return renderer
}

function lights(scene: Scene): void {
  scene.add(new HemisphereLight('#f3f5ff', '#5d6470', 1.4))
  scene.add(new AmbientLight('#ffffff', 0.25))
  const key = new DirectionalLight('#fff4ea', 2.3)
  key.position.set(-5, 7, 9)
  scene.add(key)
  const fill = new DirectionalLight('#dfe7ff', 0.7)
  fill.position.set(7, 2, 5)
  scene.add(fill)
  const rim = new DirectionalLight('#ffffff', 1.1)
  rim.position.set(2, 6, -9)
  scene.add(rim)
}

/** Draw `rig` and return the image as an object URL (WebP, or PNG where WebP is unsupported). */
export async function renderRig(rig: Rig, framing: Framing, size: RenderSize): Promise<string> {
  const gl = getRenderer()
  gl.setPixelRatio(1)
  gl.setSize(size.width, size.height, false)
  const scene = new Scene()
  lights(scene)
  const avatar = buildAvatar(rig, framing)
  // Turned a little to their left, as in CK3 portraits.
  avatar.root.rotation.y = framing === 'bust' ? 0.3 : 0.4
  scene.add(avatar.root)

  const camera = new PerspectiveCamera(16, size.width / size.height, 1, 200)
  const hs = avatar.headScale
  const c = avatar.headCentre
  if (framing === 'bust') {
    const top = c.y + 1.5 * hs
    const bottom = c.y - 2.55 * hs
    const mid = (top + bottom) / 2
    const distance = (top - bottom) / 2 / Math.tan((16 * Math.PI) / 360)
    camera.position.set(0, mid + 0.5, distance)
    camera.lookAt(0, mid, 0)
  } else {
    const top = Math.max(c.y + 1.6 * hs, rig.accessories.includes('placard') ? 13.4 : 0)
    const mid = top / 2
    const distance = (top + 0.6) / 2 / Math.tan((16 * Math.PI) / 360)
    camera.position.set(0, mid + 2, distance)
    camera.lookAt(0, mid, 0)
  }
  gl.render(scene, camera)
  const blob = await new Promise<Blob | null>((resolve) =>
    gl.domElement.toBlob(resolve, 'image/webp', 0.92),
  )
  avatar.dispose()
  if (!blob) throw new Error('Portrait render failed')
  return URL.createObjectURL(blob)
}
