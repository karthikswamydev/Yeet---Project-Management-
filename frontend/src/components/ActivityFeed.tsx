import type { ActivityItem } from '../data'
import { Avatar } from './Avatar'

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Recent activity</h2>
      </div>
      <ul className="activity">
        {items.map((a) => (
          <li key={a.id}>
            <Avatar name={a.who} size={28} />
            <div>
              <div>
                <strong>{a.who}</strong> {a.action} <span className="activity-target">{a.target}</span>
              </div>
              <div className="activity-when">{a.when}</div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
