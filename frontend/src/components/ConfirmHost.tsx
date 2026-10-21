import { TriangleAlert } from 'lucide-react'
import { useEffect, useRef, useSyncExternalStore } from 'react'
import { getCurrent, settle, subscribe, type ConfirmRequest } from '../confirm'

export function ConfirmHost() {
  const request = useSyncExternalStore(subscribe, getCurrent)
  return request ? <ConfirmDialog key={request.id} request={request} /> : null
}

function ConfirmDialog({ request }: { request: ConfirmRequest }) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    // Focus Cancel so a stray Enter never confirms a destructive action.
    cancelRef.current?.focus()

    // Capture phase so Escape cancels the dialog without also closing whatever is underneath it.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        e.preventDefault()
        settle(false)
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const buttons = [...dialogRef.current.querySelectorAll<HTMLButtonElement>('button')]
        const first = buttons[0]
        const last = buttons[buttons.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      previous?.focus?.()
    }
  }, [])

  return (
    <div className="modal-backdrop confirm-backdrop" onMouseDown={(e) => e.target === e.currentTarget && settle(false)}>
      <div
        ref={dialogRef}
        className={request.danger ? 'confirm-dialog danger' : 'confirm-dialog'}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby={request.message ? 'confirm-message' : undefined}
      >
        <div className="confirm-head">
          {request.danger && (
            <span className="confirm-icon">
              <TriangleAlert size={20} />
            </span>
          )}
          <h2 id="confirm-title">{request.title}</h2>
        </div>
        {request.message && (
          <p id="confirm-message" className="confirm-message">
            {request.message}
          </p>
        )}
        <div className="form-actions">
          <button ref={cancelRef} type="button" className="btn subtle" onClick={() => settle(false)}>
            {request.cancelLabel ?? 'Cancel'}
          </button>
          <button
            type="button"
            className={request.danger ? 'btn danger' : 'btn primary'}
            onClick={() => settle(true)}
          >
            {request.confirmLabel ?? 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}
