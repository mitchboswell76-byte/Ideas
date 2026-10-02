/**
 * World countries (Natural Earth 1:110m units) and blocs. Import lazily from UI code (~40 KB of
 * JSON); the map paths are in `worldMap.ts`.
 */
import countries from './generated/countries.json'
import type { Bloc, CountriesFile, CountryInfo } from './types.ts'

const file = countries as CountriesFile

export const COUNTRIES: CountryInfo[] = file.countries
export const BLOCS: Bloc[] = file.blocs
/** When the blocs and hand-entered country facts were last checked. */
export const COUNTRIES_AS_OF: string = file.asOf
