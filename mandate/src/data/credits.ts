/** Attribution the data licences require (docs/DATA_SOURCES.md), shown in Settings. */
export interface DataCredit {
  what: string
  credit: string
}

export const DATA_CREDITS: DataCredit[] = [
  {
    what: '2024 general election results',
    credit:
      'House of Commons Library, via the University of Bristol constituency file. Contains ' +
      'Parliamentary information licensed under the Open Parliament Licence v3.0.',
  },
  {
    what: 'Census measures by constituency',
    credit:
      'Office for National Statistics (Census 2021) and National Records of Scotland ' +
      "(Scotland's Census 2022). Contains public sector information licensed under the Open " +
      'Government Licence v3.0.',
  },
  {
    what: 'Constituency boundaries',
    credit:
      'Source: Office for National Statistics licensed under the Open Government Licence v3.0. ' +
      'Contains OS data © Crown copyright and database right 2021. Via Open Innovations.',
  },
  { what: 'Constituency hex map', credit: 'Open Innovations (MIT licence).' },
  { what: 'World borders', credit: 'Natural Earth (public domain), via world-atlas.' },
  {
    what: 'Country regions and capitals',
    credit:
      'DataHub country codes (Public Domain Dedication and License), with UN M49 regions. ' +
      'Bloc memberships compiled for this game.',
  },
]
