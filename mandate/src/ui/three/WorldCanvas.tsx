/**
 * The 3D diorama layer (DESIGN §17), loaded lazily so three.js never delays the first paint.
 * Renders on demand at the preset's reduced internal resolution; the browser upscales with hard
 * pixel edges (`image-rendering: pixelated` in `world.css`).
 */
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Color, Fog, Vector3, type PerspectiveCamera, type Scene as ThreeScene } from 'three'
import { PRESETS, SLOW_FRAME_MS } from '../graphics/presets.ts'
import { useReducedMotion } from '../hooks/useReducedMotion.ts'
import { useView, viewStore } from '../store/view.ts'
import {
  FLY_SECONDS,
  FOV,
  flyEase,
  flyPath,
  flyPose,
  fogRange,
  ISO_DISTANCE,
  placeIso,
  placeTitle,
  WORDMARK,
  type FlyPath,
  type Shot,
} from './camera.ts'
import { Monument } from './Monument.tsx'
import { useSceneTokens, type SceneTokens } from './tokens.ts'
import { useStepper } from './useStepper.ts'
import './world.css'

export interface WorldCanvasProps {
  shot: Shot
  /** The fly-in reached the isometric view (or was skipped). */
  onFlyDone?: () => void
  /** The first frame is on screen. */
  onReady?: () => void
}

interface Flight {
  fly: FlyPath
  start: number
  last: number
  frameTimes: number[]
}

const position = new Vector3()
const look = new Vector3()
/** Fog is measured from the monument, so it never swallows the subject mid-flight. */
const MONUMENT_CENTRE = new Vector3(0, WORDMARK.base + WORDMARK.height / 2, 0)

function applyFog(scene: ThreeScene, camera: PerspectiveCamera): void {
  if (scene.fog instanceof Fog) {
    ;[scene.fog.near, scene.fog.far] = fogRange(camera.position.distanceTo(MONUMENT_CENTRE))
  }
}

function CameraRig({ shot, onFlyDone }: Pick<WorldCanvasProps, 'shot' | 'onFlyDone'>) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const width = useThree((s) => s.size.width)
  const height = useThree((s) => s.size.height)
  const invalidate = useThree((s) => s.invalidate)
  const scene = useThree((s) => s.scene)
  const flight = useRef<Flight | null>(null)

  const done = useRef(onFlyDone)
  useEffect(() => {
    done.current = onFlyDone
  })

  useLayoutEffect(() => {
    if (shot === 'title') {
      flight.current = null
      placeTitle(camera, width / Math.max(height, 1))
      applyFog(scene, camera)
    } else if (shot === 'iso') {
      flight.current = null
      placeIso(camera)
      applyFog(scene, camera)
    } else if (!flight.current) {
      const now = performance.now()
      flight.current = { fly: flyPath(camera.position), start: now, last: now, frameTimes: [] }
    }
    invalidate()
  }, [shot, camera, scene, width, height, invalidate])

  useFrame(() => {
    const f = flight.current
    if (!f) return
    const now = performance.now()
    f.frameTimes.push(now - f.last)
    f.last = now
    const t = (now - f.start) / (FLY_SECONDS * 1000)
    if (t >= 1) {
      flight.current = null
      placeIso(camera)
      applyFog(scene, camera)
      // Skip the first frames (shader compiles) when judging speed.
      const settled = f.frameTimes.slice(3)
      const mean = settled.reduce((a, b) => a + b, 0) / Math.max(settled.length, 1)
      if (settled.length > 0 && mean > SLOW_FRAME_MS) viewStore.getState().reportSlowFrames()
      done.current?.()
      invalidate()
      return
    }
    flyPose(f.fly, flyEase(t), camera, position, look)
    camera.position.copy(position)
    camera.lookAt(look)
    applyFog(scene, camera)
    invalidate()
  })
  return null
}

function Scene({ shot, onFlyDone, onReady, tokens }: WorldCanvasProps & { tokens: SceneTokens }) {
  const reducedMotion = useReducedMotion()
  const animate = !reducedMotion
  useStepper(animate)

  const background = useMemo(() => new Color(tokens.ground), [tokens.ground])
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => invalidate(), [tokens, invalidate])

  const readyFired = useRef(false)
  useFrame(() => {
    if (readyFired.current) return
    readyFired.current = true
    // After this frame reaches the screen.
    requestAnimationFrame(() => onReady?.())
  })

  return (
    <>
      <primitive attach="background" object={background} />
      <fog attach="fog" args={[tokens.ground, ...fogRange(ISO_DISTANCE)]} />
      <ambientLight intensity={1.5} />
      <directionalLight position={[30, 60, 40]} intensity={2.2} />
      <CameraRig shot={shot} onFlyDone={onFlyDone} />
      <Monument tokens={tokens} animate={animate} showGroundText={shot !== 'title'} />
    </>
  )
}

export default function WorldCanvas(props: WorldCanvasProps) {
  const preset = useView((s) => s.preset)
  const tokens = useSceneTokens()
  const [ready, setReady] = useState(false)
  const { onReady } = props
  return (
    <div
      className="world"
      data-testid="world-canvas"
      data-shot={props.shot}
      data-preset={preset}
      data-ready={ready}
      aria-hidden="true"
    >
      <Canvas
        dpr={PRESETS[preset].scale}
        flat
        frameloop="demand"
        gl={{ antialias: false, powerPreference: 'default' }}
        camera={{ fov: FOV, near: 0.5, far: 900 }}
      >
        <Scene
          {...props}
          tokens={tokens}
          onReady={() => {
            setReady(true)
            onReady?.()
          }}
        />
      </Canvas>
    </div>
  )
}
