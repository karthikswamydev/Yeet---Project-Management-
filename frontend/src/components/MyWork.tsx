import { useState } from 'react'
import { STATUS_LABEL, type Task } from '../data'
import { PriorityIcon } from './PriorityIcon'

function dueLabel(days: number | null) {
  if (days === null) return { text: 'No date', tone: 'muted' }
  if (days < 0) return { text: `${-days}d overdue`, tone: 'danger' }
  if (days === 0) return { text: 'Today', tone: 'warn' }
  if (days === 1) return { text: 'Tomorrow', tone: 'warn' }
  return { text: `In ${days}d`, tone: 'muted' }
}

type Tab = 'open' | 'overdue' | 'done'

export function MyWork({ tasks }: { tasks: Task[] }) {
  const [tab, setTab] = useState<Tab>('open')
  const mine = tasks.filter((t) => t.assignee === 'You')

  const filtered = mine.filter((t) => {
    if (tab === 'done') return t.status === 'done'
    if (tab === 'overdue') return t.status !== 'done' && t.dueInDays !== null && t.dueInDays < 0
    return t.status !== 'done'
  })

  const tabs: { id: Tab; label: string }[] = [
    { id: 'open', label: 'Open' },
    { id: 'overdue', label: 'Overdue' },
    { id: 'done', label: 'Done' },
  ]

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>My work</h2>
        <div className="tabs" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className={tab === t.id ? 'tab active' : 'tab'}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="empty">Nothing here. Enjoy it.</p>
      ) : (
        <ul className="task-list">
          {filtered.map((t) => {
            const due = dueLabel(t.dueInDays)
            return (
              <li key={t.id} className="task-row">
                <PriorityIcon priority={t.priority} />
                <span className="task-key">{t.key}</span>
                <span className="task-title">{t.title}</span>
                <span className="task-project">{t.project}</span>
                <span className={`pill status-${t.status}`}>{STATUS_LABEL[t.status]}</span>
                <span className={`due due-${due.tone}`}>{due.text}</span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
