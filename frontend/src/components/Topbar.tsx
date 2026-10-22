import { Plus, Search } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useAuth } from '../auth'
import { UserMenu } from './UserMenu'

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

export function Topbar({ onCreateProject }: { onCreateProject: () => void }) {
  const { me } = useAuth()
  const searchRef = useRef<HTMLInputElement>(null)

  // ⌘K / Ctrl+K jumps to search from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <header className="topbar">
      <label className="topbar-search">
        <Search size={16} className="topbar-search-icon" />
        <input
          ref={searchRef}
          type="search"
          placeholder="Search tasks, projects, people…"
          aria-label="Search"
          onKeyDown={(e) => e.key === 'Escape' && e.currentTarget.blur()}
        />
        <kbd className="topbar-kbd">{isMac ? '⌘' : 'Ctrl'} K</kbd>
      </label>
      <div className="topbar-right">
        {me && me.role !== 'guest' && (
          <button className="btn primary" onClick={onCreateProject}>
            <Plus size={16} /> New project
          </button>
        )}
        <span className="topbar-divider" aria-hidden="true" />
        <UserMenu />
      </div>
    </header>
  )
}
