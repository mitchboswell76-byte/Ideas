import { useMemo, type CSSProperties } from 'react'
import { bitmapPath, glyph, type Bitmap } from '../pixel/font.ts'
import { cx } from './cx.ts'

/** Pleated ribbon (`o`), centre disc (`c`) and tails (`t`). The centre fits one 5×7 glyph. */
const ROSETTE = [
  '...o.o.o.o...',
  '..ooooooooo..',
  '.ooooooooooo.',
  'oooocccccoooo',
  '.ooocccccooo.',
  'ooocccccccooo',
  '.oocccccccoo.',
  'ooocccccccooo',
  '.ooocccccooo.',
  'oooocccccoooo',
  '.ooooooooooo.',
  '..ooooooooo..',
  '...o.o.o.o...',
  '....tt.tt....',
  '....tt.tt....',
  '...tt...tt...',
  '...tt...tt...',
  '..tt.....tt..',
]
const WIDTH = ROSETTE[0]!.length
const HEIGHT = ROSETTE.length
/** Where the initial's glyph sits in the centre disc. */
const INITIAL_X = 4
const INITIAL_Y = 3

function layer(...kinds: string[]): Bitmap {
  return {
    width: WIDTH,
    height: HEIGHT,
    rows: ROSETTE.map((row) => Array.from(row, (c) => kinds.includes(c))),
  }
}

const RIBBON_PATH = bitmapPath(layer('o', 't'))
const CENTRE_PATH = bitmapPath(layer('c'))

interface RosetteProps {
  /** Party colour from data, or the player's `--you` colour. */
  colour: string
  /** One character drawn in the centre. */
  initial?: string
  /** Shown beside the rosette and used as its accessible name. */
  label?: string
  scale?: number
  className?: string
}

/** Party (or player) badge: a pixel rosette in the allegiance colour. */
export function Rosette({ colour, initial, label, scale = 2, className }: RosetteProps) {
  const initialPath = useMemo(
    () => (initial ? bitmapPath(glyph(initial.slice(0, 1))) : null),
    [initial],
  )
  // With a visible label the art is decorative; otherwise the initial names it.
  const name = label ?? initial
  return (
    <span className={cx('rosette', className)} style={{ '--rosette': colour } as CSSProperties}>
      <svg
        className="rosette__art"
        width={WIDTH * scale}
        height={HEIGHT * scale}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        shapeRendering="crispEdges"
        role={label || !name ? undefined : 'img'}
        aria-label={label ? undefined : name}
        aria-hidden={label || !name ? true : undefined}
        focusable="false"
      >
        <path className="rosette__ribbon" d={RIBBON_PATH} />
        <path className="rosette__centre" d={CENTRE_PATH} />
        {initialPath && (
          <path
            className="rosette__initial"
            d={initialPath}
            transform={`translate(${INITIAL_X} ${INITIAL_Y})`}
          />
        )}
      </svg>
      {label && <span className="rosette__label">{label}</span>}
    </span>
  )
}
