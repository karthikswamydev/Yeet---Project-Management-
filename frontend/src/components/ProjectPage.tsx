import { CalendarDays, ChevronRight, CircleCheckBig, CircleDot, Play, Plus, Tag, Target } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { api, type Project, type Sprint, type SprintStatus, type Story, type User } from '../api'
import { BOARD_COLUMNS, STATUS_LABEL, type Priority, type Status } from '../data'
import { CreateSprintModal } from './CreateSprintModal'
import { AssigneeFilter, UNASSIGNED } from './AssigneeFilter'
import { FilterDropdown } from './FilterDropdown'
import { LabelChip } from './Label'
import { StoryComposer } from './StoryComposer'
import { StoryPanel } from './StoryPanel'
import { StoryRow } from './StoryRow'

const SPRINT_STATUS_LABEL: Record<SprintStatus, string> = { planned: 'Planned', active: 'Active', completed: 'Completed' }

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function dueInfo(sprint: Sprint) {
  if (sprint.status === 'completed') return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = Math.round((new Date(`${sprint.due_date}T00:00:00`).getTime() - today.getTime()) / 86_400_000)
  if (days < 0) return { text: `${-days}d overdue`, tone: 'danger' }
  if (days === 0) return { text: 'Due today', tone: 'warn' }
  return { text: `${days}d left`, tone: days <= 3 ? 'warn' : 'muted' }
}

