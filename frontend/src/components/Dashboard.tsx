import { ArrowRight } from 'lucide-react'
import { useRef, useState } from 'react'
import type { Project } from '../api'
import { STATUS_LABEL } from '../data'
import { projectHref, storyHref } from '../routes'
import { daysUntil, dueText, timeAgo } from '../time'
import { storyDueDays, useWorkData } from '../useWorkData'
import { Avatar } from './Avatar'
import { ProjectCards } from './ProjectCards'
import { StatStrip } from './StatStrip'
import { WorkRow } from './WorkRow'

type Tab = 'open' | 'overdue' | 'done'

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function Dashboard({
  userName,
  currentUserId,
  projects,
  onCreateProject,
}: {
  userName: string
  currentUserId: string | null
  projects: Project[]
  onCreateProject: () => void
}) {
  const { stories, sprints, users, error } = useWorkData()
  const [tab, setTab] = useState<Tab>('open')
  const myWorkRef = useRef<HTMLElement>(null)
  const [today] = useState(() =>
    new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }),
  )

  const projectById = new Map(projects.map((p) => [p.id, p]))
  const sprintById = new Map(sprints.map((s) => [s.id, s]))
  const userById = new Map(users.map((u) => [u.id, u]))
  const all = stories ?? []
  const mine = all.filter((s) => s.assignee_id === currentUserId)
  const open = mine.filter((s) => s.status !== 'done')
  const dueDays = (s: (typeof all)[number]) => storyDueDays(s, sprintById, daysUntil)
  const overdue = open.filter((s) => (dueDays(s) ?? 0) < 0)
  const done = mine.filter((s) => s.status === 'done')

  // Open work sorted by urgency: overdue/soonest sprint due first, then priority.
  const PRIORITY_RANK = { urgent: 0, high: 1, medium: 2, low: 3 }
  const byUrgency = (a: (typeof all)[number], b: (typeof all)[number]) =>
    (dueDays(a) ?? 999) - (dueDays(b) ?? 999) || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
  const tabStories = { open: [...open].sort(byUrgency), overdue: [...overdue].sort(byUrgency), done }[tab]


  const activeSprints = sprints.filter((s) => s.status === 'active')

  return (
    <>
      <div className="page-head">
        <h1>
          {greeting()}, {userName.split(' ')[0]}
        </h1>
        <p className="subtitle">{today}</p>
      </div>

      {error && <p className="empty">Couldn&apos;t load this. Try refreshing the page.</p>}

      <StatStrip
        open={open}
        overdue={overdue}
        done={done}
        dueDays={dueDays}
        loading={stories === null}
        onSelect={(t) => {
          setTab(t)
          myWorkRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }}
      />

      <div className="two-col">
        <section className="panel" ref={myWorkRef}>
          <div className="panel-head">
            <h2>My work</h2>
            <div className="tabs" role="tablist">
              {(['open', 'overdue', 'done'] as Tab[]).map((t) => (
                <button
                  key={t}
                  role="tab"
                  aria-selected={tab === t}
                  className={tab === t ? 'tab active' : 'tab'}
                  onClick={() => setTab(t)}
                >
                  {t === 'open' ? 'Open' : t === 'overdue' ? 'Overdue' : 'Done'}
                </button>
              ))}
            </div>
          </div>
          {stories === null ? (
            <p className="empty">Loading…</p>
          ) : tabStories.length === 0 ? (
            <p className="empty">
              {tab === 'open'
                ? 'Nothing assigned to you. Pick something up from a project backlog.'
                : tab === 'overdue'
                  ? 'Nothing overdue. Nice.'
                  : 'No completed stories yet.'}
            </p>
          ) : (
            <ul className="work-list compact">
              {tabStories.slice(0, 6).map((s) => (
                <WorkRow key={s.id} story={s} project={projectById.get(s.project_id)} sprintById={sprintById} />
              ))}
            </ul>
          )}
          <a className="panel-link" href="#/my-work">
            View all my work <ArrowRight size={14} />
          </a>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Recent activity</h2>
          </div>
          {all.length === 0 ? (
            <p className="empty">{stories === null ? 'Loading…' : 'No activity yet.'}</p>
          ) : (
            <ul className="activity">
              {all.slice(0, 7).map((s) => {
                const who = s.assignee_id ? userById.get(s.assignee_id) : null
                return (
                  <li key={s.id}>
                    <a className="activity-row" href={storyHref(s.project_id, s.id)}>
                      <Avatar name={who?.name ?? '?'} size={28} />
                      <div className="activity-text">
                        <div className="activity-title">
                          <span className="task-key">{s.key}</span> {s.title}
                        </div>
                        <div className="activity-when">
                          <span className={`pill status-${s.status}`}>{STATUS_LABEL[s.status]}</span>
                          updated {timeAgo(s.updated_at)}
                        </div>
                      </div>
                    </a>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      <section>
        <div className="section-head">
          <h2>Active sprints</h2>
        </div>
        {activeSprints.length === 0 ? (
          <div className="panel empty-state">
            <p>No active sprints. Open a project and press Start sprint to begin one.</p>
          </div>
        ) : (
          <div className="sprint-grid">
            {activeSprints.map((sp) => {
              const items = all.filter((s) => s.sprint_id === sp.id)
              const doneCount = items.filter((s) => s.status === 'done').length
              const pct = items.length ? Math.round((doneCount / items.length) * 100) : 0
              const project = projectById.get(sp.project_id)
              const due = dueText(daysUntil(sp.due_date))
              const people = [...new Set(items.map((s) => s.assignee_id).filter((id): id is string => !!id))]
              return (
                <a key={sp.id} className="sprint-card" href={projectHref(sp.project_id)}>
                  <div className="sprint-card-top">
                    <span className="work-project">
                      <span className="dot" style={{ background: project?.color ?? '#8590a2' }} />
                      {project?.name}
                    </span>
                    <span className={`due due-${due.tone}`}>{due.text}</span>
                  </div>
                  <h3>{sp.name}</h3>
                  {sp.goal && <p className="sprint-card-goal">{sp.goal}</p>}
                  <div className="progress" aria-label={`${pct}% complete`}>
                    <div className="progress-bar" style={{ width: `${pct}%`, background: 'var(--accent)' }} />
                  </div>
                  <div className="sprint-card-foot">
                    <span>
                      {doneCount}/{items.length} done
                    </span>
                    <span className="avatar-stack">
                      {people.slice(0, 4).map((id) => (
                        <Avatar key={id} name={userById.get(id)?.name ?? '?'} size={24} />
                      ))}
                    </span>
                  </div>
                </a>
              )
            })}
          </div>
        )}
      </section>

      <ProjectCards projects={projects} onCreate={onCreateProject} />
    </>
  )
}
