/**
 * Stylised 3D avatar (DESIGN §4: The Sims / Two Point Hospital): soft parametric meshes built in
 * code from a `Rig` — no model files. Loaded lazily with three.js. Units are head units (the head
 * is about 2 tall); feet stand at y = 0 and the character faces +z.
 */
import {
  BoxGeometry,
  BufferGeometry,
  CapsuleGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
  type Material,
} from 'three'
import {
  armJoints,
  bodyFrame,
  COLLAR_POINTS,
  headCentreY,
  headScaleOf,
  neckRadius,
  POPPY_AT,
  ROSETTE_AT,
  torsoFront,
  torsoPoint,
  torsoRadius,
  TORSO_BOTTOM,
  TORSO_TOP,
  vGap,
  type Frame,
} from './body.ts'
import { shade } from './colour.ts'
import type { Framing } from './portraits.ts'
import type { Rig } from './rig.ts'
import {
  add,
  ANCHORS,
  beardPoint,
  beardSpec,
  browPoints,
  browRadius,
  facePoint,
  hairPoint,
  hairProfile,
  headNormal,
  headPoint,
  lipRadius,
  mouthHalf,
  mouthPoints,
  moustachePoints,
  normalise,
  sample,
  thetaAt,
  type HeadShape,
  type Vec3,
} from './shape.ts'

// ---------------------------------------------------------------------------------------------
// Materials and helpers

/** Materials kept across builds: disposing them would make three.js recompile shaders per render. */
const MATERIALS = new Map<string, MeshStandardMaterial>()
const MATERIAL_LIMIT = 400

class Kit {
  private readonly materials = MATERIALS

  mat(colour: string, opts: { rough?: number; double?: boolean; opacity?: number } = {}): Material {
    const rough = opts.rough ?? 0.82
    const opacity = opts.opacity ?? 1
    const key = `${colour}|${rough}|${opts.double ? 1 : 0}|${opacity}`
    let m = this.materials.get(key)
    if (!m) {
      m = new MeshStandardMaterial({
        color: colour,
        roughness: rough,
        metalness: 0,
        ...(opts.double ? { side: DoubleSide } : {}),
        ...(opacity < 1 ? { transparent: true, opacity } : {}),
      })
      if (this.materials.size >= MATERIAL_LIMIT) {
        const [oldest] = this.materials.keys()
        this.materials.get(oldest)?.dispose()
        this.materials.delete(oldest)
      }
      this.materials.set(key, m)
    }
    return m
  }
}

const v3 = (p: Vec3) => new Vector3(p.x, p.y, p.z)

function mesh(geometry: BufferGeometry, material: Material, parent: Object3D): Mesh {
  const m = new Mesh(geometry, material)
  parent.add(m)
  return m
}

/** Place `obj` at `p` with its local +z along `n` (flattened parts lie on the surface). */
function onSurface(obj: Object3D, p: Vec3, n: Vec3): Object3D {
  obj.position.set(p.x, p.y, p.z)
  obj.lookAt(p.x + n.x, p.y + n.y, p.z + n.z)
  return obj
}

