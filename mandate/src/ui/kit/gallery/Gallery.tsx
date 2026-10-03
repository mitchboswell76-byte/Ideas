import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import type { RunSpeed, Speed } from '../../../runtime/protocol.ts'
import type { Theme } from '../../store/theme.ts'
import { attributeBand } from '../attributes.ts'
import { readableInk } from '../colour.ts'
import {
  CalendarBlankIcon,
  ChartLineIcon,
  CoinsIcon,
  DownloadSimpleIcon,
  FlagIcon,
  FloppyDiskIcon,
  GearSixIcon,
  HouseIcon,
  MegaphoneIcon,
  PlusIcon,
  ScrollIcon,
  TrashIcon,
  TrayIcon,
  UserIcon,
} from '../icons.ts'
import {
  AttributeGrid,
  AttributeValue,
  Badge,
  Button,
  Card,
  Chip,
  DateSpeed,
  Dialogue,
  EventWindow,
  IconButton,
  ModifierList,
  Panel,
  PauseBanner,
  PortraitFrame,
  Sidebar,
  Segmented,
  Slider,
  Stepper,
  Swatches,
  Table,
  Tabs,
  Term,
  Ticker,
  Tile,
  Tooltip,
  VoteBar,
  type Column,
  type DialogueLine,
  type PartyColours,
} from '../index.ts'
import { DEFAULT_COLOUR, PERSONAL_COLOURS } from '../../../sim/character/colours.ts'
import { Avatars } from './Avatars.tsx'
import './gallery.css'

/** Fictional parties for the specimens; real parties arrive as data (T12). */
const PARTIES: readonly PartyColours[] = [
  { name: 'Independent', colour: '#56606b' },
  { name: 'Civic Union', colour: '#2e7d4f' },
  { name: 'Harbour Party', colour: '#d9642b' },
  { name: 'Moorland Alliance', colour: '#6d4bb0' },
]

const TOKENS = [
  ['bg', 'Ground'],
  ['surface-1', 'Surface 1'],
  ['surface-2', 'Surface 2'],
  ['surface-3', 'Surface 3'],
  ['line', 'Line'],
  ['line-strong', 'Strong line'],
  ['text', 'Text'],
  ['text-muted', 'Muted'],
  ['text-faint', 'Faint'],
  ['good', 'Good'],
  ['warn', 'Warning'],
  ['bad', 'Bad'],
  ['you', 'You'],
] as const

function Section({
  title,
  note,
  children,
}: {
  title: string
  note?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="specimen">
      <header className="specimen__head">
        <h2 className="specimen__title">{title}</h2>
        {note && <p className="specimen__note">{note}</p>}
      </header>
      <div className="specimen__body">{children}</div>
    </section>
  )
}

function Tokens() {
  return (
    <Section
      title="Colour"
      note="Tokens on :root, switched by data-theme. Party colours come from data and only mean parties."
    >
      <div className="swatches">
        {TOKENS.map(([token, label]) => (
          <div key={token} className="swatch">
            <span className="swatch__chip" style={{ background: `var(--${token})` }} />
            <span className="swatch__label">{label}</span>
            <code className="swatch__token">--{token}</code>
          </div>
        ))}
      </div>
      <p className="specimen__label">Attribute scale (FM), 1–20</p>
      <div className="attr-scale">
        {Array.from({ length: 20 }, (_, i) => i + 1).map((v) => (
          <span key={v} className={`attr-scale__cell attr--${attributeBand(v)}`}>
            {v}
          </span>
        ))}
      </div>
    </Section>
  )
}

function Type() {
  return (
    <Section
      title="Type"
      note="Broadsheet pairing (T10c): Newsreader for headlines, big figures, narrative and the masthead; Public Sans (Franklin Gothic lineage) for labels, tables and controls, in sentence case. Sections sit under ruled headings, not in boxes. Tabular numbers wherever figures line up."
    >
      <div className="type-specimens">
        <p className="kicker">Section heading · a heavy rule, then a short bold label</p>
        <p className="headline">Thursday 1 October 2026</p>
        <p className="type-display">Public Sans · Home · Inbox · Calendar</p>
        <p>The interface: buttons, labels and lists at 13 px, paragraphs at 14 px.</p>
        <p className="type-headline">Chancellor faces revolt over fuel duty</p>
        <p className="serif">
          Newsreader: “The branch meets on Thursdays in the back room of the Crown, and nobody has
          stood against the chair in eleven years.”
        </p>
        <p className="num type-nums">£1,204,550 · 32.4% · 326 · 2026</p>
      </div>
    </Section>
  )
}

