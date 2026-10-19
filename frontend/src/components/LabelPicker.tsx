import { Check, Plus, Tag } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { LabelChip } from './Label'

const MAX_LABELS = 10

export function LabelPicker({
  value,
  suggestions,
  onChange,
  trigger,
  align = 'right',
}: {
  value: string[]
  suggestions: string[]
  onChange: (labels: string[]) => void
  trigger: (open: () => void) => ReactNode
  align?: 'left' | 'right'
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

  const selected = new Set(value.map((l) => l.toLowerCase()))
  const all = [...value, ...suggestions.filter((s) => !selected.has(s.toLowerCase()))]
  const q = query.trim()
  const options = all.filter((l) => l.toLowerCase().includes(q.toLowerCase()))
  const canCreate = q !== '' && q.length <= 30 && !all.some((l) => l.toLowerCase() === q.toLowerCase())
  const full = value.length >= MAX_LABELS

  function toggle(label: string) {
    const isOn = selected.has(label.toLowerCase())
    if (!isOn && full) return
    onChange(isOn ? value.filter((l) => l.toLowerCase() !== label.toLowerCase()) : [...value, label])
    setQuery('')
  }

  return (
    <div className="label-picker-anchor" ref={ref}>
      {trigger(() => setOpen((o) => !o))}
      {open && (
        <div
          className={`label-picker label-picker-${align}`}
          role="dialog"
          aria-label="Labels"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation()
              setOpen(false)
            }
          }}
        >
          <div className="label-search">
            <Tag size={14} />
            <input
              autoFocus
              value={query}
              maxLength={30}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search or create a label"
              aria-label="Search labels"
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return
                e.preventDefault()
                e.stopPropagation()
                if (canCreate) toggle(q)
                else if (options[0]) toggle(options[0])
              }}
            />
          </div>
          <ul className="label-options">
            {options.map((l) => {
              const on = selected.has(l.toLowerCase())
              return (
                <li key={l}>
                  <button type="button" onClick={() => toggle(l)} disabled={!on && full}>
                    <span className={on ? 'label-check on' : 'label-check'}>{on && <Check size={12} strokeWidth={3} />}</span>
                    <LabelChip label={l} />
                  </button>
                </li>
              )
            })}
            {canCreate && (
              <li>
                <button type="button" onClick={() => toggle(q)} disabled={full}>
                  <Plus size={14} />
                  <span>
                    Create <strong>“{q}”</strong>
                  </span>
                </button>
              </li>
            )}
            {options.length === 0 && !canCreate && <li className="label-empty">Type to create a label</li>}
          </ul>
          {full && <div className="label-note">Up to {MAX_LABELS} labels per story</div>}
        </div>
      )}
    </div>
  )
}
