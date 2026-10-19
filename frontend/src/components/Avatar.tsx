// Saturated, Jira-like avatar colors; each person keeps theirs everywhere.
const PALETTE = ['#0055cc', '#1f845a', '#c9372c', '#6e5dc6', '#e56910', '#227d9b', '#ae4787', '#5b7f24']

function colorFor(name: string) {
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return PALETTE[hash % PALETTE.length]
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.charAt(0) ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : ''
  return (first + last).toUpperCase() || '?'
}

export function Avatar({ name, size = 24 }: { name: string; size?: number }) {
  return (
    <span
      className="avatar"
      title={name}
      style={{ width: size, height: size, fontSize: size * 0.42, background: colorFor(name) }}
    >
      {initials(name)}
    </span>
  )
}

export function AvatarStack({ names, max = 4 }: { names: string[]; max?: number }) {
  const shown = names.slice(0, max)
  const extra = names.length - shown.length
  return (
    <span className="avatar-stack">
      {shown.map((n) => (
        <Avatar key={n} name={n} />
      ))}
      {extra > 0 && <span className="avatar avatar-more">+{extra}</span>}
    </span>
  )
}
