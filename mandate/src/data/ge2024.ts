/** 2024 general election results per seat and party colours. Import lazily (~200 KB JSON). */
import ge2024 from './generated/ge2024.json'
import type { Ge2024File } from './types.ts'

export const GE2024 = ge2024 as Ge2024File
