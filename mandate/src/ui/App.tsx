import { GAME_VERSION } from '../sim/version.ts'

/** Placeholder title screen until the app shell lands (T4). */
export function App() {
  return (
    <main className="title-screen">
      <p className="eyebrow">A political life simulation</p>
      <h1>Mandate</h1>
      <p className="tagline">Start as nobody. End at Number 10 — or somewhere else entirely.</p>
      <p className="build">Build {GAME_VERSION} · foundations in progress</p>
    </main>
  )
}
