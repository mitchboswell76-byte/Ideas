/**
 * The 3D layer (DESIGN §17), loaded lazily so three.js never delays the first paint. A generic host:
 * scenes (maps from T6/T7, portraits and the creator from T9/T10) are its children. Renders on
 * demand at the preset's internal resolution; redraw with `invalidate()` or `useStepper`.
 */
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Color } from 'three'
import { PRESETS } from '../graphics/presets.ts'
import { useView } from '../store/view.ts'
import { useSceneTokens } from './tokens.ts'
import './world.css'

export interface WorldCanvasProps {
  children?: ReactNode
  /** The first frame is on screen. */
  onReady?: () => void
}

function Backdrop({ onReady }: Pick<WorldCanvasProps, 'onReady'>) {
  const tokens = useSceneTokens()
  const background = useMemo(() => new Color(tokens.background), [tokens.background])
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => invalidate(), [tokens, invalidate])

  const readyFired = useRef(false)
  useFrame(() => {
    if (readyFired.current) return
    readyFired.current = true
    // After this frame reaches the screen.
    requestAnimationFrame(() => onReady?.())
  })
  return <primitive attach="background" object={background} />
}

export default function WorldCanvas({ children, onReady }: WorldCanvasProps) {
  const preset = useView((s) => s.preset)
  const [ready, setReady] = useState(false)
  return (
    <div
      className="world"
      data-testid="world-canvas"
      data-preset={preset}
      data-ready={ready}
      aria-hidden="true"
    >
      <Canvas
        dpr={PRESETS[preset].scale}
        flat
        frameloop="demand"
        gl={{ antialias: false, powerPreference: 'default' }}
      >
        <Backdrop
          onReady={() => {
            setReady(true)
            onReady?.()
          }}
        />
        <ambientLight intensity={1.5} />
        <directionalLight position={[30, 60, 40]} intensity={2.2} />
        {children}
      </Canvas>
    </div>
  )
}
