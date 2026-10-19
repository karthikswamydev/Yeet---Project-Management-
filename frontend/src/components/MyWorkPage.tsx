import { useState } from 'react'
import type { Project, Story } from '../api'
import { STATUS_LABEL, type Status } from '../data'
import { daysUntil } from '../time'
import { storyDueDays, useWorkData } from '../useWorkData'
import { WorkRow } from './WorkRow'

type Tab = 'assigned' | 'reported'
const GROUPS: Status[] = ['in_progress', 'in_review', 'todo', 'done']

export function MyWorkPage({ currentUserId, projects }: { currentUserId: string | null; projects: Project[] }) {
  const { stories, sprints, users, error } = useWorkData()
  const [tab, setTab] = useState<Tab>('assigned')
  const [showDone, setShowDone] = useState(false)

  const projectById = new Map(projects.map((p) => [p.id, p]))
  const sprintById = new Map(sprints.map((s) => [s.id, s]))
  const userById = new Map(users.map((u) => [u.id, u]))
  const all = stories ?? []
  const list = all.filter((s) => (tab === 'assigned' ? s.assignee_id : s.reporter_id) === currentUserId)

  const PRIORITY_RANK = { urgent: 0, high: 1, medium: 2, low: 3 }
  const due = (s: Story) => storyDueDays(s, sprintById, daysUntil) ?? 999
  const sorted = (items: Story[]) =>
    [...items].sort((a, b) => due(a) - due(b) || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority])

  return (
    <>
      <div className="page-head">
        <h1>My work</h1>
        <p className="subtitle">Everything on your plate, across all projects.</p>
      </div>

      <div className="tabs tabs-line" role="tablist">
        <button role="tab" aria-selected={tab === 'assigned'} className={tab === 'assigned' ? 'tab active' : 'tab'} onClick={() => setTab('assigned')}>
          Assigned to me <span className="count">{all.filter((s) => s.assignee_id === currentUserId && s.status !== 'done').length}</span>
        </button>
        <button role="tab" aria-selected={tab === 'reported'} className={tab === 'reported' ? 'tab active' : 'tab'} onClick={() => setTab('reported')}>
          Reported by me <span className="count">{all.filter((s) => s.reporter_id === currentUserId && s.status !== 'done').length}</span>
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}
      {stories === null && !error && <p className="empty">Loading…</p>}

      {stories !== null && list.length === 0 && (
        <div className="panel empty-state">
          <p>
            {tab === 'assigned'
              ? 'Nothing is assigned to you yet. Open a project and assign yourself a story.'
              : "You haven't reported any stories yet."}
          </p>
        </div>
      )}

      {GROUPS.map((status) => {
        const items = sorted(list.filter((s) => s.status === status))
        if (items.length === 0) return null
        const collapsed = status === 'done' && !showDone
        return (
          <section key={status} className="stack">
            <h2 className="section-title group-title">
              <span className={`pill status-${status}`}>{STATUS_LABEL[status]}</span>
              <span className="count">{items.length}</span>
              {status === 'done' && (
                <button className="link-btn" onClick={() => setShowDone((v) => !v)}>
                  {showDone ? 'Hide' : 'Show'}
                </button>
              )}
            </h2>
            {!collapsed && (
              <div className="panel">
                <ul className="work-list">
                  {items.map((s) => (
                    <WorkRow
                      key={s.id}
                      story={s}
                      project={projectById.get(s.project_id)}
                      sprintById={sprintById}
                      assignee={s.assignee_id ? userById.get(s.assignee_id) : null}
                      showAssignee={tab === 'reported'}
                    />
                  ))}
                </ul>
              </div>
            )}
          </section>
        )
      })}
    </>
  )
}
