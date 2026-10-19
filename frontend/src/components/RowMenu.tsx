import { ArrowRightLeft, Check, Inbox, MoreHorizontal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Sprint } from '../api'

export function RowMenu({
  sprintId,
  sprints,
  onMove,
}: {
  sprintId: string | null
  sprints: Sprint[]
  onMove: (sprintId: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // Completed sprints can't take new work.
  const targets = sprints.filter((s) => s.status !== 'completed' || s.id === sprintId)

  function move(id: string | null) {
    setOpen(false)
    if (id !== sprintId) onMove(id)
  }

  return (
    <div className="label-picker-anchor" ref={ref}>
      <button
        type="button"
        className={open ? 'row-icon-btn row-menu-btn open' : 'row-icon-btn row-menu-btn'}
        onClick={() => setOpen((o) => !o)}
        aria-label="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div
          className="label-picker label-picker-right row-menu"
          role="menu"
          onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        >
          <div className="menu-heading">
            <ArrowRightLeft size={12} /> Move to
          </div>
          <ul className="label-options">
            <li>
              <button type="button" role="menuitemradio" aria-checked={sprintId === null} onClick={() => move(null)}>
                <Inbox size={14} className="menu-icon" />
                <span className="menu-text">Backlog</span>
                {sprintId === null && <Check size={14} className="status-check" />}
              </button>
            </li>
            {targets.map((s) => (
              <li key={s.id}>
                <button type="button" role="menuitemradio" aria-checked={s.id === sprintId} onClick={() => move(s.id)}>
                  <span className={`sprint-dot sprint-dot-${s.status}`} />
                  <span className="menu-text">{s.name}</span>
                  {s.id === sprintId && <Check size={14} className="status-check" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
