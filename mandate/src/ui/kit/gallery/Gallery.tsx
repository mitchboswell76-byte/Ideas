import { useState, type ReactNode } from 'react'
import { GLYPH_HEIGHT, ICON_NAMES } from '../../pixel/font.ts'
import type { Theme } from '../../store/theme.ts'
import {
  Ballot,
  BallotOption,
  BrandBlock,
  Button,
  FrontPage,
  Meter,
  Panel,
  PixelIcon,
  PixelText,
  Rosette,
  Stamp,
  Ticker,
} from '../index.ts'
import './gallery.css'

/** Fictional parties for the specimens; real parties arrive as data (T12). */
const PARTIES = [
  { id: 'civic', name: 'Civic Union', initial: 'C', colour: '#2e7d4f' },
  { id: 'harbour', name: 'Harbour Party', initial: 'H', colour: '#d9642b' },
]

const CANDIDATES = [
  { id: 'bramley', name: 'BRAMLEY, Joan', detail: 'Civic Union', colour: '#2e7d4f' },
  { id: 'okafor', name: 'OKAFOR, Daniel', detail: 'Harbour Party', colour: '#d9642b' },
  { id: 'pryce', name: 'PRYCE-WELLS, Tom', detail: 'Independent', colour: undefined },
]

const TOKENS = [
  'ground',
  'grid-dot',
  'panel',
  'rule',
  'ink',
  'ink-muted',
  'voxel-neutral',
  'stamp',
  'you',
]

const FONT_ROWS = ['ABCDEFGHIJKLM', 'NOPQRSTUVWXYZ', '0123456789 £%', '.,:;!?\'"-+=/()<>&#*_']

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="specimen">
      <h3 className="specimen__title">{title}</h3>
      {note && <p className="specimen__note">{note}</p>}
      <div className="specimen__body">{children}</div>
    </section>
  )
}