/** A grid surface over (u, v) ∈ [0,1]²; `wrapU` joins the u = 0 and u = 1 seam smoothly. */
function surface(
  fn: (u: number, v: number) => Vec3,
  uSeg: number,
  vSeg: number,
  wrapU = false,
): BufferGeometry {
  const pos: number[] = []
  for (let j = 0; j <= vSeg; j++) {
    for (let i = 0; i <= uSeg; i++) {
      const p = fn(i / uSeg, j / vSeg)
      pos.push(p.x, p.y, p.z)
    }
  }
  const index: number[] = []
  const row = uSeg + 1
  for (let j = 0; j < vSeg; j++) {
    for (let i = 0; i < uSeg; i++) {
      const a = j * row + i
      const b = a + 1
      const c = a + row
      const d = c + 1
      index.push(a, c, b, b, c, d)
    }
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setIndex(index)
  g.computeVertexNormals()
  const normals = g.getAttribute('normal')
  const average = (ids: number[]) => {
    const n = new Vector3()
    for (const id of ids) n.add(new Vector3().fromBufferAttribute(normals, id))
    n.normalize()
    for (const id of ids) normals.setXYZ(id, n.x, n.y, n.z)
  }
  if (wrapU) for (let j = 0; j <= vSeg; j++) average([j * row, j * row + uSeg])
  // Rows that collapse to a point (poles) share one normal.
  for (const j of [0, vSeg]) {
    const first = new Vector3().fromBufferAttribute(g.getAttribute('position'), j * row)
    const last = new Vector3().fromBufferAttribute(g.getAttribute('position'), j * row + uSeg / 2)
    if (first.distanceTo(last) < 1e-5) average(Array.from({ length: row }, (_, i) => j * row + i))
  }
  normals.needsUpdate = true
  return g
}

/** A capsule between two points. */
function limb(from: Vec3, to: Vec3, radius: number, material: Material, parent: Object3D): Mesh {
  const a = v3(from)
  const b = v3(to)
  const length = Math.max(0.001, a.distanceTo(b))
  const m = mesh(new CapsuleGeometry(radius, length, 6, 14), material, parent)
  m.position.copy(a).add(b).multiplyScalar(0.5)
  m.quaternion.copy(
    new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), b.clone().sub(a).normalize()),
  )
  return m
}

function tube(points: Vec3[], radius: number, material: Material, parent: Object3D, caps = true) {
  const curve = new CatmullRomCurve3(points.map(v3))
  mesh(new TubeGeometry(curve, Math.max(8, points.length * 3), radius, 8, false), material, parent)
  if (!caps) return
  for (const p of [points[0], points[points.length - 1]]) {
    mesh(new SphereGeometry(radius, 8, 6), material, parent).position.set(p.x, p.y, p.z)
  }
}

// ---------------------------------------------------------------------------------------------
// Head

