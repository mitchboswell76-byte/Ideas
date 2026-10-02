import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from './cx.ts'
import type { Icon } from './icons.ts'
import { Tooltip } from './Tooltip.tsx'
import './controls.css'

export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: 's' | 'm'
  /** Icon before the label. */
  icon?: Icon
  /** Icon after the label (e.g. an arrow on menu buttons). */
  iconEnd?: Icon
}

/** The button set: primary (one per view), secondary, quiet and danger. */
export function Button({
  variant = 'secondary',
  size = 'm',
  icon: IconBefore,
  iconEnd: IconAfter,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx('btn', `btn--${variant}`, size === 's' && 'btn--s', className)}
      {...rest}
    >
      {IconBefore && <IconBefore className="btn__icon" aria-hidden />}
      {children !== undefined && <span className="btn__label">{children}</span>}
      {IconAfter && <IconAfter className="btn__icon btn__icon--end" aria-hidden />}
    </button>
  )
}

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: Icon
  /** Accessible name, also shown as the tooltip. */
  label: string
  /** Keyboard shortcut shown in the tooltip. */
  shortcut?: string
  /** Extra tooltip lines under the label. */
  detail?: ReactNode
  variant?: ButtonVariant
  size?: 's' | 'm'
  /** Toggle state: fills the icon when pressed. */
  pressed?: boolean
}

/** A square icon-only button with its label in a tooltip. */
export function IconButton({
  icon: IconGlyph,
  label,
  shortcut,
  detail,
  variant = 'quiet',
  size = 'm',
  pressed,
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <Tooltip
      lockable={false}
      tip={
        <>
          <span className="tip__label">
            {label}
            {shortcut && <kbd className="tip__key">{shortcut}</kbd>}
          </span>
          {detail}
        </>
      }
    >
      <button
        type={type}
        aria-label={label}
        aria-pressed={pressed}
        className={cx('btn', 'btn--icon', `btn--${variant}`, size === 's' && 'btn--s', className)}
        {...rest}
      >
        <IconGlyph className="btn__icon" weight={pressed ? 'fill' : 'regular'} aria-hidden />
      </button>
    </Tooltip>
  )
}
