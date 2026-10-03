# Progress — Mandate

**Branch:** `claude/magical-cori-1sjt0r` (push here; start new sessions on this branch)
**Current milestone:** M1 — Nobody to Prime Minister (M0 follow-ups T8b, T8c done). M0 was merged into
  `main` via PR https://github.com/mitchboswell76-byte/Ideas/pull/1; the branch was fast-forwarded to `main` after it.
**Next session:** start at **T11**
**Last playable link (T9):** https://claude.ai/artifact/Nc1przbgbhKETpcBmrAMNz (private; rebuild with
  `npm run build:preview`, publish with `url` set to this link; it declares the `downloads` capability)
**UI kit (T9):** https://claude.ai/artifact/33BFAWxwjLHcHyS8ViY99h (private; `npm run build:kit` → `dist-kit/mandate-kit.html`)

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
- [x] T4 "Ballot & Block" UI kit + app shell (DESIGN §17): tokens Night/Paper (`data-theme`), fonts (vendor
      Departure Mono woff2 + OFL.txt from GitHub raw; `@fontsource/newsreader`), bitmap font `src/ui/pixel/font.ts`,
      components (Panel, BallotOption, Rosette, Stamp, Ticker, FrontPage, PixelIcon, Meter), top-left brand block,
      top bar clock/speed, save/load menu (slots, export/import), settings (auto-pause, theme), autosave to the
      reserved `auto` slot (e.g. monthly, via `gameStore.saveTo(AUTOSAVE_SLOT, …)`). Replace the T3 placeholder
      controls in `App.tsx` (keep `data-testid`s `game-date`, `sim-mode`, `slot-list`, `import-input`).
      Playwright screenshots (Night, Paper); publish a style-preview Artifact.
- [x] T4b Title screen + voxel core: pixel wordmark (flicker, drifting squares), bitmap-font→voxel builder,
      three.js/r3f lazy chunk, low-res nearest-upscale render pipeline, graphics presets + GPU detect,
      View 3D ⇄ 2D toggle (2D default if no WebGL / reduced motion / < 900 px), fly-into-wordmark transition;
      publish preview
- [x] T4c Reference-stack UI kit + shell + main menu (DESIGN §17 table): Barlow / Barlow Condensed (@fontsource) +
      Newsreader; Phosphor icons (MIT); dark/light tokens; header tinted with party colour (placeholder until T12).
      Components: Sidebar (FM, badges), TopBar with Paradox date/speed pips + pause banner, Tile→Card (FM26, opens in
      place), Table (FM), AttributeGrid (FM 1–20 colours), Chip, Tabs, nested Tooltip (CK3), EventWindow (CK3),
      Dialogue (Suzerain), VoteBar (Frostpunk 2), PortraitFrame (placeholder silhouette until T9), Button set.
      Screens: Home tiles, Inbox (fed by sim notifications), Calendar (month grid), Saves, Settings. Main menu =
      Paradox/FM left-column menu (New career / Continue / Load / Settings). Remove `ui/voxel`, Monument, voxel title,
      Squares, pixel font + Departure Mono and their tests; keep `ui/three` infra, `ui/graphics`, view store (hide the
      3D/2D toggle until a 3D view exists). Keep `data-testid`s used by tests. Rebuild kit gallery; Playwright
      screenshots (dark, light, narrow); republish both preview links.
- [x] T5 Data pipeline `scripts/build-data.ts` (`npm run data`): hexjson (650 seats), world-atlas 110m, GE2024
      results + census (GB mirror; NI winners hand-entered), `docs/DATA_SOURCES.md`, Settings data credits
- [x] T6 World map (Paradox map modes + Plague Inc ticker): flat clean map of Natural Earth countries, map-mode switcher,
      hover/click → country card, pan/zoom; canvas/SVG, optional subtle 3D tilt (skipped, see decisions)
- [x] T7 UK constituency map: 650-seat hex map with map modes (Party, Majority, Turnout, Demographics; Swing
      disabled until T13), click → constituency card; slowly panning map as the main-menu backdrop (3D seat columns
      moved to T18)
- [x] T8 Playwright smoke + perf (4× CPU throttle, ≥30 fps Low / 60 Medium in 3D views, 2D mode); publish M0 Artifact.
      Export in the published build (decided 2026-09-30): Export uses the Artifact `downloads` capability (load
      `artifact-capabilities` first) and saves plain JSON `mandate-<name>-<date>.json`; Import accepts `.mandate` and
      `.json`; normal browser tabs keep `.mandate`. First check whether `downloads` really refuses `.mandate`; if it
      allows it, keep one format. Then create `main` at `3c573a3` (handoff files only), push it, and open a PR of
      `claude/magical-cori-1sjt0r` → `main` for M0 (decided 2026-09-30)

  Done: `npm run e2e` (16 tests: smoke, Artifact export, perf); `.mandate` refused (checked in the contract
  types), so the Artifact build exports `.json`; M0 republished; `main` created and PR opened.
- [x] T8b UK map on real boundaries (user, 2026-10-02: "I don't like the hexagon design, it's not clear enough"):
      2024 constituency boundaries (ONS via Open Innovations geography-bits, OGL) projected at build time; Map / Hexes
      switch (remembered); seat names appear as you zoom; "Zoom to" 10 cities; menu backdrop on real shapes
