import { CalendarClock, CircleCheckBig, ListTodo, TriangleAlert } from 'lucide-react'
import type { Task } from '../data'

export function StatCards({ tasks }: { tasks: Task[] }) {
  const mine = tasks.filter((t) => t.assignee === 'You' && t.status !== 'done')
  const stats = [
    { label: 'Assigned to me', icon: ListTodo, value: mine.length, tone: 'neutral' },
    { label: 'Due this week', icon: CalendarClock, value: mine.filter((t) => t.dueInDays !== null && t.dueInDays >= 0 && t.dueInDays <= 7).length, tone: 'info' },
    { label: 'Overdue', icon: TriangleAlert, value: mine.filter((t) => t.dueInDays !== null && t.dueInDays < 0).length, tone: 'danger' },
    { label: 'Completed', icon: CircleCheckBig, value: tasks.filter((t) => t.assignee === 'You' && t.status === 'done').length, tone: 'success' },
  ]

  return (
    <div className="stats">
      {stats.map(({ icon: Icon, ...s }) => (
        <div key={s.label} className={`stat stat-${s.tone}`}>
          <span className="stat-icon">
            <Icon size={20} />
          </span>
          <div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
