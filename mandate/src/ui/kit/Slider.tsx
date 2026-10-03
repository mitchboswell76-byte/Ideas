import type { CSSProperties, ReactNode } from 'react'
import { MinusIcon, PlusIcon } from './icons.ts'
import { cx } from './cx.ts'
import './controls.css'

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  /** The value as shown beside the track; nothing shown when omitted. */
  format?: (value: number) => ReactNode
  className?: string
}

/** A labelled range slider (the Sims' face and body sliders): name, track, value. */
export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
  className,
}: SliderProps) {
  const filled = ((value - min) / (max - min)) * 100
  return (
    <label className={cx('slider', className)}>
      <span className="slider__label">{label}</span>
      <input
        type="range"
        className="slider__input"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ '--slider-fill': `${filled}%` } as CSSProperties}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {format && <span className="slider__value num">{format(value)}</span>}
    </label>
  )
}

export interface Swatch {
  key: string
  colour: string
  name: string
}

interface SwatchesProps {
  label: string
  swatches: readonly Swatch[]
  value: string
  onChange: (key: string) => void
  /** `l` for the personal colour, `s` for palettes with many entries. */
  size?: 's' | 'l'
  className?: string
}

/** A row of colour swatches (CK3 / Sims colour pickers), one of which is chosen. */
export function Swatches({
  label,
  swatches,
  value,
  onChange,
  size = 's',
  className,
}: SwatchesProps) {
  return (
    <div
      className={cx('colour-picks', `colour-picks--${size}`, className)}
      role="radiogroup"
      aria-label={label}
    >
      {swatches.map((s) => (
        <button
          key={s.key}
          type="button"
          role="radio"
          aria-checked={s.key === value}
          aria-label={s.name}
          title={s.name}
          className="colour-pick"
          style={{ '--swatch': s.colour } as CSSProperties}
          onClick={() => onChange(s.key)}
        />
      ))}
    </div>
  )
}

interface StepperProps {
  label: string
  value: number
  onChange: (value: number) => void
  canDecrease: boolean
  canIncrease: boolean
  /** What sits between the buttons (default: the value). */
  children?: ReactNode
  className?: string
}

/** − value + (the CK3 ruler designer's attribute rows). */
export function Stepper({
  label,
  value,
  onChange,
  canDecrease,
  canIncrease,
  children,
  className,
}: StepperProps) {
  return (
    <div className={cx('stepper', className)} role="group" aria-label={label}>
      <button
        type="button"
        className="stepper__btn"
        aria-label={`Lower ${label}`}
        disabled={!canDecrease}
        onClick={() => onChange(value - 1)}
      >
        <MinusIcon aria-hidden />
      </button>
      <span className="stepper__value num" aria-live="polite">
        {children ?? value}
      </span>
      <button
        type="button"
        className="stepper__btn"
        aria-label={`Raise ${label}`}
        disabled={!canIncrease}
        onClick={() => onChange(value + 1)}
      >
        <PlusIcon aria-hidden />
      </button>
    </div>
  )
}
