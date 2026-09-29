/**
 * Accent colours for the title screen's flickering pixels and floating cubes. "Colour means
 * allegiance" (DESIGN §17), so these are party colours: Labour, Conservative, Liberal Democrats,
 * Reform UK, Green, SNP.
 * TODO(T12): read these from the party data files instead of hard-coding them here.
 */
export const TITLE_ACCENTS: readonly string[] = [
  '#e4003b',
  '#0087dc',
  '#faa61a',
  '#12b6cf',
  '#02a95b',
  '#fdf38e',
]

/** Share of wordmark pixels lit in an accent colour at any moment. */
export const ACCENT_SHARE = 0.1

/** Wordmark flicker: pixels changed per step, and steps per second. */
export const FLICKER_PER_STEP = 3
export const FLICKER_STEPS_PER_SECOND = 3
