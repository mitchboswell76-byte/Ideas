import type { ButtonHTMLAttributes } from 'react'
import type { IconName } from '../pixel/font.ts'
import { cx } from './cx.ts'
import { PixelIcon } from './PixelArt.tsx'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Pixel icon before the label. */
  icon?: IconName
  /** Title-screen style: label left, arrow right. */
  arrow?: boolean
  variant?: 'default' | 'quiet' | 'danger'
}

/** Bordered, square-cornered button; label in Departure Mono capitals. */
export function Button({
  icon,
  arrow,
  variant = 'default',
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        'btn',
        variant !== 'default' && `btn--${variant}`,
        arrow && 'btn--arrow',
        className,
      )}
      {...rest}
    >
      {icon && <PixelIcon name={icon} />}
      {children !== undefined && <span className="btn__label">{children}</span>}
      {arrow && <PixelIcon name="arrowRight" className="btn__arrow" />}
    </button>
  )
}
