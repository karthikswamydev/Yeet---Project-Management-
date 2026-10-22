import { CalendarClock, CircleCheckBig, ListTodo, TriangleAlert } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import type { Story } from '../api'

type Tab = 'open' | 'overdue' | 'done'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// One calm panel of "my work" numbers. Each figure carries a line of context and a
// tiny chart; colour only shows up when it means something (overdue > 0).
export function StatStrip({
  open,
  overdue,
  done,
  dueDays,
  loading,
  onSelect,
}: {
  open: Story[]
  overdue: Story[]
  done: Story[]
  dueDays: (s: Story) => number | null
  loading: boolean
  onSelect: (tab: Tab) => void
}) {
  // Weekday of today, captured once so the strip's labels don't shift between renders.
  const [startDay] = useState(() => new Date().getDay())
  const inProgress = open.filter((s) => s.status === 'in_progress').length
  const inReview = open.filter((s) => s.status === 'in_review').length
  const todo = open.length - inProgress - inReview

  // Stories due in each of the next 7 days (0 = today).
  const week = Array.from({ length: 7 }, (_, d) => open.filter((s) => dueDays(s) === d).length)
  const dueThisWeek = week.reduce((a, b) => a + b, 0)
  const next = open
    .map((s) => ({ s, d: dueDays(s) }))
    .filter((x): x is { s: Story; d: number } => x.d !== null && x.d >= 0)
    .sort((a, b) => a.d - b.d)[0]

  const oldestLate = overdue.reduce((max, s) => Math.max(max, -(dueDays(s) ?? 0)), 0)
  const total = open.length + done.length
  const pct = total ? Math.round((done.length / total) * 100) : 0

  const value = (n: number) => (loading ? '–' : n)

  return (
    <section className="stat-strip" aria-label="Your work at a glance">
      <Stat
        label="Assigned to me"
        icon={<ListTodo size={15} />}
        value={value(open.length)}
        caption={
          open.length === 0 ? 'Nothing on your plate' : `${inProgress} in progress · ${inReview} in review`
        }
        chart={
          open.length > 0 && (
            <span className="ss-bar" aria-hidden="true">
              {todo > 0 && <span className="ss-seg seg-todo" style={{ flex: todo }} />}
              {inProgress > 0 && <span className="ss-seg seg-progress" style={{ flex: inProgress }} />}
              {inReview > 0 && <span className="ss-seg seg-review" style={{ flex: inReview }} />}
            </span>
          )
        }
        onClick={() => onSelect('open')}
      />
      <Stat
        label="Due this week"
        icon={<CalendarClock size={15} />}
        value={value(dueThisWeek)}
        caption={
          next
            ? `Next: ${next.s.key} ${next.d === 0 ? 'today' : next.d === 1 ? 'tomorrow' : `in ${next.d} days`}`
            : 'No sprint deadlines this week'
        }
        chart={
          <span className="ss-week" aria-hidden="true">
            {week.map((n, d) => {
              const day = (startDay + d) % 7
              return (
                <span key={d} className="ss-day" title={`${DAY_LABELS[day]}: ${n} due`}>
                  <span className={n ? 'ss-day-bar has' : 'ss-day-bar'} style={{ height: `${Math.min(100, 25 + n * 25)}%` }} />
                  <span className="ss-day-label">{DAY_LABELS[day][0]}</span>
                </span>
              )
            })}
          </span>
        }
        onClick={() => onSelect('open')}
      />
      <Stat
        label="Overdue"
        icon={<TriangleAlert size={15} />}
        value={value(overdue.length)}
        tone={overdue.length > 0 ? 'alert' : undefined}
        caption={
          overdue.length > 0
            ? `Oldest is ${oldestLate} day${oldestLate === 1 ? '' : 's'} late`
            : "You're all caught up"
        }
        onClick={() => onSelect('overdue')}
      />
      <Stat
        label="Completed"
        icon={<CircleCheckBig size={15} />}
        value={value(done.length)}
        caption={total ? `${pct}% of your stories` : 'Finish a story to see progress'}
        chart={<Ring pct={pct} />}
        onClick={() => onSelect('done')}
      />
    </section>
  )
}

function Stat({
  label,
  icon,
  value,
  caption,
  chart,
  tone,
  onClick,
}: {
  label: string
  icon: ReactNode
  value: number | string
  caption: string
  chart?: ReactNode
  tone?: 'alert'
  onClick: () => void
}) {
  return (
    <button type="button" className={tone ? `ss-cell ss-${tone}` : 'ss-cell'} onClick={onClick}>
      <span className="ss-top">
        <span className="ss-label">{label}</span>
        <span className="ss-icon">{icon}</span>
      </span>
      <span className="ss-main">
        <span className="ss-value">{value}</span>
        {chart && <span className="ss-chart">{chart}</span>}
      </span>
      <span className="ss-caption">{caption}</span>
    </button>
  )
}

function Ring({ pct }: { pct: number }) {
  const r = 15
  const c = 2 * Math.PI * r
  return (
    <svg className="ss-ring" width="38" height="38" viewBox="0 0 38 38" aria-hidden="true">
      <circle cx="19" cy="19" r={r} className="ss-ring-track" />
      <circle
        cx="19"
        cy="19"
        r={r}
        className="ss-ring-fill"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct / 100)}
        transform="rotate(-90 19 19)"
      />
    </svg>
  )
}
