// Promise-based replacement for window.confirm, rendered by <ConfirmHost />.
//   if (!(await confirm({ title: 'Delete MAGS-3?', confirmLabel: 'Delete', danger: true }))) return

export type ConfirmOptions = {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

export type ConfirmRequest = ConfirmOptions & { id: number; resolve: (ok: boolean) => void }

let current: ConfirmRequest | null = null
let nextId = 1
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

export function confirm(options: ConfirmOptions): Promise<boolean> {
  // A newer request replaces an open one; treat the old one as cancelled.
  current?.resolve(false)
  return new Promise((resolve) => {
    current = { ...options, id: nextId++, resolve }
    emit()
  })
}

export function settle(ok: boolean) {
  if (!current) return
  current.resolve(ok)
  current = null
  emit()
}

export function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const getCurrent = () => current