function Sheet({ theme }: { theme: Theme }) {
  const [vote, setVote] = useState('okafor')
  const [speed, setSpeed] = useState(2)
  const [autoPause, setAutoPause] = useState({ elections: true, scandals: false })
  const radioName = `candidate-${theme}`
  return (
    <div className="sheet-specimen dot-grid" data-theme={theme}>
      <p className="sheet-specimen__label">{theme === 'night' ? 'Night (default)' : 'Paper'}</p>

      <Section title="Top bar" note="Brand block, game clock, speed, menus.">
        <div className="mock-bar">
          <BrandBlock />
          <span className="mock-bar__date">Thu 1 Oct 2026</span>
          <span className="mock-bar__speed">
            <Button icon="pause" aria-label="Pause" onClick={() => setSpeed(0)} />
            {[1, 2, 3, 4, 5].map((s) => (
              <Button key={s} aria-pressed={speed === s} onClick={() => setSpeed(s)}>
                {s}
              </Button>
            ))}
          </span>
        </div>
      </Section>

      <Section
        title="Buttons"
        note="Square, 1 px ink rule; hover inverts. Arrow buttons as on the title screen."
      >
        <div className="row">
          <Button arrow>New life</Button>
          <Button arrow>Continue</Button>
          <Button arrow disabled>
            Load
          </Button>
        </div>
        <div className="row">
          <Button icon="ballotBox">Saves</Button>
          <Button icon="settings">Settings</Button>
          <Button variant="quiet" icon="close" aria-label="Close" />
          <Button variant="danger" icon="trash">
            Delete for good
          </Button>
        </div>
      </Section>

      <Section
        title="Ballot paper"
        note="Every choice is a ballot: text left, box right, marked with a pen cross."
      >
        <Ballot
          legend="Election of a Member of Parliament"
          instruction="Vote for one candidate only"
        >
          {CANDIDATES.map((c) => (
            <BallotOption
              key={c.id}
              name={radioName}
              value={c.id}
              label={c.name}
              detail={c.detail}
              colour={c.colour}
              checked={vote === c.id}
              onChange={() => setVote(c.id)}
            />
          ))}
        </Ballot>
        <Ballot legend="Auto-pause on" instruction="Mark as many as you like">
          <BallotOption
            type="checkbox"
            label="Elections"
            checked={autoPause.elections}
            onChange={(on) => setAutoPause((a) => ({ ...a, elections: on }))}
          />
          <BallotOption
            type="checkbox"
            label="Scandals"
            detail="Press stories about you"
            checked={autoPause.scandals}
            onChange={(on) => setAutoPause((a) => ({ ...a, scandals: on }))}
          />
        </Ballot>
      </Section>

      <Section
        title="Rosettes"
        note="Colour means allegiance: party colours come from data; yellow is the player's own."
      >
        <div className="row">
          {PARTIES.map((p) => (
            <Rosette key={p.id} colour={p.colour} initial={p.initial} label={p.name} />
          ))}
          <Rosette colour="var(--you)" initial="Y" label="You" />
          <Rosette colour="var(--voxel-neutral)" initial="?" label="Undecided" />
        </div>
      </Section>

      <Section title="Stamps" note="Red ink is kept for danger.">
        <div className="row row--stamps">
          <Stamp>Approved</Stamp>
          <Stamp tone="danger" rotate={3}>
            Rejected
          </Stamp>
          <Stamp tone="danger" rotate={-7}>
            Urgent
          </Stamp>
          <Stamp className="stamp--small" rotate={-2}>
            Paused · Elections
          </Stamp>
        </div>
      </Section>

      <Section title="Meters" note="Pixel bars, ten cells.">
        <div className="stack">
          <Meter label="Energy" value={70} />
          <Meter label="Name recognition" value={20} tone="you" />
          <Meter label="Heat" value={40} tone="danger" />
          <Meter label="Civic Union lead" value={6} max={20} colour="#2e7d4f" valueText="+6" />
        </div>
      </Section>

      <Section title="Ticker">
        <Ticker
          items={[
            'Harbour Party selects candidate for Ashbury West',
            'Council tax row splits Civic Union group',
            'By-election called for 12 November',
          ]}
        />
      </Section>

      <Section
        title="Front page"
        note="Events arrive as newspaper front pages. Outlets in the game are fictional."
      >
        <FrontPage
          masthead="The Daily Ledger"
          edition="No. 4,812"
          price="£1.20"
          date="2026-10-01"
          kicker="Exclusive"
          headline="Council candidate in doorstep row"
          standfirst="A leaflet printed with the wrong ward sends campaigners back to the photocopier."
          stamp={
            <Stamp tone="danger" rotate={-8}>
              Urgent
            </Stamp>
          }
        >
          <p>
            Volunteers spent Saturday morning crossing out a street name on four thousand leaflets
            after a proof went to the printer unchecked.
          </p>
          <p>The candidate called it an honest mistake. Her opponents called it a gift.</p>
        </FrontPage>
      </Section>

      <Section title="Panel">
        <Panel title="Notices" actions={<Button variant="quiet" icon="close" aria-label="Close" />}>
          <p className="serif">
            Flat sheet, 1 px rule, label strip. Raised ephemera get a hard shadow.
          </p>
        </Panel>
      </Section>

      <Section title="Pixel icons" note="7×7, drawn in the bitmap font's format.">
        <ul className="icon-grid">
          {ICON_NAMES.map((name) => (
            <li key={name}>
              <PixelIcon name={name} scale={3} />
              <span>{name}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        title="Bitmap font"
        note={`Original 5×${GLYPH_HEIGHT} glyphs; one table feeds DOM, canvas and voxels.`}
      >
        <div className="font-specimen">
          <PixelText text="MANDATE" scale={6} tracking={1} />
          {FONT_ROWS.map((row) => (
            <PixelText key={row} text={row} scale={2} />
          ))}
        </div>
      </Section>

      <Section title="Tokens">
        <ul className="swatches">
          {TOKENS.map((t) => (
            <li key={t}>
              <span className="swatches__chip" style={{ background: `var(--${t})` }} />
              <span>--{t}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Type">
        <div className="stack">
          <p className="type-mono-l">DEPARTURE MONO 22 PX</p>
          <p>Departure Mono 11 px: labels, numbers, top bar, data.</p>
          <p className="serif">
            Newsreader: headlines, event and card text. Money is shown as £2,450 and dates as 1
            October 2026.
          </p>
        </div>
      </Section>
    </div>
  )
}

export function Gallery() {
  return (
    <div className="gallery">
      <header className="gallery__head">
        <BrandBlock />
        <div className="gallery__intro">
          <h1 className="gallery__title">Ballot &amp; Block</h1>
          <p className="serif">
            The look of Mandate. The world is a voxel diorama where colour means allegiance; the
            interface is British political ephemera: ballot papers, rosettes, rubber stamps and
            front pages. Every component below is live, in both themes.
          </p>
        </div>
      </header>
      <div className="gallery__sheets">
        <Sheet theme="night" />
        <Sheet theme="paper" />
      </div>
    </div>
  )
}
