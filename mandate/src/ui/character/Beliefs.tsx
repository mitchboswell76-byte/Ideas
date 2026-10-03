/**
 * Character pieces shared by the Profile and the creator: the political compass, the issue scales
 * and a trait's effects (for its tooltip).
 */
import { traitDefs } from '../../sim/character/traits.ts'
import {
  ATTRIBUTE_LABELS,
  ISSUE_LABELS,
  ISSUES,
  SKILL_LABELS,
  type AttributeKey,
  type Ideology,
} from '../../sim/character/model.ts'
import { ModifierList, Tooltip, formatSigned } from '../kit/index.ts'
import './beliefs.css'

export function TraitEffects({ id }: { id: string }) {
  const [t] = traitDefs([id])
  if (!t) return null
  const e = t.effects
  const items = [
    ...Object.entries(e.attributes ?? {}).map(([k, v]) => ({
      label: ATTRIBUTE_LABELS[k as AttributeKey],
      value: v ?? 0,
    })),
    ...Object.entries(e.checks ?? {}).map(([k, v]) => ({
      label: `${SKILL_LABELS[k as keyof typeof SKILL_LABELS]} checks`,
      value: v ?? 0,
      unit: '%',
    })),
    ...(e.energy ? [{ label: 'Daily energy', value: e.energy }] : []),
    ...(e.stress
      ? [
          {
            label: 'Stress gained',
            value: Math.round((e.stress - 1) * 100),
            unit: '%',
            invert: true,
          },
        ]
      : []),
    ...(e.recovery ? [{ label: 'Stress shed each month', value: e.recovery }] : []),
  ]
  return items.length ? <ModifierList items={items} /> : null
}

/** Political compass: economic left–right across, liberal–authoritarian up the side. */
export function Compass({ econ, social }: { econ: number; social: number }) {
  const x = 50 + econ / 2
  const y = 50 - social / 2
  return (
    <svg
      className="compass"
      viewBox="-14 -10 128 120"
      role="img"
      aria-label={`Economic ${econ}, social ${social}`}
    >
      <rect x="0" y="0" width="100" height="100" className="compass__box" />
      <line x1="50" y1="0" x2="50" y2="100" className="compass__axis" />
      <line x1="0" y1="50" x2="100" y2="50" className="compass__axis" />
      <text x="50" y="-3" className="compass__label">
        Authoritarian
      </text>
      <text x="50" y="109" className="compass__label">
        Liberal
      </text>
      <text
        x="-3"
        y="53"
        className="compass__label compass__label--side"
        transform="rotate(-90 -3 53)"
      >
        Left
      </text>
      <text
        x="103"
        y="47"
        className="compass__label compass__label--side"
        transform="rotate(90 103 47)"
      >
        Right
      </text>
      <circle cx={x} cy={y} r="4.5" className="compass__dot" />
    </svg>
  )
}

/** One bar per issue, centred: left or liberal pole to the left. */
export function IssueScales({ issues }: { issues: Ideology['issues'] }) {
  return (
    <ul className="issues">
      {ISSUES.map((k) => {
        const v = issues[k]
        const l = ISSUE_LABELS[k]
        const lean = Math.abs(v) < 15 ? 'Centre' : v < 0 ? l.low : l.high
        return (
          <li key={k} className="issues__row">
            <span className="issues__name">{l.name}</span>
            <Tooltip
              className="issues__tip"
              title={l.name}
              tip={`${l.low} ← → ${l.high}: ${formatSigned(v)}`}
            >
              <span className="issues__scale" aria-label={`${lean} (${formatSigned(v)})`}>
                <span
                  className="issues__fill"
                  style={{
                    left: `${Math.min(50, 50 + v / 2)}%`,
                    width: `${Math.abs(v) / 2}%`,
                  }}
                />
              </span>
            </Tooltip>
            <span className="issues__lean">{lean}</span>
          </li>
        )
      })}
    </ul>
  )
}
