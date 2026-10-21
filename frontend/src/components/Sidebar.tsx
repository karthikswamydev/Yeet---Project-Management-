import { CalendarDays, House, Inbox, Lock, Plus, Settings, SquareCheckBig, Users } from 'lucide-react'
import type { Project } from '../api'
import { useAuth } from '../auth'
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
  const { me } = useAuth()
  const activeProjectId = route.page === 'project' ? route.projectId : null
  // Projects you belong to (admins act in all of them) vs. open ones you can only read.
  const isAdmin = me?.role === 'admin'
  const live = projects.filter((p) => !p.archived_at)
  const mine = live.filter((p) => isAdmin || p.my_role)
  const others = live.filter((p) => !isAdmin && !p.my_role)
  const archived = projects.filter((p) => p.archived_at)

  const projectLink = (p: Project) => (
    <a key={p.id} href={projectHref(p.id)} className={p.id === activeProjectId ? 'nav-item active' : 'nav-item'}>
      <span className="dot" style={{ background: p.color }} />
      <span className="ellipsis">{p.name}</span>
      {p.visibility === 'private' && <Lock size={12} className="nav-lock" aria-label="Private" />}
    </a>
  )
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
        <span>{isAdmin ? 'Projects' : 'Your projects'}</span>
        {me && me.role !== 'guest' && (
          <button className="icon-btn" aria-label="New project" onClick={onCreateProject}>
            <Plus size={16} />
          </button>
        )}
      </div>
      <nav className="nav">
        {mine.map(projectLink)}
        {mine.length === 0 && <span className="nav-empty">No projects yet</span>}
      </nav>

      {others.length > 0 && (
        <>
          <div className="nav-heading">
            <span>Open to browse</span>
          </div>
          <nav className="nav nav-muted">{others.map(projectLink)}</nav>
        </>
      )}

      {archived.length > 0 && (
        <>
          <div className="nav-heading">
            <span>Archived</span>
          </div>
          <nav className="nav nav-muted">{archived.map(projectLink)}</nav>
        </>
      )}

      {isAdmin && (
        <>
          <div className="nav-heading">
            <span>Workspace</span>
          </div>
          <nav className="nav">
            <a href="#/settings/people" className={route.page === 'people' ? 'nav-item active' : 'nav-item'}>
              <Settings className="nav-icon" size={18} />
              People &amp; roles
            </a>
          </nav>
        </>
      )}
    </aside>
  )
}
