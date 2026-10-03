/**
 * Structural sharing for query results (pure): returns `next`, but with every subtree that is
 * deep-equal to the matching part of `prev` replaced by `prev`'s object. Memoised components then
 * skip re-rendering the parts of a refreshed view that did not change.
 */
export function share<T>(prev: unknown, next: T): T {
  if (prev === next) return next
  if (typeof prev !== 'object' || typeof next !== 'object' || prev === null || next === null) {
    return next
  }
  if (Array.isArray(prev) !== Array.isArray(next)) return next
  const p = prev as Record<string, unknown>
  const n = next as Record<string, unknown>
  const keys = Object.keys(n)
  let same = Object.keys(p).length === keys.length
  const out: Record<string, unknown> = Array.isArray(next)
    ? ([] as unknown as Record<string, unknown>)
    : {}
  for (const key of keys) {
    const value = share(p[key], n[key])
    out[key] = value
    if (value !== p[key]) same = false
  }
  return (same ? prev : out) as T
}
