import type { PartyColours } from '../kit/index.ts'

/**
 * The header takes the player's party colours (FM tints with club colours). A new career has no
 * party, so it starts neutral; party data arrives at T12 and membership at T15.
 */
export const NO_PARTY: PartyColours = { name: 'Independent', colour: '#56606b' }
