import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { cx } from './cx.ts'
import { formatSigned } from './numbers.ts'
import { placeBeside, placeFloating, type Placement } from './place.ts'
import './tooltip.css'

/** Hover this long before a tooltip opens. */
export const OPEN_DELAY_MS = 300
/** An open tooltip locks after this long, so the pointer can move into it (CK3). */
export const LOCK_MS = 1000
/** Time to move the pointer from an anchor into its locked tooltip. */
const CLOSE_GRACE_MS = 220

/** Lets a nested tooltip keep its parent open, and sit beside it. */
interface Holder {
  hold(): void
  release(): void
  panel(): HTMLElement | null
}

const ParentTooltip = createContext<Holder | null>(null)

interface TooltipProps {
  /** The tooltip body. May contain `Term`s, which open their own tooltips. */
  tip: ReactNode
  /** Optional heading line. */
  title?: ReactNode
  children: ReactNode
  /** Simple labels (icon buttons) don't lock or nest. */
  lockable?: boolean
  /** Class for the inline wrapper round `children`. */
  className?: string
  /** Make the wrapper itself focusable (for plain text anchors like `Term`). */
  focusable?: boolean
}

/**
 * CK3-style tooltip (DESIGN §17). Opens on hover or focus; after a second a bar fills and it
 * locks, so the pointer can move in and hover highlighted `Term`s, which open nested tooltips.
 * Leaving the whole stack closes it; Escape closes all.
 */
export function Tooltip({
  tip,
  title,
  children,
  lockable = true,
  className,
  focusable,
}: TooltipProps) {
  const parent = useContext(ParentTooltip)
  const anchorRef = useRef<HTMLSpanElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const id = useId()
  const [open, setOpen] = useState(false)
  const [locked, setLocked] = useState(false)
  const [place, setPlace] = useState<Placement | null>(null)
  const [theme, setTheme] = useState<string | undefined>()

  const lockedRef = useRef(false)
  const over = useRef({ anchor: false, tip: false })
  const holds = useRef(0)
  const timers = useRef({ open: 0, lock: 0, close: 0 })

  const clear = (name: keyof typeof timers.current) => {
    window.clearTimeout(timers.current[name])
    timers.current[name] = 0
  }

  const close = useCallback(() => {
    for (const name of ['open', 'lock', 'close'] as const) {
      window.clearTimeout(timers.current[name])
      timers.current[name] = 0
    }
    lockedRef.current = false
    setOpen(false)
    setLocked(false)
    setPlace(null)
  }, [])

  /** Close unless the pointer is on the anchor, on the tooltip, or on an open child tooltip. */
  const maybeClose = useCallback(() => {
    window.clearTimeout(timers.current.close)
    const check = () => {
      if (over.current.anchor || over.current.tip || holds.current > 0) return
      close()
    }
    timers.current.close = window.setTimeout(check, lockedRef.current ? CLOSE_GRACE_MS : 0)
  }, [close])

  const holder = useMemo<Holder>(
    () => ({
      hold() {
        holds.current++
        window.clearTimeout(timers.current.close)
      },
      release() {
        holds.current = Math.max(0, holds.current - 1)
        maybeClose()
      },
      panel: () => tipRef.current,
    }),
    [maybeClose],
  )

  // While open, keep the parent tooltip open too.
  useEffect(() => {
    if (!open || !parent) return
    parent.hold()
    return () => parent.release()
  }, [open, parent])

  const start = () => {
    clear('close')
    if (open || timers.current.open) return
    timers.current.open = window.setTimeout(() => {
      timers.current.open = 0
      setTheme(anchorRef.current?.closest('[data-theme]')?.getAttribute('data-theme') ?? undefined)
      setOpen(true)
      if (!lockable) return
      timers.current.lock = window.setTimeout(() => {
        lockedRef.current = true
        setLocked(true)
      }, LOCK_MS)
    }, OPEN_DELAY_MS)
  }

  const leaveAnchor = () => {
    over.current.anchor = false
    if (open) maybeClose()
    else clear('open')
  }

  // Place once the size is known (beside the parent tooltip when nested); follow scrolling.
  const measure = useCallback(() => {
    const anchor = anchorRef.current?.getBoundingClientRect()
    const panel = tipRef.current
    if (!anchor || !panel) return
    const size = { width: panel.offsetWidth, height: panel.offsetHeight }
    const viewport = { width: window.innerWidth, height: window.innerHeight }
    const parentPanel = parent?.panel()?.getBoundingClientRect()
    setPlace(
      parentPanel
        ? placeBeside(anchor, parentPanel, size, viewport)
        : placeFloating(anchor, size, viewport),
    )
  }, [parent])

  useLayoutEffect(() => {
    if (open) measure()
  }, [open, measure])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [open, close, measure])

  useEffect(
    () => () => {
      window.clearTimeout(timers.current.open)
      window.clearTimeout(timers.current.lock)
      window.clearTimeout(timers.current.close)
    },
    [],
  )

  // Measured hidden at the corner first, then placed.
  const position: CSSProperties = place
    ? { left: place.left, top: place.top }
    : { left: 0, top: 0, visibility: 'hidden' }

  return (
    <>
      <span
        ref={anchorRef}
        className={cx('tip-anchor', className)}
        tabIndex={focusable ? 0 : undefined}
        aria-describedby={open ? id : undefined}
        onPointerEnter={() => {
          over.current.anchor = true
          start()
        }}
        onPointerLeave={leaveAnchor}
        onFocus={() => {
          over.current.anchor = true
          start()
        }}
        onBlur={leaveAnchor}
      >
        {children}
      </span>
      {open &&
        createPortal(
          <div
            ref={tipRef}
            id={id}
            role="tooltip"
            data-theme={theme}
            className={cx('tip', place && `tip--${place.side}`)}
            data-lockable={lockable || undefined}
            data-locked={locked || undefined}
            style={{ ...position, '--lock-ms': `${LOCK_MS}ms` } as CSSProperties}
            onPointerEnter={() => {
              over.current.tip = true
              clear('close')
            }}
            onPointerLeave={() => {
              over.current.tip = false
              maybeClose()
            }}
          >
            <ParentTooltip.Provider value={holder}>
              {title && <div className="tip__title">{title}</div>}
              <div className="tip__body">{tip}</div>
            </ParentTooltip.Provider>
            {lockable && <span className="tip__lock" aria-hidden />}
          </div>,
          document.body,
        )}
    </>
  )
}

