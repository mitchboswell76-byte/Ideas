/**
 * The 2D illustrated avatar (DESIGN §4, §17): a flat drawing of the same rig the 3D builder
 * meshes, projected front-on. Shown in 2D view, without WebGL, and while a 3D render is on its
 * way. Framed like the 3D bust so the two swap without a jump.
 */
import { useId, useMemo } from 'react'
import { shade } from './colour.ts'
import {
  bodyFrame,
  COLLAR_POINTS,
  headCentreY,
  headScaleOf,
  neckRadius,
  POPPY_AT,
  ROSETTE_AT,
  torsoRadius,
  TORSO_TOP,
  vGap,
  vOpening,
} from './body.ts'
import type { Rig } from './rig.ts'
import {
  ANCHORS,
  beardPoint,
  beardSpec,
  browPoints,
  browRadius,
  facePoint,
  hairPoint,
  hairProfile,
  headPoint,
  lipRadius,
  mouthPoints,
  moustachePoints,
  thetaAt,
  type Vec3,
} from './shape.ts'

/** SVG px per head unit, matching the 3D bust framing (head centre 1.5 head-heights from the top). */
const K = 29.6
const CX = 50
const CY = 44.4

type P = readonly [number, number]

/** Body units the illustration lowers the body by. */
const NECK_DROP = 0.4

const hp = (p: Vec3): P => [CX + p.x * K, CY - p.y * K]

function d(points: readonly P[], close = true): string {
  return (
    points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join('') +
    (close ? 'Z' : '')
  )
}

/**
 * Outline of a cloud of points, mirrored about the centre line: the widest extent in each
 * horizontal band, gaps filled and lightly smoothed so edges stay clean.
 */
function envelope(points: readonly P[], bins = 30): P[] {
  let minY = Infinity
  let maxY = -Infinity
  for (const [, y] of points) {
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
  }
  const step = (maxY - minY) / bins || 1
  const r = new Array<number>(bins + 1).fill(-1)
  for (const [x, y] of points) {
    const i = Math.round((y - minY) / step)
    r[i] = Math.max(r[i], Math.abs(x - CX))
  }
  for (let i = 0; i <= bins; i++) {
    if (r[i] >= 0) continue
    let a = i - 1
    let b = i + 1
    while (b <= bins && r[b] < 0) b++
    while (a >= 0 && r[a] < 0) a--
    r[i] = a < 0 ? (r[b] ?? 0) : b > bins ? r[a] : r[a] + ((r[b] - r[a]) * (i - a)) / (b - a)
  }
  const smooth = r.map((v, i) =>
    i === 0 || i === bins ? v : 0.25 * r[i - 1] + 0.5 * v + 0.25 * r[i + 1],
  )
  const right = smooth.map((v, i): P => [CX + v, minY + i * step])
  return [
    ...right,
    ...right
      .slice()
      .reverse()
      .map(([x, y]): P => [2 * CX - x, y]),
  ]
}

function grid(fn: (u: number, v: number) => Vec3, nu: number, nv: number): P[] {
  const out: P[] = []
  for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) out.push(hp(fn(i / nu, j / nv)))
  return out
}

interface Drawing {
  backHair: string | null
  frontHair: string | null
  head: string
  beard: string | null
  body: {
    torso: string
    over: string | null
    v: string | null
    neck: { x: number; y: number; width: number; height: number }
    collar: string[]
    tie: string | null
  }
  k: number
  /** Body coordinates → SVG. */
  bp: (x: number, y: number) => P
}

