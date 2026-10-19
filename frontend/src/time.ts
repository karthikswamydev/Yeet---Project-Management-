export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatDay(isoDate: string) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function timeAgo(iso: string) {
  const secs = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 60) return 'just now'
  const mins = Math.round(secs / 60)
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`
  return formatDateTime(iso)
}

/** Whole days from today until an ISO date (negative = past). */
export function daysUntil(isoDate: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((new Date(`${isoDate}T00:00:00`).getTime() - today.getTime()) / 86_400_000)
}

export function dueText(days: number) {
  if (days < 0) return { text: `${-days}d overdue`, tone: 'danger' }
  if (days === 0) return { text: 'Due today', tone: 'warn' }
  if (days === 1) return { text: 'Due tomorrow', tone: 'warn' }
  return { text: `${days}d left`, tone: days <= 3 ? 'warn' : 'muted' }
}