function Buttons() {
  return (
    <Section
      title="Buttons"
      note="One primary per view. Icon buttons carry their label in a tooltip."
    >
      <div className="row">
        <Button variant="primary" icon={PlusIcon}>
          New save
        </Button>
        <Button icon={FloppyDiskIcon}>Quicksave</Button>
        <Button variant="quiet">Cancel</Button>
        <Button variant="danger" icon={TrashIcon}>
          Delete for good
        </Button>
        <Button disabled>Disabled</Button>
      </div>
      <div className="row">
        <Button size="s" variant="primary">
          Load
        </Button>
        <Button size="s">Overwrite</Button>
        <IconButton icon={DownloadSimpleIcon} label="Export save" />
        <IconButton icon={GearSixIcon} label="Settings" shortcut="Esc" variant="secondary" />
        <IconButton icon={FlagIcon} label="Pinned" pressed />
      </div>
    </Section>
  )
}

function ChipsTabs() {
  const [tab, setTab] = useState<'all' | 'unread' | 'news' | 'later'>('all')
  const [layout, setLayout] = useState<'map' | 'hex'>('map')
  return (
    <Section title="Chips, badges, tabs, segmented">
      <div className="row">
        <Chip icon={UserIcon}>Ambitious</Chip>
        <Chip icon={MegaphoneIcon}>Orator</Chip>
        <Chip tone="good">Rising</Chip>
        <Chip tone="warn">Stretched</Chip>
        <Chip tone="bad">Under investigation</Chip>
        {PARTIES.slice(1).map((p) => (
          <Chip key={p.name} party={p.colour}>
            {p.name}
          </Chip>
        ))}
        <Badge count={3} />
        <Badge count={128} />
        <Badge count={7} quiet />
      </div>
      <Tabs
        label="Example"
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'all', label: 'All' },
          { key: 'unread', label: 'Unread', count: 4 },
          { key: 'news', label: 'News' },
          { key: 'later', label: 'Later', disabled: 'Disabled tabs explain why in a tooltip' },
        ]}
      />
      <div className="row">
        <Segmented
          label="Layout"
          value={layout}
          onChange={setLayout}
          items={[
            { key: 'map', label: 'Map' },
            { key: 'hex', label: 'Hexes' },
          ]}
        />
      </div>
    </Section>
  )
}

function Creator() {
  const [height, setHeight] = useState(0.2)
  const [colour, setColour] = useState(DEFAULT_COLOUR)
  const [charisma, setCharisma] = useState(12)
  return (
    <Section
      title="Sliders, swatches, steppers"
      note="Character creator controls (T10): the Sims' sliders and colour swatches, the CK3 ruler designer's point-buy."
    >
      <div className="specimen__stack">
        <Slider
          label="Height"
          min={-1}
          max={1}
          step={0.05}
          value={height}
          format={(v) => Math.round(v * 10)}
          onChange={setHeight}
        />
        <Swatches
          label="Personal colour"
          size="l"
          swatches={PERSONAL_COLOURS.map((c) => ({ key: c.id, colour: c.dark, name: c.name }))}
          value={colour}
          onChange={setColour}
        />
        <div className="row">
          <span>Charisma</span>
          <Stepper
            label="Charisma"
            value={charisma}
            canDecrease={charisma > 4}
            canIncrease={charisma < 16}
            onChange={setCharisma}
          />
          <AttributeValue value={charisma} />
        </div>
      </div>
    </Section>
  )
}

const burnoutTip = (
  <>
    <span>
      At 80{' '}
      <Term tip="How worn down you are, 0–100. Rest, holidays and wins bring it down.">stress</Term>{' '}
      you may burn out: a month of rest, and your rivals notice.
    </span>
  </>
)

