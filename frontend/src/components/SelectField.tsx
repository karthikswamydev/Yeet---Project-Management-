import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export type SelectOption<T extends string> = {
  value: T
  label: string
  // Optional leading visual (badge, dot, avatar) and secondary text.
  icon?: ReactNode
  hint?: string
}

// Form-field dropdown that matches the inputs, with rich options. The list is
// portaled to <body> so it isn't clipped by scrolling modals.
export function SelectField<T extends string>({
  value,
  options,
  onChange,
  placeholder = 'Select…',
  ariaLabel,
}: {
  value: T
  options: SelectOption<T>[]
  onChange: (value: T) => void
  placeholder?: string
  ariaLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [rect, setRect] = useState<{ top: number; left: number; width: number; flip: boolean } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const listId = useId()

  const selectedIndex = options.findIndex((o) => o.value === value)
  const selected = options[selectedIndex]

  function openList() {
    setActive(Math.max(0, selectedIndex))
    setOpen(true)
  }

  function choose(i: number) {
    const opt = options[i]
    if (opt) onChange(opt.value)
    setOpen(false)
    triggerRef.current?.focus()
  }

  // Position under the trigger (or above it when there isn't room).
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const place = () => {
      const r = triggerRef.current!.getBoundingClientRect()
      const listHeight = Math.min(options.length * 40 + 8, 280)
      const flip = r.bottom + listHeight + 8 > window.innerHeight && r.top > listHeight + 8
      setRect({ top: flip ? r.top - 4 : r.bottom + 4, left: r.left, width: r.width, flip })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, options.length])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (!triggerRef.current?.contains(t) && !listRef.current?.contains(t)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  useEffect(() => {
    if (open) listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  function onKeyDown(e: KeyboardEvent) {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault()
        openList()
      }
      return
    }
    if (e.key === 'Escape') {
      // Close just the list, not the surrounding modal.
      e.preventDefault()
      e.stopPropagation()
      e.nativeEvent.stopImmediatePropagation()
      setOpen(false)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(options.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      choose(active)
    } else if (e.key === 'Tab') {
      setOpen(false)
    } else if (e.key.length === 1) {
      // Type-ahead: jump to the next option starting with that letter.
      const ch = e.key.toLowerCase()
      const next = options.findIndex((o, i) => i > active && o.label.toLowerCase().startsWith(ch))
      const wrap = options.findIndex((o) => o.label.toLowerCase().startsWith(ch))
      if (next >= 0 || wrap >= 0) setActive(next >= 0 ? next : wrap)
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={open ? 'select-trigger open' : 'select-trigger'}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
      >
        {selected ? (
          <span className="select-value">
            {selected.icon}
            <span className="ellipsis">{selected.label}</span>
          </span>
        ) : (
          <span className="select-placeholder">{placeholder}</span>
        )}
        <ChevronDown size={16} className="select-chevron" />
      </button>
      {open &&
        rect &&
        createPortal(
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            className="select-list"
            style={{
              left: rect.left,
              width: Math.max(rect.width, 200),
              ...(rect.flip ? { bottom: window.innerHeight - rect.top } : { top: rect.top }),
            }}
          >
            {options.map((o, i) => (
              <li
                key={o.value}
                role="option"
                data-index={i}
                aria-selected={o.value === value}
                className={['select-option', i === active && 'active', o.value === value && 'selected'].filter(Boolean).join(' ')}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(i)}
              >
                {o.icon}
                <span className="select-option-text">
                  <span className="ellipsis">{o.label}</span>
                  {o.hint && <span className="select-hint">{o.hint}</span>}
                </span>
                {o.value === value && <Check size={16} className="select-check" />}
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </>
  )
}
