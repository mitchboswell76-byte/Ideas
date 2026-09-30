# Data sources

Everything in `mandate/src/data/generated/` is built by `npm run data` (`mandate/scripts/build-data.ts`) from the
pinned inputs below. Downloads are checked against the SHA-256 listed here and cached in `mandate/data-raw/.cache/`
(gitignored); `npm run data -- --refresh` re-downloads. The outputs are committed, so the game builds offline.
The licences' attribution lines are shown in the game's Settings screen (`src/data/credits.ts`).

| Output | Content | As of |
|---|---|---|
| `uk-seats.json` | 650 Westminster seats (2024 boundaries): ONS code, name, nation, region, county/borough/burgh, hex cell | 2024-07-04 |
| `ge2024.json` | 2024 general election result per seat: votes by party, electorate, valid/rejected, majority, MP as elected | 2024-07-04 |
| `census2021.json` | 21 census measures per seat (GB only) | E&W 2021-03-21, Scotland 2022-03-20 |
| `world-110m.json`, `countries.json` | 177 countries as TopoJSON + id/name index | Natural Earth via world-atlas 2.0.2 |

## Inputs

### Constituency hex map
- **File:** `uk-constituencies-2023.hexjson`, Open Innovations
  ([hexmaps](https://github.com/odileeds/hexmaps)), commit `17982f91f7f21b84b6c876f952437c8986172811`.
- **SHA-256:** `7a99cbd2f9574ee7e3fcb55a106189b7342d35c899e96554f51c06b6c73469d0`
- **Licence:** MIT (© Open Innovations).
- **Used for:** seat list, names (keeps "Ynys Môn", "Glyndŵr"), region codes, hex positions (`odd-r`).

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
  (qualifications, tenure, NS-SEC, health, cars, deprivation, density) are not published for Scotland in this file
  and are `null`.

### Northern Ireland (18 seats)
- **File:** `mandate/data-raw/manual/ni-ge2024-winners.json`: winning party only, entered by hand on 2026-09-30.
- **Status:** unverified (`verified: false`, `source: "manual"`, no votes, no MP). The Commons Library,
  Wikipedia and the Electoral Office for NI are blocked from the build environment, and no GitHub copy of the NI
  results was found. Totals match the published result: SF 7, DUP 5, SDLP 2, Alliance 1, UUP 1, TUV 1, Ind 1.
- **To replace:** download `HoC-GE2024-results-by-constituency.csv` from
  [CBP-10009](https://commonslibrary.parliament.uk/research-briefings/cbp-10009/), put it in `mandate/data-raw/`
  and run `npm run data`. The official file then supplies all 650 seats (`source: "hoc"`), including NI votes and
  declaration times for election night. Its column mapping (`fromHocCsv` in `scripts/data/ge2024.ts`) is written
  from the published column list and tested on a fixture, not on the real file; the script names any missing column.

### World borders
- **Package:** `world-atlas` 2.0.2 (npm, ISC; © Michael Bostock): Natural Earth 1:110m admin-0 countries, public
  domain.
- **Processing:** land layer dropped; ids added for the three countries Natural Earth leaves without an ISO code
  (Kosovo `XKX`, Northern Cyprus `XNC`, Somaliland `XSL`); abbreviated labels expanded ("Dem. Rep. Congo" →
  "Democratic Republic of the Congo", "Macedonia" → "North Macedonia", "United States of America" →
  "United States", …). The list includes territories (Greenland, Falkland Islands, Western Sahara, Puerto Rico,
  New Caledonia) and Antarctica; T6 decides how the map treats them.

## Known limits
- MPs are as elected on 4 July 2024. By-elections, defections and suspensions since then are not applied
  (T12 web-verifies current office-holders).
- No 2019 notional results, so a "swing since 2019" map mode needs another source.
- Northern Ireland has no census measures (NISRA data is not in the GB file).
