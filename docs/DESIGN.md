# Mandate — Design Document

Reference for every system. Sessions should grep for the section they need rather than reading it all.
Figures marked **(verify)** must be checked by web search before being hard-coded.

---

## §1 Vision and pillars

- **Rise from nobody.** You begin as an ordinary person and every rung of power is earned (or seized).
- **Many roads.** Party politics, activism/movements, business/media, coup, insurgency. They can be combined.
- **Living simulation.** Opinion, economy, media and rivals move without you; you ride and shape them.
- **Life, not just a career.** A BitLife-style layer: birth, family, relationships, health, ageing, death and heirs.
- **Grand-strategy polish.** Stellaris-like UI: dark, cinematic, readable, with 3D centrepieces.
- **Real but editable.** Real parties, politicians, outlets and countries, stored as data with `asOf` dates.

## §2 Time and scheduler

- 1 tick = 1 in-game day. Speeds: 0 pause, then 1–5. Speed 5 is uncapped (as fast as the tick budget allows).
- Real-time interval per tick: speed 1 = 1000 ms, speed 2 = 500 ms, speed 3 = 200 ms, speed 4 = 80 ms, speed 5 = next frame.
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
- **Commands from the UI** (e.g. `startActivity`, `chooseEventOption`, `setSpeed`) are queued and applied at the start of the next tick.
- **Save format:** `{ version, savedAt, world }`, JSON compressed with CompressionStream (gzip) and stored in IndexedDB.
  Export/import is a `.mandate` file. Migrations live in `save.ts` as `migrations[version]`.
- **Worker protocol:**
  - UI → worker: `{type:'cmd', cmd}`
  - Worker → UI: `{type:'tick', summary}` (compact: date, money, fame, heat, energy, headline changes, notifications)
  - Detail queries: `{type:'query', id, what, args}` → `{type:'result', id, data}`
  - If creating a Worker fails, the same engine runs on the main thread in time-sliced chunks.

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
- **Portrait:** layered SVG with parameters: faceShape, skinTone, hair{style,colour}, eyes, brows, nose, mouth, facialHair, glasses, clothing, accessory (rosette in party colour).
  - Ageing: greying hair and lines added past set ages.
  - The same generator makes NPC portraits. Real politicians get generated portraits (no photos).
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

## §17 Visual design

- **Look:** dark navy/graphite "situation room" (default) with a light theme.
  - Glass panels (translucent, blur, 1px hairline borders), party colours as accents.
  - Newspaper-serif headlines for news; Inter for UI.
  - Stellaris-style framed portraits and panel headers.
- **Tokens:** all colours are CSS variables on `:root`, redefined for `[data-theme=light]`. No hard-coded colours in components.
- **Motion:** Framer Motion for panel transitions and toasts; respect `prefers-reduced-motion`.
- **3D scenes** (@react-three/fiber + drei):
  1. Globe: sphere with country polygons (triangulated from the TopoJSON), hover glow, atmosphere shader, day/night terminator from the in-game date, great-circle arcs, fly-to-UK camera.
  2. UK hex map: InstancedMesh columns (one draw call). Height = majority or vote share; colour = party. Election night animates heights.
  3. Commons chamber: stylised benches (government right of the Speaker, opposition left), 650 instanced seat markers, animated divisions.
  4. Later: low-poly backdrops (Downing Street, rally stage, TV studio).
- **Performance** (Dell Latitude, Intel integrated GPU):
  - `frameloop="demand"`; device pixel ratio ≤ 1.5; presets Low/Medium/High chosen at first launch from the GPU renderer string/benchmark.
  - Low = no post-processing, fewer polygons, no shadows. Pause rendering when the tab is hidden.
  - 2D SVG fallback if WebGL is unavailable or the user picks it.
- **Budgets:** sim tick median < 2 ms; ≥ 30 fps on Low in 3D views; initial JS < 1.5 MB gzip (lazy-load 3D scenes).

## §18 Data sources

- **World borders:** `world-atlas` npm (Natural Earth 110m, public domain).
- **UK constituencies (2024 boundaries):** Open Innovations `uk-constituencies-2023.hexjson` from
  `raw.githubusercontent.com/odileeds/hexmaps/gh-pages/maps/` (reachable from the cloud env).
- **GE2024 results by constituency** (House of Commons Library, Open Parliament Licence). parliament.uk is blocked from the cloud env. Fallbacks in order:
  1. GitHub-hosted mirror via raw.githubusercontent.com
  2. WebFetch
  3. User uploads `HoC-GE2024-results-by-constituency.csv` into `mandate/data-raw/`
  4. Regional results + seeded seat variation calibrated to the real seat totals (Lab 411, Con 121, LD 72, SNP 9, SF 7, Ind 6, Reform 5, DUP 5, Green 4, PC 4, SDLP 2, Alliance 1, UUP 1, TUV 1, Speaker 1)
- **Politicians, polls, pay and limits:** web-verified at build time. Each file records `asOf` and its source in `docs/DATA_SOURCES.md`.

## §19 Content rules

- Real politicians appear in their public roles. Procedurally generated scandals and crimes attach only to the player or fictional NPCs.
  Real people receive abstract approval shocks, defeats, retirements and resignations.
- Coup, insurgency and illicit paths are abstract strategy mechanics with consequences. There is no real-world operational detail, no real extremist organisations, and no violent actions against named real people.

## §20 Roadmap

| Milestone | Content |
|---|---|
| M0 | Foundations: engine, shell, theme, data pipeline, 3D globe + hex map |
| M1 | Life layer + party route to PM: character, life mode, opinion, elections, money, media, events, AI |
| M2 | Activism/movements, business/media route, espionage/kompromat, courts/prison |
| M3 | Governing, full UK economy, devolved elections, Commons/Lords legislation, 3D backdrops |
| M4 | World: countries, diplomacy, trade, sanctions, AI countries |
| M5 | Coup, insurgency, war, authoritarian governance |
| M6 | US and other playable countries, modding, tutorial, balance |
