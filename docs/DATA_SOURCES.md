# Data sources

Everything in `mandate/src/data/generated/` is built by `npm run data` (`mandate/scripts/build-data.ts`) from the
pinned inputs below. Downloads are checked against the SHA-256 listed here and cached in `mandate/data-raw/.cache/`
(gitignored); `npm run data -- --refresh` re-downloads. The outputs are committed, so the game builds offline.
The licences' attribution lines are shown in the game's Settings screen (`src/data/credits.ts`).

| Output | Content | As of |
|---|---|---|
| `uk-seats.json` | 650 Westminster seats (2024 boundaries): ONS code, name, nation, region, county/borough/burgh, hex cell | 2024-07-04 |
| `uk-map.json` | The same seats' real boundaries projected to SVG paths (transverse Mercator on 2°W, 2000 units tall): per-seat path, focus box, label point and room; seat, region and nation border meshes and the coast; region label points; city zoom boxes | 2024-07-04 |
| `ge2024.json` | 2024 general election result per seat: votes by party, electorate, valid/rejected, majority, MP as elected; map colour per party | 2024-07-04 |
| `census2021.json` | 21 census measures per seat (GB only; Scotland's density from boundary areas) | E&W 2021-03-21, Scotland 2022-03-20 |
| `world-110m.json` | 176 countries and territories as TopoJSON (Antarctica dropped) | Natural Earth via world-atlas 2.0.2 |
| `world-map.json` | The same projected to SVG paths (Natural Earth I, 1000 units wide): focus box, label point, political colour per country; border and coast meshes | derived |
| `countries.json` | Country index: ISO alpha-3, UN M49 region and sub-region, capital, status, land neighbours, blocs; the 8 blocs | 2026-09-30 (blocs, corrections) |

## Inputs

### Constituency hex map
- **File:** `uk-constituencies-2023.hexjson`, Open Innovations
  ([hexmaps](https://github.com/odileeds/hexmaps)), commit `17982f91f7f21b84b6c876f952437c8986172811`.
- **SHA-256:** `7a99cbd2f9574ee7e3fcb55a106189b7342d35c899e96554f51c06b6c73469d0`
- **Licence:** MIT (© Open Innovations).
- **Used for:** seat list, names (keeps "Ynys Môn", "Glyndŵr"), region codes, hex positions (`odd-r`).

### Constituency boundaries (real map)
- **Files:** `data/PCON24CD/<ONS code>.geojsonl` (one GeoJSON feature per seat, 650 files), Open Innovations
  ([geography-bits](https://github.com/open-innovations/geography-bits)), branch `master`.
- **Pin:** the repository has no releases, so the build pins the SHA-256 of the 650 files' contents joined in seat
  order with NUL separators: `80e91f97da3e272c8b36ae2ae71e88fbbbc7c4cd88ef570f97e18a9f0ae2ae21` (cached as
  `data-raw/.cache/pcon24-boundaries.geojsonl`). A changed upstream file fails the build instead of changing the map.
- **Upstream and licence:** ONS Westminster Parliamentary Constituencies (July 2024) boundaries, already generalised
  by Open Innovations, Open Government Licence v3.0. Attribution (from the repository's licence): "Source: Office for
  National Statistics licensed under the Open Government Licence v.3.0. Contains OS data © Crown copyright and
  database right 2021."
- **Processing (`scripts/data/ukmap.ts`):** rings rewound for d3 (RFC 7946 winds the other way); one TopoJSON
  topology (quantised to 1e6) so neighbours share borders exactly; Visvalingam simplification keeping 30% of points;
  rings under 1e-5 square degrees dropped and every ring rewound again (simplifying can collapse or flip a sliver,
  which d3 would read as the whole sphere; the build fails if any shape comes out inside-out); label points are each
  seat's pole of inaccessibility (`polylabel`); region labels use the merged region.
- **City zoom boxes:** `data-raw/manual/uk-map-places.json`, hand-drawn lon/lat boxes round 10 built-up areas.

### GE2024 results and census measures (Great Britain)
- **File:** `2024-UK-General-Election-Census-Constituency-Summaries-File-v1.1.csv`, University of Bristol
  ([UKGE24_wpc_census_summaries](https://github.com/ralphascott/UKGE24_wpc_census_summaries)), commit
  `d37264281d7ffa9eff6a86a01008c15e331022cc`. 632 GB seats.
- **SHA-256:** `981cd8b104683c95ffe9b7af5a1dd1a8a2b3e6d728c506212b6b7915a327fe8c`
- **Upstream and licences:**
  - 2024 results: House of Commons Library, *General election 2024 results* (CBP-10009), Open Parliament
    Licence v3.0. Attribution: "Contains Parliamentary information licensed under the Open Parliament Licence v3.0."
  - Census: ONS Census 2021 (England and Wales, via Nomis) and Scotland's Census 2022 (National Records of
    Scotland), Open Government Licence v3.0. Attribution: "Contains public sector information licensed under the
    Open Government Licence v3.0."
- **Caveat:** the compiled file has no licence of its own, so we take only the fields whose upstream licence is
  clear (2024 results, census). We drop its 2019 notional results (Rallings and Thrasher), EU-referendum estimates
  (Hanretty) and Scottish-referendum estimates (Miori).
- **Processing:** votes for parties without a column (independents, the Speaker, Workers Party) sit in "other";
  the winner's or runner-up's votes are recovered from the majority. Checked: every majority is a whole number of
  votes and every seat's votes sum to its valid votes. Census measures are percentages to 1 dp. Several
  (qualifications, tenure, NS-SEC, health, cars, deprivation) are not published for Scotland in this file and are
  `null`; the map hatches them and says why.
- **Density for Scotland** (not in the file) is worked out as population ÷ the seat's area from the boundary file
  (d3 `geoArea`, mean Earth radius 6,371.0088 km). Checked against the 575 English and Welsh seats that have an
  official density: median ratio 1.003, 90% within ±3%, worst 0.88 / 1.11 (coastal seats).

### Northern Ireland (18 seats)
- **File:** `mandate/data-raw/manual/ni-ge2024-results.json`: every candidate's votes, electorate, rejected
  ballots and MP per seat, transcribed by hand on 2026-10-03 from the UK Parliament results pages
  (`electionresults.parliament.uk/elections/<id>` or `members.parliament.uk/constituency/<id>/election/422`; each
  seat lists its page). The Commons Library CSV, the Electoral Office for NI and Wikipedia are blocked from the
  build environment, so the pages were read through web search results. Replaces the 2026-09-30 winners-only file.
- **Checks:** each seat's candidates sum to its valid vote; majority (first − second) and turnout (valid ÷
  electorate) match the pages; party totals across the 18 seats match the published NI totals (SF 210,891; DUP
  172,058; Alliance 117,191; UUP 94,779; SDLP 86,861; TUV 48,685), which `tests/data.test.ts` asserts. One
  figure is worth a second look against the official file: Mid Ulster's electorate is listed as exactly 74,000.
- **Folding:** as in the Commons Library files: People Before Profit, Aontú and Cross-Community Labour
  Alternative count as `other`; so does an independent who came neither first nor second (`source: "manual"`,
  `verified: true`).
- **To replace:** download `HoC-GE2024-results-by-constituency.csv` from
  [CBP-10009](https://commonslibrary.parliament.uk/research-briefings/cbp-10009/), put it in `mandate/data-raw/`
  and run `npm run data`. The official file then supplies all 650 seats (`source: "hoc"`), including declaration
  times for election night. Its column mapping (`fromHocCsv` in `scripts/data/ge2024.ts`) is written from the
  published column list and tested on a fixture, not on the real file; the script names any missing column.

### World borders
- **Package:** `world-atlas` 2.0.2 (npm, ISC; © Michael Bostock): Natural Earth 1:110m admin-0 countries, public
  domain.
- **Processing:** land layer and Antarctica dropped (no state, and it would take a fifth of the map's height); ids
  added for the three units Natural Earth leaves without an ISO code (Kosovo `XKX`, Northern Cyprus `XNC`,
  Somaliland `XSL`); abbreviated labels expanded ("Dem. Rep. Congo" → "Democratic Republic of the Congo",
  "Macedonia" → "North Macedonia", "United States of America" → "United States", …).
- **Map paths (`world-map.json`):** projected at build time with `d3-geo` (Natural Earth I, fitted to 1000 units
  wide) and `topojson-client` (both ISC, dev dependencies only), written as relative one-decimal SVG paths. Each
  country's focus box and label point come from its largest projected ring (mainland France, not French Guiana;
  Russia west of the antimeridian). Land neighbours are countries sharing an arc. Political colours: greedy
  colouring over 6 muted colours so neighbours never match; territories take their state's colour.

### Country regions and capitals
- **Source:** DataHub `datasets/country-codes`, commit `6a595f1a6f10b3d00175fe67375da88f64f7f76b`,
  `data/country-codes.csv` (SHA-256 `67b009b529330b0a6043551189f43faa785c9c3cc0011ad2bdb4eac876356c43`). Licence:
  Public Domain Dedication and License (the README notes ISO's own terms for the code lists).
- **Used:** ISO numeric (join key, zero-padded) and alpha-3; UN M49 region, sub-region and intermediate region (the
  intermediate one, e.g. Caribbean, is used where it exists); capital; `is_independent`.
- **Corrections** (`data-raw/manual/world-extra.json`, hand-entered 2026-09-30): regions and capitals for the three
  `X` units; diacritics the file drops (Bogotá, Reykjavík, …); Astana (renamed 2022); Ciudad de la Paz (Equatorial
  Guinea's capital from 2 January 2026, by presidential decree — checked by web search); neutral wording for
  disputed capitals (Jerusalem, East Jerusalem/Ramallah, Laayoune).
- **Status:** every unit the source does not mark independent must have a status entry, or the build fails.
  Territories (with their state): Falkland Islands (UK), Greenland (Denmark), New Caledonia and French Southern and
  Antarctic Lands (France), Puerto Rico (US). "State with limited recognition": Kosovo, Northern Cyprus, Palestine,
  Somaliland, Taiwan. "Disputed territory": Western Sahara. Descriptive only; the game takes no position.

### Blocs
- **File:** `data-raw/manual/world-blocs.json`, hand-entered and checked by web search on 2026-09-30. Members are ISO
  alpha-3 codes; the build checks every code and lists members too small for the 1:110m map (e.g. Malta, Singapore,
  most Caribbean and Pacific Commonwealth states).
- NATO 32 (Finland 2023, Sweden 2024); EU 27; G7 7 (the EU attends); G20 19 countries + EU + African Union (the US,
  hosting in 2026, has not invited South Africa, which stays listed as a member); BRICS 10 (Brazil, Russia, India,
  China, South Africa; Egypt, Ethiopia, Iran, UAE from 2024; Indonesia from 2025). **Saudi Arabia is left out:**
  invited in 2023, it has not confirmed membership (reports around the 2026 New Delhi summit). Commonwealth 56
  (Gabon and Togo joined 2022; Gabon's suspension ended July 2025). Five Eyes 5; UN Security Council P5 5.
- Search results used: NATO membership pages (vajiramandravi, legacyias, 2026), BRICS 2026 member lists (Wikipedia
  18th BRICS summit; businesstoday.in 2026-09-10), Saudi status (swissinfo; theglobeandmail; arabnews.pk 2026),
  Commonwealth (Wikipedia member states; commonwealthsport.com), EU (appf.europa.eu 2026 lists), G20 (Wikipedia 2026
  G20 Miami summit; thestatesman), Equatorial Guinea (archdaily; allafrica 2026-01-05). Re-check at M4.

### Party map colours
- **File:** `data-raw/manual/ge2024-party-colours.json`, hand-entered at T7: approximations of the colours election
  maps conventionally use for each party (colour only; no logos or other branding). Validated by the build (one
  `#rrggbb` per party key) and written into `ge2024.json`. Used only to mean that party (Party map mode, results
  table, main-menu backdrop). T12's party data replaces them.

## Hand-authored game data (not downloaded)

### Characters (T9)
- **Files:** `mandate/src/data/characters/traits.json` (17 traits and their effects) and `people.json` (name
  pools, heritage look weights, nation/class weights, occupations). Written for the game; no third-party data.
- **Names:** common given names and surnames for fictional NPCs, grouped into six loose heritage pools so families
  get consistent names. No real people.
- **Weights are game-design approximations, not statistics.** Heritage, class, religion-by-heritage, nation and
  appearance weights only aim for a plausible spread of fictional people across the UK; they are not taken from
  the census and must not be cited as figures. Heritage shapes names, family resemblance and religion odds, nothing
  else (no effect on skills, beliefs or events).
- **Avatars:** built in code from parameters (`src/sim/character/appearance.ts`); no model files, photos or
  photo-derived likenesses. Real politicians (T12) get hand-set parameters.

### Character creator (T10)
- **Files:** `mandate/src/data/characters/quiz.json` (14 agree/disagree statements and the compass/issue weights
  each answer moves) and the heritage `label`s in `people.json` (the creator's "Family roots"). Written for the game.
- **The quiz is game design, not a validated survey instrument.** Statements alternate direction so that agreeing
  with everything lands near the centre; weights are judgement calls, not fitted to the British Election Study or
  any other survey. Don't present a character's score as a real-world political classification.

## Known limits
- MPs are as elected on 4 July 2024. By-elections, defections and suspensions since then are not applied
  (T12 web-verifies current office-holders).
- No 2019 notional results, so a "swing since 2019" map mode needs another source.
- Northern Ireland has no census measures (NISRA publishes Census 2021 for the 2024 constituencies, but its site and
  the UK Data Service copy are blocked from the build environment). The map hatches NI in Demographics mode.
