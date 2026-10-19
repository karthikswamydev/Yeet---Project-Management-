// Soft background / strong text pairs, picked per label name so a label keeps
// its color everywhere it appears.
const COLORS: [string, string][] = [
  ['#e9f2ff', '#0055cc'],
  ['#dcfff1', '#216e4e'],
  ['#f3f0ff', '#5e4db2'],
  ['#fff3eb', '#a54800'],
  ['#e7f9ff', '#206a83'],
  ['#ffecf8', '#943d73'],
  ['#fff7d6', '#7f5f01'],
  ['#f1f2f4', '#44546f'],
]

function colorFor(label: string) {
  let hash = 0
  for (const ch of label.toLowerCase()) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return COLORS[hash % COLORS.length]
}

export function LabelChip({ label }: { label: string }) {
  const [bg, fg] = colorFor(label)
  return (
    <span className="label-chip" style={{ background: bg, color: fg }}>
      {label}
    </span>
  )
}