const stressTip = (
  <>
    <span>
      High stress lowers every check and can end in{' '}
      <Term title="Burnout" tip={burnoutTip}>
        burnout
      </Term>
      .
    </span>
    <ModifierList
      total="Change this week"
      items={[
        { label: 'Campaign schedule', value: 4, invert: true },
        { label: 'Workaholic', value: 2, invert: true },
        { label: 'Sunday off', value: -3, invert: true },
      ]}
    />
  </>
)

function Tooltips() {
  return (
    <Section
      title="Tooltips"
      note="CK3: hover for a moment and the bar fills; a locked tooltip can be entered, and its highlighted terms open their own tooltips. Esc closes."
    >
      <p className="serif tooltip-demo">
        Your{' '}
        <Term title="Stress" tip={stressTip}>
          stress
        </Term>{' '}
        is 46 and rising. The{' '}
        <Term
          title="Energy"
          tip={<span>A daily budget of about ten points. Activities reserve some each day.</span>}
        >
          energy
        </Term>{' '}
        you spend on the doorstep comes back overnight.
      </p>
      <div className="row">
        <Tooltip
          title="Fundraising dinner"
          tip={
            <ModifierList
              total="Net"
              items={[
                { label: 'Tickets', value: 2400, prefix: '£' },
                { label: 'Venue', value: -900, prefix: '£' },
                { label: 'Catering', value: -650, prefix: '£' },
              ]}
            />
          }
        >
          <Button icon={CoinsIcon}>Hover for a breakdown</Button>
        </Tooltip>
      </div>
    </Section>
  )
}

function ShellDemo() {
  const [screen, setScreen] = useState<string>('home')
  const [party, setParty] = useState(PARTIES[1]!)
  const [speed, setSpeed] = useState<Speed>(0)
  const [resume, setResume] = useState<RunSpeed>(2)
  const [day, setDay] = useState(1)
  const style = {
    '--party': party.colour,
    '--party-ink': readableInk(party.colour),
  } as CSSProperties
  const later = 'Not available yet'
  useEffect(() => {
    if (speed === 0) return
    const timer = window.setInterval(() => setDay((d) => d + 1), [0, 1000, 500, 200, 80, 16][speed])
    return () => window.clearInterval(timer)
  }, [speed])
  const date = `Thu ${((day - 1) % 30) + 1} Oct 2026`
  return (
    <Section
      title="Shell"
      note="Linear-style sidebar with FM's unread badges; the header is a breadcrumb with a stripe in the player's party colour; Paradox date, pause and five speed pips; the paused banner."
    >
      <div className="row">
        {PARTIES.map((p) => (
          <Button
            key={p.name}
            size="s"
            variant={p === party ? 'primary' : 'secondary'}
            onClick={() => setParty(p)}
          >
            {p.name}
          </Button>
        ))}
      </div>
      <div className="demo-shell">
        <Sidebar
          items={[
            { key: 'home', label: 'Home', icon: HouseIcon },
            { key: 'inbox', label: 'Inbox', icon: TrayIcon, badge: 3 },
            { key: 'calendar', label: 'Calendar', icon: CalendarBlankIcon },
            { key: 'party', label: 'Party', icon: FlagIcon, disabled: later },
            { key: 'polls', label: 'Polls', icon: ChartLineIcon, disabled: later },
          ]}
          footer={[
            { key: 'saves', label: 'Saves', icon: FloppyDiskIcon },
            { key: 'settings', label: 'Settings', icon: GearSixIcon },
          ]}
          active={screen}
          onSelect={setScreen}
          brand="Mandate"
          brandShort="M"
        />
        <div className="demo-shell__main">
          <header className="demo-topbar" style={style}>
            <div className="demo-topbar__title">
              <span className="demo-topbar__party">
                <span className="demo-topbar__dot" aria-hidden />
                {party.name}
              </span>
              <span className="demo-topbar__sep" aria-hidden>
                /
              </span>
              <h3 className="demo-topbar__screen">{screen}</h3>
            </div>
            <DateSpeed
              label={date}
              speed={speed}
              resumeSpeed={resume}
              onTogglePause={() => setSpeed(speed === 0 ? resume : 0)}
              onSpeed={(s) => {
                setSpeed(s)
                setResume(s)
              }}
              onStep={(n) => setDay((d) => d + n)}
            />
          </header>
          <div className="demo-shell__stage">
            {speed === 0 && (
              <PauseBanner
                reason={day === 1 ? null : 'Elections'}
                onResume={() => setSpeed(resume)}
              />
            )}
          </div>
        </div>
        <Sidebar
          rail
          items={[
            { key: 'home', label: 'Home', icon: HouseIcon },
            { key: 'inbox', label: 'Inbox', icon: TrayIcon, badge: 3 },
            { key: 'calendar', label: 'Calendar', icon: CalendarBlankIcon },
          ]}
          active={screen}
          onSelect={setScreen}
          brand="Mandate"
          brandShort="M"
          className="demo-rail"
        />
      </div>
    </Section>
  )
}

