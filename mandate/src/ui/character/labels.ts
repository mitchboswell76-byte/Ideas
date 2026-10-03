/** Player-facing words for character data (UK English). Pure. */
import type { RelationView } from '../../runtime/queries.ts'
import type {
  ClassOrigin,
  Education,
  Gender,
  RelationTag,
  Religion,
} from '../../sim/character/model.ts'
import type { Nation } from '../../sim/world.ts'

export const CLASS_LABELS: Record<ClassOrigin, string> = {
  working: 'Working class',
  middle: 'Middle class',
  upper: 'Upper class',
}

export const EDUCATION_LABELS: Record<Education, string> = {
  none: 'At school',
  gcse: 'GCSEs',
  alevel: 'A levels',
  degree: 'Degree',
  postgrad: 'Postgraduate degree',
}

export const RELIGION_LABELS: Record<Religion, string> = {
  none: 'No religion',
  christian: 'Christian',
  muslim: 'Muslim',
  hindu: 'Hindu',
  sikh: 'Sikh',
  jewish: 'Jewish',
  buddhist: 'Buddhist',
  other: 'Other religion',
}

export const NATION_LABELS: Record<Nation, string> = {
  england: 'England',
  scotland: 'Scotland',
  wales: 'Wales',
  'northern-ireland': 'Northern Ireland',
}

export const GENDER_LABELS: Record<Gender, string> = {
  female: 'Woman',
  male: 'Man',
  nonbinary: 'Non-binary',
}

const TAG_LABELS: Record<RelationTag, string> = {
  family: 'Family',
  partner: 'Partner',
  friend: 'Friend',
  rival: 'Rival',
  mentor: 'Mentor',
  donor: 'Donor',
  ally: 'Ally',
  enemy: 'Enemy',
}

const KIN: Record<NonNullable<RelationView['kin']>, Record<Gender, string>> = {
  parent: { female: 'Mother', male: 'Father', nonbinary: 'Parent' },
  child: { female: 'Daughter', male: 'Son', nonbinary: 'Child' },
  sibling: { female: 'Sister', male: 'Brother', nonbinary: 'Sibling' },
  partner: { female: 'Partner', male: 'Partner', nonbinary: 'Partner' },
}

/** "Mother", "Friend", "Rival"… for a relation row. */
export function relationLabel(r: Pick<RelationView, 'kin' | 'gender' | 'tags'>): string {
  if (r.kin) return KIN[r.kin][r.gender]
  const tag = r.tags.find((t) => t !== 'family') ?? r.tags[0]
  return tag ? TAG_LABELS[tag] : 'Acquaintance'
}

/** CK3-style opinion tone. */
export function opinionTone(opinion: number): 'good' | 'bad' | 'neutral' {
  return opinion >= 20 ? 'good' : opinion <= -20 ? 'bad' : 'neutral'
}

/** Relations in profile order: family first, then friends, then everyone else. */
export function sortRelations(list: readonly RelationView[]): RelationView[] {
  const rank = (r: RelationView) =>
    r.kin === 'partner' ? 0 : r.kin === 'parent' ? 1 : r.kin ? 2 : r.tags.includes('friend') ? 3 : 4
  return [...list].sort((a, b) => rank(a) - rank(b) || b.opinion - a.opinion)
}
