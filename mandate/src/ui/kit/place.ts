/** Where a floating panel (tooltip) goes next to its anchor, kept on screen. Pure. */

export interface Box {
  left: number
  top: number
  width: number
  height: number
}

export interface Placement {
  left: number
  top: number
  side: 'below' | 'above' | 'right' | 'left'
}

/** Below the anchor if it fits, else above if that fits, else whichever side has more room. */
export function placeFloating(
  anchor: Box,
  size: { width: number; height: number },
  viewport: { width: number; height: number },
  gap = 6,
  margin = 8,
): Placement {
  const below = anchor.top + anchor.height + gap
  const above = anchor.top - gap - size.height
  const roomBelow = viewport.height - margin - below
  const roomAbove = anchor.top - gap - margin
  const side =
    size.height <= roomBelow
      ? 'below'
      : size.height <= roomAbove
        ? 'above'
        : roomBelow >= roomAbove
          ? 'below'
          : 'above'
  const maxLeft = viewport.width - margin - size.width
  const left = Math.max(margin, Math.min(anchor.left, maxLeft))
  const top = side === 'below' ? below : Math.max(margin, above)
  return { left, top, side }
}

/**
 * A nested panel goes beside its parent panel (CK3), level with its anchor, so it never covers
 * the parent's text: right if it fits, else left, else next to the anchor as usual.
 */
export function placeBeside(
  anchor: Box,
  parent: Box,
  size: { width: number; height: number },
  viewport: { width: number; height: number },
  gap = 6,
  margin = 8,
): Placement {
  const right = parent.left + parent.width + gap
  const left = parent.left - gap - size.width
  const side =
    right + size.width <= viewport.width - margin ? 'right' : left >= margin ? 'left' : null
  if (!side) return placeFloating(anchor, size, viewport, gap, margin)
  const maxTop = viewport.height - margin - size.height
  const top = Math.max(margin, Math.min(anchor.top - 8, maxTop))
  return { left: side === 'right' ? right : left, top, side }
}
