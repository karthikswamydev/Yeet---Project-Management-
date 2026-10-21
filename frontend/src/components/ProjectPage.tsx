import { Archive, CalendarDays, ChevronRight, CircleCheckBig, CircleDot, Cloud, Eye, ListChecks, Lock, Play, Plus, Settings, Tag, Target } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { api, type Project, type Sprint, type SprintStatus, type Story, type User } from '../api'
import { BOARD_COLUMNS, STATUS_LABEL, type Priority, type Status } from '../data'
import { CreateSprintModal } from './CreateSprintModal'
import { AssigneeFilter, UNASSIGNED } from './AssigneeFilter'
import { FilterDropdown } from './FilterDropdown'
import { LabelChip } from './Label'
import { projectHref, resourcesHref, settingsHref, type ProjectTab } from '../routes'
import { projectPermissions, useAuth } from '../auth'
import { PROJECT_ROLE_LABEL } from '../api'
import { ProjectSettings } from './ProjectSettings'
import { ResourcesTab } from './ResourcesTab'
import { StoryComposer } from './StoryComposer'
import { StoryPanel } from './StoryPanel'
import { StoryRow } from './StoryRow'
import { daysUntil, dueText, formatDay } from '../time'

const SPRINT_STATUS_LABEL: Record<SprintStatus, string> = { planned: 'Planned', active: 'Active', completed: 'Completed' }

function dueInfo(sprint: Sprint) {
  return sprint.status === 'completed' ? null : dueText(daysUntil(sprint.due_date))
}

