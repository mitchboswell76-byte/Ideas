# Progress — Mandate

**Branch:** `claude/magical-cori-1sjt0r` (push here; start new sessions on this branch)
**Current milestone:** M0 — Foundations
**Next session:** start at **T3**
**Last playable link:** none yet

## Workflow for the user
Say "continue" (or "do T7"). Claude does one task, pushes, updates this file. Then `/clear`.

## M0 — Foundations
- [x] T0 Handoff files: `CLAUDE.md`, `PROGRESS.md`, `docs/DESIGN.md`
- [x] T1 Scaffold `mandate/` (Vite 8, React 19, TS 6 strict, oxlint, Prettier, Vitest 5, npm scripts); gates pass
- [x] T2 Engine core: sfc32 RNG, clock (1 tick = 1 day), scheduler (daily/weekly/monthly/yearly), event bus,
      normalised state + types, save/load (versioned + migrations), `npm run soak`; tests
- [ ] T3 Worker bridge (commands in, summary out, detail queries) + main-thread fallback; Zustand store;
      speed controls (space, 1–5), auto-pause hooks; IndexedDB save slots + `.mandate` export/import
      (wraps `encodeSave`/`decodeSave` from `src/sim/save.ts`)
- [ ] T4 Visual theme + app shell: tokens (dark/light), fonts (@fontsource), glass panels, top bar,
      map tabs, right panel tabs, news ticker, toasts, portrait frame component
- [ ] T5 Data pipeline `scripts/build-data.ts`: hexjson (650 seats), world-atlas 110m, GE2024 results
      (fallback chain in DESIGN §Data), `docs/DATA_SOURCES.md`
- [ ] T6 3D globe (r3f): countries on sphere, hover/click, atmosphere, terminator, arcs; graphics presets
      + GPU auto-detect; 2D SVG fallback; country info card
- [ ] T7 3D UK hex map: 650 instanced columns, orbit, click → constituency card; 2D fallback; globe→UK zoom
- [ ] T8 Playwright smoke + perf (4× CPU throttle, ≥30 fps Low, WebGL-off fallback); publish M0 Artifact;
      ask user about PR into `main`

## M1 — Nobody to Prime Minister (party route)
- [ ] T9  Character model: attributes, skills, traits, ideology, health/stress/energy, relationships; SVG portrait system (layers + ageing)
- [ ] T10 Character creation UI: birthplace (globe / hex map), family background, portrait editor, traits, ideology quiz, start mode
- [ ] T11 Event engine (data-driven) + life mode: yearly age-up backstory, ~60 childhood/youth cards
- [ ] T12 Seed data: parties, leaders & key figures (web-verify, `asOf`), outlets, polling baseline, donor archetypes
- [ ] T13 Opinion model (blocs × nations, salience, utility deltas) + pollsters with house effects + poll charts
- [ ] T14 Election engine: FPTP, D'Hondt, STV, AV, AMS + swing projection; test reproduces 2024 seat totals
- [ ] T15 Activities system + energy; ladder stages: join party, branch work, May council elections, approved list
- [ ] T16 Money: ledgers, jobs, small/major donors, fundraising, ads, spending limits, compliance, heat, investigations
- [ ] T17 Media: fame/reputation, press releases, interviews, social posts, scandals, ticker stories
- [ ] T18 Selection contests + GE campaign + election night screen (3D columns rise)
- [ ] T19 MP life: whips, rebellions, promotions; 3D Commons chamber
- [ ] T20 Leadership contests (per-party rules), becoming PM, hung parliament talks, placeholder governance
- [ ] T21 NPC AI (rivals, leaders, donors) + ~40 political events
- [ ] T22 Balance pass, soak, Playwright end-to-end, publish M1 Artifact

## Later milestones (plan each in detail when reached — see DESIGN §Roadmap)
M2 activism/movement, espionage, courts, business route · M3 governing + full UK economy ·
M4 world diplomacy/economies · M5 coup, insurgency, war · M6 US + other countries, modding, tutorial

## Decisions log
- 2026-09-28 Browser (TS/React) over Godot: runs safely on user's Dell Latitude, no install, publishable link.
- 2026-09-28 UK deep / world light first; real politicians in editable data with `asOf`.
- 2026-09-28 Real-time with pause (1 tick = 1 day, systems on cadences) — user's choice.
- 2026-09-28 Dark "situation room" look (user referenced Stellaris) + light theme; 3D globe, hex map, Commons.
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

## Known issues / open questions
- GE2024 constituency results: parliament.uk blocked from cloud env. Try fallbacks in DESIGN §Data; may need user to upload CSV.
- Current office-holders and polls must be web-verified at T12 (knowledge may be stale).
