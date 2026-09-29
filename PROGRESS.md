# Progress — Mandate

**Branch:** `claude/magical-cori-1sjt0r` (push here; start new sessions on this branch)
**Current milestone:** M0 — Foundations
**Next session:** start at **T4**
**Last playable link:** none yet

## Workflow for the user
Say "continue" (or "do T7"). Claude does one task, pushes, updates this file. Then `/clear`.

## M0 — Foundations
- [x] T0 Handoff files: `CLAUDE.md`, `PROGRESS.md`, `docs/DESIGN.md`
- [x] T1 Scaffold `mandate/` (Vite 8, React 19, TS 6 strict, oxlint, Prettier, Vitest 5, npm scripts); gates pass
- [x] T2 Engine core: sfc32 RNG, clock (1 tick = 1 day), scheduler (daily/weekly/monthly/yearly), event bus,
      normalised state + types, save/load (versioned + migrations), `npm run soak`; tests
- [x] T3 Worker bridge (commands in, summary out, detail queries) + main-thread fallback; Zustand store;
      speed controls (space, 1–5), auto-pause hooks; IndexedDB save slots + `.mandate` export/import
      (wraps `encodeSave`/`decodeSave` from `src/sim/save.ts`)
- [ ] T4 "Ballot & Block" UI kit + app shell (DESIGN §17): tokens Night/Paper (`data-theme`), fonts (vendor
      Departure Mono woff2 + OFL.txt from GitHub raw; `@fontsource/newsreader`), bitmap font `src/ui/pixel/font.ts`,
      components (Panel, BallotOption, Rosette, Stamp, Ticker, FrontPage, PixelIcon, Meter), top-left brand block,
      top bar clock/speed, save/load menu (slots, export/import), settings (auto-pause, theme), autosave to the
      reserved `auto` slot (e.g. monthly, via `gameStore.saveTo(AUTOSAVE_SLOT, …)`). Replace the T3 placeholder
      controls in `App.tsx` (keep `data-testid`s `game-date`, `sim-mode`, `slot-list`, `import-input`).
      Playwright screenshots (Night, Paper); publish a style-preview Artifact.
- [ ] T4b Title screen + voxel core: pixel wordmark (flicker, drifting squares), bitmap-font→voxel builder,
      three.js/r3f lazy chunk, low-res nearest-upscale render pipeline, graphics presets + GPU detect,
      View 3D ⇄ 2D toggle (2D default if no WebGL / reduced motion / < 900 px), fly-into-wordmark transition;
      publish preview
- [ ] T5 Data pipeline `scripts/build-data.ts`: hexjson (650 seats), world-atlas 110m, GE2024 results
      (fallback chain in DESIGN §Data), `docs/DATA_SOURCES.md`
- [ ] T6 Voxel world map: Natural Earth rasterised to a voxel grid (greedy-meshed), column height = metric,
      hover/click → country card (ephemera), fixed iso camera pan/zoom; 2D SVG equivalent
- [ ] T7 Voxel UK hex map: 650 hex columns of stacked party-coloured voxel layers (grey = undecided, flicker on
      change), click → constituency card; 2D SVG hex map; world→UK camera move
- [ ] T8 Playwright smoke + perf (4× CPU throttle, ≥30 fps Low / 60 Medium, <150 draw calls, 2D mode); publish M0 Artifact;
      ask user about PR into `main`

## M1 — Nobody to Prime Minister (party route)
- [ ] T9  Character model: attributes, skills, traits, ideology, health/stress/energy, relationships; 3D voxel avatar
      generator (swappable parts, expressions, ageing, role outfits) + cached `Portrait` renders + 2D projection fallback
- [ ] T10 Character creation UI (ballot-paper style): birthplace (world / UK map), family background, 3D avatar creator
      (turntable, all parts, randomise, presets), personal colour, traits, ideology quiz, start mode
- [ ] T11 Event engine (data-driven) + life mode as voxel "road movie" (chapter beams, birthplace scenes), ~60 childhood/youth cards; 2D document equivalent
- [ ] T12 Seed data: parties, leaders & key figures (web-verify, `asOf`), outlets, polling baseline, donor archetypes
- [ ] T13 Opinion model (blocs × nations, salience, utility deltas) + pollsters with house effects + poll charts
- [ ] T14 Election engine: FPTP, D'Hondt, STV, AV, AMS + swing projection; test reproduces 2024 seat totals
- [ ] T15 Activities system + energy; ladder stages: join party, branch work, May council elections, approved list
- [ ] T16 Money: ledgers, jobs, small/major donors, fundraising, ads, spending limits, compliance, heat, investigations
- [ ] T17 Media: fame/reputation, press releases, interviews, social posts, scandals, ticker stories
- [ ] T18 Selection contests + GE campaign + election night (diorama recolours seat by seat, FrontPage results)
- [ ] T19 MP life: whips, rebellions, promotions; voxel Commons chamber (650 voxel MPs, animated divisions)
- [ ] T20 Leadership contests (per-party rules), becoming PM, hung parliament talks, placeholder governance
- [ ] T21 NPC AI (rivals, leaders, donors) + ~40 political events
- [ ] T22 Balance pass, soak, Playwright end-to-end, optional procedural audio (Web Audio), publish M1 Artifact

## Later milestones (plan each in detail when reached — see DESIGN §Roadmap)
M2 activism/movement, espionage, courts, business route · M3 governing + full UK economy ·
M4 world diplomacy/economies · M5 coup, insurgency, war · M6 US + other countries, modding, tutorial

