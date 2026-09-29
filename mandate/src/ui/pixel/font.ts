/**
 * The game's original bitmap font (DESIGN §17): 5×7 capitals, digits and punctuation, plus pixel
 * icons in the same format. One table feeds DOM pixel art (`PixelText`, `PixelIcon`), canvas text
 * and, from T4b, the voxel builders — so this module stays free of DOM and React.
 *
 * Glyphs are rows of `#` (ink) and `.` (blank), top to bottom. Letters are 5 wide; punctuation may
 * be narrower. Lower case is drawn as capitals.
 */

export const GLYPH_HEIGHT = 7

/** A monochrome pixel image; `rows[y][x]` is true where ink is. */
export interface Bitmap {
  width: number
  height: number
  rows: readonly (readonly boolean[])[]
}

const GLYPH_ROWS: Readonly<Record<string, readonly string[]>> = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.####'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  J: ['..###', '...#.', '...#.', '...#.', '#..#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '#.#.#', '.#.#.'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['#####', '...#.', '..#..', '...#.', '....#', '#...#', '.###.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
  ' ': ['...', '...', '...', '...', '...', '...', '...'],
  '.': ['.', '.', '.', '.', '.', '.', '#'],
  ',': ['..', '..', '..', '..', '..', '.#', '#.'],
  ':': ['.', '.', '#', '.', '.', '#', '.'],
  ';': ['..', '..', '.#', '..', '..', '.#', '#.'],
  '!': ['#', '#', '#', '#', '#', '.', '#'],
  '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
  "'": ['#', '#', '.', '.', '.', '.', '.'],
  '"': ['#.#', '#.#', '...', '...', '...', '...', '...'],
  '-': ['....', '....', '....', '####', '....', '....', '....'],
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  '=': ['....', '....', '####', '....', '####', '....', '....'],
  '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
  '(': ['..#', '.#.', '#..', '#..', '#..', '.#.', '..#'],
  ')': ['#..', '.#.', '..#', '..#', '..#', '.#.', '#..'],
  '<': ['...#', '..#.', '.#..', '#...', '.#..', '..#.', '...#'],
  '>': ['#...', '.#..', '..#.', '...#', '..#.', '.#..', '#...'],
  '&': ['.##..', '#..#.', '#.#..', '.#...', '#.#.#', '#..#.', '.##.#'],
  '£': ['..##.', '.#..#', '.#...', '###..', '.#...', '.#...', '#####'],
  '%': ['##..#', '##..#', '...#.', '..#..', '.#...', '#..##', '#..##'],
  '#': ['.#.#.', '.#.#.', '#####', '.#.#.', '#####', '.#.#.', '.#.#.'],
  '*': ['.....', '#.#.#', '.###.', '#####', '.###.', '#.#.#', '.....'],
  _: ['....', '....', '....', '....', '....', '....', '####'],
}

/** 7×7 pixel icons, drawn in the same format as the glyphs. */
const ICON_ROWS = {
  pause: ['.......', '.##.##.', '.##.##.', '.##.##.', '.##.##.', '.##.##.', '.......'],
  play: ['.#.....', '.##....', '.###...', '.####..', '.###...', '.##....', '.#.....'],
  step: ['#....#.', '##...#.', '###..#.', '####.#.', '###..#.', '##...#.', '#....#.'],
  arrowRight: ['.......', '...#...', '....#..', '#######', '....#..', '...#...', '.......'],
  arrowLeft: ['.......', '...#...', '..#....', '#######', '..#....', '...#...', '.......'],
  close: ['#.....#', '.#...#.', '..#.#..', '...#...', '..#.#..', '.#...#.', '#.....#'],
  /** A pen cross, as marked on a ballot paper. */
  mark: ['##...##', '###.###', '.#####.', '..###..', '.#####.', '###.###', '##...##'],
  tick: ['.......', '......#', '.....#.', '#...#..', '.#.#...', '..#....', '.......'],
  ballotBox: ['...#...', '..##...', '#######', '#.....#', '#.###.#', '#.....#', '#######'],
  settings: ['.#.....', '#######', '.#.....', '.......', '....#..', '#######', '....#..'],
  exportFile: ['...#...', '..###..', '.#.#.#.', '...#...', '#..#..#', '#.....#', '#######'],
  importFile: ['...#...', '...#...', '.#.#.#.', '..###..', '#..#..#', '#.....#', '#######'],
  trash: ['..###..', '#######', '.#...#.', '.#.#.#.', '.#.#.#.', '.#...#.', '.#####.'],
  urgent: ['...#...', '..#.#..', '..#.#..', '.#.#.#.', '.#...#.', '#..#..#', '#######'],
  /** A voxel block: the 3D view. */
  cube: ['..###..', '.#...#.', '#######', '#..#..#', '#..#..#', '.#.#.#.', '..###..'],
  /** A page with a folded corner: the 2D document view. */
  document: ['######.', '#....##', '#.###.#', '#.....#', '#.###.#', '#.....#', '#######'],
  news: ['#######', '#.....#', '#.###.#', '#.....#', '#.##..#', '#.....#', '#######'],
} as const satisfies Record<string, readonly string[]>

