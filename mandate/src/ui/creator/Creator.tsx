/**
 * Character creation (T10, DESIGN §4): the CK3 ruler designer crossed with the Sims' Create-a-Sim.
 * Categories on the left, the avatar on a turntable in the centre (the map on Origins, the compass
 * on Beliefs), controls on the right; randomise and presets throughout. Start career hands the
 * finished `CharacterSpec` to the sim, which checks it again.
 */
import { lazy, Suspense, useCallback, useMemo, useState } from 'react'
import { EXPRESSIONS, type Expression } from '../../sim/character/appearance.ts'
import { personalColour } from '../../sim/character/colours.ts'
import { specProblems, UK, type SpecSection } from '../../sim/character/create.ts'
import { fullName } from '../../sim/character/model.ts'
import { useRig } from '../avatar/useRig.ts'
import { Turntable } from '../avatar/Turntable.tsx'
import { NATION_LABELS } from '../character/labels.ts'
import { useYouColour } from '../character/you.ts'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  IdentificationCardIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  MapPinIcon,
  PersonSimpleIcon,
  PlayIcon,
  ScalesIcon,
  ShuffleIcon,
  SparkleIcon,
  UsersThreeIcon,
  WarningIcon,
  type Icon,
} from '../kit/icons.ts'
import { Button, IconButton, Segmented, cx } from '../kit/index.ts'
import { randomSeed } from '../random.ts'
import { gameStore, useGame } from '../store/index.ts'
import { useView } from '../store/view.ts'
import { AbilitiesPanel } from './AbilitiesPanel.tsx'
import { BeliefsPanel, BeliefsStage } from './BeliefsPanel.tsx'
import { TAB_HINTS, TAB_LABELS } from './describe.ts'
import { LookPanel } from './LookPanel.tsx'
import { FamilyPanel, IdentityPanel, OriginsPanel, ProblemList, StartPanel } from './panels.tsx'
import { countryFromMap, mapIdOfCountry, onsOf, seatName, seatNation } from './places.ts'
import { creatorStore, CREATOR_TABS, seatId, useCreator, type CreatorTab } from './store.ts'
import '../screens/screens.css'
import './creator.css'

const OriginsMap = lazy(() => import('./OriginsMap.tsx'))

const TAB_ICONS: Record<CreatorTab, Icon> = {
  identity: IdentificationCardIcon,
  origins: MapPinIcon,
  family: UsersThreeIcon,
  look: PersonSimpleIcon,
  abilities: SparkleIcon,
  beliefs: ScalesIcon,
  start: PlayIcon,
}

const EXPRESSION_LABELS: Record<Expression, string> = {
  neutral: 'Neutral',
  smile: 'Smile',
  grim: 'Grim',
  worried: 'Worried',
  angry: 'Angry',
}