function TilesDemo() {
  const [open, setOpen] = useState<string | null>('polls')
  return (
    <Section
      title="Tiles and cards"
      note="A tile opens its card in place, one at a time; no stacked pop-ups. Home uses lists instead (T8c)."
    >
      <div className={open ? 'demo-tiles demo-tiles--open' : 'demo-tiles'}>
        <div className="demo-tiles__grid">
          <Tile
            title="Inbox"
            icon={TrayIcon}
            badge={2}
            open={open === 'inbox'}
            onOpen={() => setOpen(open === 'inbox' ? null : 'inbox')}
          >
            <span className="tile__stat">2</span>
            <span>unread</span>
          </Tile>
          <Tile
            title="Polls"
            icon={ChartLineIcon}
            open={open === 'polls'}
            onOpen={() => setOpen(open === 'polls' ? null : 'polls')}
          >
            <span className="tile__stat">31%</span>
            <span>Civic Union, up 2 on last week</span>
          </Tile>
        </div>
        {open && (
          <Card
            title={open === 'polls' ? 'Polls' : 'Inbox'}
            icon={open === 'polls' ? ChartLineIcon : TrayIcon}
            onClose={() => setOpen(null)}
            footer={<Button variant="primary">Go to {open === 'polls' ? 'Polls' : 'Inbox'}</Button>}
          >
            <p className="muted">
              The card opens where the detail belongs, and closes with Esc or the cross.
            </p>
          </Card>
        )}
      </div>
    </Section>
  )
}

interface Seat {
  name: string
  party: PartyColours
  majority: number
  turnout: number
  swing: number | null
}

const SEATS: readonly Seat[] = [
  { name: 'Aldermoor', party: PARTIES[1]!, majority: 4210, turnout: 61.2, swing: 3.1 },
  { name: 'Brackwater East', party: PARTIES[2]!, majority: 812, turnout: 55.8, swing: -1.4 },
  { name: 'Carnhill and Leys', party: PARTIES[3]!, majority: 12004, turnout: 67.9, swing: 0.6 },
  { name: 'Dunmore Vale', party: PARTIES[2]!, majority: 96, turnout: 49.3, swing: null },
  { name: 'Eastfold', party: PARTIES[1]!, majority: 7650, turnout: 58.1, swing: 5.2 },
]

const SEAT_COLUMNS: readonly Column<Seat>[] = [
  { key: 'name', label: 'Seat', value: (s) => s.name, firstDir: 'asc' },
  {
    key: 'party',
    label: 'Held by',
    value: (s) => s.party.name,
    firstDir: 'asc',
    render: (s) => <Chip party={s.party.colour}>{s.party.name}</Chip>,
  },
  {
    key: 'majority',
    label: 'Majority',
    value: (s) => s.majority,
    render: (s) => s.majority.toLocaleString('en-GB'),
    align: 'right',
  },
  {
    key: 'turnout',
    label: 'Turnout',
    value: (s) => s.turnout,
    render: (s) => `${s.turnout.toFixed(1)}%`,
    align: 'right',
  },
  {
    key: 'swing',
    label: 'Swing',
    value: (s) => s.swing,
    align: 'right',
    render: (s) =>
      s.swing === null ? '—' : `${s.swing > 0 ? '+' : '−'}${Math.abs(s.swing).toFixed(1)}`,
  },
]

