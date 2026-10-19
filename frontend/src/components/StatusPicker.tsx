import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { BOARD_COLUMNS, STATUS_LABEL, type Status } from '../data'

export function StatusPicker({
  value,
  onChange,
  align = 'right',
  className = '',
}: {
  value: Status
  onChange: (status: Status) => void
  align?: 'left' | 'right'
  className?: string
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

  return (
    <div className="label-picker-anchor" ref={ref}>
      <button
        type="button"
        className={`status-trigger pill status-${value} ${className}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Status: ${STATUS_LABEL[value]}`}
      >
        {STATUS_LABEL[value]}
        <ChevronDown size={12} strokeWidth={2.5} />
      </button>
      {open && (
        <div
          className={`label-picker label-picker-${align} status-menu`}
          role="listbox"
          aria-label="Change status"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation()
              setOpen(false)
            }
          }}
        >
          <ul className="label-options">
            {BOARD_COLUMNS.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  role="option"
                  aria-selected={s === value}
                  autoFocus={s === value}
                  onClick={() => {
                    setOpen(false)
                    if (s !== value) onChange(s)
                  }}
                >
                  <span className={`pill status-${s}`}>{STATUS_LABEL[s]}</span>
                  {s === value && <Check size={14} className="status-check" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
