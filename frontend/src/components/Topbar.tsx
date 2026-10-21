import { Plus } from 'lucide-react'
import { useAuth } from '../auth'
import { UserMenu } from './UserMenu'

export function Topbar({ onCreateProject }: { onCreateProject: () => void }) {
  const { me } = useAuth()
  return (
    <header className="topbar">
      <input className="search" type="search" placeholder="Search tasks, projects, people…" />
      <div className="topbar-right">
        {me && me.role !== 'guest' && (
          <button className="btn primary" onClick={onCreateProject}>
            <Plus size={16} /> New project
          </button>
        )}
        <UserMenu />
      </div>
    </header>
  )
}
