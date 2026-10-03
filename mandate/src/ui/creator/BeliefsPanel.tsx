/**
 * The creator's Beliefs: an agree / disagree quiz (the panel) scored live onto the compass and
 * issue scales (the stage).
 */
import type { Ideology } from '../../sim/character/model.ts'
import { QUIZ, QUIZ_ANSWERS, quizAnswered, type QuizAnswer } from '../../sim/character/quiz.ts'
import { Compass, IssueScales } from '../character/Beliefs.tsx'
import { ArrowCounterClockwiseIcon, ShuffleIcon } from '../kit/icons.ts'
import { Button } from '../kit/index.ts'
import { describeIdeology } from './describe.ts'
import { Section } from './Field.tsx'
import { creatorStore, useCreator } from './store.ts'

const VALUES: readonly QuizAnswer[] = [-2, -1, 0, 1, 2]
const SHORT = ['−−', '−', '0', '+', '++']

export function BeliefsPanel() {
  const answers = useCreator((s) => s.answers)
  const { setAnswer, randomise } = creatorStore.getState()
  const clear = () => {
    for (const s of QUIZ) setAnswer(s.id, undefined)
  }
  return (
    <Section
      title={`Statements · ${quizAnswered(answers)} of ${QUIZ.length} answered`}
      actions={
        <span className="section-actions">
          <Button size="s" variant="quiet" icon={ShuffleIcon} onClick={() => randomise('beliefs')}>
            Randomise
          </Button>
          <Button size="s" variant="quiet" icon={ArrowCounterClockwiseIcon} onClick={clear}>
            Clear
          </Button>
        </span>
      }
    >
      <p className="field__hint">
        How far do you agree? Skipped statements count as neither. You can change your mind later,
        though doing it in public costs credibility.
      </p>
      <ol className="quiz">
        {QUIZ.map((s) => (
          <li key={s.id} className="quiz__item">
            <p className="quiz__text">{s.text}</p>
            <div className="quiz__scale" role="radiogroup" aria-label={s.text}>
              {VALUES.map((v, i) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  className="quiz__option"
                  aria-checked={answers[s.id] === v}
                  aria-label={QUIZ_ANSWERS[i]}
                  title={QUIZ_ANSWERS[i]}
                  onClick={() => setAnswer(s.id, answers[s.id] === v ? undefined : v)}
                >
                  {SHORT[i]}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ol>
      <p className="quiz__legend">
        <span>{QUIZ_ANSWERS[0]}</span>
        <span>{QUIZ_ANSWERS[4]}</span>
      </p>
    </Section>
  )
}

/** The live result, in the stage while the quiz is open. */
export function BeliefsStage({ ideology }: { ideology: Ideology }) {
  return (
    <div className="beliefs-stage">
      <p className="beliefs-stage__kicker">Where you stand</p>
      <h2 className="beliefs-stage__title">{describeIdeology(ideology)}</h2>
      <div className="beliefs beliefs-stage__body">
        <Compass econ={ideology.econ} social={ideology.social} />
        <IssueScales issues={ideology.issues} />
      </div>
    </div>
  )
}