- [x] T8c UI restyle (user, 2026-10-02: "simple but beautiful; must not look AI-made; copy popular, acclaimed games
      and sites: fonts, spacing, design"). Research summary and choices in the decisions log (2026-10-02). Work:
      1. Tokens + type: Inter Variable (OFL, `@fontsource-variable/inter`; Inter Display cut via `opsz` for
         headings) replaces Barlow / Barlow Condensed; 13 px UI, 14 px body, tabular figures in tables; sentence case
         everywhere (no condensed all-caps labels); 4 px spacing grid; 1 px hairlines; surfaces as evenly stepped
         greys (Linear's LCH approach: bg < panel < raised < overlay), both themes; still no accent hue (selection
         and focus use `--text`; party colours only mean parties). Newsreader stays for news, letters, event text.
      2. Shell (Linear): compact sidebar (13 px items, 16 px icons, muted group labels, count badges), slim 44 px
         header (screen title + breadcrumb, party colour as a thin stripe, not a grey slab), compact date/speed.
      3. Home: lists instead of four tiles (Inbox preview, Upcoming, You, Game), since FM26's tile hub is the part
         reviewers called cluttered.
      4. Ctrl/⌘K command menu (Linear/Raycast): go to any screen, save, load, speed, theme.
      5. Restyle kit pieces into the new tokens (CK3 event window and tooltips, Suzerain dialogue, FP2 vote bar,
         tables, cards, map legend/tooltips); main menu (wordmark, menu list) to match.
      6. Kit gallery, Playwright screenshots (dark, light, 390 px), `npm run e2e`, republish kit + game.
      Avoid the "AI look": no gradients, glass, glows or blur; no default indigo/purple accent; no emoji; no big
      rounded cards with soft drop shadows; no centred hero text. Split into two sessions if large (1–2 + kit,
      then 3–6).

  Done in one session: tokens + type, shell, kit, Home lists, Ctrl+K command menu, main menu, map palettes, gallery.
  Typeface is Schibsted Grotesk, not Inter (see decisions); colour rules from the research below.

## M1 — Nobody to Prime Minister (party route)
- [x] T9  Character model: attributes, skills, traits, ideology, health/stress/energy, relationships; stylised 3D avatar
      generator (Sims / Two Point style: parametric head + body, hair/clothes parts, expression morphs, ageing, role
      outfits) + cached CK3-framed `Portrait` renders + illustrated 2D fallback

  Done: character model + system + starting cast (player, parents, maybe a sibling, friend, rival) in the sim; avatar
  generator (14 hairstyles, 6 facial hair, 4 glasses, 10 outfits, 5 accessories, 5 expressions, 4 poses, ageing);
  cached portraits + 2D illustration; Profile screen (sidebar, Ctrl+K) and the Home "You" panel; kit gallery
  Avatars section. 241 unit tests, 20 e2e (Profile at speed 5: 60 fps under a 4x throttle).
- [x] T10 Character creation (CK3 ruler designer + Sims Create-a-Sim layout): birthplace (world / UK map), family
      background, avatar creator (turntable, all parts, randomise, presets), personal colour, traits, ideology quiz,
      start mode

  Done: New career opens a 7-category creator (Identity, Origins, Family, Look, Abilities, Beliefs, Start) with a
  live turntable, UK/world pick maps, 6 preset faces, randomise per category and overall, 60-point attribute buy,
  3–5 traits, 14-statement beliefs quiz, 8 personal colours (applied as `--you`); the sim validates the
  `CharacterSpec` and builds the family around it. Life mode is shown but disabled until T11. 258 unit tests,
  22 e2e (creator flow + turntable perf).
- [ ] T11 Event engine (data-driven) + life mode as a BitLife age log (Age + button) with CK3 event windows,
      ~60 childhood/youth cards
- [ ] T12 Seed data: parties, leaders & key figures (web-verify, `asOf`), outlets, polling baseline, donor archetypes
- [ ] T13 Opinion model (blocs × nations, salience, utility deltas) + pollsters with house effects + poll charts
- [ ] T14 Election engine: FPTP, D'Hondt, STV, AV, AMS + swing projection; test reproduces 2024 seat totals
- [ ] T15 Activities system + energy; ladder stages: join party, branch work, May council elections, approved list
- [ ] T16 Money: ledgers, jobs, small/major donors, fundraising, ads, spending limits, compliance, heat, investigations
- [ ] T17 Media: fame/reputation, press releases, interviews, social posts, scandals, ticker stories
- [ ] T18 Selection contests + GE campaign + election night (3D seat columns on the hex map, from T7;
      broadcast-style: seat bar with majority line, swing
      gauge, declarations feed, map filling in)
- [ ] T19 MP life: whips, rebellions, promotions; Commons divisions with the Frostpunk 2-style vote bar + hemicycle
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

- 2026-09-29 ~~Art direction → "Ballot & Block"~~ — superseded later on 2026-09-29, see "reference stack" below.
  Original entry: Art direction → "Ballot & Block" (DESIGN §17). User rejected generic-AI look and cited y-n10.com's voxel
  "road movie". Adapted, not copied: voxel diorama + colour-means-allegiance + British political-ephemera UI;
  Departure Mono + Newsreader + original bitmap font; flat voxel world map replaces globe (on-style, cheaper,
  whole world visible); pixel portraits replace SVG; 1-bit dither only for intel screens; 2D mode first-class;
  Framer Motion dropped (CSS steps). New task T4b (title screen + voxel core).

- 2026-09-29 ~~Characters are customisable 3D voxel avatars~~ (voxel part superseded by stylised 3D; see below)
  (user request), superseding 2D pixel portraits. UI portraits
  are cached renders of the avatar bust (no live canvas per panel); 2D mode uses a front projection of the voxels.

- 2026-09-29 T4 UI map: `ui/styles/base.css` (fonts, tokens, base), `ui/kit/` (components + `kit.css`, barrel
  `index.ts`), `ui/pixel/font.ts` (5×7 glyphs, 7×7 icons, `textBitmap`/`inkRuns`/`bitmapPath` — pure, reuse for
  canvas/voxels), `ui/shell/` (TopBar, Stage, StatusBar, Sheet, SavesMenu, SettingsMenu), `ui/format.ts` (UK dates
  from the sim calendar, no Intl), `ui/store/theme.ts`. Stage shows a placeholder front page until T4b/T6.
- 2026-09-29 Tokens apply to any subtree via `[data-theme=night|paper]` (a paper document can sit on a night screen);
  derived tokens like `--lift` are redeclared on every theme root because `var()` resolves where declared.
- 2026-09-29 Type: Departure Mono 11/22/33 px for UI; Newsreader latin 400/400i/700 only, 17 px body.
- 2026-09-29 Autosave lives in the game store: on entering a new month/year of game time (setting Off / Every month
  (default) / Every year), at most once per 60 s real time. Ticks during a load/new game are ignored and the period
  re-baselined from the loaded date, so loading an old save never overwrites the autosave.
- 2026-09-29 Menus are native `<dialog>` side sheets (focus trap, Escape). Slot delete is two-step in-page (no
  `confirm()`); the `auto` slot can't be overwritten by hand.
- 2026-09-29 Style guide: `kit.html` (dev server only, not in the game build) + `npm run build:kit` → one self-contained
  `dist-kit/ballot-and-block.html` (fonts as data URIs, no doctype — the Artifact host wraps it). Reuse this approach
  for later previews; the game build itself needs a different route at T8 (worker file).
- 2026-09-29 Favicon replaced with the pixel monogram.

- 2026-09-29 T4b map: `ui/voxel/` (pure: `grid.ts` VoxelGrid + `fromBitmap`, `greedy.ts` `greedyMesh`, `instances.ts`
  `voxelCells`), `ui/graphics/` (`detect.ts` `probeGpu`/`presetForRenderer`/`defaultView`, `presets.ts`),
  `ui/store/view.ts` (view 3d/2d + quality, localStorage), `ui/three/` (lazy chunk: `WorldCanvas.tsx`, `Monument.tsx`,
  `camera.ts` constants + fly path, `geometry.ts`, `tokens.ts` CSS→scene colours, `useStepper.ts`), `ui/title/`
  (`TitleScreen`, 2D `Wordmark` canvas, `Squares`, `accents.ts`), `ui/shell/` (`Shell`, `WorldLayer` lazy + error
  boundary → 2D, `ViewToggle`), `ui/random.ts`, `hooks/useReducedMotion.ts`.
- 2026-09-29 App phases title → entering (fly) → game; leaving the title is triggered by a game appearing in the store
  (`date` null → set), so New life / Continue / Load all share one path. `gameStore.boot()` no longer starts a game.
- 2026-09-29 One persistent WebGL canvas behind the whole UI (`.world`, fixed, z 0; `.shell`/`.title` z 1); stage is
  transparent in 3D, dot-grid in 2D. Idle 3D redraws at 12 fps steps (`useStepper`), 60 fps only while flying.
- 2026-09-29 Title shot through a 10° lens so the voxel wordmark reads as flat pixels matching the 2D canvas (60vw);
  the lens widens to 30° during the 3.2 s fly (through the N–D gap, up round the back, down to iso). Fog is measured
  from the monument. Settled iso target is offset (-22, 3, 5) so the monument sits clear of the stage panels.
- 2026-09-29 Presets: Intel HD/UHD → Low, Iris/Xe → Medium, discrete/Apple M → High, software → Low; Auto drops a level
  (persisted) if a fly-in averages > 40 ms/frame. three.js needs WebGL 2 — without it 3D is disabled.
- 2026-09-29 `scripts/build-single.ts` (was build-kit) makes one-file Artifact builds: `build:kit` and `build:preview`;
  `VITE_SINGLE_FILE` makes the bridge skip the worker (main-thread runner), dynamic imports folded in.
- 2026-09-29 Voxel wordmark cubes are solid (1.0) with ±5% shade jitter per voxel instead of gaps (gaps shimmer at
  low resolution). "EST. 2026" ground lettering is hidden in the head-on title shot.

- 2026-09-29 **Art direction → copied reference stack** (DESIGN §17). User disliked "Ballot & Block" and asked for
  research + copying proven games at every level. Chose the hybrid: FM shell/inbox/calendar/tables (+ FM26 tile→card,
  minus its pop-up stacking), CK3 characters/nested tooltips/event windows, Suzerain dialogue, Democracy 4 policy web,
  Frostpunk 2 vote bar, Paradox map modes + Plague Inc ticker, BitLife age log, broadcast-style election night.
  Characters: stylised 3D (Sims / Two Point), chosen over CK3-style realism (MakeHuman CC0) and voxels. Fonts Barlow /
  Barlow Condensed / Newsreader; Phosphor icons. Copy patterns only: no artwork, logos, paid fonts or real-org
  branding (no GOV.UK/BBC look). T4/T4b look is replaced by T4c; engine, runtime, saves, graphics presets and the
  three.js layer carry over.

- 2026-09-30 T4c UI map: `ui/styles/base.css` (Barlow 400/600, Barlow Condensed 500/700, Newsreader; tokens), `ui/kit/`
  (one CSS file per group: `controls`, `tooltip`, `nav`, `cards`, `table`, `character`, `vote`, `ticker`; pure helpers
  `colour.ts` `readableInk`, `attributes.ts` `attributeBand`, `table.ts` `sortRows`, `vote.ts` `voteLayout`,
  `place.ts` `placeFloating`/`placeBeside`, `numbers.ts` `formatSigned`; `icons.ts` = the only Phosphor import point),
  `ui/shell/` (`Shell`, `GameSidebar`, `TopBar`, `StatusBar`, `Problems`, `party.ts`), `ui/screens/` (Home, Inbox,
  Calendar, Saves, Settings), `ui/menu/MainMenu.tsx`, `ui/store/nav.ts` (screen, open card, selected mail),
  `ui/calendar.ts`, `ui/mail.ts`, `hooks/useMediaQuery.ts` (`useNarrow`, < 900 px). Kit gallery: `kit/gallery/`.
- 2026-09-30 Themes renamed `dark`/`light` (old `night`/`paper` values migrate). Tokens are dark-first on `:root`.
  Selection and focus use `--text`, never a hue: party colours only mean parties; good/warn/bad are separate tokens.
- 2026-09-30 No party yet, so the header tint is a neutral "Independent" placeholder (`ui/shell/party.ts`) until
  T12/T15; `readableInk` picks the header text colour for any party colour.
- 2026-09-30 Sidebar shows every DESIGN item; ones without a screen are disabled with a "Not available yet" tooltip.
  Saves and Settings are screens (in game) and a right-hand pane (main menu); side-sheet dialogs are gone.
- 2026-09-30 Paused banner sits in the header next to the date (CK3), not over the stage, so it never covers panels.
- 2026-09-30 Tooltips: open after 300 ms, lock after 1 s (a bar fills), then the pointer can enter and hover `Term`s;
  nested tooltips open beside their parent (never over it); leaving the stack closes it; Esc closes all. Icon buttons
  use non-locking label tooltips.
- 2026-09-30 Inbox = the store's notification log (`LOG_LIMIT` 200) with `id` + `read`; sim `Notification` gained
  optional `from`/`subject`. A UI-side welcome mail (controls help) starts each new career, like FM's first mail.
- 2026-09-30 Calendar shows inbox items by date plus one placeholder fixture (May local elections, first Thursday)
  until elections live in the sim.
- 2026-09-30 No screen has a 3D view yet: `HAS_3D_VIEW = false` (`ui/store/view.ts`) hides the 3D/2D toggle and the
  graphics settings, and `WorldLayer` is not mounted, so three.js is not in the build at all for now. `WorldCanvas` is
  a generic host (`children` = scene). Flip the flag at T6/T7/T9; reattach the slow-frame downgrade then.
- 2026-09-30 Browser-verified (scratchpad Playwright, not committed): menu → new career, tile cards (one at a time,
  Esc), speed keys + banner, inbox read/unread badge, calendar month nav, save/export/import, theme switch, reload →
  Continue, 390 px (no sideways scroll), nested tooltips three deep; single-file builds load with no console errors.

- 2026-09-30 T5 map: `scripts/build-data.ts` + `scripts/data/` (`sources.ts` pinned URLs + SHA-256 + cache,
  `csv.ts`, `hexjson.ts`, `ge2024.ts` adapters `fromSummaries`/`fromHocCsv`/`fromManual`, `census.ts`, `world.ts`)
  → `src/data/generated/` (`uk-seats.json`, `ge2024.json`, `census2021.json`, `world-110m.json`, `countries.json`,
  committed). Typed access: `src/data/types.ts`, `uk.ts` (`UK_SEATS`, `GE2024`, `CENSUS`), `world.ts` (`COUNTRIES`,
  `WORLD_110M`), `credits.ts` (shown in Settings → Data). Nothing imports the data yet: import `uk.ts`/`world.ts`
  lazily at T6/T7 (~500 KB + ~110 KB JSON). Seats are keyed by ONS code; the sim will use `con_<ONS>`.
- 2026-09-30 GE2024 source chain (parliament.uk/Wikipedia blocked): official HoC CSV in `data-raw/` if present →
  University of Bristol GB file on GitHub (632 seats, HoC figures) → NI winners hand-entered and `verified: false`
  (user's choice). Independents'/Speaker's votes are recovered from "other" via the majority. Only fields with a
  clear upstream licence are used (OPL results, OGL census); the file's 2019 notionals and referendum estimates are
  dropped because the compilation has no licence.
- 2026-09-30 Seat names come from the hexjson (keeps Welsh diacritics), overridden by the HoC CSV if supplied.
  World: ids added for Kosovo/N. Cyprus/Somaliland (`XKX`/`XNC`/`XSL`), Natural Earth abbreviations expanded.
- 2026-09-30 Node's `fetch` worked through the cloud proxy without `NODE_USE_ENV_PROXY`; the script's error message
  suggests it if a download fails elsewhere.

- 2026-09-30 T6 map: `scripts/data/worldmap.ts` (build-time projection: `PathWriter`, `largestRing`, `colourGraph`,
  `neighbourMap`, `projectWorld`), `scripts/data/world.ts` `countryFacts` → `countries.json` (index + blocs) and
  `world-map.json` (paths). Typed access: `src/data/world.ts` (`COUNTRIES`, `BLOCS`), `worldMap.ts` (`WORLD_MAP`),
  `worldTopology.ts` (`WORLD_110M`, unused by the game). UI: `ui/map/viewport.ts` (pure pan/zoom maths: view = zoom
  + centre point, so resizes keep the middle), `ui/map/MapView.tsx` (generic SVG pan/zoom host for T7 too),
  `ui/map/map.css` (map tokens), `ui/map/world/{modes.ts, WorldMap.tsx}`, `ui/store/map.ts` (mode, bloc, selection,
  view, focus requests), `ui/screens/World.tsx` (lazy chunk, 62 KB gzip with its data; initial JS unchanged 108 KB).
- 2026-09-30 User chose map modes Political + Region + Blocs; Relations and Economy are disabled tabs ("Arrives with
  world diplomacy (M4)"). `Tabs` gained `disabled?: string` (reason tooltip; arrow keys skip it).
- 2026-09-30 SVG, projected at build time (Natural Earth I, `d3-geo` + `topojson-client` as dev dependencies only), not
  canvas: 176 paths pan at 60 fps under a 4× CPU throttle (headless), and hit-testing/hover come free. Only the `<g>`
  transform changes while moving; fills/borders are memoised. Strokes use `vector-effect: non-scaling-stroke`.
- 2026-09-30 Antarctica dropped from the data (no state; a fifth of the map's height): 176 units. Focus boxes and
  labels use the largest projected ring (mainland France; Russia west of the antimeridian). Names appear as you zoom,
  only where they fit inside the country.
- 2026-09-30 Colours: political = 6 muted tokens from greedy graph colouring (neighbours never match; territories
  take their state's colour); region = validated categorical slots, ordered so touching regions (Europe–Asia–Africa,
  Asia–Oceania, Asia–Americas) pass the CVD check in both themes; blocs = one blue for members. The UK is always
  outlined in `--you` ("Your country"). Party colours are never used on the world map.
- 2026-09-30 Country facts: DataHub country-codes (PDDL, pinned) + `data-raw/manual/world-extra.json` (units without
  ISO codes, capitals incl. Astana and Ciudad de la Paz, statuses). Statuses are descriptive: territory (with its
  state), "State with limited recognition" (Kosovo, N. Cyprus, Palestine, Somaliland, Taiwan), "Disputed territory"
  (Western Sahara). A non-independent unit without a status entry fails the build.
- 2026-09-30 Blocs hand-entered in `data-raw/manual/world-blocs.json`, web-checked 2026-09-30: NATO 32, EU 27, G7 7,
  G20 19 (+EU, AU), BRICS 10 (Saudi Arabia left out: invited, never confirmed), Commonwealth 56, Five Eyes, UN P5.
  Members too small for the 1:110m map are listed in the legend note.
- 2026-09-30 Click selects (no camera move, as in Paradox); list, search (Enter picks the first match), neighbour
  links and "Centre on map" select and frame the country (max zoom 8 so micro-states aren't blobs). Esc or clicking
  the sea closes the card. The map is focusable: arrows pan, + / − zoom, Home = whole map.
- 2026-09-30 Optional 3D tilt skipped: a CSS/three.js tilt costs GPU time on Intel UHD for little gain on a flat
  map. `HAS_3D_VIEW` stays false; T7's seat columns are the first real 3D candidate. The ticker is the shell's
  existing status bar.
- 2026-09-30 Browser-verified (scratchpad Playwright, not committed): dark, light, 390 px (no sideways scroll); hover
  label, click → card, wheel/drag/keys, Esc, all modes and blocs, search → Qatar framed, neighbour link; single-file
  build loads the World screen with no console errors. Republished the playable link.

- 2026-09-30 T7 map: `ui/map/uk/` (`hex.ts` pure odd-r geometry: `rawCentre`, `hexNeighbours`, `edgesBetween`
  (coast, nation and region borders drawn once), `regionLabelCells`, `buildHexMap`; `modes.ts` pure modes, bins,
  legends; `data.ts` joins seats + results + census once; `UkHexMap.tsx`; `Backdrop.tsx`), `ui/screens/UkMapScreen.tsx`
  (lazy; sidebar **Map**). Shared from T6: `ui/map/StoreMapView.tsx` (MapView bound to a map store: view, select,
  focus), `MapTip.tsx`, `Legend.tsx` (a `<details>`, folded on phones), `PlaceList.tsx`, `search.ts`,
  `useEscapeDeselect.ts`, `map-screen.css`; `ui/store/map.ts` is now `createMapStore` → `worldMapStore`,
  `ukMapStore` (`mode`, `option`, `selected`, `view`, `focus`). UK data split into `ukSeats.ts`, `ge2024.ts`,
  `census.ts` (`uk.ts` re-exports) so the backdrop loads no census.
- 2026-09-30 User chose Majority (new) over a fake Swing; Swing is a disabled tab ("Arrives with polling (T13)"). 3D
  seat columns moved to T18, where height means something; `HAS_3D_VIEW` stays false.
- 2026-09-30 Majority = majority / valid votes with fixed bins (< 5% marginal … 30%+ safe); Turnout = valid /
  electorate (Commons Library convention) and Demographics use quintiles of the data. No-data seats (NI results,
  census gaps) get their own grey and legend row. Value ramp: one party-neutral hue (sand → umber; blue would read as
  Conservative), validated with the dataviz ordinal check in both themes; lighter = more on the dark theme.
- 2026-09-30 Party colours are data (`data-raw/manual/ge2024-party-colours.json` → `ge2024.json` `colours`), used only
  to mean parties. Seat card: MP as elected with party chip, majority over the runner-up, turnout, electorate, a
  sortable results table with share bars, six census measures, NI "winner only" warning.
- 2026-09-30 Region labels sit on each region's deepest cell (furthest from coast and other regions), so the South
  East's label isn't on London's; shown below zoom 2.5. The UK key is a narrow column that fits the sea west of the
  map. Returning to a map screen keeps its view (focus requests made earlier aren't replayed; this also fixed T6).
- 2026-09-30 Main-menu backdrop: the 650 hexes in 2024 winner colours at 40% opacity (55% light), 180% of the screen
  height, drifting north ↔ south over 120 s with a CSS transform on one cached layer; static under reduced motion;
  not rendered below 900 px. Its chunk (seats + results, ~47 KB gzip) loads after first paint.
- 2026-09-30 Browser-verified (scratchpad Playwright): backdrop drifts (static with reduced motion, absent at 390 px);
  650 hexes; hover label; click → card with 6 result rows; Esc; all modes + census field; Swing disabled; search →
  Ynys Môn; Foyle shows the winner-only note; World still works; dark, light, 390 px with no sideways scroll; no
  console errors; menu drift and UK map pan hold 60 fps under a 4× CPU throttle (headless).

- 2026-09-30 T8 decisions, asked at the end of T7: M0 ends with a new `main` branch at `3c573a3` (handoff files only)
  and a PR of the Claude branch into it, one PR per milestone after that; the published build exports saves as
  `.json` through the Artifact download prompt (Import takes both). Claude's claim that the `downloads` capability
  refuses the `.mandate` extension was not verified: T8 checks it first.

- 2026-09-30 T8 map: `mandate/e2e/` (Playwright, `@playwright/test` pinned to 1.56.1 = the cloud image's Chromium
  1194) — `fixtures.ts` (fails any test on a console/page error; `newCareer`, `go`, `gameDate`), `artifact.ts`
  (serves `dist-preview/` at `/artifact.html` in the host's document skeleton, optional fake viewer with
  `window.claude.use('downloads')`), `smoke.spec.ts`, `artifact.spec.ts`, `perf.spec.ts`; `playwright.config.ts`
  (`vite preview` on 4173; projects `smoke` then `perf`, perf with tracing off). `npm run e2e` builds both builds
  first; `npm run e2e:perf` runs perf alone. Not in the per-commit gate (≈40 s + builds): run it before publishing.
- 2026-09-30 The `downloads` capability's allowlist (runtime contract 0.2.66 types) has `json` but not `mandate`, so the
  claim was right. Export: in a normal tab `.mandate` (gzip) as before; when the viewer grants `downloads`, the plain
  save JSON as `mandate-<date>.json` via `downloads.save` (a `<name>-` part is supported by `saveFileName` but
  nothing passes a name until the character exists, T10). Declined = silent; other refusals show "Export is not
  available in this view". The capability is asked for at boot (`ui/saves/host.ts`) so the button label is right.
- 2026-09-30 Import reads both formats: `decodeSave` sniffs the gzip header (`unpackSave`); any unreadable file now
  says "Not a valid save file" (was "Not a valid .mandate save file").
- 2026-09-30 Perf method: 4× CPU throttle via CDP, frames counted with rAF (main-thread headroom, not GPU raster).
  2D screens must hold the Medium target: ≥ 55 fps average and p95 frame ≤ 33 ms. Measured (cloud, headless): menu
  60, Home at speed 5 60 (worker and main thread), UK map pan + wheel zoom 57.5–58.7, world map 59–60, Artifact build
  UK map with the sim at speed 3 on the main thread 57.5–58.8; initial JS 157 KB gzip (budget 1.5 MB). Playwright
  tracing snapshots the DOM on every action and cut the UK map to ~35 fps, hence tracing off for perf. No 3D view
  exists (`HAS_3D_VIEW` false), so the Low/Medium 3D budgets get their tests with the first 3D view (T9/T18).
- 2026-09-30 M0 closed: `main` created at `3c573a3` (handoff files only), PR of `claude/magical-cori-1sjt0r` → `main`.
  Keep working on the Claude branch; one PR per milestone.

- 2026-10-02 PR 1 (M0) merged into `main` by the user; the Claude branch was fast-forwarded to `main` (no new
  history). Later milestones get their own PRs from the same branch.
- 2026-10-02 T8b map: `scripts/data/ukmap.ts` (`parseBoundary`, `rewind`/`rewindGeometry`, `placeLabel`, `projectUk`)
  → `src/data/generated/uk-map.json` (`UkMapFile`), typed access `src/data/ukMap.ts` (`UK_MAP`, lazy). `sources.ts`
  gained `RemoteSet` + `fetchSetCached` (many files, one content hash). UI: `ui/map/uk/data.ts` `GEOMETRY` (one
  `UkGeometry` per layout: shapes, border layers, labels, `box`, `maxZoom`, `focusZoom`), `UkMap.tsx` (was
  `UkHexMap.tsx`), `labels.ts` `seatLabelsThatFit`, `ui/store/map.ts` `ukLayoutStore` (localStorage) + map store
  `frame(box)`, `viewport.ts` per-map `Frame.maxZoom`, kit `Segmented`. Backdrop draws the real shapes.
- 2026-10-02 User chose real boundaries by default with a Map / Hexes switch (BBC/FT pattern: geography for where,
  equal hexes for counting seats). Transverse Mercator on 2°W (National Grid meridian), 2000 units tall, true
  positions (no Shetland inset). Visvalingam simplification keeps 30% of points (~400 KB JSON, ~140 KB gzip alone);
  London stays legible at the "Zoom to London" level. Real map zooms to 40× (London seats are ~3 km), hexes to 12×.
- 2026-10-02 d3-geo pitfalls met: RFC 7946 rings wind anticlockwise (d3 reads that as the whole sphere), and
  simplification can collapse or flip slivers; rings are rewound after parsing and after simplifying, rings under
  1e-5 sq. degrees dropped, and the build fails if any seat's area exceeds a hemisphere. `quantile(topology, p)`
  keeps the share `p` of points (it sorts descending).
- 2026-10-02 Seat borders are one mesh (drawn once) in the background colour at 0.9 px, so same-party seats stay
  distinct; seat names (Barlow 600, 11 px, halo) show where they fit round each seat's pole of inaccessibility.
- 2026-10-02 Design research for T8c (web; most design sites are blocked from the cloud env, so search results
  plus known patterns): Football Manager 26's UI, our current base, was widely panned as cluttered ("a brilliant
  game trapped in a clunky shell", Operation Sports; "a beautiful game trapped in an ugly interface", Absolute
  Geeks); Manor Lords (progressive disclosure, hover to expand) and Old World (sleek, small footprint) are praised
  for clean strategy UI. Linear is the most-copied app UI (redesign notes: LCH-generated themes so surfaces step
  evenly, Inter Display headings, less visual noise, denser navigation). Vercel Geist and Raycast were considered:
  Geist reads sterile for a game; Raycast's glass and blur cost GPU on Intel UHD. The user left the choice to Claude
  ("simple but beautiful, not AI-looking"): Linear for the shell and type, broadsheet data-journalism patterns for
  news and data pages (generic, no FT/Economist branding), game references kept for game moments (CK3, Suzerain,
  FP2). Copy patterns only (CLAUDE.md rule), no logos or brand colours.

- 2026-10-02 T8c colour research (user asked to "check wider academia on the most appealing colourway"). Findings
  used, with sources:
  - Hue preference: people like blues and dislike dark yellow (olive) and dark orange (brown), the colours of things
    they dislike (Palmer & Schloss 2010, PNAS, ecological valence theory). Valdez & Mehrabian (1994, J. Exp. Psych.:
    General): blue, blue-green, green, purple-blue, purple and red-purple most pleasant; yellow and green-yellow least.
    → No brown or olive in chrome or map palettes; value ramps violet (was sand → umber); the world map's political
    palette lost its brown and olive (and its two near-identical blue-greys: worst pair ΔE 1.8 → 11).
  - Saturation and brightness drive arousal and pleasure (Valdez & Mehrabian 1994; Wilms & Oberfeld 2018,
    Psychological Research): saturated colours raise arousal, brighter ones read as more pleasant. → Calm,
    low-saturation chrome for a long-session game; saturated colour reserved for data (party colours) and alerts.
  - Pair harmony: preference rises with hue similarity and lightness contrast (Schloss & Palmer 2011, Attention,
    Perception & Psychophysics). → One cool hue family for chrome, strong text/surface lightness contrast.
  - Polarity: dark text on light reads better (positive-polarity advantage; Piepenbrock, Mayr & Buchner, Ergonomics
    2013–14; Ergonomics 2025 found higher cognitive scores in light mode), while dark mode is reported as more
    comfortable in dim light. → Keep both themes (dark default for a game), body text 14 px, narrative in the serif
    at 17 px; avoid pure white on pure black (halation, worse for astigmatism): text #e7eaee on #15171a.
  - Colour vision deficiency affects about 8% of men and 0.5% of women; the Okabe–Ito palette is the standard safe set.
    → good / warn / bad are Okabe–Ito bluish green, orange and vermillion, always with an icon or word; map palettes
    checked with the dataviz validator (value ramps pass every ordinal check in both themes).
  - The menu backdrop drew dimmed party colours, which turns yellow and orange into exactly the disliked olive and
    brown on a dark ground; it is now a tonal grey map (seat lightness follows the winner's colour).
  Party colours themselves are unchanged (they are data and real-world conventions). Most journals and design sites are
  blocked from the cloud env, so findings come from search results and abstracts, not full texts.
- 2026-10-02 T8c look: Linear's layout habits (compact sidebar on the window background, the screen in one raised
  panel, slim header with a party / screen breadcrumb and a 2 px party-colour stripe, sentence case, 13 px UI, hairline
  tables without zebra rows, evenly stepped OKLCH greys) plus its Ctrl+K command menu (`ui/commands.ts` pure filter +
  `isCommandShortcut`, `ui/shell/CommandMenu.tsx` native modal dialog, `hooks/useCommandShortcut.ts`, header button).
  Home is an overview (dated heading, Inbox and Upcoming lists, You / Game / Keys panels); the nav store lost its Home
  card state. Main menu: Newsreader masthead, quiet list items, tonal backdrop (`ui/map/uk/tone.ts`). Events and mail
  subjects take serif headlines. Kit gained nothing new beyond `Segmented` (T8b); `.label`, `.list`, `.page-head` are
  screen-level styles.
- 2026-10-02 Typeface: first switched to Inter (Linear's font), then reverted the same session because DESIGN §17
  already banned Inter as the generated-UI default and the user asked for "not AI-looking". Chosen instead: Schibsted
  Grotesk (OFL, made for the Schibsted news group; variable 400–900; has `tnum`; 47 KB latin + 21 KB latin-ext, only
  latin and latin-ext are bundled). IBM Plex Sans was rejected (no tabular figures in the fontsource build).
- 2026-10-02 T8c measured: all 17 e2e tests pass; 57–60 fps under a 4× CPU throttle on every 2D screen; 212 unit
  tests. The player's default personal colour (`--you`, violet) now shares a hue family with the UK value ramp
  (T10: the player can now pick one of eight).

- 2026-10-03 T9 sim map: `src/sim/character/` = `model.ts` (Character, attribute/skill/issue keys and labels,
  relationships, background), `appearance.ts` (avatar parameters, palettes, part catalogue with generation weights,
  `randomAppearance`), `traits.ts` (data/characters/traits.json, `canAddTrait`, `pickTraits`), `checks.ts`
  (`checkOdds` with a CK3 modifier breakdown, `rollCheck`, `practise`), `condition.ts` (`energyMax`, `addStress`,
  `monthlyCondition`), `generate.ts` (data/characters/people.json, `generateCharacter`, `randomIdeology`, `relate`),
  `cast.ts` (`createStartingCast`, `startWorld`). `systems/character.ts`: daily energy refill and the player's
  birthday card (from the parent who likes them most), monthly stress recovery and health drift, burnout warning.
- 2026-10-03 New careers come from `startWorld` (runner `newGame`); `createWorld` stays bare for tests. Until T10 the
  player is random: 21–26, early-career job, 3–4 traits. Save v2: the v1 → v2 migration empties `characters` and
  sets `player` null (v1 games never had characters). `TickSummary.player` carries the player's headline numbers;
  the store keeps the old object when nothing changed. Queries `character {id}` and `player` return a
  `CharacterView` (age, energy max, check odds per skill, relations with both opinions).
- 2026-10-03 Heritage pools (people.json) shape names, family resemblance and religion odds only; weights are
  game-design approximations, documented as such in DATA_SOURCES (not statistics). Non-binary NPCs are rare (0.6%);
  the player chooses at T10.
- 2026-10-03 T9 avatar map: `ui/avatar/` = `rig.ts` (pure: appearance + age + expression + role → `Rig`; ageing,
  outfits, `lookAge`, cache `key`), `shape.ts` (pure head surface, face anchors, hair profiles and drape, brow/mouth/
  beard curves shared by both renderers), `body.ts` (pure proportions), `build.ts` (three.js meshes), `render.ts`
  (one offscreen WebGL canvas → WebP blob URL), `portraits.ts` (LRU cache of 240, one render per frame, lazy-imports
  three), `usePortrait.ts`, `useRig.ts`, `Portrait.tsx` (`Portrait`, `AvatarImage`), `AvatarSvg.tsx` (2D). `PortraitFrame`
  takes children as art. three.js lands in a lazy `render` chunk (~141 KB gzip); initial JS ~130 KB gzip.
- 2026-10-03 Look: stylised Two Point proportions (head 1.12x, compact body), CK3 three-quarter turn, bust crop from
  just above the head to mid-chest; MeshStandardMaterial with hemisphere + key/fill/rim lights, transparent
  background. Expressions are rig parameters, not GPU morph targets (renders are one-off). Long hair is pushed
  clear of the torso so it drapes over the shoulders. Suits keep to a sober palette; ties never white.
- 2026-10-03 Portrait cost: ~7.5 ms CPU to build a bust (18.6k triangles) on the cloud machine, after cutting mesh
  resolution; materials stay cached across builds because disposing them made three.js recompile shaders on every
  render. Adults' portraits use five-year age steps (`lookAge`), so a running clock doesn't redraw faces on every
  birthday. Measured (4x throttle, software WebGL): first face ~1 s, a Profile page of 6 faces ~2 s.
- 2026-10-03 `HAS_3D_VIEW` is now true: the 3D/2D toggle and graphics settings are back (3D = rendered characters,
  2D = illustrations); the toggle hides below 600 px (Settings keeps it). `WorldLayer` is still not mounted.
- 2026-10-03 Profile screen (FM profile + CK3 character window): framed portrait, traits (tooltip: description and
  effects), attributes, skills (tooltip: check odds and every modifier), condition and standing, political compass
  and issue scales, people (each opens their own profile), background. `useCharacterView` watches the date outside
  React, refreshes at most every 500 ms and structurally shares unchanged parts (`ui/character/share.ts`) so
  memoised panels skip re-rendering; the first version re-rendered the whole screen every tick (44 fps at speed 5).
- 2026-10-03 Browser-verified (scratchpad Playwright): gallery avatars in 3D and 2D, Home, Profile, a relation's
  profile and back, 2D view, 390 px (no sideways scroll); no console errors.

- 2026-10-03 T10 map: `sim/character/create.ts` (`CharacterSpec`, `specProblems` → `{ section, message }[]`,
  `randomSpec`, `createPlayer`, `START_AGE` 18–70, `ATTRIBUTE_BUY` 4–16 / 60 points, `TRAIT_COUNT` 3–5, households,
  `EDUCATION_MIN_AGE`), `quiz.ts` + `data/characters/quiz.json` (`scoreQuiz`, `answersFor`), `colours.ts`
  (`PERSONAL_COLOURS`: id + dark/light shade). `cast.ts`: `createStartingCast(world, rng, spec)` always builds from a
  spec; `startWorld({ seed, player? })` throws on an invalid spec (random spec when omitted: tests, soak). Protocol
  `newGame.options` carries `player`; store `newGame(seed, spec?)`. `ui/creator/` = `Creator.tsx` (lazy from the
  main menu), `store.ts` (draft, quiz answers, view state, `presetLooks`), `panels.tsx`, `LookPanel.tsx`,
  `AbilitiesPanel.tsx`, `BeliefsPanel.tsx`, `OriginsMap.tsx` (lazy: map geometry), `SearchPick.tsx`, `places.ts`,
  `describe.ts`, `Field.tsx`. Kit gained `Slider`, `Swatches` (`.colour-pick`, not `.swatch`: the gallery uses that),
  `Stepper`; `.search-field` moved to kit controls.css. Profile's compass, issue scales and trait effects moved to
  `ui/character/Beliefs.tsx` (+ beliefs.css) for reuse.
- 2026-10-03 Start age: the age on the game start date, 18–70 for both modes (DESIGN §5 rewritten). The old "0–17
  for life mode" contradicted the 2026-09-28 decision that politics starts on the start date with real politicians
  current. Life mode is stored (`world.meta.startMode`) but disabled in the UI until T11 builds the age log.
- 2026-10-03 New data on the character (no save bump; both optional): `background.home { nation, seat? }` (the
  player's political home seat, for T15's local party) and `meta.startMode`. `colour` now holds a palette id.
  Born abroad = citizenship [GBR, birth country] (standing needs British citizenship). Country ids are
  `cty_<ISO3>`; seats `con_<ONS code>` (format-checked only: the sim has no seat table until T12–T14).
- 2026-10-03 The family takes after the chosen player: parents share roots, class and nation; skin within one step,
  one parent has the player's hair colour and one their eye colour; parents' beliefs centre on the household's
  lean (left −45 / centre 0 / right +45 econ, sd 18; "not political" = random); 80% share the religion. Parents over
  78 may have died (chance rises with age; never before 60). 0–2 siblings as chosen.
- 2026-10-03 Turntable = plain three.js on its own canvas (`ui/avatar/turntable.ts` + `Turntable.tsx`), not r3f,
  so it shares the portrait chunk (turntable code 1 KB gzip). Renders on demand; full-body build; drag / arrow keys
  turn, wheel / +/− / button zoom to the face (eased, instant with reduced motion). Low preset: no MSAA (40 → 59
  fps turning under the 4x throttle). Rebuilds that cost > 8 ms (meshes + upload) hold the next one back by
  max(2 × cost, 120 ms), so slider drags stay smooth on slow machines. The rosette shows the personal colour.
  No decorative stage gradient (DESIGN §17 ban).
- 2026-10-03 Measured (4x throttle, software WebGL): turntable turning 59–60 fps; slider rebuilds 31–38 fps,
  p95 50–67 ms (budget: Low floor 30 fps, p95 ≤ 4 frames). Without rebuilds the same drag is 60 fps, so React is
  not the cost. Unthrottled: full-body build ~5.3 ms, 21.7k triangles. Creator chunk 19.5 KB gzip, lazy; initial
  JS ~133 KB gzip.

## Known issues / open questions
- Space toggles pause even when a button has focus (T3 design), so keyboard users press buttons with Enter. Revisit
  at T22 accessibility pass.
- GE2024 Northern Ireland: winners only, hand-entered and unverified (no votes, turnout or MPs). User can add
  `mandate/data-raw/HoC-GE2024-results-by-constituency.csv` (Commons Library CBP-10009) and run `npm run data` to
  get official results for all 650 seats plus declaration times; `fromHocCsv` is fixture-tested only.
- UK boundaries (T8b) are pinned by a content hash, not a commit (geography-bits has no releases): if Open Innovations
  edits a file, `npm run data -- --refresh` fails until the new hash is checked and pinned in `scripts/data/sources.ts`.
- The `ukMap` chunk (boundaries + 2024 results) is ~175 KB gzip and also loads behind the main menu (backdrop), after
  first paint. If menu load time matters, give the backdrop a coarser copy of the shapes.
- No 2019 notional results (dropped for licence reasons): the UK map's Swing mode is disabled until T13, where swing
  will be measured from 2024 in the running game.
- Census gaps: Scotland lacks ~10 measures in the source; Northern Ireland has none.
- Current office-holders and polls must be web-verified at T12 (knowledge may be stale).
- Characters never die yet: health bottoms out at 1 (death and heirs are DESIGN §4, not yet scheduled). Fame,
  credibility and heat sit at their defaults until media and money (T16–T17).
- Avatar rough edges: long hair lies flat over the shoulders, the hoodie's hood is a simple ring, collar points are
  flat triangles, and the 2D illustration is front-on while the 3D bust is turned a little. The T10 turntable shows
  the full body large, which exposes more: ball hands, a hard jumper hem, plain legs. Worth a pass on the body
  meshes before M1 ships. The 2D creator view is the bust only (no full-body illustration, no turning).
- Creator slider drags rebuild the whole figure (~5 ms; ~13 ms with upload and GC). Paced, they hold 31–38 fps
  under the 4x throttle; if the Dell hitches, build a lower-detail figure while dragging, or move builds to a
  worker (OffscreenCanvas).
- Traits are free at creation (CK3 charges for good ones): players will skip Lazy and Scandal-prone. Balance at T22
  (trait costs against the attribute budget).
- The Profile shows the birth nation only: not the birth country (born abroad) or the home seat, because seat and
  country names live in lazy UI data. Show them once the sim has a seat table (T12–T14).
- Life mode is visible but disabled in the creator ("coming soon") until T11.
- Portrait renders happen on the main thread (~7.5 ms each to build on the cloud machine, plus the WebGL draw);
  worth timing on the Dell. An OffscreenCanvas in a worker could move it off the main thread if it hitches.
- `THREE.Clock` deprecation warning comes from @react-three/fiber 9.8.1 internals with three r186 (not our code);
  revisit when r3f updates.
- Artifact export via `downloads` is tested against a fake viewer only; the real claude.ai prompt hasn't been
  clicked through by a person yet. If it fails, the Saves screen shows the error (check once in the viewer).
- Perf tests measure the main thread in headless Chromium on a fast machine; the real Intel UHD laptop may differ
  (GPU raster isn't measured). Worth one manual check on the Dell before M1 ships.
- WorldCanvas chunk was ~245 KB gzip (r3f pulls in all of three); lazy. Not built at all until `HAS_3D_VIEW`.
  Initial JS is ~107 KB gzip after T4c.
- Inbox items live only in the UI store: not in saves, so a loaded game starts with an empty inbox. Move the inbox
  into the sim/world when events start producing mail (T11/T15).
- Number keys 1–5 set the speed everywhere; Dialogue shows numbered choices but can't take number keys yet. Decide
  at T11 (e.g. capture 1–4 while a conversation is open).
- World map facts are static until M4: blocs and capitals need re-checking then (`asOf` 2026-09-30). Hover labels
  are mouse-only; touch players use the country list and card.
- Single-file builds inline both woff2 and woff for Newsreader (fontsource CSS lists both); ~90 KB wasted. Fine for
  now; trim at T8 if size matters.
