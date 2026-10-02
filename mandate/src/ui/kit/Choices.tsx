import type { ReactNode } from 'react'
import { cx } from './cx.ts'
import './controls.css'

interface ChoiceGroupProps {
  legend: string
  children: ReactNode
  className?: string
}

/** A titled group of `Choice` rows (radio or checkbox). */
export function ChoiceGroup({ legend, children, className }: ChoiceGroupProps) {
  return (
    <fieldset className={cx('choices', className)}>
      <legend className="choices__legend">{legend}</legend>
      {children}
    </fieldset>
  )
}

interface ChoiceProps {
  label: ReactNode
  detail?: ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
  type?: 'radio' | 'checkbox'
  /** Radio group name. */
  name?: string
  value?: string
  disabled?: boolean
}

/** One option row: native input, label and a muted detail line. */
export function Choice({
  label,
  detail,
  checked,
  onChange,
  type = 'radio',
  name,
  value,
  disabled,
}: ChoiceProps) {
  return (
    <label className="choice">
      <input
        type={type}
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="choice__label">{label}</span>
      {detail && <span className="choice__detail">{detail}</span>}
    </label>
  )
}
