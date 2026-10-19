import type { Priority, Status } from './data'

export type User = {
  id: string
  name: string
  email: string | null
}

export type Project = {
  id: string
  name: string
  key: string
  description: string
  color: string
  story_count: number
  done_count: number
  sprint_count: number
}

export type SprintStatus = 'planned' | 'active' | 'completed'

export type Sprint = {
  id: string
  project_id: string
  name: string
  goal: string
  start_date: string | null
  due_date: string
  status: SprintStatus
}

export type Story = {
  id: string
  project_id: string
  sprint_id: string | null
  assignee_id: string | null
  reporter_id: string | null
  key: string
  number: number
  title: string
  description: string
  status: Status
  priority: Priority
  points: number | null
  labels: string[]
  created_at: string
  updated_at: string
}

export type Comment = {
  id: string
  story_id: string
  author_id: string | null
  body: string
  created_at: string
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const body = (await res.json()) as { detail?: unknown }
      if (typeof body.detail === 'string') message = body.detail
      else if (Array.isArray(body.detail)) message = body.detail.map((d: { msg: string }) => d.msg).join(', ')
    } catch {
      // keep the generic message
    }
    throw new Error(message)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) })

export const api = {
  listUsers: () => request<User[]>('/users'),
  createUser: (body: { name: string; email?: string }) => request<User>('/users', json('POST', body)),

  listProjects: () => request<Project[]>('/projects'),
  getProject: (id: string) => request<Project>(`/projects/${id}`),
  createProject: (body: { name: string; key?: string; description?: string; color?: string }) =>
    request<Project>('/projects', json('POST', body)),

  listSprints: (projectId: string) => request<Sprint[]>(`/projects/${projectId}/sprints`),
  createSprint: (
    projectId: string,
    body: { name: string; goal?: string; start_date?: string | null; due_date: string },
  ) => request<Sprint>(`/projects/${projectId}/sprints`, json('POST', body)),
  updateSprint: (id: string, body: Partial<Pick<Sprint, 'name' | 'goal' | 'start_date' | 'due_date' | 'status'>>) =>
    request<Sprint>(`/sprints/${id}`, json('PATCH', body)),

  listStories: (projectId: string) => request<Story[]>(`/projects/${projectId}/stories`),
  createStory: (
    projectId: string,
    body: {
      title: string
      description?: string
      priority?: Priority
      points?: number | null
      labels?: string[]
      assignee_id?: string | null
      sprint_id?: string | null
    },
  ) => request<Story>(`/projects/${projectId}/stories`, json('POST', body)),
  updateStory: (
    id: string,
    body: Partial<Pick<Story, 'title' | 'description' | 'priority' | 'points' | 'status' | 'sprint_id' | 'labels' | 'assignee_id' | 'reporter_id'>>,
  ) => request<Story>(`/stories/${id}`, json('PATCH', body)),

  getStory: (id: string) => request<Story>(`/stories/${id}`),
  deleteStory: (id: string) => request<void>(`/stories/${id}`, { method: 'DELETE' }),
  listComments: (storyId: string) => request<Comment[]>(`/stories/${storyId}/comments`),
  createComment: (storyId: string, body: string) =>
    request<Comment>(`/stories/${storyId}/comments`, json('POST', { body })),
}
