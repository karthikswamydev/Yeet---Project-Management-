import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

export type MenuOption<T extends string> = { value: T; node: ReactNode }

// Single-choice dropdown in the same popover style as the filters.
export function MenuSelect<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: MenuOption<T>[]
  onChange: (value: T) => void
  label: string
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

  const current = options.find((o) => o.value === value)

  return (
    <div className="label-picker-anchor" ref={ref}>
      <button
        type="button"
        className="field-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
      >
        {current?.node}
        <ChevronDown size={14} className="field-caret" />
      </button>
      {open && (
        <div
          className="label-picker label-picker-left status-menu"
          role="listbox"
          aria-label={label}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation()
              setOpen(false)
            }
          }}
        >
          <ul className="label-options">
            {options.map((o) => (
              <li key={o.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={o.value === value}
                  autoFocus={o.value === value}
                  onClick={() => {
                    setOpen(false)
                    if (o.value !== value) onChange(o.value)
                  }}
                >
                  <span className="menu-text menu-row">{o.node}</span>
                  {o.value === value && <Check size={14} className="status-check" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
