import type { Priority, Status } from './data'
import type { Environment, Provider, ResourceStatus } from './resources'

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
  parent_id: string | null
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

export type Resource = {
  id: string
  project_id: string
  name: string
  provider: Provider
  service: string
  environment: Environment
  region: string
  identifier: string
  url: string
  monthly_cost: number | null
  owner_id: string | null
  status: ResourceStatus
  notes: string
  created_at: string
  updated_at: string
}

export type ResourceInput = Omit<Resource, 'id' | 'project_id' | 'created_at' | 'updated_at'>

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
      parent_id?: string | null
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

  listOrgStories: (params: { assignee?: string; order?: 'updated' | 'created'; limit?: number } = {}) => {
    const q = new URLSearchParams()
    if (params.assignee) q.set('assignee', params.assignee)
    if (params.order) q.set('order', params.order)
    if (params.limit) q.set('limit', String(params.limit))
    return request<Story[]>(`/stories?${q}`)
  },
  listOrgSprints: (status?: SprintStatus) => request<Sprint[]>(`/sprints${status ? `?status=${status}` : ''}`),

  listResources: (projectId: string) => request<Resource[]>(`/projects/${projectId}/resources`),
  createResource: (projectId: string, body: ResourceInput) =>
    request<Resource>(`/projects/${projectId}/resources`, json('POST', body)),
  updateResource: (id: string, body: Partial<ResourceInput>) => request<Resource>(`/resources/${id}`, json('PATCH', body)),
  deleteResource: (id: string) => request<void>(`/resources/${id}`, { method: 'DELETE' }),
}
