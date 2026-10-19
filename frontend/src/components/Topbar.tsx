import { Plus } from 'lucide-react'
import { Avatar } from './Avatar'

export function Topbar({ userName, onCreateProject }: { userName: string; onCreateProject: () => void }) {
  return (
    <header className="topbar">
      <input className="search" type="search" placeholder="Search tasks, projects, people…" />
      <div className="topbar-right">
        <button className="btn primary" onClick={onCreateProject}>
          <Plus size={16} /> New project
        </button>
        <Avatar name={userName} size={32} />
      </div>
    </header>
  )
}