function buildHead(rig: Rig, kit: Kit, mount: HeadMount): Group {
  const h: HeadShape = rig.head
  const head = new Group()
  const skin = kit.mat(rig.colours.skin, { rough: 0.7 })

  mesh(
    surface((u, v) => headPoint(h, v * Math.PI, -Math.PI + u * 2 * Math.PI), 48, 32, true),
    skin,
    head,
  )

  // Ears.
  for (const side of [1, -1] as const) {
    const t = thetaAt(ANCHORS.ear.y)
    const phi = side * Math.PI * 0.5
    const p = headPoint(h, t, phi)
    const ear = mesh(new SphereGeometry(0.2, 16, 12), skin, head)
    const s = 1 + rig.ears.size * 0.2
    ear.scale.set(0.42 * s, 1 * s, 0.78 * s)
    ear.position.set(p.x + side * 0.02, p.y, p.z - 0.05)
    ear.rotation.y = side * 0.35
  }

  // Eyes, lids.
  const eyePhi = ANCHORS.eye.phi(rig.eyes.spacing)
  const eyeR = 0.13 * (1 + rig.eyes.size * 0.12)
  const white = kit.mat('#f4f1ee', { rough: 0.35 })
  const iris = kit.mat(rig.colours.iris, { rough: 0.3 })
  const pupil = kit.mat('#121214', { rough: 0.3 })
  const glint = kit.mat('#ffffff', { rough: 0.2 })
  const lidEdge = Math.min(0.85, Math.max(-0.2, 0.5 + (rig.eyes.open - 1)))
  for (const side of [1, -1] as const) {
    const t = thetaAt(ANCHORS.eye.y)
    const phi = side * eyePhi
    const n = headNormal(h, t, phi)
    const p = add(headPoint(h, t, phi), n, -0.035)
    const eye = new Group()
    onSurface(eye, p, n)
    head.add(eye)
    mesh(new SphereGeometry(eyeR, 20, 14), white, eye).scale.set(1, 0.8, 0.55)
    const irisM = mesh(new SphereGeometry(eyeR * 0.62, 16, 12), iris, eye)
    irisM.scale.set(1, 1, 0.45)
    irisM.position.z = eyeR * 0.36
    const pupilM = mesh(new SphereGeometry(eyeR * 0.32, 12, 10), pupil, eye)
    pupilM.scale.set(1, 1, 0.45)
    pupilM.position.z = eyeR * 0.48
    const glintM = mesh(new SphereGeometry(eyeR * 0.13, 8, 6), glint, eye)
    glintM.position.set(eyeR * 0.18, eyeR * 0.2, eyeR * 0.55)
    // Upper lid: a skin cap over the top of the eye, tilted with the expression.
    const lid = mesh(
      new SphereGeometry(eyeR * 1.1, 20, 10, 0, Math.PI * 2, 0, Math.acos(lidEdge)),
      skin,
      eye,
    )
    lid.scale.set(1.04, 0.86, 0.62)
    lid.rotation.z = -side * rig.eyes.lidTilt * 0.45
  }

  // Brows.
  const browMat = kit.mat(rig.colours.brow, { rough: 0.9 })
  const browR = browRadius(rig)
  for (const side of [1, -1] as const) tube(browPoints(rig, side), browR, browMat, head)

  // Nose: bridge and tip.
  const ns = 1.12 + rig.nose.size * 0.18
  {
    const t = thetaAt(-0.08)
    const n = headNormal(h, t, 0)
    const bridge = mesh(new SphereGeometry(0.09, 14, 12), skin, head)
    onSurface(bridge, add(headPoint(h, t, 0), n, -0.01), n)
    bridge.scale.set(0.6 * ns, 1.7, 0.6 * ns)
    const tt = thetaAt(ANCHORS.nose.y)
    const tn = headNormal(h, tt, 0)
    const tip = mesh(new SphereGeometry(0.13, 18, 14), skin, head)
    onSurface(tip, add(headPoint(h, tt, 0), tn, 0.035 * ns), tn)
    tip.scale.set((0.82 + rig.nose.width * 0.16) * ns, 0.95 * ns, 0.9 * ns)
    for (const side of [1, -1] as const) {
      const wing = mesh(new SphereGeometry(0.07, 12, 10), skin, head)
      const wp = facePoint(h, ANCHORS.nose.y - 0.03, side * 0.11 * (1 + rig.nose.width * 0.15), 0.0)
      wing.position.set(wp.x, wp.y, wp.z)
      wing.scale.setScalar(ns)
    }
  }

  // Facial hair before the mouth, so the mouth can sit on top of it.
  const beardLift = buildFacialHair(rig, kit, head)

  // Mouth.
  {
    const lip = kit.mat(rig.colours.lip, { rough: 0.6 })
    const half = mouthHalf(rig)
    const lift = 0.02 + beardLift
    const line = (offset: number) => mouthPoints(rig, offset, lift)
    const r = lipRadius(rig)
    if (rig.mouth.open > 0.08) {
      const inside = kit.mat('#3b1d24', { rough: 0.8 })
      const t = thetaAt(ANCHORS.mouth.y - 0.035)
      const n = headNormal(h, t, 0)
      const hole = mesh(new SphereGeometry(1, 20, 12), inside, head)
      onSurface(hole, add(headPoint(h, t, 0), n, lift - 0.005), n)
      hole.scale.set(half * 0.85, 0.06 + rig.mouth.open * 0.18, 0.03)
      const teeth = mesh(new SphereGeometry(1, 16, 8), kit.mat('#f2efe9', { rough: 0.4 }), head)
      onSurface(teeth, add(headPoint(h, thetaAt(ANCHORS.mouth.y - 0.01), 0), n, lift + 0.004), n)
      teeth.scale.set(half * 0.7, 0.035, 0.02)
      tube(line(0), r * 0.9, lip, head)
      tube(line(-0.06 - rig.mouth.open * 0.12), r, lip, head)
    } else {
      tube(line(0), r, lip, head)
    }
  }

  // Age lines.
  if (rig.lines > 0.15) {
    const lineMat = kit.mat(shade(rig.colours.skin, 1 - 0.1 * rig.lines), { rough: 0.8 })
    for (const yN of [0.5, 0.6]) {
      tube(
        sample(9, (t) => facePoint(h, yN + 0.02 * (1 - t * t), t * 0.4, 0.004)),
        0.008,
        lineMat,
        head,
      )
    }
    for (const side of [1, -1] as const) {
      const pts = [0, 0.5, 1].map((k) =>
        facePoint(
          h,
          -0.3 - k * 0.17,
          side * (0.21 + k * 0.08 + Math.sin(k * Math.PI) * 0.015),
          0.004,
        ),
      )
      tube(pts, 0.009, lineMat, head)
    }
  }

  buildGlasses(rig, kit, head, eyePhi)
  buildHair(rig, kit, head, mount)
  return head
}

