import { useMemo } from 'react'
import type {
  Accessory,
  Appearance,
  Expression,
  Outfit,
  Pose,
} from '../../sim/character/appearance.ts'
import type { Gender } from '../../sim/character/model.ts'
import { buildRig, type Rig } from './rig.ts'

/** Enough of a character to draw them. */
export interface PortraitPerson {
  name: string
  appearance: Appearance
  age: number
  gender: Gender
}

export interface LookOptions {
  expression?: Expression
  pose?: Pose
  /** A role's outfit, overriding their usual clothes. */
  outfit?: Outfit
  accessories?: readonly Accessory[]
  partyColour?: string
}

export function useRig(person: PortraitPerson, look: LookOptions = {}): Rig {
  const { appearance, age, gender } = person
  const { expression, pose, outfit, accessories, partyColour } = look
  const accessoryKey = accessories?.join(',') ?? ''
  return useMemo(
    () =>
      buildRig({
        appearance,
        age,
        gender,
        expression,
        pose,
        outfit,
        accessories: accessoryKey ? (accessoryKey.split(',') as Accessory[]) : undefined,
        partyColour,
      }),
    [appearance, age, gender, expression, pose, outfit, accessoryKey, partyColour],
  )
}
