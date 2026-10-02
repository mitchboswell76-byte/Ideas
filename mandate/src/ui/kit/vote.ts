/** Frostpunk 2-style vote bar maths (DESIGN §17). Pure. */

export interface VoteCount {
  for: number
  against: number
  undecided: number
}

export type VoteOutcome = 'passes' | 'fails' | 'open'

export interface VoteLayout {
  /** Seats needed for a majority of `total`. */
  majority: number
  /** Where the majority line sits, 0–1 from the left. */
  majorityAt: number
  /** Shares of the bar, 0–1: For from the left, Against from the right, Undecided between. */
  shares: VoteCount
  outcome: VoteOutcome
}

/** More than half: 326 of 650. */
export function majorityOf(total: number): number {
  return Math.floor(Math.max(0, total) / 2) + 1
}

/**
 * Layout for a vote among `total` seats (default: everyone counted). Seats not counted anywhere
 * (vacant, abstaining) sit with Undecided on the bar. The outcome is settled once For reaches the
 * majority, or once For can no longer reach it.
 */
export function voteLayout(count: VoteCount, total?: number): VoteLayout {
  const f = Math.max(0, count.for)
  const a = Math.max(0, count.against)
  const counted = f + a + Math.max(0, count.undecided)
  const seats = Math.max(total ?? counted, counted, 1)
  const majority = majorityOf(seats)
  const outcome: VoteOutcome = f >= majority ? 'passes' : seats - a < majority ? 'fails' : 'open'
  return {
    majority,
    majorityAt: majority / seats,
    shares: { for: f / seats, against: a / seats, undecided: (seats - f - a) / seats },
    outcome,
  }
}
