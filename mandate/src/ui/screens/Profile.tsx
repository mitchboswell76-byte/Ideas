/**
 * Profile (DESIGN §17: FM player profile + CK3 character window): framed portrait, traits,
 * FM-coloured attributes, skills with their check odds, condition, standing, beliefs and the
 * people they know. Shows the player, or anyone opened from a relations list.
 */
import { memo } from 'react'
import { AvatarImage, Portrait } from '../avatar/Portrait.tsx'
import { useRig } from '../avatar/useRig.ts'
import { formatLongDate } from '../format.ts'
import type { CharacterView, RelationView } from '../../runtime/queries.ts'
import {
  ATTRIBUTE_LABELS,
  fullName,
  SKILL_LABELS,
  SKILLS,
  type AttributeKey,
  type Character,
} from '../../sim/character/model.ts'
import { traitDefs } from '../../sim/character/traits.ts'
import { toIso } from '../../sim/clock.ts'
import {
  CLASS_LABELS,
  EDUCATION_LABELS,
  GENDER_LABELS,
  NATION_LABELS,
  opinionTone,
  relationLabel,
  RELIGION_LABELS,
  sortRelations,
} from '../character/labels.ts'
import { Compass, IssueScales, TraitEffects } from '../character/Beliefs.tsx'
import { useCharacterView } from '../character/useCharacter.ts'
import { ArrowLeftIcon, ScrollIcon, UserIcon, UsersIcon } from '../kit/icons.ts'
import {
  AttributeGrid,
  Button,
  Chip,
  ModifierList,
  Panel,
  Tooltip,
  cx,
  formatSigned,
} from '../kit/index.ts'
import { navStore, useNav } from '../store/nav.ts'
import './profile.css'
import './screens.css'

const ATTRIBUTE_GROUPS: { title: string; keys: AttributeKey[] }[] = [
  { title: 'Presence', keys: ['charisma', 'empathy', 'stamina'] },
  { title: 'Mind', keys: ['intellect', 'cunning', 'discipline'] },
]

/** A thin 0–100 bar (FM condition bars). */
function Bar({
  value,
  max = 100,
  tone,
}: {
  value: number
  max?: number
  tone?: 'good' | 'warn' | 'bad'
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <span className="bar" aria-hidden>
      <span
        className={cx('bar__fill', tone && `bar__fill--${tone}`)}
        style={{ width: `${pct}%` }}
      />
    </span>
  )
}

function Header({ view }: { view: CharacterView }) {
  const c = view.character
  const person = { name: fullName(c), appearance: c.appearance, age: view.age, gender: c.gender }
  const nation = c.background.birthplace.nation
  return (
    <header className="profile__head">
      <Portrait person={person} size="l" you={view.isPlayer} />
      <div className="profile__id">
        <p className="profile__kicker">{view.isPlayer ? 'You' : 'Profile'}</p>
        <h2 className="profile__name">{fullName(c)}</h2>
        <p className="profile__sub">
          {view.age} · {c.occupation}
          {nation && ` · ${NATION_LABELS[nation]}`}
        </p>
        <div className="chip-row profile__traits">
          {traitDefs(c.traits).map((t) => (
            <Tooltip
              key={t.id}
              title={t.name}
              tip={
                <div className="trait-tip">
                  <p>{t.description}</p>
                  <TraitEffects id={t.id} />
                </div>
              }
            >
              <Chip>{t.name}</Chip>
            </Tooltip>
          ))}
        </div>
      </div>
    </header>
  )
}

const Attributes = memo(function Attributes({ a }: { a: Character['attributes'] }) {
  return (
    <Panel title="Attributes">
      <AttributeGrid
        groups={ATTRIBUTE_GROUPS.map((g) => ({
          title: g.title,
          attributes: g.keys.map((k) => ({ name: ATTRIBUTE_LABELS[k], value: a[k] })),
        }))}
      />
    </Panel>
  )
})

