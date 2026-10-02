/** The 650 seats' real boundaries as projected SVG paths (`npm run data`). Import lazily: ~400 KB. */
import map from './generated/uk-map.json'
import type { UkMapFile } from './types.ts'

export const UK_MAP = map as UkMapFile
