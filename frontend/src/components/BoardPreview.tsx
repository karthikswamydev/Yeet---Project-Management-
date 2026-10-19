import { BOARD_COLUMNS, STATUS_LABEL, type Task } from '../data'
import { Avatar } from './Avatar'

export function BoardPreview({ tasks }: { tasks: Task[] }) {
  return (
    <section>
      <div className="section-head">
        <h2>Team board</h2>
        <a href="#" className="link">
          Open board
        </a>
      </div>
      <div className="board">
        {BOARD_COLUMNS.map((status) => {
          const cards = tasks.filter((t) => t.status === status)
          return (
            <div key={status} className="column">
              <div className="column-head">
                <span>{STATUS_LABEL[status]}</span>
                <span className="count">{cards.length}</span>
              </div>
              <div className="column-cards">
                {cards.map((t) => (
                  <div key={t.id} className="card-item">
                    <div className="card-title">{t.title}</div>
                    <div className="card-meta">
                      <span className="task-key">{t.key}</span>
                      <Avatar name={t.assignee} size={20} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
