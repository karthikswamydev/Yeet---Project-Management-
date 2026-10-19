import { UserRound } from 'lucide-react'
import type { User } from '../api'
import { Avatar } from './Avatar'

export const UNASSIGNED = 'unassigned'

// Jira-style avatar row: click people to show only their stories.
export function AssigneeFilter({
  users,
  showUnassigned,
  value,
  onChange,
}: {
  users: User[]
  showUnassigned: boolean
  value: string[]
  onChange: (ids: string[]) => void
}) {
  if (users.length === 0 && !showUnassigned) return null

  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])

  return (
    <div className="assignee-filter" role="group" aria-label="Filter by assignee">
      {users.map((u) => (
        <button
          key={u.id}
          type="button"
          className={value.includes(u.id) ? 'assignee-filter-btn active' : 'assignee-filter-btn'}
          onClick={() => toggle(u.id)}
          aria-pressed={value.includes(u.id)}
          title={u.name}
        >
          <Avatar name={u.name} size={32} />
        </button>
      ))}
      {showUnassigned && (
        <button
          type="button"
          className={value.includes(UNASSIGNED) ? 'assignee-filter-btn active' : 'assignee-filter-btn'}
          onClick={() => toggle(UNASSIGNED)}
          aria-pressed={value.includes(UNASSIGNED)}
          title="Unassigned"
        >
          <span className="avatar-empty avatar-empty-lg">
            <UserRound size={16} />
          </span>
        </button>
      )}
    </div>
  )
}
