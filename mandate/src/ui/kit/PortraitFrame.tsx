import type { CSSProperties } from 'react'
import { readableInk } from './colour.ts'
import { cx } from './cx.ts'
import './character.css'

export interface PartyColours {
  name: string
  colour: string
}

interface PortraitFrameProps {
  /** Who it is (the image's accessible name). */
  name: string
  party?: PartyColours | null
  /** Shown on the party band at sizes m and l. */
  office?: string
  size?: 's' | 'm' | 'l'
  /** The player: framed in their personal colour. */
  you?: boolean
  /** A cached portrait render (T9); a silhouette until then. */
  src?: string
  className?: string
}

/** CK3-style framed portrait: bust, party-coloured band, office (DESIGN §4, §17). */
export function PortraitFrame({
  name,
  party,
  office,
  size = 'm',
  you,
  src,
  className,
}: PortraitFrameProps) {
  const style = party
    ? ({ '--frame-party': party.colour, '--frame-ink': readableInk(party.colour) } as CSSProperties)
    : undefined
  const band = size !== 's' && (office || party)
  return (
    <figure
      className={cx('portrait', `portrait--${size}`, you && 'portrait--you', className)}
      style={style}
      role="img"
      aria-label={[name, office, party?.name].filter(Boolean).join(', ')}
    >
      {src ? (
        <img className="portrait__image" src={src} alt="" />
      ) : (
        <svg className="portrait__image" viewBox="0 0 100 120" aria-hidden>
          <ellipse cx="50" cy="47" rx="19" ry="23" />
          <path d="M42 66h16v14H42z" />
          <path d="M10 120c2-26 18-40 40-40s38 14 40 40z" />
        </svg>
      )}
      {band && <figcaption className="portrait__band">{office ?? party?.name}</figcaption>}
      {!band && party && <span className="portrait__stripe" aria-hidden />}
    </figure>
  )
}
