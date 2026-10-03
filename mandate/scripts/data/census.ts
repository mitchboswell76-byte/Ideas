/**
 * Census subset per seat, from the Bristol summaries file: England and Wales from ONS (Census 2021),
 * Scotland from Scotland's Census 2022 (fewer measures, so gaps are null; density is worked out from
 * boundary areas). Percentages, 1 dp.
 */
import type { CensusField, CensusSeat } from '../../src/data/types.ts'
import type { CsvRow } from './csv.ts'

export const CENSUS_FIELDS: Record<CensusField, string> = {
  population: 'Population',
  density: 'People per hectare',
  age16to24: 'Aged 16–24',
  age65plus: 'Aged 65 and over',
  female: 'Female',
  whiteBritish: 'White British',
  bornOutsideUk: 'Born outside the UK',
  christian: 'Christian',
  muslim: 'Muslim',
  noReligion: 'No religion',
  degree: 'Degree-level qualification',
  ownerOccupied: 'Own their home',
  socialRent: 'Social renters',
  privateRent: 'Private renters',
  professional: 'Higher managerial and professional',
  routine: 'Routine and semi-routine jobs',
  retired: 'Retired',
  badHealth: 'Bad or very bad health',
  noCar: 'Households with no car',
  deprived: 'Households deprived in at least one dimension',
  welshSpeakers: 'Can speak Welsh',
}

function value(row: CsvRow, col: string): number | null {
  const v = row[col]
  if (v === undefined) throw new Error(`Census column ${col} missing`)
  if (v === '' || v === 'NA') return null
  const n = Number(v)
  if (!Number.isFinite(n)) throw new Error(`Census ${col}: ${v} is not a number`)
  return n
}

const round1 = (n: number) => Math.round(n * 10) / 10

/** Sum of the columns, or null if any is missing. */
function sum(row: CsvRow, cols: string[]): number | null {
  let total = 0
  for (const col of cols) {
    const n = value(row, col)
    if (n === null) return null
    total += n
  }
  return round1(total)
}

const minus100 = (n: number | null) => (n === null ? null : round1(100 - n))

/**
 * Fills a missing density (Scotland's source has none) as population ÷ boundary area. Seats with
 * a published density keep it.
 */
export function withDensity(
  seats: readonly CensusSeat[],
  hectares: ReadonlyMap<string, number>,
): CensusSeat[] {
  return seats.map((s) => {
    if (s.density !== null || s.population === null) return s
    const ha = hectares.get(s.id)
    if (!ha) throw new Error(`${s.id}: no boundary area for its density`)
    return { ...s, density: round1(s.population / ha) }
  })
}

export function censusFromSummaries(row: CsvRow): CensusSeat {
  const one = (col: string) => sum(row, [col])
  return {
    id: row.ONSConstID,
    population: value(row, 'c21Population'),
    density: one('c21PopulationDensity'),
    age16to24: sum(row, ['c21Age16to19', 'c21Age20to24']),
    age65plus: sum(row, [
      'c21Age65to69',
      'c21Age70to74',
      'c21Age75to79',
      'c21Age80to84',
      'c21Age85plus',
    ]),
    female: one('c21Female'),
    whiteBritish: one('c21EthnicityWhiteBritish'),
    bornOutsideUk: sum(row, [
      'c21BornIreland',
      'c21BornOtherEurope',
      'c21BornAfrica',
      'c21BornMiddleEastAndAsia',
      'c21BornAmericasAndCaribbean',
      'c21BornOceania',
    ]),
    christian: one('c21Christian'),
    muslim: one('c21Muslim'),
    noReligion: one('c21NoReligion'),
    degree: one('c21QualLevel4'),
    ownerOccupied: sum(row, ['c21HouseOutright', 'c21HouseMortgage']),
    socialRent: sum(row, ['c21HouseSocialLA', 'c21HouseSocialOther']),
    privateRent: sum(row, ['c21HousePrivateLandlord', 'c21HousePrivateOther']),
    professional: sum(row, ['c21NSSECHigherManager', 'c21NSSECHigherProfessional']),
    routine: sum(row, ['c21NSSECSemiRoutine', 'c21NSSECRoutine']),
    retired: one('c21InactiveRetired'),
    badHealth: sum(row, ['c21HealthBad', 'c21HealthVeryBad']),
    noCar: one('c21CarsNone'),
    deprived: minus100(one('c21DeprivedNone')),
    welshSpeakers: one('c21AnyWelsh'),
  }
}

/** A seat the source doesn't cover (Northern Ireland). */
export function emptyCensus(id: string): CensusSeat {
  const fields = Object.keys(CENSUS_FIELDS) as CensusField[]
  return { id, ...Object.fromEntries(fields.map((f) => [f, null])) } as CensusSeat
}
