import { WarningIcon } from '../kit/icons.ts'
import { Button } from '../kit/index.ts'
import { gameStore, useGame } from '../store/index.ts'

/** A crashed simulation or a failed action, above the current screen. */
export function Problems() {
  const fatal = useGame((s) => s.fatal)
  const lastError = useGame((s) => s.lastError)
  if (!fatal && !lastError) return null
  return (
    <div className="problems" role="alert">
      {fatal && (
        <p className="problem">
          <WarningIcon className="problem__icon" weight="fill" aria-hidden />
          <span>The simulation stopped: {fatal}. Load a save to carry on.</span>
        </p>
      )}
      {lastError && (
        <p className="problem">
          <WarningIcon className="problem__icon" weight="fill" aria-hidden />
          <span>{lastError}</span>
          <Button size="s" variant="quiet" onClick={() => gameStore.getState().dismissError()}>
            Dismiss
          </Button>
        </p>
      )}
    </div>
  )
}
