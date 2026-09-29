import type { ReactNode } from 'react'
import { cx } from './cx.ts'
import { PixelIcon } from './PixelArt.tsx'

interface BallotProps {
  legend: ReactNode
  /** The instruction line, as printed on a ballot paper. */
  instruction?: string
  children: ReactNode
  className?: string
}

/** A group of `BallotOption`s laid out as a ballot paper. */
export function Ballot({ legend, instruction, children, className }: BallotProps) {
  return (
    <fieldset className={cx('ballot', className)}>
      <legend className="ballot__legend">{legend}</legend>
      {instruction && <p className="ballot__instruction">{instruction}</p>}
      <div className="ballot__options">{children}</div>
    </fieldset>
  )
}

interface BallotOptionProps {
  type?: 'radio' | 'checkbox'
  /** Radio group name. */
  name?: string
  value?: string
  checked: boolean
  onChange: (checked: boolean) => void
  label: ReactNode
  /** Second line, like the party description under a candidate's name. */
  detail?: ReactNode
  /** Allegiance colour (party or the player's own) — only for political choices. */
  colour?: string
  disabled?: boolean
}

/** One choice: text on the left, a box on the right that gets a pen cross. */
export function BallotOption({
  type = 'radio',
  name,
  value,
  checked,
  onChange,
  label,
  detail,
  colour,
  disabled,
}: BallotOptionProps) {
  return (
    <label className={cx('ballot-option', checked && 'is-marked', disabled && 'is-disabled')}>
      <span className="ballot-option__text">
        <span className="ballot-option__label">{label}</span>
        {detail && <span className="ballot-option__detail">{detail}</span>}
      </span>
      {colour && (
        <span className="ballot-option__emblem" style={{ backgroundColor: colour }} aria-hidden />
      )}
      <input
        className="visually-hidden"
        type={type}
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="ballot-option__box" aria-hidden>
        {checked && <PixelIcon name="mark" scale={3} className="ballot-option__mark" />}
      </span>
    </label>
  )
}
