/** The 650 Westminster seats (2024 boundaries) and their hex cells. Import lazily (~80 KB JSON). */
import seats from './generated/uk-seats.json'
import type { SeatsFile } from './types.ts'

export const UK_SEATS = seats as SeatsFile