function TableDemo() {
  const [selected, setSelected] = useState<string | null>('Dunmore Vale')
  return (
    <Section
      title="Table"
      note="FM density with Linear rows: hairlines, no zebra stripes, sortable headers, tabular numbers. Fictional seats."
    >
      <Panel flush>
        <Table
          label="Seats"
          columns={SEAT_COLUMNS}
          rows={SEATS}
          rowKey={(s) => s.name}
          initialSort={{ key: 'majority', dir: 'asc' }}
          selected={selected}
          onSelect={(s) => setSelected(s.name)}
        />
      </Panel>
    </Section>
  )
}

function Character() {
  return (
    <Section
      title="Character"
      note="CK3 framed portraits (silhouettes until the avatar generator) and FM's colour-coded attributes."
    >
      <div className="character-demo">
        <div className="portraits">
          <PortraitFrame name="You" size="l" you office="Councillor" party={PARTIES[1]} />
          <PortraitFrame name="Rival" size="m" office="Party chair" party={PARTIES[2]} />
          <PortraitFrame name="Ally" size="m" party={PARTIES[3]} />
          <div className="portraits__small">
            <PortraitFrame name="Contact" size="s" party={PARTIES[1]} />
            <PortraitFrame name="Contact" size="s" party={PARTIES[2]} />
            <PortraitFrame name="Contact" size="s" />
          </div>
        </div>
        <AttributeGrid
          groups={[
            {
              title: 'Presence',
              attributes: [
                {
                  name: 'Charisma',
                  value: 15,
                  tip: (
                    <ModifierList
                      total="Charisma"
                      items={[
                        { label: 'Base', value: 11 },
                        { label: 'Charming', value: 3 },
                        { label: 'Local hero', value: 1 },
                      ]}
                    />
                  ),
                },
                { name: 'Empathy', value: 12 },
                { name: 'Stamina', value: 7 },
              ],
            },
            {
              title: 'Mind',
              attributes: [
                { name: 'Intellect', value: 18 },
                { name: 'Cunning', value: 9 },
                { name: 'Discipline', value: 3 },
              ],
            },
          ]}
        />
      </div>
    </Section>
  )
}

function EventDemo() {
  const [chosen, setChosen] = useState<string | null>(null)
  return (
    <Section
      title="Event window"
      note="CK3: title, scene, serif body, options with their effects on hover."
    >
      <EventWindow
        kicker="Tuesday 13 October 2026 · Aldermoor"
        title="A misprint"
        sceneIcon={ScrollIcon}
        sceneCaption="Scene render arrives with the 3D characters"
        options={[
          {
            key: 'reprint',
            label: 'Pay for a reprint',
            effects: [
              { label: 'Money', value: -180, prefix: '£' },
              { label: 'Stress', value: 2, invert: true },
            ],
          },
          {
            key: 'deliver',
            label: 'Deliver them anyway and hope nobody rings',
            effects: [{ label: 'Local reputation', value: -2 }],
          },
          {
            key: 'blame',
            label: 'Blame the printer, loudly',
            note: 'The printer also prints for the Harbour Party.',
            effects: [
              { label: 'Local fame', value: 1 },
              { label: 'Printer’s opinion', value: -20 },
            ],
          },
          {
            key: 'volunteers',
            label: 'Ask the branch to correct them by hand',
            disabled: 'Needs 5 volunteers (you have 2)',
          },
        ]}
        onChoose={setChosen}
      >
        <p>
          Four thousand leaflets are back from the printer with your phone number wrong by one
          digit. The number belongs to a taxi firm in Brackwater, which has already called twice.
        </p>
        {chosen && <p className="muted">You chose: {chosen}.</p>}
      </EventWindow>
    </Section>
  )
}

const OPENING: readonly DialogueLine[] = [
  {
    speaker: 'Margaret Hale',
    text: 'You’re the one who emailed about volunteering? We’ve had three of those this year. Two never came back.',
  },
]

const REPLIES: Record<string, { you: string; her: string }> = {
  help: {
    you: 'I’ll be at the next meeting. What needs doing?',
    her: 'Leaflets. Always leaflets. Thursday, seven o’clock, and bring comfortable shoes.',
  },
  seat: {
    you: 'I was hoping to talk about the council seat.',
    her: 'Were you. Let’s see you deliver a round first, and then we’ll talk about seats.',
  },
  others: {
    you: 'Who were the other two?',
    her: 'One’s on the council now. The other one moved to Leeds. Make of that what you will.',
  },
}

