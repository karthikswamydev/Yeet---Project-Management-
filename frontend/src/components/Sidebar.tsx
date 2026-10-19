import { CalendarDays, House, Inbox, Plus, SquareCheckBig, Users } from 'lucide-react'
import type { Project } from '../api'
import { projectHref, type Route } from '../routes'

const NAV = [
  { label: 'Home', icon: House, href: '#/', page: 'home' },
  { label: 'My work', icon: SquareCheckBig, href: '#/my-work', page: 'my-work' },
  { label: 'Inbox', icon: Inbox, href: null, page: null },
  { label: 'Calendar', icon: CalendarDays, href: null, page: null },
  { label: 'Teams', icon: Users, href: null, page: null },
] as const

export function Sidebar({
  orgName,
  projects,
  route,
  onCreateProject,
}: {
  orgName: string
  projects: Project[]
  route: Route
  onCreateProject: () => void
}) {
  const activeProjectId = route.page === 'project' ? route.projectId : null
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark">Y</span>
        <div>
          <div className="brand-name">Yeet</div>
          <div className="brand-org">{orgName}</div>
        </div>
      </div>

      <nav className="nav">
        {NAV.map(({ icon: Icon, ...item }) =>
          item.href ? (
            <a key={item.label} href={item.href} className={route.page === item.page ? 'nav-item active' : 'nav-item'}>
              <Icon className="nav-icon" size={18} />
              {item.label}
            </a>
          ) : (
            <span key={item.label} className="nav-item disabled" aria-disabled="true" title="Coming soon">
              <Icon className="nav-icon" size={18} />
              {item.label}
              <span className="soon">Soon</span>
            </span>
          ),
        )}
      </nav>

      <div className="nav-heading">
        <span>Projects</span>
        <button className="icon-btn" aria-label="New project" onClick={onCreateProject}>
          <Plus size={16} />
        </button>
      </div>
      <nav className="nav">
        {projects.map((p) => (
          <a key={p.id} href={projectHref(p.id)} className={p.id === activeProjectId ? 'nav-item active' : 'nav-item'}>
            <span className="dot" style={{ background: p.color }} />
            {p.name}
          </a>
        ))}
        {projects.length === 0 && <span className="nav-empty">No projects yet</span>}
      </nav>
    </aside>
  )
}
