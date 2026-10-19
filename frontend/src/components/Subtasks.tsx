import { CornerDownLeft, ListTree, Plus, UserRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { Story, User } from '../api'
import type { Status } from '../data'
import { AssigneePicker } from './AssigneePicker'
import { Avatar } from './Avatar'
import { PriorityIcon } from './PriorityIcon'
import { StatusPicker } from './StatusPicker'

export function Subtasks({
  subtasks,
  users,
  onCreate,
  onOpen,
  onChange,
  onAddUser,
}: {
  subtasks: Story[]
  users: User[]
  onCreate: (title: string) => Promise<void>
  onOpen: (id: string) => void
  onChange: (id: string, patch: { status?: Status; assignee_id?: string | null }) => void
  onAddUser: (name: string) => Promise<User>
}) {
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const done = subtasks.filter((s) => s.status === 'done').length
  const pct = subtasks.length ? Math.round((done / subtasks.length) * 100) : 0

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() || saving) return
    setSaving(true)
    setError(null)
    try {
      await onCreate(title.trim())
      setTitle('')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="panel-section">
      <div className="subtasks-head">
        <h3 className="panel-h">Subtasks</h3>
        {subtasks.length > 0 && (
          <span className="subtasks-progress">
            <span className="mini-progress" aria-label={`${pct}% done`}>
              <span className="mini-progress-bar" style={{ width: `${pct}%` }} />
            </span>
            {pct}% done
          </span>
        )}
        {!adding && (
          <button type="button" className="row-icon-btn" aria-label="Add subtask" title="Add subtask" onClick={() => setAdding(true)}>
            <Plus size={16} />
          </button>
        )}
      </div>

      {subtasks.length > 0 && (
        <ul className="subtask-list">
          {subtasks.map((s) => (
            <li key={s.id} className={s.status === 'done' ? 'subtask-row is-done' : 'subtask-row'}>
              <span className="subtask-type" title="Subtask">
                <ListTree size={12} />
              </span>
              <button type="button" className="subtask-link" onClick={() => onOpen(s.id)}>
                <span className="task-key">{s.key}</span>
                <span className="task-title">{s.title}</span>
              </button>
              <PriorityIcon priority={s.priority} />
              <AssigneePicker
                value={s.assignee_id}
                users={users}
                onAddUser={onAddUser}
                onChange={(assignee_id) => onChange(s.id, { assignee_id })}
                trigger={(open, assignee) => (
                  <button
                    type="button"
                    className="assignee-trigger"
                    onClick={open}
                    title={assignee ? assignee.name : 'Unassigned'}
                    aria-label={assignee ? `Assignee: ${assignee.name}` : 'Unassigned'}
                  >
                    {assignee ? (
                      <Avatar name={assignee.name} size={24} />
                    ) : (
                      <span className="avatar-empty">
                        <UserRound size={14} />
                      </span>
                    )}
                  </button>
                )}
              />
              <StatusPicker value={s.status} onChange={(status) => onChange(s.id, { status })} />
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <>
          <form
            className="composer subtask-composer"
            onSubmit={submit}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.stopPropagation()
                setAdding(false)
              }
            }}
          >
            <span className="subtask-type">
              <ListTree size={12} />
            </span>
            <input
              className="composer-input"
              autoFocus
              value={title}
              maxLength={300}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              aria-label="Subtask title"
            />
            <button className="composer-submit" disabled={!title.trim() || saving} aria-label="Add subtask">
              <CornerDownLeft size={15} />
            </button>
          </form>
          <div className="composer-hint">
            {error ? (
              <span className="form-error">{error}</span>
            ) : (
              <>
                <kbd>Enter</kbd> to add · <kbd>Esc</kbd> to close
              </>
            )}
          </div>
        </>
      ) : (
        subtasks.length === 0 && (
          <button type="button" className="add-story" onClick={() => setAdding(true)}>
            <Plus size={15} /> Add subtask
          </button>
        )
      )}
    </section>
  )
}
