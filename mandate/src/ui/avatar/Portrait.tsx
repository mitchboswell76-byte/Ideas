import { PortraitFrame, type PartyColours } from '../kit/PortraitFrame.tsx'
import { AvatarSvg } from './AvatarSvg.tsx'
import type { Framing } from './portraits.ts'
import type { Rig } from './rig.ts'
import { usePortraitImage } from './usePortrait.ts'
import { useRig, type LookOptions, type PortraitPerson } from './useRig.ts'

export type { LookOptions, PortraitPerson }

/** The avatar as an image: the cached 3D render, or the 2D illustration (2D view, no WebGL). */
export function AvatarImage({
  rig,
  framing = 'bust',
  className,
}: {
  rig: Rig
  framing?: Framing
  className?: string
}) {
  const url = usePortraitImage(rig, framing)
  return url ? (
    <img className={className} src={url} alt="" draggable={false} />
  ) : (
    <AvatarSvg rig={rig} className={className} />
  )
}

interface PortraitProps extends LookOptions {
  person: PortraitPerson
  party?: PartyColours | null
  office?: string
  size?: 's' | 'm' | 'l'
  you?: boolean
  className?: string
}

/** A character's CK3-framed portrait (DESIGN §4): bust render in a party-coloured frame. */
export function Portrait({ person, party, office, size, you, className, ...look }: PortraitProps) {
  const rig = useRig(person, { partyColour: party?.colour, ...look })
  return (
    <PortraitFrame
      name={person.name}
      party={party}
      office={office}
      size={size}
      you={you}
      className={className}
    >
      <AvatarImage rig={rig} className="portrait__image" />
    </PortraitFrame>
  )
}