/** Beards, moustaches, stubble. Returns how far the mouth must sit out to stay visible. */
function buildFacialHair(rig: Rig, kit: Kit, head: Group): number {
  const h = rig.head
  const style = rig.facialHair
  if (style === 'none') return 0
  const colour = rig.colours.facialHair
  const moustache = () => tube(moustachePoints(h), 0.045, kit.mat(colour, { rough: 0.95 }), head)
  const spec = beardSpec(style)
  if (!spec) {
    moustache()
    return 0
  }
  const geometry = surface((u, v) => beardPoint(h, style, spec, u, v), 24, 12)
  const stubble = style === 'stubble'
  const material = stubble
    ? kit.mat(shade(colour, 1.05), { rough: 1, opacity: 0.45 })
    : kit.mat(colour, { rough: 0.95, double: true })
  const m = mesh(geometry, material, head)
  if (stubble) {
    m.renderOrder = 1
    return 0.012
  }
  moustache()
  return spec.thick * 0.6 + 0.02
}

function buildGlasses(rig: Rig, kit: Kit, head: Group, eyePhi: number): void {
  if (rig.glasses === 'none') return
  const h = rig.head
  const frame = kit.mat('#26272b', { rough: 0.4 })
  const rim = rig.glasses === 'browline' ? kit.mat('#8d939b', { rough: 0.35 }) : frame
  const ends: Vec3[] = []
  for (const side of [1, -1] as const) {
    const t = thetaAt(ANCHORS.eye.y)
    const n = headNormal(h, t, side * eyePhi)
    const centre = add(headPoint(h, t, side * eyePhi), { x: 0, y: 0, z: 1 }, 0.17)
    const lens = new Group()
    onSurface(lens, centre, { x: n.x * 0.35, y: 0, z: 1 })
    head.add(lens)
    const ring = mesh(new TorusGeometry(0.17, 0.017, 8, 32), rim, lens)
    if (rig.glasses === 'rect' || rig.glasses === 'browline') ring.scale.set(1.18, 0.78, 1)
    if (rig.glasses === 'browline') {
      const top = mesh(new CapsuleGeometry(0.035, 0.32, 4, 8), frame, lens)
      top.rotation.z = Math.PI / 2
      top.position.y = 0.12
    }
    ends.push(add(centre, { x: side, y: 0, z: 0 }, 0.2))
    // Arm back to the ear.
    const ear = headPoint(h, thetaAt(ANCHORS.eye.y), side * 1.45)
    limb(
      add(centre, { x: side, y: 0, z: 0 }, 0.19),
      add(ear, { x: side, y: 0, z: 0 }, 0.04),
      0.014,
      frame,
      head,
    )
  }
  const [l, r] = ends
  const bridgeL = add(l, { x: -1, y: 0, z: 0 }, 0.38)
  const bridgeR = add(r, { x: 1, y: 0, z: 0 }, 0.38)
  tube(
    [bridgeR, { x: 0, y: bridgeL.y + 0.04, z: bridgeL.z + 0.02 }, bridgeL],
    0.016,
    frame,
    head,
    false,
  )
}

/** Where the head sits on the body, so long hair can drape over the shoulders. */
interface HeadMount {
  centre: Vec3
  scale: number
  bodyScale: number
  frame: Frame
}

