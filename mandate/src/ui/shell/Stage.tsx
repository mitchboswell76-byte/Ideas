import { formatShortDate } from '../format.ts'
import { Button, FrontPage, Panel, Stamp } from '../kit/index.ts'
import { gameStore, useGame } from '../store/index.ts'

function Problems() {
  const fatal = useGame((s) => s.fatal)
  const lastError = useGame((s) => s.lastError)
  if (!fatal && !lastError) return null
  return (
    <div className="problems" role="alert">
      {fatal && (
        <Panel raised className="problem">
          <Stamp tone="danger">Stopped</Stamp>
          <p className="serif">The simulation stopped: {fatal}. Load a save to carry on.</p>
        </Panel>
      )}
      {lastError && (
        <Panel raised className="problem">
          <Stamp tone="danger" rotate={3}>
            Rejected
          </Stamp>
          <p className="serif">{lastError}</p>
          <Button onClick={() => gameStore.getState().dismissError()}>Dismiss</Button>
        </Panel>
      )}
    </div>
  )
}

function Notices() {
  const log = useGame((s) => s.log)
  return (
    <Panel title="Notices" className="notices">
      {log.length === 0 ? (
        <p className="notices__empty serif">
          Nothing yet. Word from your party, your rivals and the press will land here.
        </p>
      ) : (
        <ol className="notices__list">
          {log.slice(0, 12).map((n, i) => (
            <li key={`${n.date}-${i}`}>
              <span className="notices__date">{formatShortDate(n.date)}</span>
              <span className="serif">{n.text}</span>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  )
}

/** The centre of the screen. The voxel diorama replaces the front page from T4b/T6. */
export function Stage() {
  const date = useGame((s) => s.date)
  return (
    <main className="stage dot-grid">
      <Problems />
      <div className="stage__layout">
        <FrontPage
          className="stage__paper"
          masthead="The Daily Ledger"
          edition="No. 1"
          price="£1.20"
          date={date}
          kicker="First edition"
          headline="A nobody from nowhere"
          standfirst="Somewhere in Britain, a political career is about to begin. Nobody has noticed yet."
        >
          <p>
            Every Prime Minister started out as someone no one had heard of. Most people who start
            out that way stay there. The difference is made in branch meetings, on doorsteps and in
            the small hours of election night.
          </p>
          <p>
            The clock is running. Pause it with the space bar, speed it up with the number keys, and
            keep a save before anything you might regret.
          </p>
        </FrontPage>
        <Notices />
      </div>
    </main>
  )
}
