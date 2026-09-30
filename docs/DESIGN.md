# Mandate — Design Document

Reference for every system. Sessions should grep for the section they need rather than reading it all.
Figures marked **(verify)** must be checked by web search before being hard-coded.

---

## §1 Vision and pillars

- **Rise from nobody.** You begin as an ordinary person and every rung of power is earned (or seized).
- **Many roads.** Party politics, activism/movements, business/media, coup, insurgency. They can be combined.
- **Living simulation.** Opinion, economy, media and rivals move without you; you ride and shape them.
- **Life, not just a career.** A BitLife-style layer: birth, family, relationships, health, ageing, death and heirs.
- **Proven look, not an invented one.** Every layer of the interface copies a named, acclaimed game (§17):
  Football Manager's shell and data screens, Crusader Kings III's characters, tooltips and events, and so on.
- **Real but editable.** Real parties, politicians, outlets and countries, stored as data with `asOf` dates.

## §2 Time and scheduler

- 1 tick = 1 in-game day. Speeds: 0 pause, then 1–5. Keys: Space pauses/resumes (previous speed), 1–5 set speed.
- Real-time interval per tick: speed 1 = 1000 ms, speed 2 = 500 ms, speed 3 = 200 ms, speed 4 = 80 ms, speed 5 = 16 ms
  (one per frame; if ticks outgrow that it runs back-to-back, i.e. as fast as the tick budget allows).
  `TICK_MS` in `src/runtime/protocol.ts`. A late timer (throttled tab) catches up at most one tick.
- While paused the player can step +N days; steps run in time slices and stop early on an auto-pause.
- The scheduler runs systems by cadence. The order within a tick is fixed (deterministic).
  - **Daily:** activities progress, energy, money flows, heat decay, event rolls (low probability).
  - **Weekly (Monday):** polls, media cycle, opinion drift, donor behaviour.
  - **Monthly (1st):** economy, NPC AI decisions, salaries/rent, party finances.
  - **Yearly:** ageing (on the birthday, daily check), May local elections (first Thursday in May), fiscal events.
- **Auto-pause** triggers are configurable: elections, events that need a choice, investigations, activity completed.
- **Game start date:** the data `asOf` date (default 2026-10-01). Life mode backstory years precede it.

## §3 Engine and state

- `World` is a plain serialisable object of normalised tables: `characters`, `parties`, `constituencies`,
  `countries`, `outlets`, `activities`, `events`, `ledgers`, `polls`, `elections`, `news`, plus `player` (a character ID), `clock` and `rngState`.
- IDs are prefixed strings (`chr_…`, `pty_lab`, `con_E14001074`, `cty_GBR`).
- A system is `{ id, cadence, run(world, ctx) }`. `ctx` = `{ rng, bus, day, emit }`.
- **Determinism:** only `ctx.rng` (sfc32, seeded). There is no wall-clock time inside the sim.
- **Commands from the UI** (e.g. `startActivity`, `chooseEventOption`) are queued and applied at the start of the next tick.
  Speed, pause and stepping are runner controls, not sim commands.
- **Save format:** `{ version, savedAt, world }`, JSON compressed with CompressionStream (gzip) and stored in IndexedDB.
  Export/import is a `.mandate` file. Migrations live in `save.ts` as `migrations[version]`.
- **Worker protocol** (`src/runtime/protocol.ts`; the runner is `SimRunner`, the UI side `createSimBridge`):
  - UI → runner: `{type:'cmd', cmd}` · `{type:'speed', speed}` · `{type:'togglePause'}` · `{type:'step', days}` ·
    `{type:'autoPause', settings}` · `{type:'request', id, req}` with `req` = `newGame` | `save` | `load` | `query {what, args}`
  - Runner → UI: `{type:'ready'}` · `{type:'tick', summary}` (compact: date, money, fame, heat, energy, headline changes,
    notifications) · `{type:'status', speed, resumeSpeed, pausedBy}` · `{type:'result', id, ok, data|error}` · `{type:'fatal', message}`
  - Detail queries are a data-driven registry (`src/runtime/queries.ts`); add an entry, not a message type.
  - Main-thread fallback if `Worker` is missing, its constructor throws, it errors before `ready`, or `ready` takes > 5 s.
    Same runner and messages (structured-cloned); step batches yield every 8 ms (50 ms in the worker).
