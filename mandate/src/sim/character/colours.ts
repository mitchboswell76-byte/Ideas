/**
 * Personal colours (DESIGN §4): the player picks one at creation; it marks them in the UI (`--you`:
 * portrait frame, map home, compass dot). Each has a shade for the dark and the light theme. No
 * brown or olive (DESIGN §17).
 */
export interface PersonalColour {
  id: string
  name: string
  dark: string
  light: string
}

export const PERSONAL_COLOURS: readonly PersonalColour[] = [
  { id: 'violet', name: 'Violet', dark: '#b79cf2', light: '#7a55d6' },
  { id: 'blue', name: 'Blue', dark: '#82aef5', light: '#2f68c9' },
  { id: 'teal', name: 'Teal', dark: '#4fc6bc', light: '#0d857b' },
  { id: 'green', name: 'Green', dark: '#7ccc7e', light: '#2c8a3c' },
  { id: 'orange', name: 'Orange', dark: '#f39a5e', light: '#c2541a' },
  { id: 'red', name: 'Red', dark: '#f2807c', light: '#c13a3a' },
  { id: 'pink', name: 'Pink', dark: '#f08cc0', light: '#bd3d83' },
  { id: 'slate', name: 'Slate', dark: '#a9b4c4', light: '#56616f' },
]

export const DEFAULT_COLOUR = 'violet'

export function personalColour(id: string | undefined): PersonalColour {
  return PERSONAL_COLOURS.find((c) => c.id === id) ?? PERSONAL_COLOURS[0]
}
