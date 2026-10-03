/** The creator's Identity, Origins, Family and Start panels. */
import { PERSONAL_COLOURS, personalColour } from '../../sim/character/colours.ts'
import {
  EDUCATION_MIN_AGE,
  educationOptions,
  HOUSEHOLDS,
  MAX_SIBLINGS,
  NAME_MAX,
  START_AGE,
  UK,
  type CharacterSpec,
  type SpecProblem,
} from '../../sim/character/create.ts'
import { HERITAGES, OCCUPATIONS } from '../../sim/character/generate.ts'
import {
  CLASS_ORIGINS,
  EDUCATION,
  GENDERS,
  RELIGIONS,
  type ClassOrigin,
  type Education,
  type Gender,
  type Religion,
} from '../../sim/character/model.ts'
import { traitDefs } from '../../sim/character/traits.ts'
import { START_DATE } from '../../sim/clock.ts'
import { NATIONS, type Nation } from '../../sim/world.ts'
import {
  CLASS_LABELS,
  EDUCATION_LABELS,
  GENDER_LABELS,
  NATION_LABELS,
  RELIGION_LABELS,
} from '../character/labels.ts'
import { formatLongDate } from '../format.ts'
import { MapPinIcon, ShuffleIcon, WarningIcon, XIcon } from '../kit/icons.ts'
import { Button, Choice, ChoiceGroup, Segmented, Slider, Swatches } from '../kit/index.ts'
import { describeIdeology, HOUSEHOLD_LABELS, TAB_LABELS } from './describe.ts'
import { Field, Section, Select } from './Field.tsx'
import {
  COUNTRY_ITEMS,
  countryFromMap,
  countryName,
  SEAT_ITEMS,
  seatName,
  seatNation,
} from './places.ts'
import { SearchPick } from './SearchPick.tsx'
import { creatorStore, seatId, useCreator, type CreatorTab } from './store.ts'

const actions = () => creatorStore.getState()

export function IdentityPanel() {
  const spec = useCreator((s) => s.spec)
  const { update, randomise } = actions()
  return (
    <>
      <Section
        title="Name"
        actions={
          <Button size="s" variant="quiet" icon={ShuffleIcon} onClick={() => randomise('name')}>
            Suggest
          </Button>
        }
      >
        <div className="field-row">
          <Field label="First name">
            <input
              className="input"
              value={spec.givenName}
              maxLength={NAME_MAX}
              autoComplete="off"
              data-testid="creator-given-name"
              onChange={(e) => update({ givenName: e.target.value })}
            />
          </Field>
          <Field label="Surname">
            <input
              className="input"
              value={spec.familyName}
              maxLength={NAME_MAX}
              autoComplete="off"
              onChange={(e) => update({ familyName: e.target.value })}
            />
          </Field>
        </div>
      </Section>
      <Section title="You">
        <Field as="div" label="Gender">
          <Segmented<Gender>
            label="Gender"
            items={GENDERS.map((g) => ({ key: g, label: GENDER_LABELS[g] }))}
            value={spec.gender}
            onChange={(gender) => update({ gender })}
          />
        </Field>
        <Field label="Age" hint={`On ${formatLongDate(START_DATE)}, when the game begins.`}>
          <Slider
            label="Age"
            className="slider--wide"
            min={START_AGE.min}
            max={START_AGE.max}
            value={spec.age}
            format={(v) => v}
            onChange={(age) => update({ age })}
          />
        </Field>
      </Section>
      <Section title="Personal colour">
        <Field
          as="div"
          label={personalColour(spec.colour).name}
          hint="Marks you across the game: your portrait frame, your seat on the map, your place on the compass."
        >
          <Swatches
            label="Personal colour"
            size="l"
            swatches={PERSONAL_COLOURS.map((c) => ({ key: c.id, colour: c.dark, name: c.name }))}
            value={spec.colour}
            onChange={(colour) => update({ colour })}
          />
        </Field>
      </Section>
    </>
  )
}

function PlaceLine({ name, meta, onClear }: { name: string; meta?: string; onClear?: () => void }) {
  return (
    <p className="place-line">
      <MapPinIcon aria-hidden className="place-line__icon" />
      <span className="place-line__name">{name}</span>
      {meta && <span className="place-line__meta">{meta}</span>}
      {onClear && (
        <button type="button" className="place-line__clear" aria-label="Clear" onClick={onClear}>
          <XIcon aria-hidden />
        </button>
      )}
    </p>
  )
}

