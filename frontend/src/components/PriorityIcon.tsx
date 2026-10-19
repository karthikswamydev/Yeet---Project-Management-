import { ChevronDown, ChevronUp, ChevronsUp, Equal } from 'lucide-react'
import type { Priority } from '../data'

const ICONS = { urgent: ChevronsUp, high: ChevronUp, medium: Equal, low: ChevronDown } as const

export function PriorityIcon({ priority }: { priority: Priority }) {
  const Icon = ICONS[priority]
  return (
    <span className={`prio prio-${priority}`} title={`${priority} priority`}>
      <Icon size={16} strokeWidth={2.5} aria-label={`${priority} priority`} />
    </span>
  )
}
