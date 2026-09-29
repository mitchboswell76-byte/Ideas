import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Button } from '../kit/index.ts'

interface SheetProps {
  title: string
  onClose: () => void
  children: ReactNode
}

/** A modal side sheet on the native `<dialog>` (focus trap, Escape to close, flat scrim). */
export function Sheet({ title, onClose, children }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    // No close on cleanup: removing the element ends the modal, and a close event here would
    // shut the sheet straight after StrictMode's re-run.
    if (dialog && !dialog.open) dialog.showModal()
  }, [])
  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby={titleId}
      onClose={onClose}
      // A click on the scrim lands on the dialog element itself.
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="sheet__inner">
        <header className="sheet__head">
          <h2 id={titleId} className="sheet__title">
            {title}
          </h2>
          <Button variant="quiet" icon="close" aria-label="Close" onClick={onClose} />
        </header>
        <div className="sheet__body">{children}</div>
      </div>
    </dialog>
  )
}
