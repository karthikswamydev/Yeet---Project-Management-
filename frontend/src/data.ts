// Placeholder data for the landing dashboard until the projects API exists.

export type Status = 'todo' | 'in_progress' | 'in_review' | 'done'
export type Priority = 'urgent' | 'high' | 'medium' | 'low'

export type Task = {
  id: string
  key: string
  title: string
  project: string
  status: Status
  priority: Priority
  dueInDays: number | null
  assignee: string
}

export type ActivityItem = {
  id: string
  who: string
  action: string
  target: string
  when: string
}

export const STATUS_LABEL: Record<Status, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  in_review: 'In review',
  done: 'Done',
}

export const BOARD_COLUMNS: Status[] = ['todo', 'in_progress', 'in_review', 'done']

export const tasks: Task[] = [
  { id: 't1', key: 'WEB-142', title: 'Redesign onboarding checklist', project: 'Website', status: 'in_progress', priority: 'high', dueInDays: 1, assignee: 'You' },
  { id: 't2', key: 'API-87', title: 'Add pagination to /projects endpoint', project: 'Platform API', status: 'todo', priority: 'medium', dueInDays: 3, assignee: 'You' },
  { id: 't3', key: 'WEB-139', title: 'Fix broken avatar upload on Safari', project: 'Website', status: 'in_review', priority: 'urgent', dueInDays: -1, assignee: 'You' },
  { id: 't4', key: 'MOB-56', title: 'Push notification permissions copy', project: 'Mobile app', status: 'todo', priority: 'low', dueInDays: 6, assignee: 'You' },
  { id: 't5', key: 'API-91', title: 'Rate limit unauthenticated routes', project: 'Platform API', status: 'in_progress', priority: 'high', dueInDays: 2, assignee: 'Priya' },
  { id: 't6', key: 'MOB-52', title: 'Offline mode for task list', project: 'Mobile app', status: 'in_progress', priority: 'medium', dueInDays: null, assignee: 'Marcus' },
  { id: 't7', key: 'WEB-137', title: 'Update pricing page copy', project: 'Website', status: 'done', priority: 'low', dueInDays: -4, assignee: 'Dana' },
  { id: 't8', key: 'API-85', title: 'Write migration for org settings', project: 'Platform API', status: 'done', priority: 'medium', dueInDays: -2, assignee: 'You' },
  { id: 't9', key: 'WEB-144', title: 'Dark mode color audit', project: 'Website', status: 'todo', priority: 'medium', dueInDays: 9, assignee: 'Dana' },
  { id: 't10', key: 'MOB-58', title: 'Crash on cold start (Android 12)', project: 'Mobile app', status: 'in_review', priority: 'urgent', dueInDays: 0, assignee: 'Marcus' },
]

export const activity: ActivityItem[] = [
  { id: 'a1', who: 'Priya', action: 'moved', target: 'API-91 to In progress', when: '12m ago' },
  { id: 'a2', who: 'Dana', action: 'commented on', target: 'WEB-144 Dark mode color audit', when: '1h ago' },
  { id: 'a3', who: 'Marcus', action: 'opened', target: 'MOB-58 Crash on cold start', when: '2h ago' },
  { id: 'a4', who: 'Lee', action: 'completed', target: 'API-85 Write migration for org settings', when: 'Yesterday' },
  { id: 'a5', who: 'Dana', action: 'created project', target: 'Q4 launch', when: 'Yesterday' },
]