- **Save slots:** IndexedDB `mandate` with stores `slots` (metadata) and `saveData` (gzip bytes), one transaction per write.
  Reserved slot ids `auto`, `quick`. Settings (auto-pause) in localStorage.

## §4 Character

- **Attributes** (0–20): Charisma, Intellect, Cunning, Discipline, Empathy, Stamina.
- **Skills** (0–100, grow with use): Oratory, Organising, Fundraising, Policy, Media, Networking, Intrigue, Leadership, Military, Business.
- **Traits** (3–5 at creation, more gained through life): e.g. Ambitious, Principled, Opportunist, Workaholic, Charming, Awkward, Hot-headed, Calm, Scandal-prone, Teetotal, Gambler, Bookish, Local hero.
  - Each trait modifies skill checks, energy, stress and event weights.
- **Ideology:**
  - `econ` −100 (left) … +100 (right) and `social` −100 (liberal) … +100 (authoritarian).
  - `issues`: immigration, EU, climate, NHS/public services, tax, defence, devolution/union, crime, housing, culture/identity. Each runs −100…+100.
  - Ideology drifts slowly with experiences; flip-flopping publicly costs credibility.
- **Condition:**
  - `health` 0–100 and `stress` 0–100. High stress lowers checks and can cause burnout events.
  - `energy`: a daily budget of about 10 points, regenerated each day. Activities reserve energy per day.
- **Public standing:**
  - `fame` {local, regional, national} 0–100.
  - `reputation[bloc]` −100…+100, `credibility` 0–100 and `heat` 0–100.
- **Money:** personal ledger (see §10).
- **Relationships:** `opinion` −100…+100 plus tags (family, partner, friend, rival, mentor, donor, ally, enemy).
  Favours owed and secrets known (kompromat, M2).
- **Background:** birthplace (country + optional constituency), nationality/citizenship, class origin, parents (jobs, politics, wealth), religion, education.
- **Eligibility:** standing for Parliament needs age ≥ 18 and British/Irish/qualifying Commonwealth citizenship. Some jobs (civil servants, police, military) must resign to stand.
- **3D avatar (stylised, customisable):** every character is a stylised 3D person in the vein of The Sims or Two
  Point Hospital: soft, readable shapes, not realism. Built in code from parametric meshes, so there are no large
  model downloads.
  - Parts: head (shape morphs: width, jaw, cheeks, chin, brow), eyes, brows, nose, mouth, ears, hair (mesh
    variants + colour), facial hair, glasses, body (height, build), clothing (top, jacket/suit, tie, trousers/skirt,
    shoes), accessories (rosette, lanyard, placard, hard hat, poppy).
  - Expressions (neutral, smile, grim, worried, angry) as morph targets. Idle poses: stand, arms folded, podium, wave.
  - Ageing: hair greys or recedes, lines appear, posture changes past set ages. Outfits change with role
    (student → councillor → MP suit).
  - **Creator (T10):** copies the CK3 ruler designer and The Sims' Create-a-Sim: categories on the left, turntable
    avatar in the centre (drag to rotate, zoom to face), sliders and swatches on the right, randomise and presets.
  - **Portraits:** CK3-style framed portraits. The bust is rendered once to a small offscreen target and cached as
    an image (`Portrait` component); re-rendered only when appearance changes; no live 3D canvas per panel. The frame
    shows party colour and office. Without WebGL: a flat illustrated silhouette in the same colours.
  - NPCs use the same generator. Real politicians get avatars generated from editable parameters (hair, glasses,
    build), with no photos and no photo-derived likenesses.
