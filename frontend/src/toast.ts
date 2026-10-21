// Tiny global toast store. Call toast.success/error/... from anywhere (including
// non-React code like the API client); <Toaster /> renders whatever is queued.

export type ToastKind = 'success' | 'error' | 'warning' | 'info'

export type Toast = {
  id: number
  kind: ToastKind
  title: string
  description?: string
  duration: number
}

type Listener = () => void

const MAX_VISIBLE = 4
const DEFAULT_DURATION: Record<ToastKind, number> = { success: 3500, info: 4000, warning: 6000, error: 7000 }

let toasts: Toast[] = []
let nextId = 1
const listeners = new Set<Listener>()

function emit() {
  for (const l of listeners) l()
}

function push(kind: ToastKind, title: string, opts: { description?: string; duration?: number } = {}) {
  // Collapse repeats (e.g. several requests failing because the server is down).
  const dupe = toasts.find((t) => t.kind === kind && t.title === title && t.description === opts.description)
  if (dupe) dismiss(dupe.id)
  const t: Toast = { id: nextId++, kind, title, description: opts.description, duration: opts.duration ?? DEFAULT_DURATION[kind] }
  toasts = [...toasts, t].slice(-MAX_VISIBLE)
  emit()
  return t.id
}

export function dismiss(id: number) {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

export function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const getToasts = () => toasts

export const toast = {
  success: (title: string, opts?: { description?: string; duration?: number }) => push('success', title, opts),
  error: (title: string, opts?: { description?: string; duration?: number }) => push('error', title, opts),
  warning: (title: string, opts?: { description?: string; duration?: number }) => push('warning', title, opts),
  info: (title: string, opts?: { description?: string; duration?: number }) => push('info', title, opts),
}
