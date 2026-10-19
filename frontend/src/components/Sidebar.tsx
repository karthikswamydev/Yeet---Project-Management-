import { CalendarDays, House, Inbox, Plus, SquareCheckBig, Users } from 'lucide-react'
import type { Project } from '../api'

const NAV = [
  { label: 'Home', icon: House, href: '#/' },
  { label: 'My work', icon: SquareCheckBig, href: '#' },
  { label: 'Inbox', icon: Inbox, href: '#' },
  { label: 'Calendar', icon: CalendarDays, href: '#' },
  { label: 'Teams', icon: Users, href: '#' },
]

export function Sidebar({
  orgName,
  projects,
  activeProjectId,
  onCreateProject,
}: {
  orgName: string
  projects: Project[]
  activeProjectId: string | null
  onCreateProject: () => void
}) {
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
        {NAV.map(({ icon: Icon, ...item }) => (
          <a key={item.label} href={item.href} className={item.href === '#/' && !activeProjectId ? 'nav-item active' : 'nav-item'}>
            <Icon className="nav-icon" size={18} />
            {item.label}
          </a>
        ))}
      </nav>

      <div className="nav-heading">
        <span>Projects</span>
        <button className="icon-btn" aria-label="New project" onClick={onCreateProject}>
          <Plus size={16} />
        </button>
      </div>
      <nav className="nav">
        {projects.map((p) => (
          <a key={p.id} href={`#/projects/${p.id}`} className={p.id === activeProjectId ? 'nav-item active' : 'nav-item'}>
            <span className="dot" style={{ background: p.color }} />
            {p.name}
          </a>
        ))}
        {projects.length === 0 && <span className="nav-empty">No projects yet</span>}
      </nav>
    </aside>
  )
}