/** Push a head-local hair point out of the torso so long hair lies on the shoulders. */
function drape(p: Vec3, m: HeadMount): Vec3 {
  const wx = p.x * m.scale
  const wy = m.centre.y + p.y * m.scale
  const wz = p.z * m.scale
  const y = wy / m.bodyScale
  if (y > TORSO_TOP || y < TORSO_BOTTOM) return p
  const r = torsoRadius(y)
  const a = r * m.frame.sx * m.bodyScale
  const b = r * m.frame.sz * m.bodyScale
  const inside = (wx / a) ** 2 + (wz / b) ** 2
  // Clear of the torso and any jacket over it.
  const clear = (1 + 0.14 / Math.max(a, 0.1)) ** 2
  if (inside >= clear || a < 1e-3) return p
  const k = Math.sqrt(clear / Math.max(inside, 1e-4))
  return { x: (wx * k) / m.scale, y: p.y, z: (wz * k) / m.scale }
}

function buildHair(rig: Rig, kit: Kit, head: Group, mount: HeadMount): void {
  const h = rig.head
  const hat = rig.accessories.includes('hardHat')
  const p = hairProfile(rig.hair.style, rig.hair.recession)
  const colour = rig.colours.hair
  const material = kit.mat(colour, { rough: 0.75, double: true })
  if (!p.none && !hat) {
    const buzz = rig.hair.style === 'buzz'
    const m = buzz ? kit.mat(colour, { rough: 0.95, double: true }) : material
    mesh(
      surface((u, v) => drape(hairPoint(h, p, -Math.PI + u * 2 * Math.PI, v), mount), 56, 26, true),
      m,
      head,
    )
  }
  const back = (yN: number, lift: number) => facePoint(h, yN, Math.PI, lift)
  switch (rig.hair.style) {
    case 'ponytail': {
      const root = back(0.15, 0.1)
      const tieMat = kit.mat(shade(colour, 0.6))
      const band = mesh(new TorusGeometry(0.11, 0.04, 8, 16), tieMat, head)
      band.position.set(root.x, root.y, root.z - 0.02)
      limb(
        { x: 0, y: root.y - 0.1, z: root.z - 0.12 },
        { x: 0, y: root.y - 1.5, z: root.z - 0.3 },
        0.17,
        material,
        head,
      )
      break
    }
    case 'bun': {
      if (hat) break
      const top = facePoint(h, 0.72, Math.PI, 0.26)
      mesh(new SphereGeometry(0.34, 18, 14), material, head).position.set(top.x, top.y, top.z)
      break
    }
    default:
      break
  }
  if (hat) {
    const hatMat = kit.mat('#e3c02f', { rough: 0.45 })
    const cap = mesh(new SphereGeometry(1, 32, 14, 0, Math.PI * 2, 0, 1.3), hatMat, head)
    cap.scale.set(h.rx * 1.22, h.ry * 1.02, h.rz * 1.24)
    cap.position.y = 0.12
    const brim = mesh(new CylinderGeometry(1, 1, 0.05, 32), hatMat, head)
    brim.scale.set(h.rx * 1.38, 1, h.rz * 1.45)
    brim.position.set(0, 0.42, 0.06)
  }
}

// ---------------------------------------------------------------------------------------------
// Body