export type IconName = keyof typeof ICON_ROWS

export const ICON_NAMES = Object.keys(ICON_ROWS) as IconName[]

function toBitmap(rows: readonly string[]): Bitmap {
  return {
    width: rows[0]?.length ?? 0,
    height: rows.length,
    rows: rows.map((row) => Array.from(row, (c) => c === '#')),
  }
}

const glyphCache = new Map<string, Bitmap>()

/** Characters the font draws (after upper-casing). */
export function hasGlyph(char: string): boolean {
  return char.toUpperCase() in GLYPH_ROWS
}

/** The bitmap for one character; unknown characters draw as `?`. */
export function glyph(char: string): Bitmap {
  const key = hasGlyph(char) ? char.toUpperCase() : '?'
  let bitmap = glyphCache.get(key)
  if (!bitmap) {
    bitmap = toBitmap(GLYPH_ROWS[key] ?? [])
    glyphCache.set(key, bitmap)
  }
  return bitmap
}

export function icon(name: IconName): Bitmap {
  return toBitmap(ICON_ROWS[name])
}

export interface TextOptions {
  /** Blank columns between glyphs (default 1). */
  tracking?: number
}

/** Lay out a single line of text as one bitmap. */
export function textBitmap(text: string, { tracking = 1 }: TextOptions = {}): Bitmap {
  const glyphs = Array.from(text, glyph)
  const width = glyphs.reduce((w, g, i) => w + g.width + (i > 0 ? tracking : 0), 0)
  const rows = Array.from({ length: GLYPH_HEIGHT }, () => new Array<boolean>(width).fill(false))
  let x = 0
  for (const g of glyphs) {
    for (let y = 0; y < g.height; y++) {
      for (let gx = 0; gx < g.width; gx++) {
        if (g.rows[y]?.[gx]) rows[y]![x + gx] = true
      }
    }
    x += g.width + tracking
  }
  return { width, height: GLYPH_HEIGHT, rows }
}

/**
 * The bitmap as horizontal runs of ink, `[x, y, length]`: few rectangles to draw, whether as SVG
 * path segments, canvas `fillRect`s or merged voxel rows.
 */
export function inkRuns(bitmap: Bitmap): [x: number, y: number, length: number][] {
  const runs: [number, number, number][] = []
  bitmap.rows.forEach((row, y) => {
    let start = -1
    for (let x = 0; x <= row.length; x++) {
      const on = x < row.length && row[x]
      if (on && start < 0) start = x
      if (!on && start >= 0) {
        runs.push([start, y, x - start])
        start = -1
      }
    }
  })
  return runs
}

/** An SVG path (`M x y h n v 1 h -n z` per run) covering every ink pixel, in pixel units. */
export function bitmapPath(bitmap: Bitmap): string {
  return inkRuns(bitmap)
    .map(([x, y, n]) => `M${x} ${y}h${n}v1h-${n}z`)
    .join('')
}