- **Personal colour:** chosen at creation; used for the player's rosette, portrait frame and UI highlights (`--you`).
- **Death and heirs:** health can fail with age or stress. The player may continue as a protégé or child who inherits part of the money, contacts and fame.

## §5 Life mode (playable backstory)

- You choose a start age (0–17 for life mode, or 18–70 for quick start). Birth date = game start date − start age.
- Life mode plays each backstory year as 1–3 BitLife-style **cards** (text + 2–4 choices) until the game start date.
  After that, real-time politics begins.
- Card pools by age band:
  - 0–4 family
  - 5–11 primary school
  - 11–16 secondary school/GCSEs
  - 16–18 A-levels, college, apprenticeship, first job, first protest
  - University years if the start age is higher
- Cards are keyed to real years for formative moments: 2008 crash, 2010 tuition fees protests, 2014 Scottish referendum, 2016 EU referendum, 2020 COVID, 2022 cost of living. A card fires only if the character was the right age.
- Outcomes: attribute/skill growth, traits, ideology drift, contacts (friends who later become NPC allies), qualifications, starting money.
- Quick start generates a backstory by sampling the same cards automatically.
- **Presentation** copies BitLife: a year-by-year age log ("Age 7: You won the school spelling bee."), an
  **Age +** button, and each choice shown in a CK3-style event window (§17). In real time the same log continues as
  the career timeline on the Profile screen.

## §6 Opinion model

- **Voter blocs:** age (18–34, 35–54, 55+) × education (degree, no degree) × class (ABC1, C2DE) = 12 blocs.
  Each nation (England, Scotland, Wales, NI) has its own bloc weights and party set.
- Each bloc has issue positions, issue salience (0–1), party attachment, turnout propensity and reputation of key figures.
- **Party support uses calibrated deltas** (keeps the start state equal to real polling):
  `share[b,p] = base[b,p] · exp(Δu[b,p]) / Σ_q base[b,q] · exp(Δu[b,q])`
  where `Δu = −k·Σ_i salience_i·(|pos_i − party_i| − |pos_i − party_i|₀) + a·Δleader + c·Δcompetence + m·momentum + campaign`.
  National share = Σ blocs weight × turnout × share.
- **Salience** moves with the news cycle (§11) and events. Party positions move via manifesto/leadership.
- **Constituency projection:**
  `ukShare[c,p] = 0.5·proportional + 0.5·uniform swing from the 2024 baseline`, applied within each nation.
  Values are clamped at ≥ 0.2% and renormalised. Local effects then apply: incumbency, candidate fame, campaign spend in seat, tactical-vote factor.
- **Polling:** pollsters (YouGov, More in Common, Opinium, Ipsos, Techne, Find Out Now, Survation; **verify** the current set).
  - Each has a house effect per party and n ≈ 1,000–2,000, and publishes on its own cadence.
  - Poll = true national share + house effect + N(0, √(p(1−p)/n)).

## §7 Elections

- **Generic engines** (pure functions + tests):
  - `fptp(votes)`
  - `dhondt(votes, seats, threshold)`
  - `sainteLague`
  - `stv(ballots, seats)` (Droop quota, Gregory transfers)
  - `av(ballots)`
  - `twoRound(votes)`
  - `ams(constituency, regional)`
- **UK Westminster:** 650 FPTP seats.
  - Latest poll: Parliament dissolves automatically 5 years after it first met (9 July 2024), and polling day follows about 25 working days later. That puts the latest date around mid-August 2029 **(verify)**.
  - The PM (NPC or player) can call one earlier. AI weighs its poll lead against how long remains of the Parliament.
