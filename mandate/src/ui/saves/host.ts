/**
 * The published Artifact's viewer (claude.ai) blocks ordinary `<a download>` links; a page offers
 * files through its `downloads` capability instead (runtime contract 0.2.66, declared at publish).
 * The viewer shows a confirmation and only accepts listed extensions — `.json` yes, `.mandate` no.
 */

/** The slice of the viewer's `downloads` namespace the game uses. */
export interface HostDownloads {
  save(request: { filename: string; data: string }): Promise<{ status: 'saved' | 'delivered' }>
}

interface ClaudeHost {
  use(name: 'downloads'): Promise<HostDownloads | null>
}

let pending: Promise<HostDownloads | null> | undefined
/** `undefined` until the viewer has answered. */
let answered: HostDownloads | null | undefined

/**
 * The viewer's downloads capability, or `null` in a normal browser tab (no `window.claude`) or a
 * view that can't offer it. Asked once; call early so the answer is in before the Saves screen.
 */
export function hostDownloads(): Promise<HostDownloads | null> {
  if (!pending) {
    const host = (globalThis as { claude?: Partial<ClaudeHost> }).claude
    pending = (
      typeof host?.use === 'function' ? host.use('downloads') : Promise.resolve(null)
    ).then(
      (downloads) => (answered = downloads ?? null),
      () => (answered = null),
    )
  }
  return pending
}

/** The answer so far without waiting: `undefined` while the viewer hasn't replied. */
export function hostDownloadsNow(): HostDownloads | null | undefined {
  return answered
}

/** Why a viewer save failed (`declined`, `rate_limited`, …), if the rejection says. */
export function hostErrorCode(error: unknown): string | undefined {
  const code = (error as { code?: unknown } | null)?.code
  return typeof code === 'string' ? code : undefined
}

/** Test hook: forget the cached answer. */
export function resetHostDownloads(): void {
  pending = undefined
  answered = undefined
}
