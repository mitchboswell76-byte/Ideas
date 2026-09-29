import { useMemo } from 'react'
import { bitmapPath, icon, textBitmap, type Bitmap, type IconName } from '../pixel/font.ts'
import { cx } from './cx.ts'

interface PixelArtProps {
  bitmap: Bitmap
  /** CSS pixels per bitmap pixel. */
  scale?: number
  /** Accessible name; without one the art is decorative. */
  label?: string
  className?: string
}

/** A bitmap drawn as one crisp SVG path in `currentColor`. */
export function PixelArt({ bitmap, scale = 2, label, className }: PixelArtProps) {
  const d = useMemo(() => bitmapPath(bitmap), [bitmap])
  return (
    <svg
      className={cx('pixel-art', className)}
      width={bitmap.width * scale}
      height={bitmap.height * scale}
      viewBox={`0 0 ${bitmap.width} ${bitmap.height}`}
      shapeRendering="crispEdges"
      fill="currentColor"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <path d={d} />
    </svg>
  )
}

interface PixelTextProps extends Omit<PixelArtProps, 'bitmap' | 'label'> {
  text: string
  tracking?: number
  /** Defaults to the text itself; pass `''` when the words are also written out nearby. */
  label?: string
}

/** Text in the game's bitmap font (wordmarks, voxel-style headings). */
export function PixelText({ text, tracking, label = text, ...rest }: PixelTextProps) {
  const bitmap = useMemo(() => textBitmap(text, { tracking }), [text, tracking])
  return <PixelArt bitmap={bitmap} label={label || undefined} {...rest} />
}

interface PixelIconProps extends Omit<PixelArtProps, 'bitmap'> {
  name: IconName
}

export function PixelIcon({ name, ...rest }: PixelIconProps) {
  const bitmap = useMemo(() => icon(name), [name])
  return <PixelArt bitmap={bitmap} {...rest} />
}