export function OriginsPanel() {
  const spec = useCreator((s) => s.spec)
  const target = useCreator((s) => s.mapTarget)
  const { update, setMapTarget } = actions()
  const born = spec.birthplace
  const abroad = born.country !== UK
  const bornNation = born.nation ?? spec.home.nation

  const pickHome = (ons: string) => {
    const nation = seatNation(ons)
    if (nation) update({ home: { nation, seat: seatId(ons) } })
  }
  const pickBornSeat = (ons: string) => {
    const nation = seatNation(ons)
    if (nation) update({ birthplace: { country: UK, nation, seat: seatId(ons) } })
  }
  const pickCountry = (mapId: string) => {
    const country = countryFromMap(mapId)
    if (!country) return
    update({
      birthplace: country === UK ? { country: UK, nation: spec.home.nation } : { country },
    })
  }
  const mapButton = (which: 'home' | 'born') => (
    <Button
      size="s"
      variant="quiet"
      icon={MapPinIcon}
      aria-pressed={target === which}
      onClick={() => setMapTarget(which)}
    >
      {target === which ? 'Clicking the map' : 'Pick on the map'}
    </Button>
  )

  return (
    <>
      <Section title="Where you live" actions={mapButton('home')}>
        <PlaceLine
          name={seatName(spec.home.seat) ?? `Somewhere in ${NATION_LABELS[spec.home.nation]}`}
          meta={NATION_LABELS[spec.home.nation]}
        />
        <SearchPick
          label="Find a constituency to live in"
          placeholder="Find a constituency"
          items={SEAT_ITEMS}
          onPick={pickHome}
        />
        <p className="field__hint">
          Your home seat: where you will join a local party and first stand for election.
        </p>
      </Section>
      <Section title="Where you were born" actions={mapButton('born')}>
        <Segmented<'uk' | 'abroad'>
          label="Born in"
          items={[
            { key: 'uk', label: 'The UK' },
            { key: 'abroad', label: 'Abroad' },
          ]}
          value={abroad ? 'abroad' : 'uk'}
          onChange={(k) => {
            setMapTarget('born')
            update({
              birthplace:
                k === 'uk'
                  ? { country: UK, nation: spec.home.nation, seat: spec.home.seat }
                  : { country: 'cty_IRL' },
            })
          }}
        />
        {abroad ? (
          <>
            <PlaceLine name={countryName(born.country)} />
            <SearchPick
              label="Find the country you were born in"
              placeholder="Find a country"
              items={COUNTRY_ITEMS}
              onPick={pickCountry}
            />
            <p className="field__hint">
              You grew up in Britain and hold British citizenship, which standing for Parliament
              needs, as well as your birth country’s.
            </p>
          </>
        ) : (
          <>
            <Field label="Nation">
              <Select<Nation>
                value={bornNation}
                options={NATIONS.map((n) => ({ value: n, label: NATION_LABELS[n] }))}
                onChange={(nation) => update({ birthplace: { country: UK, nation } })}
              />
            </Field>
            {born.seat && (
              <PlaceLine
                name={seatName(born.seat) ?? 'Unknown seat'}
                onClear={() => update({ birthplace: { country: UK, nation: bornNation } })}
              />
            )}
            <SearchPick
              label="Find the constituency you were born in"
              placeholder="Find a constituency (optional)"
              items={SEAT_ITEMS}
              onPick={pickBornSeat}
            />
          </>
        )}
      </Section>
    </>
  )
}

/** Jobs grouped for the select: starting out, then by the class of work. */
const JOB_GROUPS = [
  { label: 'Starting out', key: 'young' },
  { label: 'Trades and services', key: 'working' },
  { label: 'Professions', key: 'middle' },
  { label: 'Senior professions', key: 'upper' },
  { label: 'Other', key: 'retired' },
] as const

