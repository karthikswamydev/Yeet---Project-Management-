export type Status = 'todo' | 'in_progress' | 'in_review' | 'done'
export type Priority = 'urgent' | 'high' | 'medium' | 'low'

export const STATUS_LABEL: Record<Status, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  in_review: 'In review',
  done: 'Done',
}

export const BOARD_COLUMNS: Status[] = ['todo', 'in_progress', 'in_review', 'done']
