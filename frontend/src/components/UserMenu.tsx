import { Building2, Check, ChevronDown, FlaskConical, LogOut, UserRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { api, DEV_USER_KEY, ORG_ROLE_LABEL, type User } from '../api'
import { useAuth } from '../auth'
import { signOut } from '../stytch'
import { Avatar } from './Avatar'

export function UserMenu() {
  const { me, mode } = useAuth()
  const [open, setOpen] = useState(false)
  const [people, setPeople] = useState<User[] | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => {
    if (open && mode === 'dev' && people === null) api.listUsers().then(setPeople).catch(() => setPeople([]))
  }, [open, mode, people])

  if (!me) return null

  function switchTo(id: string) {
    try {
      localStorage.setItem(DEV_USER_KEY, id)
    } catch {
      // Storage blocked: nothing to switch.
    }
    // Reload so every screen refetches as the new person.
    window.location.reload()
  }

  return (
    <div className="user-menu" ref={ref}>
      <button type="button" className="user-trigger" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}>
        <Avatar name={me.name} size={32} />
        <span className="user-trigger-text">
          <span className="user-trigger-name">{me.name}</span>
          <span className="user-trigger-role">{ORG_ROLE_LABEL[me.role]}</span>
        </span>
        <ChevronDown size={16} className="user-trigger-caret" />
      </button>
      {open && (
        <div className="user-pop" role="menu">
          <div className="user-pop-head">
            <Avatar name={me.name} size={40} />
            <div className="ellipsis">
              <div className="user-pop-name">{me.name}</div>
              <div className="user-pop-email">{me.email ?? 'No email'}</div>
            </div>
            <span className={`role-badge role-${me.role}`}>{ORG_ROLE_LABEL[me.role]}</span>
          </div>

          <div className="user-pop-section">
            <div className="user-pop-row">
              <Building2 size={15} />
              <span className="menu-text">{me.org_name}</span>
              <span className="user-pop-hint">Workspace</span>
            </div>
            <a href="#/account" className="user-pop-action" role="menuitem" onClick={() => setOpen(false)}>
              <UserRound size={15} /> Account settings
            </a>
            {mode === 'stytch' && (
              <button type="button" className="user-pop-action" role="menuitem" onClick={() => void signOut()}>
                <LogOut size={15} /> Sign out
              </button>
            )}
          </div>

          {mode === 'dev' && (
            <div className="user-pop-section">
              <div className="menu-heading">
                <FlaskConical size={12} /> Dev mode · view as
              </div>
              {people === null ? (
                <div className="label-empty">Loading…</div>
              ) : (
                <ul className="label-options">
                  {people.map((u) => (
                    <li key={u.id}>
                      <button type="button" role="menuitemradio" aria-checked={u.id === me.id} onClick={() => switchTo(u.id)}>
                        <Avatar name={u.name} size={24} />
                        <span className="menu-text">{u.name}</span>
                        <span className={`role-badge role-${u.org_role}`}>{ORG_ROLE_LABEL[u.org_role]}</span>
                        {u.id === me.id && <Check size={14} className="status-check" />}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="user-pop-note">No login in dev mode. Switch people to see the app with their roles.</p>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
