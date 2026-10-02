/** Seat names on the real UK map: which fit at the current zoom. Pure. */
import type { SeatLabel } from './data.ts'

export const SEAT_LABEL_PX = 11
/** Rough width of a seat-name character at `SEAT_LABEL_PX`. */
const SEAT_CHAR_PX = 5.6

/**
 * Seats whose name fits round their label point at `pxPerUnit` (map units → pixels), so names
 * appear as you zoom in (Paradox). `room` is the distance to the nearest edge; seats are rarely
 * round, so a name may run a little past that circle.
 */
export function seatLabelsThatFit(
  labels: readonly SeatLabel[],
  nameOf: (id: string) => string,
  pxPerUnit: number,
): SeatLabel[] {
  return labels.filter((l) => {
    const room = l.room * pxPerUnit
    return 2 * room >= SEAT_LABEL_PX * 1.4 && nameOf(l.id).length * SEAT_CHAR_PX <= 3 * room
  })
}
