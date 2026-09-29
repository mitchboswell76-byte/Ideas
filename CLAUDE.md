# Mandate — political rise-to-power sim (working title)

Browser grand-strategy/life sim: start as nobody in the UK, rise to PM via party politics
(later: activism, coup, insurgency, world diplomacy, war). "BitLife meets Stellaris, but deeper."

## Session protocol (token economy — the user clears chat after every task)
1. Read `PROGRESS.md` first. Do the task it names as next (or the one the user names). One task per session.
2. Read only the `docs/DESIGN.md` sections the task needs (grep headings; don't read it all).
3. Before finishing: run the quality gates, update `PROGRESS.md` (tick task, log decisions,
   set "Next session"), commit, push to the branch in `PROGRESS.md`. Keep replies short.

## Layout
- `mandate/` — the game (Vite + React 19 + TypeScript strict)
  - `src/sim/` pure TS engine: no DOM, deterministic (seeded RNG), runs in a Web Worker or Node
  - `src/runtime/` sim runner (speed, auto-pause, save/load), Web Worker entry, main-thread bridge; timers OK, no DOM
  - `src/ui/` React UI, Zustand store (`ui/store`), IndexedDB saves (`ui/saves`), 3D via @react-three/fiber
  - `src/data/` bundled JSON data
  - `scripts/` data build + soak test; `tests/` Vitest
- `docs/DESIGN.md` full design of every system; `docs/DATA_SOURCES.md` licences + `asOf` dates

## Commands (run inside `mandate/`)
`npm run dev` · `npm run build` · `npm test` · `npm run lint` · `npm run typecheck` · `npm run soak`
Quality gate before every commit: `npm run typecheck && npm run lint && npm test && npm run build`

## Rules
- Sim code never imports from `src/ui/` or touches DOM/`Math.random` — use `ctx.rng`.
- Content is data-driven (events, parties, politicians, actions) — add data, not special cases.
- UK English in all player-facing text. Money in £.
- Real politicians: no invented crimes/scandals; procedural scandals only hit the player or fictional NPCs.
- Coup/insurgency stay abstract (numbers, risk, backlash) — no real-world tactics, no real extremist groups.
- Look = "Ballot & Block" (DESIGN §17): voxel diorama, colour means allegiance, UI as political ephemera.
  Never: glass/blur, gradients, glows, soft shadows, rounded cards, emoji icons, Inter, purple/blue tech palettes.
- Laptop target (Dell Latitude, Intel integrated GPU): 3D renders on demand at reduced internal resolution,
  Low preset + first-class 2D mode.
- Network is restricted in cloud sessions: npm + raw.githubusercontent.com work; gov.uk/parliament/ONS/Wikipedia don't.
