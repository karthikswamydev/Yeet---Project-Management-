import { ListTree, Tag, UserRound } from 'lucide-react'
import type { Status } from '../data'
import type { Sprint, Story, User } from '../api'
import { AssigneePicker } from './AssigneePicker'
import { Avatar } from './Avatar'
import { LabelChip } from './Label'
import { LabelPicker } from './LabelPicker'
import { PriorityIcon } from './PriorityIcon'
import { RowMenu } from './RowMenu'
import { StatusPicker } from './StatusPicker'

export function StoryRow({
  story,
  subtasks = [],
  sprints,
  allLabels,
  users,
  selected,
  onOpen,
  onAddUser,
  onChange,
}: {
  story: Story
  subtasks?: Story[]
  sprints: Sprint[]
  allLabels: string[]
  users: User[]
  selected: boolean
  onOpen: (id: string) => void
  onAddUser: (name: string) => Promise<User>
  onChange: (
    id: string,
    patch: { status?: Status; sprint_id?: string | null; labels?: string[]; assignee_id?: string | null },
  ) => void
}) {
  const inBacklog = story.sprint_id === null

  return (
    <li
      className={['story-row', story.status === 'done' && 'is-done', selected && 'selected'].filter(Boolean).join(' ')}
      tabIndex={0}
      aria-selected={selected}
      onClick={(e) => {
        // Clicks on the row's own controls (and their popovers) shouldn't open the panel.
        if ((e.target as HTMLElement).closest('button, input, select, a, .label-picker')) return
        onOpen(story.id)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && e.target === e.currentTarget) onOpen(story.id)
      }}
    >
      <PriorityIcon priority={story.priority} />
      <span className="task-key">{story.key}</span>
      <div className="story-main">
        <span className="task-title" title={story.title}>
          {story.title}
        </span>
        <span className="story-labels">
          {story.labels.map((l) => (
            <LabelChip key={l} label={l} />
          ))}
        </span>
        {subtasks.length > 0 && (
          <span className="subtask-badge" title={`${subtasks.length} subtask${subtasks.length === 1 ? '' : 's'}`}>
            <ListTree size={12} />
            {subtasks.filter((s) => s.status === 'done').length}/{subtasks.length}
          </span>
        )}
        <LabelPicker
          value={story.labels}
          suggestions={allLabels}
          onChange={(labels) => onChange(story.id, { labels })}
          trigger={(open) => (
            <button
              type="button"
              className={story.labels.length ? 'row-icon-btn' : 'row-icon-btn reveal'}
              onClick={open}
              aria-label="Edit labels"
              title="Labels"
            >
              <Tag size={14} />
            </button>
          )}
        />
      </div>
      {/* Fixed-width cells keep these columns lined up across rows. */}
      <span className="story-cell cell-points">
        {story.points !== null && <span className="points">{story.points}</span>}
      </span>
      <span className="story-cell cell-status">
        {!inBacklog && <StatusPicker value={story.status} onChange={(status) => onChange(story.id, { status })} />}
      </span>
      <span className="story-cell cell-assignee">
        <AssigneePicker
          value={story.assignee_id}
          users={users}
          onAddUser={onAddUser}
          onChange={(assignee_id) => onChange(story.id, { assignee_id })}
          trigger={(open, assignee) => (
            <button
              type="button"
              className="assignee-trigger"
              onClick={open}
              aria-label={assignee ? `Assignee: ${assignee.name}` : 'Unassigned'}
              title={assignee ? assignee.name : 'Unassigned'}
            >
              {assignee ? (
                <Avatar name={assignee.name} size={24} />
              ) : (
                <span className="avatar-empty">
                  <UserRound size={14} />
                </span>
              )}
            </button>
          )}
        />
      </span>
      <span className="story-cell cell-actions">
        <RowMenu sprintId={story.sprint_id} sprints={sprints} onMove={(sprint_id) => onChange(story.id, { sprint_id })} />
      </span>
    </li>
  )
}
