import { Check, Search, UserPlus, UserRound } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { User } from '../api'
import { Avatar } from './Avatar'

export function AssigneePicker({
  value,
  users,
  onChange,
  onAddUser,
  trigger,
  align = 'right',
}: {
  value: string | null
  users: User[]
  onChange: (userId: string | null) => void
  // Only admins can add people, so this is omitted for everyone else.
  onAddUser?: (name: string) => Promise<User>
  trigger: (open: () => void, assignee: User | null) => ReactNode
  align?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const assignee = users.find((u) => u.id === value) ?? null
  const q = query.trim()
  const shown = users.filter((u) => `${u.name} ${u.email ?? ''}`.toLowerCase().includes(q.toLowerCase()))
  const canAdd = !!onAddUser && q !== '' && !users.some((u) => u.name.toLowerCase() === q.toLowerCase())

  function pick(id: string | null) {
    onChange(id)
    setOpen(false)
    setQuery('')
  }

  async function add() {
    try {
      if (!onAddUser) return
      const user = await onAddUser(q)
      pick(user.id)
    } catch {
      // The API client already showed an error toast.
    }
  }

  return (
    <div className="label-picker-anchor" ref={ref}>
      {trigger(() => setOpen((o) => !o), assignee)}
      {open && (
        <div
          className={`label-picker label-picker-${align} assignee-menu`}
          role="dialog"
          aria-label="Assignee"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation()
              setOpen(false)
            }
          }}
        >
          <div className="label-search">
            <Search size={14} />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people"
              aria-label="Search people"
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return
                e.preventDefault()
                e.stopPropagation()
                if (shown[0]) pick(shown[0].id)
                else if (canAdd) void add()
              }}
            />
          </div>
          <ul className="label-options">
            {!q && (
              <li>
                <button type="button" onClick={() => pick(null)}>
                  <span className="avatar-empty">
                    <UserRound size={14} />
                  </span>
                  <span className="assignee-name">Unassigned</span>
                  {value === null && <Check size={14} className="status-check" />}
                </button>
              </li>
            )}
            {shown.map((u) => (
              <li key={u.id}>
                <button type="button" onClick={() => pick(u.id)}>
                  <Avatar name={u.name} size={24} />
                  <span className="assignee-name">
                    {u.name}
                    {u.email && <small>{u.email}</small>}
                  </span>
                  {u.id === value && <Check size={14} className="status-check" />}
                </button>
              </li>
            ))}
            {canAdd && (
              <li>
                <button type="button" onClick={() => void add()}>
                  <span className="avatar-empty">
                    <UserPlus size={14} />
                  </span>
                  <span className="assignee-name">
                    Add <strong>“{q}”</strong> to the team
                  </span>
                </button>
              </li>
            )}
            {shown.length === 0 && !canAdd && q && <li className="label-empty">No matches</li>}
          </ul>
        </div>
      )}
    </div>
  )
}