function buildBody(rig: Rig, kit: Kit, root: Group, full: boolean): void {
  const c = rig.clothes
  const frame = bodyFrame(rig)
  const topMat = kit.mat(c.top)
  const skin = kit.mat(rig.colours.skin, { rough: 0.7 })

  mesh(
    surface(
      (u, v) =>
        torsoPoint(
          frame,
          TORSO_BOTTOM + v * (TORSO_TOP - TORSO_BOTTOM),
          -Math.PI + u * 2 * Math.PI,
        ),
      36,
      18,
      true,
    ),
    topMat,
    root,
  )
  // Neck.
  const neckR = neckRadius(rig)
  const neck = mesh(new CylinderGeometry(neckR, neckR * 1.15, 1.3, 20), skin, root)
  neck.position.set(0, 9.45, 0)

  // Jacket / jumper / vest over the top, open in a V at the front.
  if (c.over) {
    const gap = (y: number) => vGap(c.kind, y)
    mesh(
      surface(
        (u, v) => {
          const y = TORSO_BOTTOM - 0.05 + v * (TORSO_TOP - TORSO_BOTTOM + 0.04)
          const g = gap(y)
          return torsoPoint(frame, y, g + u * (2 * Math.PI - 2 * g), 0.05)
        },
        36,
        20,
      ),
      kit.mat(c.over, { double: true }),
      root,
    )
    if (c.kind === 'vest') {
      // Reflective bands.
      const band = kit.mat('#c9ced6', { rough: 0.3 })
      for (const y of [6.0, 6.5]) {
        mesh(
          surface(
            (u, v) => {
              const yy = y + v * 0.18
              const g = gap(yy) + 0.02
              return torsoPoint(frame, yy, g + u * (2 * Math.PI - 2 * g), 0.065)
            },
            40,
            2,
          ),
          band,
          root,
        )
      }
    }
  }
  // Shirt collar: a band round the neck and two flat points lying on the chest.
  if (c.collar) {
    const collar = kit.mat(c.collar, { rough: 0.7, double: true })
    const band = mesh(new TorusGeometry(neckR + 0.03, 0.05, 8, 28), collar, root)
    band.rotation.x = Math.PI / 2 - 0.2
    band.position.set(0, 9.0, 0.03)
    const lift = c.over ? 0.035 : 0.025
    const on = (x: number, y: number) => ({ x, y, z: torsoFront(frame, x, y) + lift })
    for (const side of [1, -1] as const) {
      const pts = COLLAR_POINTS.map(([x, y]) => on(side * x, y))
      const g = new BufferGeometry()
      g.setAttribute(
        'position',
        new Float32BufferAttribute(
          pts.flatMap((q) => [q.x, q.y, q.z]),
          3,
        ),
      )
      g.setIndex(side === 1 ? [0, 2, 1] : [0, 1, 2])
      g.computeVertexNormals()
      mesh(g, collar, root)
    }
  }
  // Tie on the shirt front.
  if (c.tie) {
    const tieMat = kit.mat(c.tie, { rough: 0.6 })
    mesh(
      surface(
        (u, v) => {
          const y = 9.0 - v * 2.5
          const w = v < 0.08 ? 0.14 : 0.1 + v * 0.1 - (v > 0.94 ? (v - 0.94) * 2.5 : 0)
          const x = (u * 2 - 1) * w
          return { x, y, z: torsoFront(frame, x, y) + 0.025 }
        },
        6,
        20,
      ),
      tieMat,
      root,
    )
    const knot = mesh(new SphereGeometry(0.13, 12, 10), tieMat, root)
    knot.position.set(0, 9.0, torsoFront(frame, 0, 9.0) + 0.06)
    knot.scale.set(1, 0.9, 0.6)
  }
  // Necklines.
  if (c.kind === 'tshirt' || c.kind === 'blouse' || c.kind === 'hoodie') {
    const ring = mesh(
      new TorusGeometry(neckR + 0.08, 0.06, 8, 24),
      kit.mat(shade(c.top, 0.86)),
      root,
    )
    ring.rotation.x = Math.PI / 2 - 0.15
    ring.position.set(0, 9.08, 0.05)
  }
  if (c.kind === 'hoodie') {
    // Hood bunched behind the neck: a horizontal half-ring round the back.
    const hood = mesh(new TorusGeometry(0.78, 0.3, 10, 24, Math.PI * 1.2), topMat, root)
    hood.rotation.set(Math.PI / 2 + 0.3, 0, Math.PI * 0.9)
    hood.position.set(0, 9.0, -0.12)
    for (const side of [1, -1] as const) {
      limb(
        { x: side * 0.22, y: 8.95, z: torsoFront(frame, side * 0.22, 8.95) + 0.03 },
        { x: side * 0.25, y: 8.0, z: torsoFront(frame, side * 0.25, 8.0) + 0.04 },
        0.025,
        kit.mat('#e9ecef'),
        root,
      )
    }
  }

  // Arms.
  const sleeve = kit.mat(c.sleeve)
  for (const side of [1, -1] as const) {
    const j = armJoints(rig.pose, side, rig.body.width)
    const elbowMid = add(j.shoulder, add(j.elbow, j.shoulder, -1), 0.55)
    if (c.shortSleeves) {
      limb(j.shoulder, elbowMid, 0.45, sleeve, root)
      limb(elbowMid, j.elbow, 0.36, skin, root)
      limb(j.elbow, j.hand, 0.33, skin, root)
    } else {
      limb(j.shoulder, j.elbow, 0.45, sleeve, root)
      limb(j.elbow, j.hand, 0.37, sleeve, root)
    }
    // The hand sits just past the cuff.
    const reach = normalise(add(j.hand, j.elbow, -1))
    const hand = mesh(new SphereGeometry(0.36, 14, 12), skin, root)
    hand.position.copy(v3(add(j.hand, reach, 0.42)))
    hand.scale.set(0.9, 1.15, 0.8)
  }

  // Accessories on the chest.
  const front = (x: number, y: number, lift = 0.08) => ({
    x,
    y,
    z: torsoFront(frame, x, y) + (c.over ? 0.05 : 0) + lift,
  })
  if (rig.accessories.includes('rosette')) {
    const at = front(ROSETTE_AT.x, ROSETTE_AT.y)
    const party = kit.mat(rig.partyColour, { rough: 0.55 })
    const disc = mesh(new CylinderGeometry(ROSETTE_AT.r, ROSETTE_AT.r, 0.06, 24), party, root)
    disc.position.set(at.x, at.y, at.z)
    disc.rotation.x = Math.PI / 2
    const middle = mesh(new CylinderGeometry(0.12, 0.12, 0.08, 16), kit.mat('#f2f2ee'), root)
    middle.position.set(at.x, at.y, at.z + 0.02)
    middle.rotation.x = Math.PI / 2
    for (const side of [1, -1] as const) {
      const tail = mesh(new BoxGeometry(0.11, 0.55, 0.02), party, root)
      tail.position.set(at.x + side * 0.1, at.y - 0.45, at.z - 0.02)
      tail.rotation.z = side * 0.18
    }
  }
  if (rig.accessories.includes('poppy')) {
    const at = front((rig.accessories.includes('rosette') ? -1 : 1) * POPPY_AT.x, POPPY_AT.y, 0.06)
    const petal = mesh(
      new CylinderGeometry(POPPY_AT.r, POPPY_AT.r, 0.04, 16),
      kit.mat('#c4202c', { rough: 0.6 }),
      root,
    )
    petal.position.set(at.x, at.y, at.z)
    petal.rotation.x = Math.PI / 2
    const middle = mesh(new SphereGeometry(0.05, 8, 6), kit.mat('#141414'), root)
    middle.position.set(at.x, at.y, at.z + 0.03)
  }
  if (rig.accessories.includes('lanyard')) {
    const strap = kit.mat('#2b4f9f', { rough: 0.6 })
    const card = front(0, 7.25, 0.12)
    for (const side of [1, -1] as const) {
      tube(
        [
          { x: side * 0.5, y: 9.1, z: -0.1 },
          { x: side * 0.45, y: 8.9, z: torsoFront(frame, side * 0.45, 8.9) + 0.1 },
          { x: side * 0.08, y: 7.6, z: card.z },
        ],
        0.03,
        strap,
        root,
        false,
      )
    }
    const badge = mesh(new BoxGeometry(0.5, 0.65, 0.03), kit.mat('#f1f1ee'), root)
    badge.position.set(card.x, card.y, card.z)
    const band = mesh(new BoxGeometry(0.5, 0.16, 0.035), strap, root)
    band.position.set(card.x, card.y + 0.22, card.z + 0.002)
  }

  if (!full) return

  // Legs, skirt, shoes.
  const legs = kit.mat(c.legs)
  for (const side of [1, -1] as const) {
    const hip = { x: side * 0.62, y: 5.2, z: 0 }
    const knee = { x: side * 0.66, y: 2.8, z: 0.05 }
    const ankle = { x: side * 0.66, y: 0.55, z: 0 }
    limb(hip, knee, 0.5, c.skirt ? skin : legs, root)
    limb(knee, ankle, 0.42, c.skirt ? skin : legs, root)
    const shoe = mesh(new SphereGeometry(0.5, 16, 12), kit.mat(c.shoes, { rough: 0.5 }), root)
    shoe.scale.set(0.95, 0.6, 1.5)
    shoe.position.set(ankle.x, 0.3, 0.3)
  }
  if (c.skirt) {
    const skirt = mesh(
      new CylinderGeometry(1.25, 1.55, 2.3, 28, 1, true),
      kit.mat(c.legs, { double: true }),
      root,
    )
    skirt.scale.set(frame.sx / 1.3, 1, frame.sz / 0.72)
    skirt.position.set(0, 4.15, 0)
  } else {
    const hips = mesh(new SphereGeometry(1, 28, 16), legs, root)
    hips.scale.set((1.25 * frame.sx) / 1.05, 0.7, (1.3 * frame.sz) / 0.95)
    hips.position.set(0, 5.05, 0)
  }
  if (rig.pose === 'podium') {
    const lectern = mesh(new BoxGeometry(3.2, 6.4, 1.3), kit.mat('#2e3744', { rough: 0.6 }), root)
    lectern.position.set(0, 3.2, 2.55)
    const top = mesh(new BoxGeometry(3.6, 0.2, 1.7), kit.mat('#3a4555', { rough: 0.6 }), root)
    top.position.set(0, 6.45, 2.5)
    top.rotation.x = 0.12
  }
  if (rig.accessories.includes('placard')) {
    const j = armJoints('stand', 1, rig.body.width)
    const stick = kit.mat('#b9bec6', { rough: 0.7 })
    limb(
      { x: j.hand.x, y: j.hand.y - 0.4, z: j.hand.z },
      { x: j.hand.x, y: 11.6, z: j.hand.z },
      0.07,
      stick,
      root,
    )
    const board = mesh(new BoxGeometry(2.8, 1.7, 0.08), kit.mat('#f1f1ee'), root)
    board.position.set(j.hand.x, 12.3, j.hand.z + 0.06)
    const band = mesh(new BoxGeometry(2.8, 0.42, 0.09), kit.mat(rig.partyColour), root)
    band.position.set(j.hand.x, 11.67, j.hand.z + 0.065)
  }
}

