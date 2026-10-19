import { useEffect, useState } from 'react'
import { api, type Sprint, type Story, type User } from './api'

// Org-wide stories, sprints and people for the dashboard and My work.
export function useWorkData() {
  const [stories, setStories] = useState<Story[] | null>(null)
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([api.listOrgStories({ order: 'updated', limit: 200 }), api.listOrgSprints(), api.listUsers()])
      .then(([st, sp, us]) => {
        if (cancelled) return
        setStories(st)
        setSprints(sp)
        setUsers(us)
      })
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : String(e)))
    return () => {
      cancelled = true
    }
  }, [])

  return { stories, sprints, users, error }
}

/** Days until the story's sprint is due, or null if it has no open sprint or is done. */
export function storyDueDays(story: Story, sprintById: Map<string, Sprint>, daysUntil: (d: string) => number) {
  if (story.status === 'done' || !story.sprint_id) return null
  const sprint = sprintById.get(story.sprint_id)
  if (!sprint || sprint.status === 'completed') return null
  return daysUntil(sprint.due_date)
}
