/** The world map as projected SVG paths (`npm run data`). Import lazily: ~130 KB of JSON. */
import map from './generated/world-map.json'
import type { WorldMapFile } from './types.ts'

export const WORLD_MAP = map as WorldMapFile
