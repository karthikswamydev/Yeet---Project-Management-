import { Lock, Plus } from 'lucide-react'
import { PROJECT_ROLE_LABEL, type Project } from '../api'
import { useAuth } from '../auth'
import { projectHref } from '../routes'

export function ProjectCards({ projects, onCreate }: { projects: Project[]; onCreate: () => void }) {
  const { me } = useAuth()
  const live = projects.filter((p) => !p.archived_at)
  return (
    <section>
      <div className="section-head">
        <h2>Projects</h2>
      </div>
      <div className="project-grid">
        {live.map((p) => {
          const pct = p.story_count ? Math.round((p.done_count / p.story_count) * 100) : 0
          return (
            <a key={p.id} href={projectHref(p.id)} className="project-card">
              <div className="project-banner" style={{ background: p.color }} />
              <div className="project-body">
                <h3>
                  {p.name} <span className="key-badge">{p.key}</span>
                  {p.visibility === 'private' && <Lock size={13} className="card-lock" aria-label="Private" />}
                </h3>
                <span className={p.my_role ? 'card-role' : 'card-role muted-role'}>
                  {me?.role === 'admin' && !p.my_role ? 'Admin' : p.my_role ? PROJECT_ROLE_LABEL[p.my_role] : 'Not a member · read-only'}
                </span>
                <p>{p.description || 'No description'}</p>
                <div className="progress" aria-label={`${pct}% complete`}>
                  <div className="progress-bar" style={{ width: `${pct}%`, background: p.color }} />
                </div>
                <div className="project-foot">
                  <span>
                    {p.done_count}/{p.story_count} done
                  </span>
                  <span>
                    {p.sprint_count} {p.sprint_count === 1 ? 'sprint' : 'sprints'}
                  </span>
                </div>
              </div>
            </a>
          )
        })}
        {me && me.role !== 'guest' && (
          <button className="project-card project-new" onClick={onCreate}>
            <span className="project-new-label">
              <Plus size={18} /> New project
            </span>
          </button>
        )}
      </div>
    </section>
  )
}
