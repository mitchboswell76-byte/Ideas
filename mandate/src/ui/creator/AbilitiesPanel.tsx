/**
 * The creator's Abilities panel (the CK3 ruler designer): attributes bought from a points budget,
 * then 3–5 traits; a trait's bonuses show on the attributes they touch.
 */
import { ATTRIBUTE_BUY, attributePointsSpent, TRAIT_COUNT } from '../../sim/character/create.ts'
import { withTraitBonuses } from '../../sim/character/generate.ts'
import { ATTRIBUTE_LABELS, ATTRIBUTES } from '../../sim/character/model.ts'
import { canAddTrait, traitDef, TRAITS, type TraitGroup } from '../../sim/character/traits.ts'
import { TraitEffects } from '../character/Beliefs.tsx'
import { ShuffleIcon } from '../kit/icons.ts'
import { AttributeValue, Button, Stepper, Tooltip, cx, formatSigned } from '../kit/index.ts'
import { Section } from './Field.tsx'
import { creatorStore, useCreator } from './store.ts'

const GROUPS: { key: TraitGroup; title: string }[] = [
  { key: 'personality', title: 'Personality' },
  { key: 'lifestyle', title: 'Lifestyle' },
  { key: 'reputation', title: 'Reputation' },
]

const CHOOSABLE = TRAITS.filter((t) => t.creation !== false)

export function AbilitiesPanel() {
  const spec = useCreator((s) => s.spec)
  const { setAttribute, toggleTrait, randomise } = creatorStore.getState()
  const left = ATTRIBUTE_BUY.points - attributePointsSpent(spec.attributes)
  const final = withTraitBonuses(spec.attributes, spec.traits)
  const full = spec.traits.length >= TRAIT_COUNT.max

  return (
    <>
      <Section
        title="Attributes"
        actions={
          <Button
            size="s"
            variant="quiet"
            icon={ShuffleIcon}
            onClick={() => randomise('abilities')}
          >
            Randomise
          </Button>
        }
      >
        <p className={cx('points', left < 0 && 'points--over')} aria-live="polite">
          <span className="num">{left}</span> of {ATTRIBUTE_BUY.points} points left
        </p>
        <ul className="buy">
          {ATTRIBUTES.map((a) => {
            const base = spec.attributes[a]
            const bonus = final[a] - base
            return (
              <li key={a} className="buy__row">
                <span className="buy__name">{ATTRIBUTE_LABELS[a]}</span>
                <Stepper
                  label={ATTRIBUTE_LABELS[a]}
                  value={base}
                  canDecrease={base > ATTRIBUTE_BUY.min}
                  canIncrease={base < ATTRIBUTE_BUY.max && left > 0}
                  onChange={(v) => setAttribute(a, v)}
                />
                <span className="buy__bonus num">{bonus !== 0 && formatSigned(bonus)}</span>
                <AttributeValue value={final[a]} />
              </li>
            )
          })}
        </ul>
        <p className="field__hint">
          Each runs {ATTRIBUTE_BUY.min}–{ATTRIBUTE_BUY.max} before traits; 10 is ordinary.
        </p>
      </Section>
      <Section title={`Traits · ${spec.traits.length} of ${TRAIT_COUNT.min}–${TRAIT_COUNT.max}`}>
        {GROUPS.map((g) => (
          <div key={g.key} className="trait-group">
            <h4 className="trait-group__title">{g.title}</h4>
            <div className="trait-picks">
              {CHOOSABLE.filter((t) => t.group === g.key).map((t) => {
                const held = spec.traits.includes(t.id)
                const clash = !held && !canAddTrait(spec.traits, t.id)
                const opposite = t.opposite ? traitDef(t.opposite)?.name : undefined
                const blocked = clash || (!held && full)
                return (
                  <Tooltip
                    key={t.id}
                    title={t.name}
                    focusable={false}
                    tip={
                      <div className="trait-tip">
                        <p>{t.description}</p>
                        <TraitEffects id={t.id} />
                        {clash && opposite && (
                          <p className="trait-tip__note">Clashes with {opposite}.</p>
                        )}
                        {!clash && blocked && (
                          <p className="trait-tip__note">
                            You already have {TRAIT_COUNT.max} traits.
                          </p>
                        )}
                      </div>
                    }
                  >
                    <button
                      type="button"
                      className="trait-pick"
                      aria-pressed={held}
                      aria-disabled={blocked}
                      onClick={() => !blocked && toggleTrait(t.id)}
                    >
                      {t.name}
                    </button>
                  </Tooltip>
                )
              })}
            </div>
          </div>
        ))}
      </Section>
    </>
  )
}