const Skills = memo(function Skills({
  s,
  allOdds,
}: {
  s: Character['skills']
  allOdds: CharacterView['odds']
}) {
  return (
    <Panel title="Skills" icon={ScrollIcon}>
      <ul className="skills">
        {SKILLS.map((k) => {
          const odds = allOdds[k]
          return (
            <li key={k}>
              <Tooltip
                className="skills__tip"
                title={`${SKILL_LABELS[k]}: ${odds.chance}% on an ordinary check`}
                tip={
                  <ModifierList
                    items={odds.modifiers.map((m) => ({
                      label: m.label,
                      value: m.value,
                      unit: '%',
                    }))}
                    total="Chance"
                  />
                }
              >
                <span className="skills__row">
                  <span className="skills__name">{SKILL_LABELS[k]}</span>
                  <Bar value={s[k]} />
                  <span className="skills__value num">{Math.round(s[k])}</span>
                </span>
              </Tooltip>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
})

const Condition = memo(function Condition({
  condition,
  st,
  energyMax,
}: {
  condition: Character['condition']
  st: Character['standing']
  energyMax: number
}) {
  const { health, stress, energy } = condition
  const tone = (v: number, invert = false) => {
    const x = invert ? 100 - v : v
    return x >= 60 ? 'good' : x >= 35 ? 'warn' : 'bad'
  }
  return (
    <Panel title="Condition">
      <dl className="stats">
        <dt>Health</dt>
        <dd>
          <Bar value={health} tone={tone(health)} />
          <span className="num">{health}</span>
        </dd>
        <dt>Stress</dt>
        <dd>
          <Bar value={stress} tone={tone(stress, true)} />
          <span className="num">{stress}</span>
        </dd>
        <dt>Energy</dt>
        <dd>
          <Bar value={energy} max={energyMax} />
          <span className="num">
            {energy}/{energyMax}
          </span>
        </dd>
      </dl>
      <h3 className="label profile__sublabel">Standing</h3>
      <dl className="stats">
        <dt>Local fame</dt>
        <dd>
          <Bar value={st.fame.local} />
          <span className="num">{st.fame.local}</span>
        </dd>
        <dt>National fame</dt>
        <dd>
          <Bar value={st.fame.national} />
          <span className="num">{st.fame.national}</span>
        </dd>
        <dt>Credibility</dt>
        <dd>
          <Bar value={st.credibility} />
          <span className="num">{st.credibility}</span>
        </dd>
        <dt>Heat</dt>
        <dd>
          <Bar value={st.heat} tone={st.heat > 50 ? 'bad' : undefined} />
          <span className="num">{st.heat}</span>
        </dd>
      </dl>
    </Panel>
  )
})

const Beliefs = memo(function Beliefs({ i }: { i: Character['ideology'] }) {
  return (
    <Panel title="Beliefs">
      <div className="beliefs">
        <Compass econ={i.econ} social={i.social} />
        <IssueScales issues={i.issues} />
      </div>
    </Panel>
  )
})

function Background({ view }: { view: CharacterView }) {
  const c = view.character
  const b = c.background
  return (
    <Panel title="Background" icon={UserIcon}>
      <dl className="facts">
        <dt>Born</dt>
        <dd>
          {formatLongDate(toIso(c.birthDay))}
          {b.birthplace.nation && `, ${NATION_LABELS[b.birthplace.nation]}`}
        </dd>
        <dt>Gender</dt>
        <dd>{GENDER_LABELS[c.gender]}</dd>
        <dt>Upbringing</dt>
        <dd>{CLASS_LABELS[b.classOrigin]}</dd>
        <dt>Education</dt>
        <dd>{EDUCATION_LABELS[b.education]}</dd>
        <dt>Religion</dt>
        <dd>{RELIGION_LABELS[b.religion]}</dd>
        <dt>Occupation</dt>
        <dd>{c.occupation}</dd>
      </dl>
    </Panel>
  )
}

function RelationAvatar({ r }: { r: RelationView }) {
  const rig = useRig({ name: r.name, appearance: r.appearance, age: r.age, gender: r.gender })
  return (
    <span className="relation__face">
      <AvatarImage rig={rig} />
    </span>
  )
}

const RelationAvatarMemo = memo(RelationAvatar)

const Relations = memo(function Relations({
  relations,
  name,
}: {
  relations: CharacterView['relations']
  name: string
}) {
  const list = sortRelations(relations)
  return (
    <Panel title="People" icon={UsersIcon} flush>
      {list.length === 0 ? (
        <p className="list-empty">Nobody yet.</p>
      ) : (
        <ul className="list relations">
          {list.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                className="list__row relation"
                onClick={() => navStore.getState().openProfile(r.id)}
              >
                <RelationAvatarMemo r={r} />
                <span className="relation__who">
                  <span className="list__title">{r.name}</span>
                  <span className="list__meta">
                    {relationLabel(r)} · {r.age}
                    {!r.alive && ' · died'}
                  </span>
                </span>
                <Tooltip
                  title="Opinion"
                  tip={
                    <ModifierList
                      items={[
                        { label: `${name} of them`, value: r.opinion },
                        ...(r.theirOpinion !== null
                          ? [{ label: `They of ${name}`, value: r.theirOpinion }]
                          : []),
                      ]}
                    />
                  }
                >
                  <span className={cx('opinion num', `opinion--${opinionTone(r.opinion)}`)}>
                    {formatSigned(r.opinion)}
                  </span>
                </Tooltip>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
})

export function Profile() {
  const person = useNav((s) => s.person)
  const view = useCharacterView(person)
  if (view === undefined) return <p className="empty">Loading…</p>
  if (view === null) {
    return (
      <p className="empty">
        {person ? 'This person is not in the game.' : 'No character in this game yet.'}
      </p>
    )
  }
  return (
    <div className="profile" data-testid="profile">
      {person && (
        <div className="profile__back">
          <Button
            size="s"
            variant="quiet"
            icon={ArrowLeftIcon}
            onClick={() => navStore.getState().openProfile(null)}
          >
            Your profile
          </Button>
        </div>
      )}
      <Header view={view} />
      <div className="profile__grid">
        <div className="profile__col">
          <Attributes a={view.character.attributes} />
          <Skills s={view.character.skills} allOdds={view.odds} />
        </div>
        <div className="profile__col">
          <Condition
            condition={view.character.condition}
            st={view.character.standing}
            energyMax={view.energyMax}
          />
          <Beliefs i={view.character.ideology} />
        </div>
        <div className="profile__col">
          <Relations relations={view.relations} name={view.character.givenName} />
          <Background view={view} />
        </div>
      </div>
    </div>
  )
}