// ---------------------------------------------------------------------------------------------

export interface Avatar {
  root: Group
  /** Head centre after scaling, for framing the camera. */
  headCentre: Vector3
  /** Head scale (for framing). */
  headScale: number
  dispose(): void
}

/** Build the avatar. `full` adds legs, shoes and props (the bust skips what it can't see). */
export function buildAvatar(rig: Rig, framing: Framing = 'bust'): Avatar {
  const kit = new Kit()
  const root = new Group()
  const body = new Group()
  root.add(body)
  buildBody(rig, kit, body, framing === 'full')
  body.scale.setScalar(rig.body.scale)

  // Stylised proportions: a big head on a compact body.
  const headScale = headScaleOf(rig)
  const headCentre = new Vector3(0, headCentreY(rig), 0)
  const head = buildHead(rig, kit, {
    centre: headCentre,
    scale: headScale,
    bodyScale: rig.body.scale,
    frame: bodyFrame(rig),
  })
  head.scale.setScalar(headScale)
  head.position.copy(headCentre)
  // Stoop: the head drops forward with age.
  head.rotation.x = rig.body.stoop
  head.position.z += rig.body.stoop * 1.4
  head.position.y -= rig.body.stoop * 0.6
  root.add(head)

  return {
    root,
    headCentre,
    headScale,
    /** Frees the geometry; materials stay cached for the next build. */
    dispose() {
      root.traverse((o) => {
        if (o instanceof Mesh) o.geometry.dispose()
      })
    },
  }
}
