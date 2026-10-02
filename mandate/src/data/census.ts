/** Census measures per seat (E&W 2021, Scotland 2022). Import lazily (~250 KB JSON). */
import census from './generated/census2021.json'
import type { CensusFile } from './types.ts'

export const CENSUS = census as CensusFile
