/**
 * The character creator's draft (T10): the `CharacterSpec` being built, the quiz answers behind its
 * beliefs, and view state (category, expression, zoom). UI only; the sim checks the finished spec
 * again when the career starts. Randomising uses the sim's seeded generators with a fresh seed, so
 * a random draft is always a valid one.
 */
import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla'
import { UK_SEATS } from '../../data/ukSeats.ts'
import type { Appearance, Expression } from '../../sim/character/appearance.ts'
import { randomAppearance } from '../../sim/character/appearance.ts'
import { PERSONAL_COLOURS } from '../../sim/character/colours.ts'
import {
  educationOptions,
  randomAttributes,
  randomFamilyName,
  randomGivenName,
  randomSpec,
  TRAIT_COUNT,
  type CharacterSpec,
} from '../../sim/character/create.ts'
import { heritageById, randomIdeology } from '../../sim/character/generate.ts'
import {
  answersFor,
  scoreQuiz,
  type QuizAnswer,
  type QuizAnswers,
} from '../../sim/character/quiz.ts'
import { canAddTrait, pickTraits } from '../../sim/character/traits.ts'
import { Rng, seedState } from '../../sim/rng.ts'
import type { ConstituencyId, Nation } from '../../sim/world.ts'
import { randomSeed } from '../random.ts'

export const CREATOR_TABS = [
  'identity',
  'origins',
  'family',
  'look',
  'abilities',
  'beliefs',
  'start',
] as const
export type CreatorTab = (typeof CREATOR_TABS)[number]

export type RandomPart = 'all' | 'name' | 'look' | 'abilities' | 'beliefs'

export interface CreatorState {
  spec: CharacterSpec
  answers: QuizAnswers
  tab: CreatorTab
  /** Preview only: the expression on the turntable. */
  expression: Expression
  /** 0 = whole body, 1 = face. */
  zoom: 0 | 1
  /** What a click on the Origins map sets. */
  mapTarget: 'home' | 'born'
  /** Start a fresh, random draft. */
  begin(): void
  setTab(tab: CreatorTab): void
  setExpression(expression: Expression): void
  setZoom(zoom: 0 | 1): void
  setMapTarget(target: 'home' | 'born'): void
  update(patch: Partial<CharacterSpec>): void
  /** Change the look; `edit` gets a copy to modify. */
  editLook(edit: (look: Appearance) => void): void
  setAnswer(id: string, answer: QuizAnswer | undefined): void
  toggleTrait(id: string): void
  setAttribute(key: keyof CharacterSpec['attributes'], value: number): void
  randomise(part: RandomPart): void
}

const freshRng = () => new Rng(seedState(randomSeed()))

const SEATS_BY_NATION = new Map<Nation, string[]>()
for (const s of UK_SEATS.seats) {
  const list = SEATS_BY_NATION.get(s.nation) ?? []
  list.push(s.id)
  SEATS_BY_NATION.set(s.nation, list)
}

export const seatId = (ons: string) => `con_${ons}` as ConstituencyId

export function randomSeat(rng: Rng, nation: Nation): ConstituencyId {
  return seatId(rng.pick(SEATS_BY_NATION.get(nation) ?? ['E14001063']))
}

/** A whole random draft: a valid spec, a home seat in its nation and quiz answers to match. */
function randomDraft(): Pick<CreatorState, 'spec' | 'answers'> {
  const rng = freshRng()
  const spec = randomSpec(rng, { age: [20, 30] })
  const seat = randomSeat(rng, spec.home.nation)
  spec.home = { ...spec.home, seat }
  spec.birthplace = { ...spec.birthplace, seat: rng.chance(0.6) ? seat : undefined }
  const answers = answersFor(spec.ideology)
  return { spec: { ...spec, ideology: scoreQuiz(answers) }, answers }
}

const VIEW_DEFAULTS = {
  tab: 'identity',
  expression: 'smile',
  zoom: 0,
  mapTarget: 'home',
} as const satisfies Partial<CreatorState>

export const creatorStore = createStore<CreatorState>()((set, get) => {
  const patch = (p: Partial<CharacterSpec>) => set((s) => ({ spec: { ...s.spec, ...p } }))
  return {
    ...randomDraft(),
    ...VIEW_DEFAULTS,
    begin: () => set({ ...randomDraft(), ...VIEW_DEFAULTS }),
    setTab: (tab) => set({ tab }),
    setExpression: (expression) => set({ expression }),
    setZoom: (zoom) => set({ zoom }),
    setMapTarget: (mapTarget) => set({ mapTarget }),
    update(p) {
      const next = { ...get().spec, ...p }
      // A younger character can't keep a degree they couldn't have finished yet.
      const options = educationOptions(next.age)
      if (!options.includes(next.education)) next.education = options[options.length - 1]
      set({ spec: next })
    },
    editLook(edit) {
      const look = structuredClone(get().spec.appearance)
      edit(look)
      patch({ appearance: look })
    },
    setAnswer(id, answer) {
      const answers = { ...get().answers, [id]: answer }
      if (answer === undefined) delete answers[id]
      set({ answers })
      patch({ ideology: scoreQuiz(answers) })
    },
    toggleTrait(id) {
      const { traits } = get().spec
      if (traits.includes(id)) patch({ traits: traits.filter((t) => t !== id) })
      else if (traits.length < TRAIT_COUNT.max && canAddTrait(traits, id))
        patch({ traits: [...traits, id] })
    },
    setAttribute(key, value) {
      patch({ attributes: { ...get().spec.attributes, [key]: value } })
    },
    randomise(part) {
      const { spec } = get()
      const rng = freshRng()
      switch (part) {
        case 'all':
          return set({ ...randomDraft(), zoom: 0 })
        case 'name':
          return patch({
            givenName: randomGivenName(rng, spec.heritage, spec.gender),
            familyName: randomFamilyName(rng, spec.heritage),
          })
        case 'look':
          return patch({
            appearance: randomAppearance(rng, {
              gender: spec.gender,
              look: heritageById(spec.heritage),
              age: spec.age,
            }),
          })
        case 'abilities':
          return patch({
            attributes: randomAttributes(rng),
            traits: pickTraits(rng, rng.int(TRAIT_COUNT.min, TRAIT_COUNT.max - 1)),
          })
        case 'beliefs': {
          const answers = answersFor(randomIdeology(rng, spec.classOrigin, spec.age))
          set({ answers })
          return patch({ ideology: scoreQuiz(answers) })
        }
      }
    },
  }
})

export function useCreator<T>(selector: (state: CreatorState) => T): T {
  return useStore(creatorStore, selector)
}

/** Six ready-made faces for the current gender, roots and age (the Sims' preset row). */
export function presetLooks(
  spec: Pick<CharacterSpec, 'gender' | 'heritage' | 'age'>,
): Appearance[] {
  return Array.from({ length: 6 }, (_, i) =>
    randomAppearance(new Rng(seedState(`preset:${spec.heritage}:${spec.gender}:${i}`)), {
      gender: spec.gender,
      look: heritageById(spec.heritage),
      age: spec.age,
    }),
  )
}

export const COLOUR_IDS = PERSONAL_COLOURS.map((c) => c.id)
