import { BookOpenCheck, ChevronDown, Inbox, Link2, ListTree, Tag, Trash2, UserRound, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { api, type Comment, type Project, type Sprint, type Story, type User } from '../api'
import type { Priority } from '../data'
import { AssigneePicker } from './AssigneePicker'
import { BranchCard } from './BranchCard'
import { Avatar } from './Avatar'
import { LabelChip } from './Label'
import { LabelPicker } from './LabelPicker'
import { MenuSelect } from './MenuSelect'
import { PriorityIcon } from './PriorityIcon'
import { StatusPicker } from './StatusPicker'
import { Subtasks } from './Subtasks'
import { formatDateTime, timeAgo } from '../time'

type Patch = Parameters<typeof api.updateStory>[1]

const PRIORITIES: Priority[] = ['urgent', 'high', 'medium', 'low']
const BACKLOG = '__backlog__'

export function StoryPanel({
  story,
  project,
  sprints,
  users,
  allLabels,
  currentUserId,
  onChange,
  onAddUser,
  onDelete,
  onClose,
  parent,
  subtasks,
  onCreateSubtask,
  onOpenStory,
}: {
  parent: Story | null
  subtasks: Story[]
  onCreateSubtask: (title: string) => Promise<void>
  onOpenStory: (id: string) => void
  story: Story
  project: Project
  sprints: Sprint[]
  users: User[]
  allLabels: string[]
  currentUserId: string | null
  onChange: (id: string, patch: Patch) => Promise<void>
  onAddUser: (name: string) => Promise<User>
  onDelete: (id: string) => Promise<void>
  onClose: () => void
}) {
  const panelRef = useRef<HTMLElement>(null)

  // Escape closes the panel unless a dropdown inside it is open (it handles Escape itself).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (panelRef.current?.querySelector('.label-picker')) return
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const save = (patch: Patch) => void onChange(story.id, patch)

  const sprintOptions = [
    {
      value: BACKLOG,
      node: (
        <>
          <Inbox size={14} className="menu-icon" /> Backlog
        </>
      ),
    },
    ...sprints
      .filter((s) => s.status !== 'completed' || s.id === story.sprint_id)
      .map((s) => ({
        value: s.id,
        node: (
          <>
            <span className={`sprint-dot sprint-dot-${s.status}`} /> {s.name}
          </>
        ),
      })),
  ]

  async function remove() {
    const extra = subtasks.length ? ` Its ${subtasks.length} subtask${subtasks.length === 1 ? '' : 's'} will be deleted too.` : ''
    if (!window.confirm(`Delete ${story.key}?${extra} This can't be undone.`)) return
    await onDelete(story.id)
  }

  return (
    <aside className="story-panel" ref={panelRef} aria-label={`${story.key} details`}>
      <header className="panel-bar">
        <div className="panel-crumbs">
          {parent ? (
            <span className="subtask-type" title="Subtask">
              <ListTree size={12} />
            </span>
          ) : (
            <span className="composer-type" title="Story">
              <BookOpenCheck size={14} />
            </span>
          )}
          <span>{project.name}</span>
          <span className="crumb-sep">/</span>
          {parent && (
            <>
              <button type="button" className="crumb-link" onClick={() => onOpenStory(parent.id)} title={parent.title}>
                {parent.key}
              </button>
              <span className="crumb-sep">/</span>
            </>
          )}
          <strong>{story.key}</strong>
        </div>
        <div className="panel-actions">
          <button
            type="button"
            className="row-icon-btn"
            title="Copy link"
            aria-label="Copy link to story"
            onClick={() => void navigator.clipboard?.writeText(window.location.href)}
          >
            <Link2 size={16} />
          </button>
          <button type="button" className="row-icon-btn danger" title="Delete" aria-label="Delete story" onClick={remove}>
            <Trash2 size={16} />
          </button>
          <button type="button" className="row-icon-btn" title="Close (Esc)" aria-label="Close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
      </header>

      <div className="panel-scroll">
        <TitleEditor key={`t-${story.id}`} value={story.title} onSave={(title) => save({ title })} />

        <div className="panel-status-row">
          <StatusPicker
            value={story.status}
            onChange={(status) => save({ status })}
            align="left"
            className="status-trigger-lg"
          />
        </div>

        <section className="panel-section">
          <h3 className="panel-h">Description</h3>
          <DescriptionEditor
            key={`d-${story.id}`}
            value={story.description}
            onSave={(description) => save({ description })}
          />
        </section>

        {!parent && (
          <Subtasks
            subtasks={subtasks}
            users={users}
            onCreate={onCreateSubtask}
            onOpen={onOpenStory}
            onChange={(id, patch) => void onChange(id, patch)}
            onAddUser={onAddUser}
          />
        )}

        <section className="details-card">
          <div className="details-head">
            Details <ChevronDown size={14} />
          </div>
          <dl className="details-grid">
            <dt>Assignee</dt>
            <dd>
              <PersonField
                value={story.assignee_id}
                users={users}
                onAddUser={onAddUser}
                onChange={(assignee_id) => save({ assignee_id })}
              />
              {currentUserId && story.assignee_id !== currentUserId && (
                <button type="button" className="link-btn" onClick={() => save({ assignee_id: currentUserId })}>
                  Assign to me
                </button>
              )}
            </dd>

            <dt>Reporter</dt>
            <dd>
              <PersonField
                value={story.reporter_id}
                users={users}
                onAddUser={onAddUser}
                onChange={(reporter_id) => save({ reporter_id })}
                emptyText="None"
              />
            </dd>

            <dt>Labels</dt>
            <dd>
              <LabelPicker
                value={story.labels}
                suggestions={allLabels}
                align="left"
                onChange={(labels) => save({ labels })}
                trigger={(open) => (
                  <button type="button" className="field-trigger field-labels" onClick={open}>
                    {story.labels.length ? (
                      story.labels.map((l) => <LabelChip key={l} label={l} />)
                    ) : (
                      <span className="field-empty">
                        <Tag size={14} /> None
                      </span>
                    )}
                  </button>
                )}
              />
            </dd>

            <dt>Priority</dt>
            <dd>
              <MenuSelect
                label="Priority"
                value={story.priority}
                onChange={(priority) => save({ priority })}
                options={PRIORITIES.map((p) => ({
                  value: p,
                  node: (
                    <>
                      <PriorityIcon priority={p} />
                      <span className="cap">{p}</span>
                    </>
                  ),
                }))}
              />
            </dd>

            <dt>Story points</dt>
            <dd>
              <PointsEditor key={`p-${story.id}`} value={story.points} onSave={(points) => save({ points })} />
            </dd>

            <dt>Sprint</dt>
            <dd>
              {parent ? (
                <span className="field-static" title="Subtasks move with their parent">
                  {sprints.find((s) => s.id === story.sprint_id)?.name ?? 'Backlog'}
                  <span className="muted">· follows {parent.key}</span>
                </span>
              ) : (
              <MenuSelect
                label="Sprint"
                value={story.sprint_id ?? BACKLOG}
                onChange={(v) => save({ sprint_id: v === BACKLOG ? null : v })}
                options={sprintOptions}
              />
              )}
            </dd>
          </dl>
        </section>

        <BranchCard storyKey={story.key} title={story.title} labels={story.labels} />

        <div className="panel-meta">
          <span>Created {formatDateTime(story.created_at)}</span>
          <span>Updated {timeAgo(story.updated_at)}</span>
        </div>

        <Comments key={`c-${story.id}`} storyId={story.id} users={users} currentUserId={currentUserId} />
      </div>
    </aside>
  )
}

function PersonField({
  value,
  users,
  onAddUser,
  onChange,
  emptyText = 'Unassigned',
}: {
  emptyText?: string
  value: string | null
  users: User[]
  onAddUser: (name: string) => Promise<User>
  onChange: (id: string | null) => void
}) {
  return (
    <AssigneePicker
      value={value}
      users={users}
      onAddUser={onAddUser}
      onChange={onChange}
      align="left"
      trigger={(open, person) => (
        <button type="button" className="field-trigger" onClick={open}>
          {person ? (
            <>
              <Avatar name={person.name} size={24} />
              <span>{person.name}</span>
            </>
          ) : (
            <>
              <span className="avatar-empty">
                <UserRound size={14} />
              </span>
              <span className="field-empty">{emptyText}</span>
            </>
          )}
        </button>
      )}
    />
  )
}

function TitleEditor({ value, onSave }: { value: string; onSave: (title: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  function commit() {
    const title = draft.trim()
    if (title && title !== value) onSave(title)
    setEditing(false)
  }

  if (!editing) {
    return (
      <h2 className="panel-title-view">
        <button
          type="button"
          onClick={() => {
            setDraft(value)
            setEditing(true)
          }}
          title="Click to edit"
        >
          {value}
        </button>
      </h2>
    )
  }

  return (
    <textarea
      className="panel-title"
      autoFocus
      value={draft}
      rows={2}
      maxLength={300}
      aria-label="Title"
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => setDraft(e.target.value.replace(/\n/g, ''))}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          e.currentTarget.blur()
        }
        if (e.key === 'Escape') {
          e.stopPropagation()
          setEditing(false)
        }
      }}
    />
  )
}