interface TermProps {
  /** The nested tooltip. */
  tip: ReactNode
  title?: ReactNode
  children: ReactNode
}

/** A highlighted word inside text or a tooltip that opens its own tooltip (CK3 nesting). */
export function Term({ tip, title, children }: TermProps) {
  return (
    <Tooltip tip={tip} title={title} className="term" focusable>
      {children}
    </Tooltip>
  )
}

export interface Modifier {
  label: ReactNode
  value: number
  /** Suffix such as "%". */
  unit?: string
  /** Prefix such as "£". */
  prefix?: string
  /** Higher is worse (stress, heat): positive values show as bad. */
  invert?: boolean
}

interface ModifierListProps {
  items: readonly Modifier[]
  /** Label for a total row summing the values. */
  total?: ReactNode
  className?: string
}

/** An effect breakdown: every modifier with its signed, coloured value (CK3). */
export function ModifierList({ items, total, className }: ModifierListProps) {
  const tone = (m: Pick<Modifier, 'value' | 'invert'>) =>
    m.value === 0 ? undefined : m.value > 0 !== Boolean(m.invert) ? 'good' : 'bad'
  const sum = items.reduce((n, m) => n + m.value, 0)
  // A total only makes sense for like items, so it takes the first item's units.
  const { unit, prefix, invert } = items[0] ?? {}
  return (
    <dl className={cx('mods', className)}>
      {items.map((m, i) => (
        <div key={i} className="mods__row">
          <dt>{m.label}</dt>
          <dd className={cx('num', tone(m) && `mods__value--${tone(m)}`)}>
            {formatSigned(m.value, m.unit, m.prefix)}
          </dd>
        </div>
      ))}
      {total !== undefined && (
        <div className="mods__row mods__row--total">
          <dt>{total}</dt>
          <dd
            className={cx(
              'num',
              tone({ value: sum, invert }) && `mods__value--${tone({ value: sum, invert })}`,
            )}
          >
            {formatSigned(sum, unit, prefix)}
          </dd>
        </div>
      )}
    </dl>
  )
}
