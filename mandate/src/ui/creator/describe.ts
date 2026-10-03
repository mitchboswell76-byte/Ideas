/** Player-facing words for the creator (UK English). Pure. */
import type { CharacterSpec, Household, StartMode } from '../../sim/character/create.ts'
import { heritageById } from '../../sim/character/generate.ts'
import type { Ideology } from '../../sim/character/model.ts'
import type { CreatorTab } from './store.ts'

export const TAB_LABELS: Record<CreatorTab, string> = {
  identity: 'Identity',
  origins: 'Origins',
  family: 'Family',
  look: 'Look',
  abilities: 'Abilities',
  beliefs: 'Beliefs',
  start: 'Start',
}

export const TAB_HINTS: Record<CreatorTab, string> = {
  identity: 'Name, age and colour',
  origins: 'Where you were born and live',
  family: 'Upbringing, schooling, work',
  look: 'Face, hair, body, clothes',
  abilities: 'Attributes and traits',
  beliefs: 'Where you stand',
  start: 'Check and begin',
}

export const HOUSEHOLD_LABELS: Record<Household, string> = {
  left: 'Left-leaning',
  centre: 'Centrist',
  right: 'Right-leaning',
  apolitical: 'Not political',
}

export const START_MODE_LABELS: Record<StartMode, string> = {
  quick: 'Quick start',
  life: 'Life mode',
}

/** "Centre-left, liberal": a rough reading of the compass. */
export function describeIdeology({ econ, social }: Pick<Ideology, 'econ' | 'social'>): string {
  const side =
    econ < -50
      ? 'Left'
      : econ < -15
        ? 'Centre-left'
        : econ <= 15
          ? 'Centre'
          : econ <= 50
            ? 'Centre-right'
            : 'Right'
  const axis = social < -33 ? 'liberal' : social > 33 ? 'authoritarian' : null
  return axis ? `${side}, ${axis}` : side
}

export function heritageLabel(spec: Pick<CharacterSpec, 'heritage'>): string {
  return heritageById(spec.heritage).label
}

/** Slider value as the −10 … +10 shown beside it. */
export const sliderNumber = (v: number) => Math.round(v * 10)