- **Local elections:** first Thursday in May, abstracted as a ward contest in the player's area, plus national projected-share headlines.
- **Devolved elections (M3):** Holyrood (AMS) and Senedd (closed list D'Hondt, 2026 reform **(verify)**).
- **Campaign phase** (about 5–6 weeks): manifesto, target seats, ground game, ads, debates, gaffes, endorsements.
- **Election night:** declarations stream in with realistic order (early Sunderland/Newcastle-type seats first), then exit poll at 22:00, then results.
- **Hung parliament:** coalition or confidence-and-supply talks. Parties score deals by ideological distance, policy asks and seat maths.

## §8 Parties and leadership

- **Party data:** id, name, short name, colour, nations, leader, key figures, econ/social position, issue positions, members, funds, factions (with strength and position), leadershipRules, affiliated unions/donor base.
- **Seed parties:** Labour, Conservative, Reform UK, Liberal Democrats, Green, SNP, Plaid Cymru, Sinn Féin, DUP, SDLP, Alliance, UUP, TUV, plus independents. Current leaders are to be verified at T12.
- **Leadership rules** (data-driven, **verify** details):
  - `con`: nominations threshold of MPs; MP ballots eliminate down to 2; members' OMOV.
  - `lab`: nominations from 20% of MPs (vacancy or challenge); CLP/affiliate nominations; members' OMOV.
  - `ld`: MP proposers + member supporters; members' preferential ballot.
  - `simple`: members' OMOV (Green, SNP, Plaid) or leader-controlled (Reform: a company structure, so the challenge route is limited).
- **Factions:** e.g. Labour (Starmerite/soft left/Socialist Campaign Group), Conservative (One Nation/free-market/national-conservative). Faction support decides contests and rebellions.

## §9 Careers and offices (party route)

- **Ladder:**
  1. Member
  2. Branch officer
  3. Councillor (then council group leader or council leader)
  4. Approved candidate
  5. PPC
  6. MP
  7. PPS
  8. Junior minister / shadow junior minister
  9. Minister of State
  10. Cabinet / shadow cabinet
  11. Party leader
  12. PM
- **Jobs** (M1 set): student, retail, hospitality, care worker, teacher, nurse, solicitor, accountant, journalist, union organiser, small-business owner, civil servant (must resign to stand), soldier (must resign), unemployed.
  Each job has salary, energy cost, skill growth and network access.
- **Pay (verify all):**
  - MP salary about £93,904 (April 2025).
  - Councillor allowance varies by council (about £8k–£20k).
  - Ministerial salaries are added on top of the MP salary.
- **Selection contests:** members vote. Candidate score = standing with members + oratory check at hustings + endorsements (union, factions, local notables) + money + incumbency. Seats are safe, marginal or no-hope by 2024 majority.

## §10 Money

- **Ledgers:** `personal` and `campaign` (each organisation later gets its own). Every transaction is logged `{day, amount, category, counterparty, legal}`.
- **Income:**
  - salary
  - small donors: rate ∝ fame × enthusiasm × fundraising skill
  - fundraising events: costs up front, check-based return
  - crowdfunds: time-limited, virality roll
  - major donors (NPCs with ideology and asks: policy pledges, access, peerage hints)
  - party grants for target seats
  - membership fees (movements, M2)
  - Short money (opposition parties, M3)
  - speaking fees, book deals, consultancy (MPs; second-job scandal risk)
- **Spending channels:** each channel has cost, reach and persuasion, with diminishing returns per area per week.
  - leaflets (cost per 1,000, local)
  - door-knocking (volunteer time, local, strong)
  - digital ads (targeted by bloc/region, cheap reach, weak persuasion)
  - billboards (regional awareness)
  - print ads
  - events/rallies (enthusiasm)
  - staff (energy multiplier)
  - UK rule: no paid political TV/radio adverts, only party election broadcasts for qualifying parties.
- **Compliance (verify figures):** candidate spending limits for the long and short campaign (fixed sum plus pence per elector); permissible donors only (UK electoral register/UK companies); donation recording/reporting thresholds.
  - Breaches add heat and can bring an Electoral Commission or police investigation → fine, disqualification or prosecution.
- **Illicit money (M2):** foreign or impermissible donations, dark-money shells, selling information, blackmail proceeds.
  These are high reward but add heat and create scandal hooks.

## §11 Media and fame

- **Outlets (seed):** BBC, ITV, Sky, Channel 4, GB News, Guardian, Times, Telegraph, FT, Mail, Sun, Mirror, Express, i, Observer, Economist, Spectator, New Statesman, regional papers (generic by region), social platforms (abstract).
  Each outlet has fields: bias {econ, social}, reach by bloc, tone (tabloid/broadsheet) and stance per party.
- **News cycle (weekly):** stories come from events, activities and scandals. Each story has salience effects on issues and reputation effects on people. Big stories dominate for 1–3 weeks.
- **Player media actions:**
  - press release (local fame)
  - interview (check: Oratory + Media vs outlet hostility; the gaffe risk rises with fame)
  - op-ed (Policy)
  - social post (virality roll; outrage risk)
  - PMQs question (as an MP)
  - TV debate (campaign)
- **Fame** decays slowly without coverage. Reputation per bloc shifts with story tone × bloc reach.
- **Scandals:** triggered by heat, traits and secrets. Stages: rumour → story → investigation → resolution. Responses: deny, apologise, resign, counter-attack, bury (Intrigue).

## §12 Heat and legal

- `heat` 0–100 rises with illicit or rule-breaking acts and decays about 1 per week.
- Weekly investigation chance = f(heat, fame, media hostility). Bodies: Electoral Commission, police, Standards Commissioner, HMRC; later NCA/MI5 (M2+).
- Investigation → evidence meter → outcome: cleared, fine, suspension, recall petition (MPs), prosecution, prison.
  Prison is a setback path: release, memoir, comeback.

## §13 Events engine

- An event is `{ id, scope: player|party|nation|world, title, text (templated), trigger: { mtthDays | weight, conditions[] }, options: [{ label, conditions?, effects[], aiWeight? }], once?, tags }`.
- Conditions and effects are small JSON-able operations (e.g. `{op:'skill>=', skill:'oratory', value:40}` or `{op:'add', path:'player.fame.local', value:5}`), interpreted by the engine. No `eval`.
- Life-mode cards are events with `scope:'player'` and age-band conditions.
- Content lives in `src/data/events/*.ts`. Adding content should never need engine changes.

## §14 Activities (actions over time)

- An activity definition is `{ id, name, category, requires[], cost:{money, energyPerDay}, durationDays, skill, difficulty, onComplete: outcome table, xp }`.
- Outcome roll: `d100 + skill·0.6 + attribute·1.5 + trait mods − difficulty`. The result bands are crit fail, fail, success and crit success, each with its own effects.
- Concurrency is limited by the daily energy budget. Staff and volunteers add capacity.
- Examples: canvass ward, attend branch meeting, run for branch officer, write policy paper, fundraising dinner, run ad campaign, network at conference, study for qualification, rest.

## §15 NPC AI

- Utility AI: each NPC scores candidate actions by goals (ambition, ideology, loyalty, self-preservation) with noise, and evaluates monthly (weekly during campaigns).
- **Party leaders:** call elections, reshuffle, respond to scandals, resign after defeat or low confidence.
- **Rivals:** compete for selections and leadership; can leak or attack when their opinion of you is low.
- **Donors:** give or withdraw according to your ideology alignment and success.

## §16 Later systems (outline; detail when the milestone is planned)

- **Activism and movements (M2):**
  - Found or join a movement with its own ledger, members, branches and enthusiasm.
  - Actions: protests, petitions (10k signatures = government response, 100k = considered for debate), direct action (heat), media stunts.
  - A movement can become a party (register with the Electoral Commission), pursue entryism into an existing party, or endorse candidates.
- **Business and media route (M2):** start or buy a business or outlet; income, and influence over coverage (bias your outlet's stance).
- **Espionage and kompromat (M2):**
  - Networks of assets. Operations: dig dirt, leak, surveil, disinformation, counter-intel.
  - Each operation has success and detection chances; exposure causes a scandal and heat.
  - Foreign intelligence ops unlock in government (M3–M4).
- **Governing (M3):**
  - Cabinet appointment and reshuffles (competence, loyalty, faction balance).
  - Bills through Commons stages and Lords (ping-pong; Parliament Acts).
  - Whipping and rebellions; confidence votes.
  - Budgets: tax sliders (income tax bands, NICs, VAT, corporation tax, CGT, fuel duty) and departmental spending.
  - Civil service implementation lag; judicial review; devolved relations.
  - Institutions (civil service, military, police, security services, judiciary, BoE, media, monarchy) each with independence and loyalty.
- **UK economy (M3):**
  - About 10 sectors (output, employment, wages, productivity) with demand C+I+G+NX.
  - Inflation: expectations-augmented Phillips curve plus energy/import prices.
  - BoE Taylor rule; unemployment; housing market.
  - Public finances: receipts from the tax model, spending, deficit, debt/GDP.
  - Gilt yields = base + risk premium(debt, credibility, fiscal shock). Mini-budget-style crises are possible.
  - Regional distribution feeds bloc and constituency mood. Calibrate to ONS/OBR 2025–26 figures **(verify)**.
- **World (M4):**
  - Every country: government type, leader (data), GDP/growth/inflation/debt, alignment, bloc memberships (NATO, EU, G7, G20, BRICS, UNSC P5, Five Eyes, Commonwealth), relations matrix, trade links, military strength (abstract), nuclear status.
  - Diplomacy: relations, treaties, trade deals, sanctions, aid, arms sales, summits, UN votes.
  - AI countries use utility AI.
- **War (M5):**
  - Theatre-level: war goals, fronts (strength, supply, morale), attrition, mobilisation, alliances joining, casualties feeding domestic opinion.
  - Nuclear escalation ladder with deterrence; peace deals.
- **Coup (M5):**
  - Build a loyalty network in the military and security services (abstract assets), with plot progress vs discovery risk.
  - Needs crisis conditions (low legitimacy, economic collapse, constitutional crisis).
  - Outcome: junta or emergency government, then sanctions, resistance and a legitimacy rebuild. No real-world tactical detail.
- **Insurgency (M5):**
  - An abstract armed-struggle path: cells (strength, cohesion), support base, security-force pressure, public backlash, splinters.
  - A negotiation track leads to ceasefire and settlement (Good Friday-style); the political wing can become a party.
  - Actions target abstract institutions, never named real people. There are no real extremist organisations.
- **Authoritarian governance (M5):** emergency powers, press control, packing institutions, rigging elections, with legitimacy, unrest and international response.
- **Other countries (M6):** US first (primaries, conventions, Electoral College, Congress, filibuster, SCOTUS), then others via generic election engines and institution templates.

## §17 Visual design — the reference stack

The user rejected two invented looks ("situation room"; "Ballot & Block" voxels) as generic or unwanted and asked for
a design that **copies proven games at every level**. Each layer below names its source. We copy layouts,
interaction patterns and conventions only: never artwork, logos, trademarks or paid fonts. No real organisation's
branding either (no GOV.UK or BBC look: impersonation, and GOV.UK's Transport font is licence-restricted).

### What each layer copies
| Layer | Copy from | What exactly |
|---|---|---|
| App shell + navigation | Football Manager (FM24-era sidebar; FM26 tile → card) | Left sidebar with unread badges: Home, Inbox, Calendar, Profile, Party, Money, Media, Polls, Map, World. Header strip tinted in **your party's colours** (FM tints it with club colours). Home = tile dashboard; a tile opens a detail card |
| Time controls | Paradox (CK3, Victoria 3) | Date, pause and five speed pips top-right; Space pauses; a banner says why the game paused |
| Inbox + calendar | Football Manager | Inbox list (sender portrait, subject, date, unread dot) + reading pane with reply/action buttons. Calendar month grid: elections, conferences, council meetings, PMQs |
| Character sheet | FM player profile + CK3 character window | Attribute grid with FM's colour-coded 1–20 values; traits as icon chips; relations with opinion numbers; big framed portrait |
| Portraits | CK3 framing, stylised art (§4) | Cached 3D bust in a frame showing party colour and office |
| Tooltips | CK3 nested tooltips | Highlighted terms inside a tooltip open their own tooltip; hold to lock; effect breakdowns list every modifier |
| Events / decisions | CK3 event window | Title, scene image (3D render), body text, 2–4 options; each option's effects in its tooltip |
| Conversations | Suzerain | Portrait left, dialogue in the serif, numbered choices, scrollable log |
| Policy (M3) | Democracy 4 | Policy web: category clusters of round nodes, lines to affected voter groups and stats, green/red effect lines |
| Votes (T19–T20) | Frostpunk 2 council | Horizontal For / Against / Undecided bar with the majority line; hemicycle seat chart |
| Maps (T6–T7) | Paradox map modes + Plague Inc | Flat, clean map with a map-mode switcher; news ticker along the bottom. World (T6): Political, Region, Blocs now; Relations, Economy shown disabled until M4. UK (T7): Party, Swing, Turnout, Demographics |
| Election night (T18) | Broadcast convention, unbranded | Seat totals bar with the majority line, swing gauge, declared-seats feed, the map filling in |
| Tables + charts | Football Manager | Dense sortable tables, zebra rows, 13 px, tabular numbers; thin line charts with endpoint dots |
| Main menu | Paradox / FM main menus | Left-column menu (New career, Continue, Load, Settings) over a full-bleed backdrop: plain until T7, then a slowly panning political map of Britain |
| Character creator (T10) | CK3 ruler designer + Sims Create-a-Sim | See §4 |
| Life mode (T11) | BitLife | See §5 |

Avoid FM26's criticised habit of stacking pop-ups: cards open in place (a side panel or the main area), one at a time.

### Visual system
- **Fonts** (open licence, bundled offline): **Barlow** for UI text, **Barlow Condensed** for headers, tabs and
  tables, **Newsreader** for narrative text (events, dialogue, news). Tabular numerals wherever numbers line up.
- **Icons:** Phosphor Icons (MIT), regular weight for UI and fill weight for active states. No emoji.
- **Colour:** dark graphite UI (default) and a light theme, as CSS tokens on `:root` with `[data-theme]` overrides.
  The header strip takes your party's colours. Attribute values use FM's scale: low red → orange → yellow → green →
  high blue-green. Semantic good / warning / bad colours are separate from party colours, and party colours only ever
  mean parties.
- **Still banned:** glassmorphism and blur, decorative gradients and glows, emoji icons, Inter.
- **Motion:** quick, functional transitions (panel slides, tooltip fades ≤ 150 ms); respect `prefers-reduced-motion`.

### 3D (three.js + @react-three/fiber; lazy-loaded)
- Used for characters (portrait renders, the creator's turntable, event scene images) and, from T6/T7, an optional
  map tilt and election-night seat columns. No voxel diorama.
- Kept from T4b: the persistent canvas layer, graphics presets with GPU detection and adaptive downgrade, on-demand
  rendering (`useStepper`), and the 3D/2D view setting.

### 2D mode (first-class)
The whole game without WebGL: same UI, flat maps, illustrated portrait silhouettes. Default when WebGL is unavailable,
`prefers-reduced-motion`, or viewport < 900 px; the setting is always offered.

### Performance (Dell Latitude, Intel UHD 620-class GPU)
- Render on demand; full-rate loops only while animating; pause when the tab is hidden.
- Portraits are cached images, never one live canvas per panel. Reduced internal resolution on Low.
- **Budgets:** sim tick median < 2 ms; 60 fps on Medium, ≥ 30 fps on Low in 3D views; initial JS < 1.5 MB gzip.

### Audio (optional, T22)
Procedural UI sounds and an ambient loop via Web Audio (no audio files). Starts only after a user gesture; mute
changes gain only.

## §18 Data sources

- **World borders:** `world-atlas` npm (Natural Earth 110m, public domain), projected to SVG paths at build time.
- **Country regions and capitals:** DataHub `country-codes` (PDDL; UN M49 regions), with hand corrections.
- **Blocs** (NATO, EU, G7, G20, BRICS, Commonwealth, Five Eyes, UN P5): hand-entered, web-checked, `asOf` dated.
- **UK constituencies (2024 boundaries):** Open Innovations `uk-constituencies-2023.hexjson` from
  `raw.githubusercontent.com/odileeds/hexmaps/gh-pages/maps/` (reachable from the cloud env).
- **GE2024 results by constituency** (House of Commons Library, Open Parliament Licence). parliament.uk and
  Wikipedia are blocked from the cloud env. Chosen chain (T5, details in `docs/DATA_SOURCES.md`):
  1. `data-raw/HoC-GE2024-results-by-constituency.csv` if the user adds it: official, all 650 seats.
  2. Otherwise the University of Bristol GB file on GitHub (632 seats; results copied from the Commons Library,
     plus Census 2021/2022 measures).
  3. Northern Ireland: hand-entered winners only, marked unverified, until the official file is added.
  Seat totals reproduce the published result (Lab 411, Con 121, LD 72, SNP 9, SF 7, Ind 6, Reform 5, DUP 5,
  Green 4, PC 4, SDLP 2, Alliance 1, UUP 1, TUV 1, Speaker 1).
- **Census by constituency:** from the same GB file (ONS Census 2021; Scotland's Census 2022), 21 measures.
- **Politicians, polls, pay and limits:** web-verified at build time. Each file records `asOf` and its source in `docs/DATA_SOURCES.md`.
- **Fonts and icons:** Barlow and Barlow Condensed (OFL, @fontsource), Newsreader (OFL, @fontsource), Phosphor
  Icons (MIT). Departure Mono was used by the superseded "Ballot & Block" kit.
- **Art-direction research (2026-09-29):** y-n10.com (Cannes Lions / D&AD 2021 entries: "road movie", "80s game
  with a modern look"); 2026 brutalism/anti-AI trend pieces; Obra Dinn 1-bit dithering; Mini Metro/Vignelli
  minimalism; Dorfromantik diorama readability; three.js low-res upscaling and voxel meshing notes. Superseded.
- **Reference-stack research (2026-09-29):** CK3 cited as the best Paradox UI, nested tooltips singled out
  (forum.rpg.net best-UI thread); FM26 UI feature (tiles → cards; Efficiency, Familiarity, Predictability) and its
  mixed reception (gosugamers review); Suzerain's map → notification → dialogue loop (Wikipedia); Frostpunk 2 council
  vote bar (pcgamesn); Democracy 4's vector UI (techraptor); Atlus on the cost of Persona-style menus (pushsquare);
  govuk-frontend is MIT but its Transport font is restricted (npm); MakeHuman exports are CC0 (considered for
  realistic busts, not chosen); Game UI Database (gameuidatabase.com) as a reference library.

## §19 Content rules

- Real politicians appear in their public roles. Procedurally generated scandals and crimes attach only to the player or fictional NPCs.
  Real people receive abstract approval shocks, defeats, retirements and resignations.
- Coup, insurgency and illicit paths are abstract strategy mechanics with consequences. There is no real-world operational detail, no real extremist organisations, and no violent actions against named real people.

## §20 Roadmap

| Milestone | Content |
|---|---|
| M0 | Foundations: engine, runtime, reference-stack UI kit + shell, main menu, data pipeline, world + UK maps |
| M1 | Life layer + party route to PM: character, life mode, opinion, elections, money, media, events, AI |
| M2 | Activism/movements, business/media route, espionage/kompromat, courts/prison |
| M3 | Governing, full UK economy, devolved elections, Commons/Lords legislation, 3D backdrops |
| M4 | World: countries, diplomacy, trade, sanctions, AI countries |
| M5 | Coup, insurgency, war, authoritarian governance |
| M6 | US and other playable countries, modding, tutorial, balance |
