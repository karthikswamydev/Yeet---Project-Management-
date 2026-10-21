import { BookOpenCheck, ChevronDown, CornerDownLeft, Plus, Tag, UserRound, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { User } from '../api'
import type { Priority } from '../data'
import { AssigneePicker } from './AssigneePicker'
import { Avatar } from './Avatar'
import { LabelChip } from './Label'
import { LabelPicker } from './LabelPicker'
import { PriorityIcon } from './PriorityIcon'

const PRIORITIES: Priority[] = ['urgent', 'high', 'medium', 'low']

export function StoryComposer({
  placeholder = 'What needs to be done?',
  labelSuggestions,
  users,
  onAddUser,
  onCreate,
}: {
  placeholder?: string
  labelSuggestions: string[]
  users: User[]
  onAddUser: (name: string) => Promise<User>
  onCreate: (story: {
    title: string
    priority: Priority
    points: number | null
    labels: string[]
    assignee_id: string | null
  }) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [points, setPoints] = useState('')
  const [labels, setLabels] = useState<string[]>([])
  const [assigneeId, setAssigneeId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() || saving) return
    setSaving(true)
    try {
      await onCreate({ title: title.trim(), priority, points: points === '' ? null : Number(points), labels, assignee_id: assigneeId })
      setTitle('')
      setPoints('')
    } catch {
      // The API client already showed an error toast.
    } finally {
      setSaving(false)
    }
  }

  function close() {
    setOpen(false)
  }

  if (!open) {
    return (
      <button className="add-story" onClick={() => setOpen(true)}>
        <Plus size={15} /> Create story
      </button>
    )
  }

  return (
    <>
      <form className="composer" onSubmit={submit} onKeyDown={(e) => e.key === 'Escape' && close()}>
        <span className="composer-type" title="Story">
          <BookOpenCheck size={14} />
        </span>
        <input
          className="composer-input"
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={placeholder}
          maxLength={300}
          aria-label="Story title"
        />

        <label className="chip" title="Priority">
          <PriorityIcon priority={priority} />
          <span className="chip-label">{priority}</span>
          <ChevronDown size={14} className="chip-caret" />
          <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} aria-label="Priority">
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
        </label>

        <LabelPicker
          value={labels}
          suggestions={labelSuggestions}
          onChange={setLabels}
          trigger={(open) => (
            <button type="button" className="chip" onClick={open} title="Labels">
              <Tag size={13} />
              {labels.length === 0 ? (
                <span className="chip-label">Label</span>
              ) : labels.length === 1 ? (
                <LabelChip label={labels[0]} />
              ) : (
                <span className="chip-label">{labels.length} labels</span>
              )}
            </button>
          )}
        />

        <AssigneePicker
          value={assigneeId}
          users={users}
          onAddUser={onAddUser}
          onChange={setAssigneeId}
          trigger={(open, assignee) => (
            <button type="button" className="chip" onClick={open} title="Assignee">
              {assignee ? <Avatar name={assignee.name} size={18} /> : <UserRound size={13} />}
              <span className="chip-label">{assignee ? assignee.name.split(' ')[0] : 'Assignee'}</span>
            </button>
          )}
        />

        <label className="chip chip-points" title="Story points">
          <span className="chip-prefix">Pts</span>
          <input
            type="number"
            min={0}
            max={100}
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            placeholder="–"
            aria-label="Story points"
          />
        </label>

        <button className="composer-submit" disabled={!title.trim() || saving} aria-label="Add story">
          <CornerDownLeft size={15} />
        </button>
        <button type="button" className="composer-close" onClick={close} aria-label="Close">
          <X size={15} />
        </button>
      </form>
      <div className="composer-hint">
                    <kbd>Enter</kbd> to add · <kbd>Esc</kbd> to close
      </div>
    </>
  )
}