function DialogueDemo() {
  const [log, setLog] = useState<DialogueLine[]>([...OPENING])
  const [asked, setAsked] = useState<string[]>([])
  const choose = (key: string) => {
    const r = REPLIES[key]!
    setAsked((a) => [...a, key])
    setLog((l) => [
      ...l,
      { speaker: 'You', text: r.you, you: true },
      { speaker: 'Margaret Hale', text: r.her },
    ])
  }
  return (
    <Section
      title="Conversation"
      note="Suzerain: portrait left, serif dialogue, numbered choices, the log scrolls."
    >
      <Dialogue
        portrait={
          <PortraitFrame
            name="Margaret Hale"
            size="m"
            office="Branch secretary"
            party={PARTIES[1]}
          />
        }
        name="Margaret Hale"
        role="Branch secretary, Civic Union"
        log={log}
        onChoose={choose}
        choices={[
          {
            key: 'help',
            label: REPLIES.help!.you,
            tip: <span>She will remember whether you turn up.</span>,
          },
          {
            key: 'seat',
            label: REPLIES.seat!.you,
            disabled: asked.includes('seat') ? 'Already asked' : undefined,
          },
          {
            key: 'others',
            label: REPLIES.others!.you,
            disabled: asked.includes('others') ? 'Already asked' : undefined,
          },
        ]}
      />
      <Button
        size="s"
        variant="quiet"
        onClick={() => {
          setLog([...OPENING])
          setAsked([])
        }}
      >
        Start again
      </Button>
    </Section>
  )
}

function Votes() {
  return (
    <Section
      title="Vote bar"
      note="Frostpunk 2: For from the left, Against from the right, the majority line."
    >
      <div className="votes">
        <VoteBar title="Second reading" count={{ for: 298, against: 241, undecided: 111 }} />
        <VoteBar title="Opposition day motion" count={{ for: 331, against: 280, undecided: 39 }} />
        <VoteBar
          title="Branch vote: new chair"
          count={{ for: 12, against: 21, undecided: 5 }}
          total={40}
        />
      </div>
    </Section>
  )
}

function TickerDemo() {
  return (
    <Section title="Ticker" note="Plague Inc-style news line along the bottom of the screen.">
      <Ticker
        items={[
          'Civic Union holds Aldermoor by 4,210',
          'Harbour Party chair resigns after row over leaflets',
          'Turnout down in every seat declared so far',
        ]}
      />
    </Section>
  )
}

/** The kit, one theme at a time (tabs switch Dark and Light). */
export function Gallery({ initialTheme }: { initialTheme: Theme }) {
  const [theme, setTheme] = useState<Theme>(initialTheme)
  useEffect(() => {
    document.body.dataset.theme = theme
  }, [theme])
  return (
    <div className="gallery" data-theme={theme}>
      <header className="gallery__head">
        <div>
          <h1 className="gallery__title">Mandate UI kit</h1>
          <p className="gallery__lede">
            The reference stack: a broadsheet's pages (ruled sections, serif headlines, Franklin
            labels); Linear's layout and command menu; Football Manager's inbox and tables; Crusader
            Kings III's portraits, tooltips and event windows; Suzerain's conversations; Frostpunk
            2's vote bar; Paradox time controls. Patterns only; no artwork, logos or paid fonts.
          </p>
        </div>
        <Tabs
          label="Theme"
          value={theme}
          onChange={setTheme}
          tabs={[
            { key: 'dark', label: 'Dark' },
            { key: 'light', label: 'Light' },
          ]}
        />
      </header>
      <main className="gallery__grid">
        <Tokens />
        <Type />
        <Buttons />
        <ChipsTabs />
        <Creator />
        <Tooltips />
        <ShellDemo />
        <TilesDemo />
        <TableDemo />
        <Character />
        <Avatars Section={Section} />
        <EventDemo />
        <DialogueDemo />
        <Votes />
        <TickerDemo />
      </main>
      <footer className="gallery__foot">
        Fictional parties, places and people throughout. Icons: Phosphor (MIT). Fonts: Public Sans
        and Newsreader (OFL).
      </footer>
    </div>
  )
}
