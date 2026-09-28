# Progress — Mandate

**Branch:** `claude/magical-cori-1sjt0r` (push here; start new sessions on this branch)
**Current milestone:** M0 — Foundations
**Next session:** start at **T2**
**Last playable link:** none yet

## Workflow for the user
Say "continue" (or "do T7"). Claude does one task, pushes, updates this file. Then `/clear`.

## M0 — Foundations
- [x] T0 Handoff files: `CLAUDE.md`, `PROGRESS.md`, `docs/DESIGN.md`
- [x] T1 Scaffold `mandate/` (Vite, React 19, TS strict, ESLint, Prettier, Vitest, npm scripts); gates pass
- [ ] T2 Engine core: sfc32 RNG, clock (1 tick = 1 day), scheduler (daily/weekly/monthly/yearly), event bus,
      normalised state + types, save/load (versioned + migrations), `npm run soak`; tests
- [ ] T3 Worker bridge (commands in, summary out, detail queries) + main-thread fallback; Zustand store;
      speed controls (space, 1–5), auto-pause hooks
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

## Known issues / open questions
- GE2024 constituency results: parliament.uk blocked from cloud env. Try fallbacks in DESIGN §Data; may need user to upload CSV.
- Current office-holders and polls must be web-verified at T12 (knowledge may be stale).
