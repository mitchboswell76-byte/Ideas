/**
 * The creator's beliefs quiz (T10): agree / disagree statements (data/characters/quiz.json) scored
 * into an `Ideology`. Pure; the creator shows the result live as the player answers.
 */
import data from '../../data/characters/quiz.json'
import { clamp, ISSUE_LOADINGS, ISSUES, type Ideology, type IssueKey } from './model.ts'

export interface QuizStatement {
  id: string
  text: string
  econ?: number
  social?: number
  issues?: Partial<Record<IssueKey, number>>
}

export const QUIZ: readonly QuizStatement[] = data.statements as QuizStatement[]
/** Labels for answers −2 … +2. */
export const QUIZ_ANSWERS: readonly string[] = data.answers

/** −2 (strongly disagree) … +2 (strongly agree); a missing answer counts as 0. */
export type QuizAnswer = -2 | -1 | 0 | 1 | 2
export type QuizAnswers = Partial<Record<string, QuizAnswer>>

/** Points of belief (−100 … +100) per answer step when guessing someone's answers. */
const ANSWER_STEP = 25

/** How much of an issue comes from the statements about it rather than from the two axes. */
const DIRECT_SHARE = 0.65

/** Sum of answer × weight, as a share of the most a full set of answers could reach (−100 … +100). */
function scale(answers: QuizAnswers, weight: (s: QuizStatement) => number | undefined): number {
  let sum = 0
  let max = 0
  for (const s of QUIZ) {
    const w = weight(s) ?? 0
    sum += (answers[s.id] ?? 0) * w
    max += 2 * Math.abs(w)
  }
  return max === 0 ? 0 : (100 * sum) / max
}

const round = (n: number) => clamp(Math.round(n), -100, 100)

export function scoreQuiz(answers: QuizAnswers): Ideology {
  const econ = scale(answers, (s) => s.econ)
  const social = scale(answers, (s) => s.social)
  const issues = {} as Record<IssueKey, number>
  for (const issue of ISSUES) {
    const l = ISSUE_LOADINGS[issue]
    const fromAxes = l.econ * econ + l.social * social
    const asked = QUIZ.some((s) => s.issues?.[issue])
    issues[issue] = round(
      asked
        ? (1 - DIRECT_SHARE) * fromAxes + DIRECT_SHARE * scale(answers, (s) => s.issues?.[issue])
        : fromAxes,
    )
  }
  return { econ: round(econ), social: round(social), issues }
}

export function quizAnswered(answers: QuizAnswers): number {
  return QUIZ.filter((s) => answers[s.id] !== undefined).length
}

/**
 * The answers someone with these beliefs would most likely give (for a random character's quiz,
 * so the creator's answers and its compass agree).
 */
export function answersFor(ideology: Ideology): QuizAnswers {
  const out: QuizAnswers = {}
  for (const s of QUIZ) {
    let sum = (s.econ ?? 0) * ideology.econ + (s.social ?? 0) * ideology.social
    let weight = Math.abs(s.econ ?? 0) + Math.abs(s.social ?? 0)
    for (const [issue, w] of Object.entries(s.issues ?? {}) as [IssueKey, number][]) {
      sum += w * ideology.issues[issue]
      weight += Math.abs(w)
    }
    const lean = weight === 0 ? 0 : sum / weight / ANSWER_STEP
    out[s.id] = clamp(Math.round(lean), -2, 2) as QuizAnswer
  }
  return out
}
