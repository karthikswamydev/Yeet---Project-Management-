import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { dismiss, getToasts, subscribe, type Toast } from '../toast'

const ICONS = { success: CircleCheck, error: CircleAlert, warning: TriangleAlert, info: Info } as const

export function Toaster() {
  const toasts = useSyncExternalStore(subscribe, getToasts)
  return (
    <div className="toaster" role="region" aria-label="Notifications">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  )
}

function ToastItem({ toast }: { toast: Toast }) {
  const [paused, setPaused] = useState(false)
  const remaining = useRef(toast.duration)
  const startedAt = useRef(0)

  // Auto-dismiss, pausing while hovered or focused so people can read/act.
  useEffect(() => {
    if (paused) return
    startedAt.current = Date.now()
    const timer = window.setTimeout(() => dismiss(toast.id), remaining.current)
    return () => {
      window.clearTimeout(timer)
      remaining.current -= Date.now() - startedAt.current
    }
  }, [paused, toast.id])

  const Icon = ICONS[toast.kind]
  return (
    <div
      className={`toast toast-${toast.kind}`}
      role={toast.kind === 'error' || toast.kind === 'warning' ? 'alert' : 'status'}
      aria-live={toast.kind === 'error' ? 'assertive' : 'polite'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <Icon size={20} className="toast-icon" />
      <div className="toast-text">
        <div className="toast-title">{toast.title}</div>
        {toast.description && <div className="toast-desc">{toast.description}</div>}
      </div>
      <button type="button" className="toast-close" onClick={() => dismiss(toast.id)} aria-label="Dismiss">
        <X size={16} />
      </button>
      <span
        className="toast-timer"
        style={{ animationDuration: `${toast.duration}ms`, animationPlayState: paused ? 'paused' : 'running' }}
      />
    </div>
  )
}