## Decisions log
- 2026-09-28 Browser (TS/React) over Godot: runs safely on user's Dell Latitude, no install, publishable link.
- 2026-09-28 UK deep / world light first; real politicians in editable data with `asOf`.
- 2026-09-28 Real-time with pause (1 tick = 1 day, systems on cadences) — user's choice.
- 2026-09-28 ~~Dark "situation room" look~~ — superseded 2026-09-29, see below.
- 2026-09-28 Life mode = playable backstory: born (startDate − startAge), childhood years as cards, real-time politics begins at game start date (keeps real politicians current).
- 2026-09-28 React 19 (not 18) because @react-three/fiber v9 requires it.
- 2026-09-28 oxlint (Vite template default, much faster) instead of ESLint; `lint` = oxlint --deny-warnings + prettier --check.
- 2026-09-28 Vite `base: './'` so the build runs from any path (Artifact hosting).
- 2026-09-28 Tests live in `mandate/tests/`, type-checked via `tsconfig.tools.json` (with `scripts/`).
- 2026-09-29 T2 engine map (`src/sim/`): `rng.ts` sfc32 (state lives in `world.rngState`, mutated in place),
  `clock.ts` integer day numbers since 1970-01-01 (no `Date`), `bus.ts` typed sync pub/sub (`SimEventMap`),
  `world.ts` tables + placeholder entity types + `createWorld`/`newId`, `scheduler.ts` `System`/`Cadence`/
  `Notification`, `command.ts`, `engine.ts`, `save.ts`, `systems/index.ts` (`defaultSystems`, run order).
- 2026-09-29 A tick = advance to next day → apply queued commands → bus day/week/month/year events → due systems
  in registration order. Summary date = the day just simulated.
- 2026-09-29 Systems are `{id, cadence?, run?, on?, commands?}`: one object owns its schedule, bus listeners and
  command handlers (`defineCommand<C>()` for typed payloads). Unknown command → `alert` notification.
- 2026-09-29 Weekly = Monday, monthly = 1st, yearly = 1 Jan; date-specific yearly things (birthdays, May
  elections) are daily systems with their own check (`isAnniversary`, `nthWeekdayOfMonth`). 29 Feb birthdays → 1 Mar.
- 2026-09-29 `migrations[v]` upgrades v → v+1; `migrate()` sets `version`. Sim never reads the wall clock:
  caller passes `savedAt`. IndexedDB + export/import moved to T3 (browser-side).
- 2026-09-29 `setSpeed` is a runner concern (T3), not a sim command. Notifications carry `pause?: PauseReason`
  for the configurable auto-pause.
- 2026-09-29 Soak: 50 years = 18,263 ticks in ~20 ms with no systems; p99 budget 4 ms; checks NaN/Infinity and
  that save-at-halfway + reload ends in the same world hash as an uninterrupted run.

- 2026-09-29 T3 runtime map: `src/runtime/` (not sim — may use timers) = `protocol.ts` (messages, `TICK_MS`,
  auto-pause types), `queries.ts` (query registry), `runner.ts` (`SimRunner` + `RunnerHost` so tests use a manual
  clock), `sim.worker.ts`, `bridge.ts` (`createSimBridge`). UI: `ui/store/game.ts` (`createGameStore`, vanilla
  Zustand, deps injected), `ui/store/index.ts` (singleton `gameStore`, `useGame`), `ui/saves/slots.ts` (idb),
  `ui/saves/file.ts`, `ui/keys.ts` + `ui/hooks/useSpeedKeys.ts`.
- 2026-09-29 Runner is authoritative for speed/pause (auto-pause happens there); the store mirrors `status`.
  Requests (`newGame`/`save`/`load`/`query`) share one `request {id}` → `result {id, ok}` envelope.
  Runner holds no game until `newGame`/`load`; loading or a new game always leaves the clock paused.
- 2026-09-29 Speed 5 = 16 ms/tick (one per frame), running back-to-back if ticks get slower; DESIGN §2 said both
  "uncapped" and "next frame" — this satisfies both without letting decades fly past in a second.
- 2026-09-29 Save bytes are encoded in the runner (worker) and transferred, so the World is never cloned to the UI.
  `.mandate` import is validated by the runner's `decodeSave`; a bad file leaves the current game untouched.
- 2026-09-29 Auto-pause settings in localStorage (try/catch; not Zustand `persist`, which warns without storage).
- 2026-09-29 Placeholder control panel in `App.tsx` until T4; `main.tsx` boots a random-seed game until T10.
- 2026-09-29 Browser-verified (scratchpad Playwright script, not committed) in worker and forced main-thread
  modes: speeds, Space, save/reload/load, export/import, bad import error.

- 2026-09-29 Art direction → "Ballot & Block" (DESIGN §17). User rejected generic-AI look and cited y-n10.com's voxel
  "road movie". Adapted, not copied: voxel diorama + colour-means-allegiance + British political-ephemera UI;
  Departure Mono + Newsreader + original bitmap font; flat voxel world map replaces globe (on-style, cheaper,
  whole world visible); pixel portraits replace SVG; 1-bit dither only for intel screens; 2D mode first-class;
  Framer Motion dropped (CSS steps). New task T4b (title screen + voxel core).

- 2026-09-29 Characters are customisable 3D voxel avatars (user request), superseding 2D pixel portraits. UI portraits
  are cached renders of the avatar bust (no live canvas per panel); 2D mode uses a front projection of the voxels.

## Known issues / open questions
- GE2024 constituency results: parliament.uk blocked from cloud env. Try fallbacks in DESIGN §Data; may need user to upload CSV.
- Current office-holders and polls must be web-verified at T12 (knowledge may be stale).