function draw(rig: Rig): Drawing {
  const h = rig.head
  const hs = headScaleOf(rig)
  const bs = rig.body.scale
  const k = K / hs
  const cy = headCentreY(rig)
  // The body sits a little lower than in 3D: a flat front view hides the neck otherwise.
  const bp = (x: number, y: number): P => [CX + x * bs * k, CY - ((y - NECK_DROP) * bs - cy) * k]

  // Hair: the whole fall behind the head, and the front half (minus the face) over it.
  const profile = hairProfile(rig.hair.style, rig.hair.recession)
  const hat = rig.accessories.includes('hardHat')
  let backHair: string | null = null
  let frontHair: string | null = null
  if (!profile.none && !hat) {
    const back = grid((u, v) => hairPoint(h, profile, -Math.PI + u * 2 * Math.PI, v), 96, 40)
    backHair = d(envelope(back))
    const front = grid((u, v) => hairPoint(h, profile, -Math.PI / 2 + u * Math.PI, v), 64, 40)
    // The face opening, pulled in a hair so it never pokes outside the outline.
    const hairline = Array.from({ length: 61 }, (_, i): P => {
      const [x, y] = hp(hairPoint(h, profile, -Math.PI / 2 + (i / 60) * Math.PI, 1))
      return [CX + (x - CX) * 0.97, y]
    })
    frontHair = d(envelope(front)) + d(hairline)
  }

  // Head silhouette (its widest line is at φ = ±π/2).
  const side = Array.from({ length: 33 }, (_, i) => headPoint(h, (i / 32) * Math.PI, Math.PI / 2))
  // Round the jaw off below this height (a flat drawing has no shading to soften the chin).
  const jawY = -0.5
  const jaw = side.reduce((a, p) => (Math.abs(p.y - jawY) < Math.abs(a.y - jawY) ? p : a))
  const bottom = Math.min(...side.map((p) => p.y))
  const rounded = side.map((p): P => {
    if (p.y >= jaw.y) return hp(p)
    const t = (p.y - jaw.y) / (bottom - jaw.y)
    return hp({ x: Math.max(p.x, jaw.x * Math.sqrt(Math.max(0, 1 - t * t)) * 0.97), y: p.y, z: 0 })
  })
  const head = d([
    ...rounded,
    ...rounded
      .slice(1, -1)
      .reverse()
      .map(([x, y]): P => [2 * CX - x, y]),
  ])

  const spec = beardSpec(rig.facialHair)
  // The beard patch's own boundary (it never folds over in a front view).
  let beard: string | null = null
  if (spec) {
    const at = (u: number, v: number) => hp(beardPoint(h, rig.facialHair, spec, u, v))
    const n = 20
    const edge = (f: (t: number) => P) => Array.from({ length: n + 1 }, (_, i) => f(i / n))
    beard = d([
      ...edge((t) => at(t, 0)),
      ...edge((t) => at(1, t)),
      ...edge((t) => at(1 - t, 1)),
      ...edge((t) => at(0, 1 - t)),
    ])
  }

  // Body.
  const f = bodyFrame(rig)
  const c = rig.clothes
  // Front view of the shoulders: the torso's sides, then a slope up to the base of the neck.
  const ys = Array.from({ length: 19 }, (_, i) => 5.2 + (i / 18) * (8.6 - 5.2))
  const nr = neckRadius(rig)
  const outline = [
    ...ys.map((y): P => bp(torsoRadius(y) * f.sx, y)),
    bp(torsoRadius(8.6) * f.sx * 0.93, 8.78),
    bp(torsoRadius(8.6) * f.sx * 0.72, 8.9),
    bp(nr + 0.35, 8.98),
    bp(nr * 0.6, 9.02),
  ]
  const torso = d([
    ...outline,
    ...outline
      .slice()
      .reverse()
      .map(([x, y]): P => [2 * CX - x, y]),
  ])
  let over: string | null = null
  let v: string | null = null
  if (c.over) {
    over = torso
    const vb = vOpening(c.kind).bottom
    const vy = Array.from({ length: 16 }, (_, i) => vb + (i / 15) * (TORSO_TOP - vb))
    const edge = vy.map((y): P =>
      bp(Math.min(torsoRadius(y) * f.sx * Math.sin(vGap(c.kind, y)), nr + 0.25), Math.min(y, 9.0)),
    )
    v = d([
      ...edge,
      ...edge
        .slice()
        .reverse()
        .map(([x, y]): P => [2 * CX - x, y]),
    ])
  }
  const [nx0, ny0] = bp(-nr, cy / bs + NECK_DROP - 0.3)
  const [nx1, ny1] = bp(nr, 8.8)
  const neck = { x: nx0, y: ny0, width: nx1 - nx0, height: ny1 - ny0 }
  const collar = c.collar
    ? ([1, -1] as const).map((s) => d(COLLAR_POINTS.map(([x, y]) => bp(s * x, y))))
    : []
  const tie = c.tie
    ? d([bp(-0.12, 9.0), bp(0.12, 9.0), bp(0.18, 6.6), bp(0, 6.4), bp(-0.18, 6.6)])
    : null
  return {
    backHair,
    frontHair,
    head,
    beard,
    body: { torso, over, v, neck, collar, tie },
    k,
    bp,
  }
}

