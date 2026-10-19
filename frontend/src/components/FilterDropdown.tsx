import { Check, ChevronDown, Search, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

export type FilterOption = {
  value: string
  // Shown in the list (e.g. a colored chip); `text` is used for search and the button.
  node: ReactNode
  text: string
}

export function FilterDropdown({
  label,
  icon,
  options,
  value,
  onChange,
  searchable = false,
  emptyText = 'Nothing to filter yet',
}: {
  label: string
  icon: ReactNode
  options: FilterOption[]
  value: string[]
  onChange: (values: string[]) => void
  searchable?: boolean
  emptyText?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const selected = new Set(value)
  const shown = options.filter((o) => o.text.toLowerCase().includes(query.trim().toLowerCase()))
  const first = options.find((o) => o.value === value[0])
  const buttonText =
    value.length === 0 ? label : value.length === 1 ? `${label}: ${first?.text ?? value[0]}` : `${label} (${value.length})`

  function toggle(v: string) {
    onChange(selected.has(v) ? value.filter((x) => x !== v) : [...value, v])
  }

  return (
    <div className="label-picker-anchor" ref={ref}>
      <button
        type="button"
        className={value.length ? 'filter-btn active' : 'filter-btn'}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {icon}
        {buttonText}
        <ChevronDown size={14} />
      </button>
      {value.length > 0 && (
        <button type="button" className="filter-clear" onClick={() => onChange([])} aria-label={`Clear ${label} filter`}>
          <X size={13} />
        </button>
      )}
      {open && (
        <div
          className="label-picker label-picker-left"
          role="dialog"
          aria-label={`Filter by ${label}`}
          onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        >
          {options.length === 0 ? (
            <div className="label-empty">{emptyText}</div>
          ) : (
            <>
              {searchable && (
                <div className="label-search">
                  <Search size={14} />
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={`Search ${label.toLowerCase()}s`}
                    aria-label={`Search ${label.toLowerCase()}s`}
                  />
                </div>
              )}
              <ul className="label-options">
                {shown.map((o) => {
                  const on = selected.has(o.value)
                  return (
                    <li key={o.value}>
                      <button type="button" onClick={() => toggle(o.value)} aria-pressed={on}>
                        <span className={on ? 'label-check on' : 'label-check'}>
                          {on && <Check size={12} strokeWidth={3} />}
                        </span>
                        {o.node}
                      </button>
                    </li>
                  )
                })}
                {shown.length === 0 && <li className="label-empty">No matches</li>}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  )
}
