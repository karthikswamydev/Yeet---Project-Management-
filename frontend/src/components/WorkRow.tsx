import type { Project, Sprint, Story, User } from '../api'
import { STATUS_LABEL } from '../data'
import { storyHref } from '../routes'
import { daysUntil, dueText } from '../time'
import { storyDueDays } from '../useWorkData'
import { Avatar } from './Avatar'
import { LabelChip } from './Label'
import { PriorityIcon } from './PriorityIcon'

// A story row for cross-project lists (dashboard, My work). Links to the story.
export function WorkRow({
  story,
  project,
  sprintById,
  assignee,
  showAssignee = false,
}: {
  story: Story
  project: Project | undefined
  sprintById: Map<string, Sprint>
  assignee?: User | null
  showAssignee?: boolean
}) {
  const days = storyDueDays(story, sprintById, daysUntil)
  const due = days === null ? null : dueText(days)
  const sprint = story.sprint_id ? sprintById.get(story.sprint_id) : undefined

  return (
    <li>
      <a className={story.status === 'done' ? 'work-row is-done' : 'work-row'} href={storyHref(story.project_id, story.id)}>
        <PriorityIcon priority={story.priority} />
        <span className="task-key">{story.key}</span>
        <span className="work-main">
          <span className="task-title">{story.title}</span>
          {story.labels.slice(0, 2).map((l) => (
            <LabelChip key={l} label={l} />
          ))}
        </span>
        <span className="work-project" title={sprint ? `${project?.name} · ${sprint.name}` : project?.name}>
          <span className="dot" style={{ background: project?.color ?? '#8590a2' }} />
          <span className="ellipsis">{project?.name ?? 'Project'}</span>
        </span>
        <span className={`due due-${due?.tone ?? 'muted'} work-due`}>{due ? due.text : sprint ? '' : 'Backlog'}</span>
        <span className={`pill status-${story.status}`}>{STATUS_LABEL[story.status]}</span>
        {showAssignee && (
          <span className="work-assignee">
            {assignee ? <Avatar name={assignee.name} size={24} /> : <span className="avatar-empty" />}
          </span>
        )}
      </a>
    </li>
  )
}
