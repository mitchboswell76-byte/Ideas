import { useMemo } from 'react'
import {
  EXPRESSIONS,
  type Accessory,
  type Outfit,
  type Pose,
} from '../../../sim/character/appearance.ts'
import { generateCharacter } from '../../../sim/character/generate.ts'
import { fullName, type Character } from '../../../sim/character/model.ts'
import { ageOn } from '../../../sim/clock.ts'
import { Rng } from '../../../sim/rng.ts'
import { createWorld } from '../../../sim/world.ts'
import { AvatarImage, Portrait, type PortraitPerson } from '../../avatar/Portrait.tsx'
import { useRig } from '../../avatar/useRig.ts'
import type { PartyColours } from '../PortraitFrame.tsx'

const PARTY: PartyColours = { name: 'Fictional party', colour: '#c8372d' }

function cast(seed: string, count: number): PortraitPerson[] {
  const world = createWorld({ seed })
  const rng = new Rng(world.rngState)
  const people: Character[] = []
  for (let i = 0; i < count; i++) people.push(generateCharacter(world, rng, { age: [19, 80] }))
  return people.map((c) => ({
    name: fullName(c),
    appearance: c.appearance,
    age: ageOn(c.birthDay, world.clock.day),
    gender: c.gender,
  }))
}

function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <figure className="avatar-demo__item">
      {children}
      <figcaption className="avatar-demo__label">{label}</figcaption>
    </figure>
  )
}

const ROLES: { label: string; age: number; outfit: Outfit; accessories?: Accessory[] }[] = [
  { label: 'Pupil, 15', age: 15, outfit: 'school' },
  { label: 'Student, 20', age: 20, outfit: 'hoodie' },
  { label: 'Site work, 24', age: 24, outfit: 'workwear', accessories: ['hardHat'] },
  { label: 'Councillor, 31', age: 31, outfit: 'knit', accessories: ['rosette'] },
  { label: 'MP, 38', age: 38, outfit: 'suit', accessories: ['rosette'] },
  { label: 'Minister, 47', age: 47, outfit: 'suitOpen', accessories: ['lanyard', 'poppy'] },
]

const POSES: { label: string; pose: Pose; accessories?: Accessory[] }[] = [
  { label: 'Stand', pose: 'stand' },
  { label: 'Arms folded', pose: 'armsFolded' },
  { label: 'Podium', pose: 'podium' },
  { label: 'Wave', pose: 'wave' },
  { label: 'Placard', pose: 'stand', accessories: ['placard', 'rosette'] },
]

function FullBody({
  person,
  pose,
  accessories,
}: {
  person: PortraitPerson
  pose: Pose
  accessories?: Accessory[]
}) {
  const rig = useRig(person, { pose, accessories, partyColour: PARTY.colour, outfit: 'suit' })
  return <AvatarImage rig={rig} framing="full" className="avatar-demo__full" />
}

/** Avatar generator specimens: generated people, expressions, ageing, roles, poses (DESIGN §4). */
export function Avatars({
  Section,
}: {
  Section: React.ComponentType<{ title: string; note: string; children: React.ReactNode }>
}) {
  const people = useMemo(() => cast('kit-avatars', 12), [])
  const lead = people[0]
  return (
    <Section
      title="Avatars"
      note="Stylised 3D people built in code (The Sims / Two Point), rendered once and cached as images. 2D view shows the flat illustration."
    >
      <div className="avatar-demo">
        <h3 className="avatar-demo__title">Generated people</h3>
        <div className="avatar-demo__row">
          {people.map((p) => (
            <Labelled key={p.name} label={`${p.name}, ${p.age}`}>
              <Portrait person={p} size="m" />
            </Labelled>
          ))}
        </div>
        <h3 className="avatar-demo__title">Expressions</h3>
        <div className="avatar-demo__row">
          {EXPRESSIONS.map((e) => (
            <Labelled key={e} label={e}>
              <Portrait person={lead} expression={e} size="m" />
            </Labelled>
          ))}
        </div>
        <h3 className="avatar-demo__title">Ageing</h3>
        <div className="avatar-demo__row">
          {[8, 16, 25, 40, 55, 70, 85].map((age) => (
            <Labelled key={age} label={`${age}`}>
              <Portrait person={{ ...people[1], age }} size="m" />
            </Labelled>
          ))}
        </div>
        <h3 className="avatar-demo__title">Roles</h3>
        <div className="avatar-demo__row">
          {ROLES.map((r) => (
            <Labelled key={r.label} label={r.label}>
              <Portrait
                person={{ ...people[2], age: r.age }}
                outfit={r.outfit}
                accessories={r.accessories}
                party={r.accessories?.includes('rosette') ? PARTY : null}
                size="m"
              />
            </Labelled>
          ))}
        </div>
        <h3 className="avatar-demo__title">Poses</h3>
        <div className="avatar-demo__row">
          {POSES.map((p) => (
            <Labelled key={p.label} label={p.label}>
              <FullBody person={people[3]} pose={p.pose} accessories={p.accessories} />
            </Labelled>
          ))}
        </div>
      </div>
    </Section>
  )
}