export function AvatarSvg({ rig, className }: { rig: Rig; className?: string }) {
  const id = useId()
  const g = useMemo(() => draw(rig), [rig])
  const h = rig.head
  const col = rig.colours
  const c = rig.clothes
  const eyePhi = ANCHORS.eye.phi(rig.eyes.spacing)
  const eyeR = 0.13 * (1 + rig.eyes.size * 0.12) * K
  const lidEdge = Math.min(0.85, Math.max(-0.2, 0.5 + (rig.eyes.open - 1)))
  const lineCol = shade(col.skin, 1 - 0.1 * rig.lines)
  const noseY = ANCHORS.nose.y
  const ear = hp(headPoint(h, thetaAt(ANCHORS.ear.y), Math.PI / 2))
  const earS = 1 + rig.ears.size * 0.2
  const hat = rig.accessories.includes('hardHat')
  const beardLift = g.beard ? 0.05 : 0
  const stroke = (pts: Vec3[]) => d(pts.map(hp), false)
  const rosette = rig.accessories.includes('rosette') ? g.bp(ROSETTE_AT.x, ROSETTE_AT.y) : null
  const poppy = rig.accessories.includes('poppy')
    ? g.bp((rosette ? -1 : 1) * POPPY_AT.x, POPPY_AT.y)
    : null
  return (
    <svg className={className} viewBox="0 0 100 120" aria-hidden>
      {g.backHair && <path d={g.backHair} fill={shade(col.hair, 0.85)} />}
      {/* Body */}
      <path d={g.body.torso} fill={c.top} />
      {g.body.over && g.body.v && (
        <path d={g.body.over + g.body.v} fill={c.over ?? c.top} fillRule="evenodd" />
      )}
      {g.body.tie && <path d={g.body.tie} fill={c.tie ?? undefined} />}
      {rig.accessories.includes('lanyard') && (
        <g>
          <path
            d={
              d([g.bp(-0.45, 9.0), g.bp(-0.08, 7.6)], false) +
              d([g.bp(0.45, 9.0), g.bp(0.08, 7.6)], false)
            }
            stroke="#2b4f9f"
            strokeWidth={0.06 * g.k}
            fill="none"
          />
          <rect
            x={g.bp(-0.25, 0)[0]}
            y={g.bp(0, 7.58)[1]}
            width={0.5 * g.k * rig.body.scale}
            height={0.65 * g.k * rig.body.scale}
            fill="#f1f1ee"
          />
        </g>
      )}
      <rect {...g.body.neck} rx={g.body.neck.width * 0.3} fill={col.skin} />
      {g.body.collar.map((p, i) => (
        <path key={i} d={p} fill={c.collar ?? undefined} />
      ))}
      {rosette && (
        <g>
          <path
            d={d([
              [rosette[0] - 3, rosette[1]],
              [rosette[0] - 4, rosette[1] + 14],
              [rosette[0] - 1, rosette[1] + 13],
              [rosette[0], rosette[1]],
              [rosette[0] + 1, rosette[1] + 13],
              [rosette[0] + 4, rosette[1] + 14],
              [rosette[0] + 3, rosette[1]],
            ])}
            fill={rig.partyColour}
          />
          <circle
            cx={rosette[0]}
            cy={rosette[1]}
            r={ROSETTE_AT.r * g.k * rig.body.scale}
            fill={rig.partyColour}
          />
          <circle cx={rosette[0]} cy={rosette[1]} r={0.12 * g.k * rig.body.scale} fill="#f2f2ee" />
        </g>
      )}
      {poppy && (
        <g>
          <circle
            cx={poppy[0]}
            cy={poppy[1]}
            r={POPPY_AT.r * g.k * rig.body.scale}
            fill="#c4202c"
          />
          <circle cx={poppy[0]} cy={poppy[1]} r={0.05 * g.k * rig.body.scale} fill="#141414" />
        </g>
      )}

      {/* Head */}
      {[1, -1].map((s) => (
        <ellipse
          key={s}
          cx={CX + s * (ear[0] - CX + 0.02 * K)}
          cy={ear[1]}
          rx={0.09 * K * earS}
          ry={0.2 * K * earS}
          fill={col.skin}
        />
      ))}
      <path d={g.head} fill={col.skin} />
      {g.beard && (
        <path d={g.beard} fill={col.facialHair} opacity={rig.facialHair === 'stubble' ? 0.35 : 1} />
      )}
      {rig.lines > 0.15 && (
        <g stroke={lineCol} strokeWidth={0.6} fill="none" strokeLinecap="round">
          {[0.5, 0.6].map((y) => (
            <path
              key={y}
              d={d(
                [-0.4, -0.2, 0, 0.2, 0.4].map((p) =>
                  hp(facePoint(h, y + 0.02 * (1 - (p / 0.4) ** 2), p)),
                ),
                false,
              )}
            />
          ))}
        </g>
      )}
      {/* Eyes */}
      {([1, -1] as const).map((s) => {
        const [ex, ey] = hp(facePoint(h, ANCHORS.eye.y, s * eyePhi))
        const clip = `${id}-eye${s}`
        const tilt = (s * rig.eyes.lidTilt * 0.45 * 180) / Math.PI
        return (
          <g key={s}>
            <clipPath id={clip}>
              <ellipse cx={ex} cy={ey} rx={eyeR} ry={eyeR * 0.8} />
            </clipPath>
            <g clipPath={`url(#${clip})`}>
              <ellipse cx={ex} cy={ey} rx={eyeR} ry={eyeR * 0.8} fill="#f4f1ee" />
              <circle cx={ex} cy={ey} r={eyeR * 0.62} fill={col.iris} />
              <circle cx={ex} cy={ey} r={eyeR * 0.32} fill="#121214" />
              <circle cx={ex + eyeR * 0.2} cy={ey - eyeR * 0.22} r={eyeR * 0.13} fill="#fff" />
              <rect
                x={ex - eyeR * 1.5}
                y={ey - eyeR * 2}
                width={eyeR * 3}
                height={eyeR * (2 - lidEdge * 0.8 - 0.18)}
                fill={col.skin}
                transform={`rotate(${tilt} ${ex} ${ey})`}
              />
            </g>
          </g>
        )
      })}
      {([1, -1] as const).map((s) => (
        <path
          key={s}
          d={stroke(browPoints(rig, s))}
          stroke={col.brow}
          strokeWidth={browRadius(rig) * 2 * K}
          strokeLinecap="round"
          fill="none"
        />
      ))}
      {/* Nose: a soft shadowed tip and nostrils */}
      {(() => {
        const [nx, ny] = hp(facePoint(h, noseY, 0, 0.04))
        const ns = 1.12 + rig.nose.size * 0.18
        const w = (0.82 + rig.nose.width * 0.16) * ns * 0.13 * K
        return (
          <g>
            <ellipse
              cx={nx + w * 0.12}
              cy={ny + w * 0.15}
              rx={w}
              ry={w * 0.9}
              fill={shade(col.skin, 0.9)}
            />
            <ellipse cx={nx} cy={ny} rx={w * 0.92} ry={w * 0.82} fill={shade(col.skin, 1.04)} />
            {[1, -1].map((s) => (
              <circle
                key={s}
                cx={nx + s * w * 0.55}
                cy={ny + w * 0.75}
                r={w * 0.2}
                fill={shade(col.skin, 0.66)}
              />
            ))}
          </g>
        )
      })()}
      {/* Mouth */}
      {rig.mouth.open > 0.08 && (
        <ellipse
          cx={CX}
          cy={hp(facePoint(h, ANCHORS.mouth.y - 0.035 - rig.mouth.curve * 0.03, 0))[1]}
          rx={0.27 * K}
          ry={(0.06 + rig.mouth.open * 0.18) * K}
          fill="#3b1d24"
        />
      )}
      <path
        d={stroke(mouthPoints(rig, 0, beardLift))}
        stroke={col.lip}
        strokeWidth={lipRadius(rig) * 2 * K}
        strokeLinecap="round"
        fill="none"
      />
      {rig.mouth.open > 0.08 && (
        <path
          d={stroke(mouthPoints(rig, -0.06 - rig.mouth.open * 0.12, beardLift))}
          stroke={col.lip}
          strokeWidth={lipRadius(rig) * 2 * K}
          strokeLinecap="round"
          fill="none"
        />
      )}
      {g.beard && rig.facialHair !== 'stubble' && (
        <path
          d={stroke(moustachePoints(h))}
          stroke={col.facialHair}
          strokeWidth={0.09 * K}
          strokeLinecap="round"
          fill="none"
        />
      )}
      {rig.facialHair === 'moustache' && (
        <path
          d={stroke(moustachePoints(h))}
          stroke={col.facialHair}
          strokeWidth={0.09 * K}
          strokeLinecap="round"
          fill="none"
        />
      )}
      {g.frontHair && <path d={g.frontHair} fill={col.hair} fillRule="evenodd" />}
      {/* Glasses */}
      {rig.glasses !== 'none' && (
        <g
          stroke={rig.glasses === 'browline' ? '#8d939b' : '#26272b'}
          strokeWidth={1.1}
          fill="none"
        >
          {([1, -1] as const).map((s) => {
            const [ex, ey] = hp(facePoint(h, ANCHORS.eye.y, s * eyePhi))
            const wide = rig.glasses === 'round' ? 1 : 1.18
            const tall = rig.glasses === 'round' ? 1 : 0.78
            return (
              <g key={s}>
                <ellipse cx={ex} cy={ey} rx={0.17 * K * wide} ry={0.17 * K * tall} />
                {rig.glasses === 'browline' && (
                  <path
                    d={`M${ex - 0.18 * K} ${ey - 0.11 * K}L${ex + 0.18 * K} ${ey - 0.11 * K}`}
                    stroke="#26272b"
                    strokeWidth={2.2}
                    strokeLinecap="round"
                  />
                )}
              </g>
            )
          })}
          <path
            d={`M${CX - 0.13 * K} ${hp(facePoint(h, ANCHORS.eye.y, 0))[1]}Q${CX} ${hp(facePoint(h, ANCHORS.eye.y + 0.05, 0))[1]} ${CX + 0.13 * K} ${hp(facePoint(h, ANCHORS.eye.y, 0))[1]}`}
            stroke="#26272b"
          />
        </g>
      )}
      {hat && (
        <g fill="#e3c02f">
          <path
            d={`M${CX - h.rx * 1.22 * K} ${CY - 0.32 * K}A${h.rx * 1.22 * K} ${h.ry * 0.95 * K} 0 0 1 ${CX + h.rx * 1.22 * K} ${CY - 0.32 * K}Z`}
          />
          <rect
            x={CX - h.rx * 1.42 * K}
            y={CY - 0.4 * K}
            width={h.rx * 2.84 * K}
            height={0.1 * K}
            rx={0.05 * K}
          />
        </g>
      )}
    </svg>
  )
}
