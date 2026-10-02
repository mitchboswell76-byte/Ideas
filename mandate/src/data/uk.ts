/**
 * UK seat data (650 Westminster constituencies, 2024 boundaries). The UI imports the parts it needs
 * (`ukSeats.ts`, `ge2024.ts`, `census.ts`) lazily; together they are ~500 KB of JSON (~70 KB gzip).
 */
export { CENSUS } from './census.ts'
export { GE2024 } from './ge2024.ts'
export { UK_SEATS } from './ukSeats.ts'
