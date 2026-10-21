import { STATUS_LABEL, type Priority, type Status } from './data'
import type { Environment, Provider, ResourceStatus } from './resources'
import { toast } from './toast'

export type Me = { id: string; email: string; name: string; org_id: string; role: string }

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
  edited_at: string | null
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

type Success<T> = string | ((data: T) => string)

// Every call goes through here: failures always raise an error toast; mutating
// calls pass `success` to confirm what happened. Errors are still thrown so
// callers can keep forms open or roll back.
async function request<T>(path: string, init?: RequestInit, success?: Success<T>): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    })
  } catch {
    toast.error("Can't reach the server", { description: 'Check your connection or that the backend is running.' })
    throw new Error("Can't reach the server")
  }
  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const body = (await res.json()) as { detail?: unknown }
      if (typeof body.detail === 'string') message = body.detail
      else if (Array.isArray(body.detail))
        message = body.detail.map((d: { msg: string }) => d.msg.replace(/^Value error, /, '')).join(', ')
    } catch {
      // keep the generic message
    }
    const reading = !init?.method || init.method === 'GET'
    const title =
      res.status >= 500
        ? 'Something went wrong on our side'
        : res.status === 404
          ? 'Not found'
          : res.status === 403
            ? 'Not allowed'
            : reading
              ? "Couldn't load data"
              : "Couldn't save changes"
    toast.error(title, { description: res.status >= 500 ? 'Please try again in a moment.' : message })
    throw new Error(message)
  }
  const data = (res.status === 204 ? undefined : await res.json()) as T
  if (success) toast.success(typeof success === 'function' ? success(data) : success)
  return data
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) })

function storyUpdateMessage(story: Story, body: Partial<Story>) {
  if (body.status) return `${story.key} moved to ${STATUS_LABEL[story.status]}`
  if ('sprint_id' in body) return story.sprint_id ? `${story.key} moved to sprint` : `${story.key} moved to backlog`
  if ('assignee_id' in body) return story.assignee_id ? `${story.key} assigned` : `${story.key} unassigned`
  if (body.labels) return `Labels updated on ${story.key}`
  return `${story.key} updated`
}

export const api = {
  me: () => request<Me>('/me'),
  listUsers: () => request<User[]>('/users'),
  createUser: (body: { name: string; email?: string }) =>
    request<User>('/users', json('POST', body), (u) => `${u.name} added to the team`),

  listProjects: () => request<Project[]>('/projects'),
  getProject: (id: string) => request<Project>(`/projects/${id}`),
  createProject: (body: { name: string; key?: string; description?: string; color?: string }) =>
    request<Project>('/projects', json('POST', body), (p) => `Project "${p.name}" created`),

  listSprints: (projectId: string) => request<Sprint[]>(`/projects/${projectId}/sprints`),
  createSprint: (
    projectId: string,
    body: { name: string; goal?: string; start_date?: string | null; due_date: string },
  ) => request<Sprint>(`/projects/${projectId}/sprints`, json('POST', body), (sp) => `${sp.name} created`),
  updateSprint: (id: string, body: Partial<Pick<Sprint, 'name' | 'goal' | 'start_date' | 'due_date' | 'status'>>) =>
    request<Sprint>(`/sprints/${id}`, json('PATCH', body), (sp) =>
      body.status === 'active' ? `${sp.name} started` : body.status === 'completed' ? `${sp.name} completed` : `${sp.name} updated`,
    ),

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
  ) => request<Story>(`/projects/${projectId}/stories`, json('POST', body), (st) =>
      st.parent_id ? `Subtask ${st.key} created` : `${st.key} created`,
    ),
  updateStory: (
    id: string,
    body: Partial<Pick<Story, 'title' | 'description' | 'priority' | 'points' | 'status' | 'sprint_id' | 'labels' | 'assignee_id' | 'reporter_id'>>,
  ) => request<Story>(`/stories/${id}`, json('PATCH', body), (st) => storyUpdateMessage(st, body)),

  getStory: (id: string) => request<Story>(`/stories/${id}`),
  deleteStory: (id: string) => request<void>(`/stories/${id}`, { method: 'DELETE' }, 'Story deleted'),
  listComments: (storyId: string) => request<Comment[]>(`/stories/${storyId}/comments`),
  createComment: (storyId: string, body: string) =>
    request<Comment>(`/stories/${storyId}/comments`, json('POST', { body }), 'Comment added'),
  updateComment: (id: string, body: string) =>
    request<Comment>(`/comments/${id}`, json('PATCH', { body }), 'Comment updated'),
  deleteComment: (id: string) => request<void>(`/comments/${id}`, { method: 'DELETE' }, 'Comment deleted'),

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
    request<Resource>(`/projects/${projectId}/resources`, json('POST', body), (r) => `${r.name} added to resources`),
  updateResource: (id: string, body: Partial<ResourceInput>) =>
    request<Resource>(`/resources/${id}`, json('PATCH', body), (r) => `${r.name} updated`),
  deleteResource: (id: string) => request<void>(`/resources/${id}`, { method: 'DELETE' }, 'Resource removed'),
}