export function FamilyPanel() {
  const spec = useCreator((s) => s.spec)
  const { update } = actions()
  const open = educationOptions(spec.age)
  const known = JOB_GROUPS.some((g) => OCCUPATIONS[g.key].includes(spec.occupation))
  return (
    <>
      <Section title="Home life">
        <Field
          label="Family roots"
          hint="Shapes suggested names, family likeness and religion; nothing else."
        >
          <Select
            value={spec.heritage}
            options={HERITAGES.map((h) => ({ value: h.id, label: h.label }))}
            onChange={(heritage) => update({ heritage })}
          />
        </Field>
        <Field as="div" label="Upbringing">
          <Segmented<ClassOrigin>
            label="Upbringing"
            items={CLASS_ORIGINS.map((c) => ({ key: c, label: CLASS_LABELS[c] }))}
            value={spec.classOrigin}
            onChange={(classOrigin) => update({ classOrigin })}
          />
        </Field>
        <Field as="div" label="Politics at home" hint="Where your parents stand.">
          <Segmented
            label="Politics at home"
            items={HOUSEHOLDS.map((h) => ({ key: h, label: HOUSEHOLD_LABELS[h] }))}
            value={spec.household}
            onChange={(household) => update({ household })}
          />
        </Field>
        <Field as="div" label="Brothers and sisters">
          <Segmented
            label="Brothers and sisters"
            items={Array.from({ length: MAX_SIBLINGS + 1 }, (_, n) => ({
              key: String(n),
              label: ['None', 'One', 'Two'][n],
            }))}
            value={String(spec.siblings)}
            onChange={(n) => update({ siblings: Number(n) })}
          />
        </Field>
        <Field label="Religion">
          <Select<Religion>
            value={spec.religion}
            options={RELIGIONS.map((r) => ({ value: r, label: RELIGION_LABELS[r] }))}
            onChange={(religion) => update({ religion })}
          />
        </Field>
      </Section>
      <Section title="School and work">
        <Field label="Education">
          <Select<Education>
            value={spec.education}
            options={EDUCATION.filter((e) => e !== 'none').map((e) => ({
              value: e,
              label: open.includes(e)
                ? EDUCATION_LABELS[e]
                : `${EDUCATION_LABELS[e]} (age ${EDUCATION_MIN_AGE[e]}+)`,
              disabled: !open.includes(e),
            }))}
            onChange={(education) => update({ education })}
          />
        </Field>
        <Field label="Occupation">
          <Select
            value={spec.occupation}
            options={known ? [] : [{ value: spec.occupation, label: spec.occupation }]}
            groups={JOB_GROUPS.map((g) => ({
              label: g.label,
              options: OCCUPATIONS[g.key].map((o) => ({ value: o, label: o })),
            }))}
            onChange={(occupation) => update({ occupation })}
          />
        </Field>
      </Section>
    </>
  )
}

export function ProblemList({
  problems,
  onGo,
}: {
  problems: readonly SpecProblem[]
  onGo: (tab: CreatorTab) => void
}) {
  return (
    <ul className="creator-problems" role="alert">
      {problems.map((p, i) => (
        <li key={i} className="creator-problems__item">
          <WarningIcon weight="fill" aria-hidden className="creator-problems__icon" />
          <span>{p.message}</span>
          <Button size="s" variant="quiet" onClick={() => onGo(p.section)}>
            {TAB_LABELS[p.section]}
          </Button>
        </li>
      ))}
    </ul>
  )
}

function Facts({ spec }: { spec: CharacterSpec }) {
  const born = spec.birthplace
  const bornAt =
    born.country === UK
      ? (seatName(born.seat) ?? NATION_LABELS[born.nation ?? spec.home.nation])
      : countryName(born.country)
  return (
    <dl className="facts">
      <dt>Name</dt>
      <dd>
        {spec.givenName} {spec.familyName}
      </dd>
      <dt>Age</dt>
      <dd>{spec.age}</dd>
      <dt>Born</dt>
      <dd>{bornAt}</dd>
      <dt>Lives in</dt>
      <dd>{seatName(spec.home.seat) ?? NATION_LABELS[spec.home.nation]}</dd>
      <dt>Upbringing</dt>
      <dd>
        {CLASS_LABELS[spec.classOrigin]}, {HOUSEHOLD_LABELS[spec.household].toLowerCase()}
      </dd>
      <dt>Education</dt>
      <dd>{EDUCATION_LABELS[spec.education]}</dd>
      <dt>Occupation</dt>
      <dd>{spec.occupation}</dd>
      <dt>Traits</dt>
      <dd>
        {traitDefs(spec.traits)
          .map((t) => t.name)
          .join(', ') || 'None'}
      </dd>
      <dt>Beliefs</dt>
      <dd>{describeIdeology(spec.ideology)}</dd>
    </dl>
  )
}

export function StartPanel({ problems }: { problems: readonly SpecProblem[] }) {
  const spec = useCreator((s) => s.spec)
  const { update, setTab } = actions()
  return (
    <>
      <Section title="How to begin">
        <ChoiceGroup legend="Start mode" className="start-modes">
          <Choice
            name="start-mode"
            value="quick"
            checked={spec.startMode === 'quick'}
            onChange={() => update({ startMode: 'quick' })}
            label="Quick start"
            detail={`Begin on ${formatLongDate(START_DATE)} as you are now; your past is written for you.`}
          />
          <Choice
            name="start-mode"
            value="life"
            checked={spec.startMode === 'life'}
            disabled
            onChange={() => update({ startMode: 'life' })}
            label="Life mode (coming soon)"
            detail="Play your childhood and youth a year at a time, up to the start date."
          />
        </ChoiceGroup>
      </Section>
      <Section title="Your character">
        <Facts spec={spec} />
      </Section>
      {problems.length > 0 && (
        <Section title="Before you start">
          <ProblemList problems={problems} onGo={setTab} />
        </Section>
      )}
    </>
  )
}