function Nav({ tab, flagged }: { tab: CreatorTab; flagged: ReadonlySet<SpecSection> }) {
  return (
    <nav className="creator__nav" aria-label="Character">
      <ol className="creator__steps">
        {CREATOR_TABS.map((t, i) => {
          const TabIcon = TAB_ICONS[t]
          return (
            <li key={t}>
              <button
                type="button"
                className="creator__step"
                aria-current={t === tab ? 'step' : undefined}
                data-testid={`creator-tab-${t}`}
                onClick={() => creatorStore.getState().setTab(t)}
              >
                <TabIcon
                  className="creator__step-icon"
                  weight={t === tab ? 'fill' : 'regular'}
                  aria-hidden
                />
                <span className="creator__step-text">
                  <span className="creator__step-label">
                    <span className="creator__step-n num">{i + 1}</span>
                    {TAB_LABELS[t]}
                  </span>
                  <span className="creator__step-hint">{TAB_HINTS[t]}</span>
                </span>
                {flagged.has(t) && (
                  <WarningIcon
                    weight="fill"
                    className="creator__step-flag"
                    aria-label="Needs attention"
                  />
                )}
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function AvatarStage() {
  const spec = useCreator((s) => s.spec)
  const expression = useCreator((s) => s.expression)
  const zoom = useCreator((s) => s.zoom)
  const { setExpression, setZoom } = creatorStore.getState()
  // The 2D illustration is a bust already: nothing to zoom.
  const turns = useView((s) => s.view === '3d' && s.webgl)
  const person = useMemo(
    () => ({
      name: fullName(spec),
      appearance: spec.appearance,
      age: spec.age,
      gender: spec.gender,
    }),
    [spec],
  )
  const rig = useRig(person, {
    expression,
    accessories: ['rosette'],
    partyColour: personalColour(spec.colour).dark,
  })
  const onZoom = useCallback((z: 0 | 1) => setZoom(z), [setZoom])
  return (
    <div className="stage">
      <div className="stage__tools">
        <Segmented<Expression>
          label="Expression"
          className="stage__expressions"
          items={EXPRESSIONS.map((e) => ({ key: e, label: EXPRESSION_LABELS[e] }))}
          value={expression}
          onChange={setExpression}
        />
        {turns && (
          <IconButton
            icon={zoom === 1 ? MagnifyingGlassMinusIcon : MagnifyingGlassPlusIcon}
            label={zoom === 1 ? 'Whole body' : 'Zoom to face'}
            shortcut="Wheel"
            variant="secondary"
            onClick={() => setZoom(zoom === 1 ? 0 : 1)}
          />
        )}
      </div>
      <Turntable
        rig={rig}
        zoom={zoom}
        onZoom={onZoom}
        label={`${fullName(spec)}, ${spec.age}`}
        className="stage__turntable"
      />
    </div>
  )
}

function MapStage() {
  const spec = useCreator((s) => s.spec)
  const target = useCreator((s) => s.mapTarget)
  const { update } = creatorStore.getState()
  const abroad = spec.birthplace.country !== UK
  const world = target === 'born' && abroad
  const onPick = useCallback(
    (id: string) => {
      if (world) {
        const country = countryFromMap(id)
        // The UK on the world map means born at home after all.
        if (country === UK) update({ birthplace: { country: UK, nation: spec.home.nation } })
        else if (country) update({ birthplace: { country } })
        return
      }
      const nation = seatNation(id)
      if (!nation) return
      if (target === 'home') update({ home: { nation, seat: seatId(id) } })
      else update({ birthplace: { country: UK, nation, seat: seatId(id) } })
    },
    [world, target, update, spec.home.nation],
  )
  return (
    <div className="stage stage--map">
      <p className="stage__note">
        {world
          ? 'Click the country you were born in.'
          : target === 'home'
            ? 'Click the constituency you live in.'
            : 'Click the constituency you were born in.'}
      </p>
      <Suspense fallback={<p className="stage__loading">Loading the map…</p>}>
        <OriginsMap
          mode={world ? 'world' : 'uk'}
          target={target}
          home={onsOf(spec.home.seat)}
          born={onsOf(spec.birthplace.seat)}
          country={mapIdOfCountry(spec.birthplace.country)}
          onPick={onPick}
        />
      </Suspense>
    </div>
  )
}

function Caption() {
  const spec = useCreator((s) => s.spec)
  const place = seatName(spec.home.seat) ?? NATION_LABELS[spec.home.nation]
  return (
    <div className="stage__caption">
      <p className="stage__name">{fullName(spec).trim() || 'Unnamed'}</p>
      <p className="stage__sub">
        {spec.age} · {spec.occupation} · {place}
      </p>
    </div>
  )
}

export default function Creator({ onBack }: { onBack: () => void }) {
  const spec = useCreator((s) => s.spec)
  const tab = useCreator((s) => s.tab)
  const lastError = useGame((s) => s.lastError)
  const [busy, setBusy] = useState(false)
  const problems = useMemo(() => specProblems(spec), [spec])
  const flagged = useMemo(() => new Set(problems.map((p) => p.section)), [problems])
  useYouColour(spec.colour)

  const start = () => {
    if (problems.length > 0) {
      creatorStore.getState().setTab('start')
      return
    }
    setBusy(true)
    void gameStore
      .getState()
      .newGame(randomSeed(), spec)
      .then(() => {
        // A game took over the screen; the next career starts from a fresh draft.
        if (gameStore.getState().date) creatorStore.getState().begin()
      })
      .finally(() => setBusy(false))
  }

  const index = CREATOR_TABS.indexOf(tab)
  const next = CREATOR_TABS[index + 1]
  const stage =
    tab === 'origins' ? (
      <MapStage />
    ) : tab === 'beliefs' ? (
      <BeliefsStage ideology={spec.ideology} />
    ) : (
      <AvatarStage />
    )

  return (
    <div className="creator" data-testid="creator">
      <header className="creator__head">
        <Button variant="quiet" icon={ArrowLeftIcon} onClick={onBack}>
          Main menu
        </Button>
        <h1 className="creator__title">New career</h1>
        <div className="creator__head-actions">
          <Button
            variant="secondary"
            icon={ShuffleIcon}
            onClick={() => creatorStore.getState().randomise('all')}
          >
            Randomise<span className="hide-narrow"> everything</span>
          </Button>
          <Button
            variant="primary"
            iconEnd={ArrowRightIcon}
            disabled={busy}
            aria-describedby={problems.length > 0 ? 'creator-problems' : undefined}
            data-testid="creator-start"
            onClick={start}
          >
            Start career
          </Button>
        </div>
      </header>
      <div className={cx('creator__body', `creator__body--${tab}`)}>
        <Nav tab={tab} flagged={flagged} />
        <main className="creator__stage">
          {stage}
          {tab !== 'beliefs' && tab !== 'origins' && <Caption />}
        </main>
        <aside className="creator__panel" aria-label={TAB_LABELS[tab]}>
          <h2 className="creator__panel-title">{TAB_LABELS[tab]}</h2>
          <div className="creator__panel-body">
            {tab === 'identity' && <IdentityPanel />}
            {tab === 'origins' && <OriginsPanel />}
            {tab === 'family' && <FamilyPanel />}
            {tab === 'look' && <LookPanel />}
            {tab === 'abilities' && <AbilitiesPanel />}
            {tab === 'beliefs' && <BeliefsPanel />}
            {tab === 'start' && <StartPanel problems={problems} />}
            {lastError && (
              <p className="creator__error" role="alert">
                <WarningIcon weight="fill" aria-hidden />
                {lastError}
              </p>
            )}
          </div>
          <footer className="creator__panel-foot">
            {problems.length > 0 && tab !== 'start' && (
              <div id="creator-problems" className="creator__problems">
                <ProblemList
                  problems={problems.slice(0, 2)}
                  onGo={creatorStore.getState().setTab}
                />
              </div>
            )}
            {next ? (
              <Button
                variant="secondary"
                iconEnd={ArrowRightIcon}
                onClick={() => creatorStore.getState().setTab(next)}
              >
                {TAB_LABELS[next]}
              </Button>
            ) : (
              <Button
                variant="primary"
                iconEnd={ArrowRightIcon}
                disabled={busy || problems.length > 0}
                onClick={start}
              >
                Start career
              </Button>
            )}
          </footer>
        </aside>
      </div>
    </div>
  )
}
