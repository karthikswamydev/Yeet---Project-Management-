import { Plus } from 'lucide-react'
import type { Project } from '../api'
import { projectHref } from '../routes'

export function ProjectCards({ projects, onCreate }: { projects: Project[]; onCreate: () => void }) {
  return (
    <section>
      <div className="section-head">
        <h2>Projects</h2>
      </div>
      <div className="project-grid">
        {projects.map((p) => {
          const pct = p.story_count ? Math.round((p.done_count / p.story_count) * 100) : 0
          return (
            <a key={p.id} href={projectHref(p.id)} className="project-card">
              <div className="project-banner" style={{ background: p.color }} />
              <div className="project-body">
                <h3>
                  {p.name} <span className="key-badge">{p.key}</span>
                </h3>
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
        <button className="project-card project-new" onClick={onCreate}>
          <span className="project-new-label">
            <Plus size={18} /> New project
          </span>
        </button>
      </div>
    </section>
  )
}