export function ProjectPage({
  projectId,
  currentUserId,
  onChanged,
}: {
  projectId: string
  currentUserId: string | null
  onChanged: () => void
}) {
  const [project, setProject] = useState<Project | null>(null)
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [stories, setStories] = useState<Story[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showSprintModal, setShowSprintModal] = useState(false)
  const [labelFilter, setLabelFilter] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<Status[]>([])
  const [assigneeFilter, setAssigneeFilter] = useState<string[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [p, sp, st, us] = await Promise.all([
        api.getProject(projectId),
        api.listSprints(projectId),
        api.listStories(projectId),
        api.listUsers(),
      ])
      setProject(p)
      setSprints(sp)
      setStories(st)
      setUsers(us)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [projectId])

  useEffect(() => {
    void load()
  }, [load])

  async function createStory(
    sprintId: string | null,
    data: { title: string; priority: Priority; points: number | null; labels: string[]; assignee_id: string | null },
  ) {
    const story = await api.createStory(projectId, { ...data, sprint_id: sprintId })
    setStories((prev) => [...prev, story])
    onChanged()
  }

  async function addUser(name: string) {
    const user = await api.createUser({ name })
    setUsers((prev) => [...prev, user].sort((a, b) => a.name.localeCompare(b.name)))
    return user
  }

  async function changeStory(id: string, patch: Parameters<typeof api.updateStory>[1]) {
    try {
      const updated = await api.updateStory(id, patch)
      setStories((prev) => prev.map((s) => (s.id === id ? updated : s)))
      onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  async function deleteStory(id: string) {
    try {
      await api.deleteStory(id)
      setStories((prev) => prev.filter((s) => s.id !== id))
      setSelectedId(null)
      onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  async function setSprintStatus(id: string, status: SprintStatus) {
    try {
      const updated = await api.updateSprint(id, { status })
      setSprints((prev) => prev.map((s) => (s.id === id ? updated : s)))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  if (error && !project) return <p className="form-error">{error}</p>
  if (!project) return <p className="empty">Loading…</p>

  const allLabels = [...new Map(stories.flatMap((s) => s.labels).map((l) => [l.toLowerCase(), l])).values()].sort(
    (a, b) => a.localeCompare(b),
  )
  // Within a filter any selected value matches; across filters all must match.
  const wantedLabels = new Set(labelFilter.map((l) => l.toLowerCase()))
  const visible = stories.filter(
    (s) =>
      (wantedLabels.size === 0 || s.labels.some((l) => wantedLabels.has(l.toLowerCase()))) &&
      (statusFilter.length === 0 || statusFilter.includes(s.status)) &&
      (assigneeFilter.length === 0 || assigneeFilter.includes(s.assignee_id ?? UNASSIGNED)),
  )
  const filtering = labelFilter.length > 0 || statusFilter.length > 0 || assigneeFilter.length > 0
  // People with work in this project.
  const assignedIds = new Set(stories.map((s) => s.assignee_id).filter(Boolean))
  const projectPeople = users.filter((u) => assignedIds.has(u.id))
  const hasUnassigned = stories.some((s) => s.assignee_id === null)
  const backlog = visible.filter((s) => s.sprint_id === null)
  const selected = stories.find((s) => s.id === selectedId) ?? null
  const pct = project.story_count ? Math.round((project.done_count / project.story_count) * 100) : 0

  return (
    <>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <a href="#/">Projects</a>
        <ChevronRight size={14} />
        <span>{project.name}</span>
      </nav>

      <div className="project-head">
        <span className="project-avatar" style={{ background: project.color }}>
          {project.key.slice(0, 2)}
        </span>
        <div className="project-head-text">
          <h1>{project.name}</h1>
          <p className="project-meta">
            <span className="key-badge">{project.key}</span>
            {project.description && <span>{project.description}</span>}
          </p>
        </div>
        <div className="project-head-stats">
          <div className="mini-progress" aria-label={`${pct}% done`}>
            <div className="mini-progress-bar" style={{ width: `${pct}%` }} />
          </div>
          <span>
            {pct}% done · {project.story_count} {project.story_count === 1 ? 'story' : 'stories'}
          </span>
        </div>
        <button className="btn primary" onClick={() => setShowSprintModal(true)}>
          <Plus size={16} /> Create sprint
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="filter-bar">
        <AssigneeFilter
          users={projectPeople}
          showUnassigned={hasUnassigned}
          value={assigneeFilter}
          onChange={setAssigneeFilter}
        />
        <FilterDropdown
          label="Status"
          icon={<CircleDot size={14} />}
          options={BOARD_COLUMNS.map((st) => ({
            value: st,
            text: STATUS_LABEL[st],
            node: <span className={`pill status-${st}`}>{STATUS_LABEL[st]}</span>,
          }))}
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as Status[])}
        />
        <FilterDropdown
          label="Label"
          icon={<Tag size={14} />}
          options={allLabels.map((l) => ({ value: l, text: l, node: <LabelChip label={l} /> }))}
          value={labelFilter}
          onChange={setLabelFilter}
          searchable
          emptyText="No labels yet. Add one from a story's tag icon."
        />
        {filtering && (
          <>
            <span className="muted">
              Showing {visible.length} of {stories.length} stories
            </span>
            <button
              className="filter-clear"
              onClick={() => {
                setLabelFilter([])
                setStatusFilter([])
                setAssigneeFilter([])
              }}
            >
              Clear all
            </button>
          </>
        )}
      </div>

      <section className="stack">
        <h2 className="section-title">Sprints</h2>
        {sprints.length === 0 && (
          <div className="panel empty-state">
            <p>No sprints yet. Create one with a due date, then pull stories in from the backlog.</p>
          </div>
        )}
        {sprints.map((sprint) => {
          const items = visible.filter((s) => s.sprint_id === sprint.id)
          const done = items.filter((s) => s.status === 'done').length
          const due = dueInfo(sprint)
          return (
            <div key={sprint.id} className="panel">
              <div className="panel-head sprint-head">
                <div>
                  <h3>
                    {sprint.name} <span className={`pill sprint-${sprint.status}`}>{SPRINT_STATUS_LABEL[sprint.status]}</span>
                  </h3>
                  <div className="sprint-dates">
                    <CalendarDays size={14} />
                    {sprint.start_date ? `${formatDate(sprint.start_date)} – ` : 'Due '}
                    {formatDate(sprint.due_date)}
                    {due && <span className={`due due-${due.tone}`}> · {due.text}</span>}
                    {sprint.goal && (
                      <span className="sprint-goal">
                        <Target size={14} /> {sprint.goal}
                      </span>
                    )}
                  </div>
                </div>
                <div className="sprint-actions">
                  <span className="muted">
                    {done}/{items.length} done
                  </span>
                  {sprint.status === 'planned' && (
                    <button className="btn" onClick={() => setSprintStatus(sprint.id, 'active')}>
                      <Play size={14} /> Start sprint
                    </button>
                  )}
                  {sprint.status === 'active' && (
                    <button className="btn" onClick={() => setSprintStatus(sprint.id, 'completed')}>
                      <CircleCheckBig size={14} /> Complete sprint
                    </button>
                  )}
                </div>
              </div>
              {items.length > 0 && (
                <ul className="story-list">
                  {items.map((s) => (
                    <StoryRow key={s.id} story={s} sprints={sprints} allLabels={allLabels}
                      users={users}
                      selected={s.id === selectedId}
                      onOpen={setSelectedId}
                      onAddUser={addUser}
                      onChange={changeStory}
                    />
                  ))}
                </ul>
              )}
              {sprint.status !== 'completed' && (
                <div className="panel-foot">
                  <StoryComposer labelSuggestions={allLabels}
                    users={users}
                    onAddUser={addUser} onCreate={(d) => createStory(sprint.id, d)} />
                </div>
              )}
            </div>
          )
        })}
      </section>

      <section className="stack">
        <h2 className="section-title">
          Backlog <span className="count">{backlog.length}</span>
        </h2>
        <div className="panel">
          {backlog.length === 0 ? (
            <p className="empty">The backlog is empty. Capture ideas here, then plan them into a sprint.</p>
          ) : (
            <ul className="story-list">
              {backlog.map((s) => (
                <StoryRow key={s.id} story={s} sprints={sprints} allLabels={allLabels}
                      users={users}
                      selected={s.id === selectedId}
                      onOpen={setSelectedId}
                      onAddUser={addUser}
                      onChange={changeStory}
                    />
              ))}
            </ul>
          )}
          <div className="panel-foot">
            <StoryComposer
              placeholder="Add to backlog…"
              labelSuggestions={allLabels}
                    users={users}
                    onAddUser={addUser}
              onCreate={(d) => createStory(null, d)}
            />
          </div>
        </div>
      </section>

      {showSprintModal && (
        <CreateSprintModal
          projectId={projectId}
          nextNumber={sprints.length + 1}
          onClose={() => setShowSprintModal(false)}
          onCreated={(s) => {
            setSprints((prev) => [...prev, s].sort((a, b) => a.due_date.localeCompare(b.due_date)))
            setShowSprintModal(false)
            onChanged()
          }}
        />
      )}
      {selected && (
        <StoryPanel
          story={selected}
          project={project}
          sprints={sprints}
          users={users}
          allLabels={allLabels}
          currentUserId={currentUserId}
          onChange={changeStory}
          onAddUser={addUser}
          onDelete={deleteStory}
          onClose={() => setSelectedId(null)}
        />
      )}
    </>
  )
}
