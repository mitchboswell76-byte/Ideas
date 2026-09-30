/**
 * UK seat data (650 Westminster constituencies, 2024 boundaries). Import lazily from UI code —
 * together these files are ~500 KB of JSON (~70 KB gzip).
 */
import census from './generated/census2021.json'
import ge2024 from './generated/ge2024.json'
import seats from './generated/uk-seats.json'
import type { CensusFile, Ge2024File, SeatsFile } from './types.ts'

export const UK_SEATS = seats as SeatsFile
export const GE2024 = ge2024 as Ge2024File
export const CENSUS = census as CensusFile