function DescriptionEditor({ value, onSave }: { value: string; onSave: (description: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  if (!editing) {
    return (
      <button
        type="button"
        className={value ? 'description-view' : 'description-view empty'}
        onClick={() => {
          setDraft(value)
          setEditing(true)
        }}
      >
        {value || 'Add a description…'}
      </button>
    )
  }

  return (
    <div className="description-edit">
      <textarea
        autoFocus
        rows={6}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Describe the work, acceptance criteria, links…"
        onKeyDown={(e) => {
          if (e.key === 'Escape') setEditing(false)
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            onSave(draft)
            setEditing(false)
          }
        }}
      />
      <div className="form-actions start">
        <button
          type="button"
          className="btn primary"
          onClick={() => {
            if (draft !== value) onSave(draft)
            setEditing(false)
          }}
        >
          Save
        </button>
        <button type="button" className="btn" onClick={() => setEditing(false)}>
          Cancel
        </button>
      </div>
    </div>
  )
}

function PointsEditor({ value, onSave }: { value: number | null; onSave: (points: number | null) => void }) {
  const [draft, setDraft] = useState(value === null ? '' : String(value))

  function commit() {
    const next = draft === '' ? null : Math.max(0, Math.min(100, Math.round(Number(draft))))
    if (next !== null && Number.isNaN(next)) return setDraft(value === null ? '' : String(value))
    setDraft(next === null ? '' : String(next))
    if (next !== value) onSave(next)
  }

  return (
    <input
      className="field-input"
      type="number"
      min={0}
      max={100}
      value={draft}
      placeholder="None"
      aria-label="Story points"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
    />
  )
}

function Comments({
  storyId,
  users,
  currentUserId,
}: {
  storyId: string
  users: User[]
  currentUserId: string | null
}) {
  const [comments, setComments] = useState<Comment[] | null>(null)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    api
      .listComments(storyId)
      .then((c) => !cancelled && setComments(c))
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : String(e)))
    return () => {
      cancelled = true
    }
  }, [storyId])

  async function submit() {
    if (!draft.trim() || saving) return
    setSaving(true)
    setError(null)
    try {
      const comment = await api.createComment(storyId, draft)
      setComments((prev) => [...(prev ?? []), comment])
      setDraft('')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  const me = users.find((u) => u.id === currentUserId)

  return (
    <section className="panel-section">
      <h3 className="panel-h">Activity</h3>
      <div className="comment-new">
        <Avatar name={me?.name ?? 'You'} size={32} />
        <div className="comment-box">
          <textarea
            rows={draft ? 3 : 1}
            value={draft}
            placeholder="Add a comment…"
            aria-label="Add a comment"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void submit()
            }}
          />
          {draft && (
            <div className="form-actions start">
              <button type="button" className="btn primary" disabled={saving} onClick={() => void submit()}>
                Save
              </button>
              <button type="button" className="btn" onClick={() => setDraft('')}>
                Cancel
              </button>
              <span className="composer-hint">
                <kbd>⌘</kbd> + <kbd>Enter</kbd> to save
              </span>
            </div>
          )}
        </div>
      </div>
      {error && <p className="form-error">{error}</p>}
      {comments === null && !error && <p className="muted">Loading comments…</p>}
      <ul className="comment-list">
        {[...(comments ?? [])].reverse().map((c) => {
          const author = users.find((u) => u.id === c.author_id)
          return (
            <li key={c.id}>
              <Avatar name={author?.name ?? 'Unknown'} size={32} />
              <div>
                <div className="comment-head">
                  <strong>{author?.name ?? 'Unknown user'}</strong>
                  <span title={formatDateTime(c.created_at)}>{timeAgo(c.created_at)}</span>
                </div>
                <p className="comment-body">{c.body}</p>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