export function ProjectPage({
  projectId,
  storyId,
  tab,
  onSelectStory,
  currentUserId,
  onChanged,
}: {
  projectId: string
  storyId: string | null
  tab: ProjectTab
  onSelectStory: (id: string | null) => void
  currentUserId: string | null
  onChanged: () => void
}) {
  const { me, mode } = useAuth()
  const [project, setProject] = useState<Project | null>(null)
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [stories, setStories] = useState<Story[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loadFailed, setLoadFailed] = useState(false)
  const [showSprintModal, setShowSprintModal] = useState(false)
  const [labelFilter, setLabelFilter] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<Status[]>([])
  const [assigneeFilter, setAssigneeFilter] = useState<string[]>([])

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
      setLoadFailed(false)
    } catch {
      setLoadFailed(true)
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

  async function createSubtask(parentId: string, title: string) {
    const story = await api.createStory(projectId, { title, parent_id: parentId })
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
      setStories((prev) =>
        prev.map((s) => {
          if (s.id === id) return updated
          // The server moves subtasks along with their parent.
          if ('sprint_id' in patch && s.parent_id === id) return { ...s, sprint_id: updated.sprint_id }
          return s
        }),
      )
      onChanged()
    } catch {
      // The API client already showed an error toast.
    }
  }

  async function deleteStory(id: string) {
    try {
      await api.deleteStory(id)
      setStories((prev) => prev.filter((s) => s.id !== id && s.parent_id !== id))
      onSelectStory(null)
      onChanged()
    } catch {
      // The API client already showed an error toast.
    }
  }

  async function setSprintStatus(id: string, status: SprintStatus) {
    try {
      const updated = await api.updateSprint(id, { status })
      setSprints((prev) => prev.map((s) => (s.id === id ? updated : s)))
    } catch {
      // The API client already showed an error toast.
    }
  }

  if (loadFailed && !project) return <p className="empty">Couldn&apos;t load this project. Try refreshing the page.</p>
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
  const parents = stories.filter((s) => !s.parent_id)
  const assignedIds = new Set(parents.map((s) => s.assignee_id).filter(Boolean))
  const projectPeople = users.filter((u) => assignedIds.has(u.id))
  const hasUnassigned = parents.some((s) => s.assignee_id === null)
  // Subtasks live under their parent (panel + row badge), not as separate rows.
  const childrenOf = new Map<string, Story[]>()
  for (const s of stories) {
    if (s.parent_id) childrenOf.set(s.parent_id, [...(childrenOf.get(s.parent_id) ?? []), s])
  }
  const topLevel = visible.filter((s) => !s.parent_id)
  const backlog = topLevel.filter((s) => s.sprint_id === null)
  const selected = stories.find((s) => s.id === storyId) ?? null
  const perms = projectPermissions(me, project)
  // Quick-add is dev only: with real sign-in, people must be invited from People & roles.
  const addUserIfAdmin = me?.role === 'admin' && mode === 'dev' ? addUser : undefined
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
        {tab === 'work' && perms.canManageSprints && (
          <button className="btn primary" onClick={() => setShowSprintModal(true)}>
            <Plus size={16} /> Create sprint
          </button>
        )}
      </div>

      <nav className="tabs tabs-line project-tabs" aria-label="Project sections">
        <a href={projectHref(projectId)} className={tab === 'work' ? 'tab active' : 'tab'} aria-current={tab === 'work'}>
          <ListChecks size={15} /> Backlog &amp; sprints
        </a>
        {perms.canSeeResources && (
          <a href={resourcesHref(projectId)} className={tab === 'resources' ? 'tab active' : 'tab'} aria-current={tab === 'resources'}>
            <Cloud size={15} /> Resources
          </a>
        )}
        {perms.canManageProject && (
          <a href={settingsHref(projectId)} className={tab === 'settings' ? 'tab active' : 'tab'} aria-current={tab === 'settings'}>
            <Settings size={15} /> Settings
          </a>
        )}
      </nav>

      {perms.archived && (
        <div className="notice notice-archived">
          <Archive size={16} />
          <span>This project is archived, so it&apos;s read-only.</span>
          {perms.canManageProject && tab !== 'settings' && <a href={settingsHref(projectId)}>Restore it in Settings</a>}
        </div>
      )}
      {!perms.archived && (perms.access === 'reader' || perms.access === 'viewer') && (
        <div className="notice">
          <Eye size={16} />
          <span>
            {perms.access === 'viewer'
              ? `You're a ${PROJECT_ROLE_LABEL.viewer.toLowerCase()} here: you can read and comment, but not change work.`
              : "You're browsing an open project. Ask its scrum master to add you to make changes or comment."}
          </span>
        </div>
      )}


      {tab === 'resources' &&
        (perms.canSeeResources ? (
          <ResourcesTab projectId={projectId} users={users} canEdit={perms.canEditResources} />
        ) : (
          <div className="panel resource-empty">
            <Lock size={28} />
            <h3>Resources are for project contributors</h3>
            <p>Costs and infrastructure details are visible to contributors and scrum masters.</p>
          </div>
        ))}

      {tab === 'settings' &&
        (perms.canManageProject ? (
          <ProjectSettings
            project={project}
            users={users}
            onProjectChange={(p) => {
              setProject(p)
              onChanged()
            }}
          />
        ) : (
          <div className="panel resource-empty">
            <Lock size={28} />
            <h3>Only the scrum master can change project settings</h3>
          </div>
        ))}

      {tab === 'work' && (
      <>
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
          const items = topLevel.filter((s) => s.sprint_id === sprint.id)
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
                    {sprint.start_date ? `${formatDay(sprint.start_date)} – ` : 'Due '}
                    {formatDay(sprint.due_date)}
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
                  {perms.canManageSprints && sprint.status === 'planned' && (
                    <button className="btn" onClick={() => setSprintStatus(sprint.id, 'active')}>
                      <Play size={14} /> Start sprint
                    </button>
                  )}
                  {perms.canManageSprints && sprint.status === 'active' && (
                    <button className="btn" onClick={() => setSprintStatus(sprint.id, 'completed')}>
                      <CircleCheckBig size={14} /> Complete sprint
                    </button>
                  )}
                </div>
              </div>
              {items.length > 0 && (
                <ul className="story-list">
                  {items.map((s) => (
                    <StoryRow key={s.id} story={s} subtasks={childrenOf.get(s.id)} sprints={sprints} allLabels={allLabels}
                      users={users}
                      selected={s.id === storyId}
                      onOpen={onSelectStory}
                      onAddUser={addUserIfAdmin}
                      readOnly={!perms.canEditWork}
                      onChange={changeStory}
                    />
                  ))}
                </ul>
              )}
              {perms.canEditWork && sprint.status !== 'completed' && (
                <div className="panel-foot">
                  <StoryComposer labelSuggestions={allLabels}
                    users={users}
                    onAddUser={addUserIfAdmin} onCreate={(d) => createStory(sprint.id, d)} />
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
                <StoryRow key={s.id} story={s} subtasks={childrenOf.get(s.id)} sprints={sprints} allLabels={allLabels}
                      users={users}
                      selected={s.id === storyId}
                      onOpen={onSelectStory}
                      onAddUser={addUserIfAdmin}
                      readOnly={!perms.canEditWork}
                      onChange={changeStory}
                    />
              ))}
            </ul>
          )}
          {perms.canEditWork && (
          <div className="panel-foot">
            <StoryComposer
              placeholder="Add to backlog…"
              labelSuggestions={allLabels}
                    users={users}
                    onAddUser={addUserIfAdmin}
              onCreate={(d) => createStory(null, d)}
            />
          </div>
          )}
        </div>
      </section>
      </>
      )}

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
          onAddUser={addUserIfAdmin}
          onDelete={deleteStory}
          onClose={() => onSelectStory(null)}
          parent={selected.parent_id ? (stories.find((s) => s.id === selected.parent_id) ?? null) : null}
          subtasks={childrenOf.get(selected.id) ?? []}
          onCreateSubtask={(title) => createSubtask(selected.id, title)}
          onOpenStory={onSelectStory}
          perms={perms}
        />
      )}
    </>
  )
}
