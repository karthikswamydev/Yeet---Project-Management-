import { useEffect, useState } from 'react'

// Hash routes:
//   #/                                  dashboard
//   #/my-work                           my work
//   #/projects/:projectId               project
//   #/projects/:projectId/stories/:id   project with a story open
//   #/projects/:projectId/resources     project's cloud resources
//   #/projects/:projectId/settings      members, visibility, archive (scrum masters)
export type Route =
  | { page: 'home' }
  | { page: 'my-work' }
  | { page: 'people' }
  | { page: 'project'; projectId: string; storyId: string | null; tab: ProjectTab }

export type ProjectTab = 'work' | 'resources' | 'settings'

function parse(hash: string): Route {
  if (/^#\/my-work\/?$/.test(hash)) return { page: 'my-work' }
  if (/^#\/settings\/people\/?$/.test(hash)) return { page: 'people' }
  const sub = /^#\/projects\/([^/]+)\/(resources|settings)\/?$/.exec(hash)
  if (sub) return { page: 'project', projectId: sub[1], storyId: null, tab: sub[2] as ProjectTab }
  const m = /^#\/projects\/([^/]+)(?:\/stories\/([^/]+))?/.exec(hash)
  if (m) return { page: 'project', projectId: m[1], storyId: m[2] ?? null, tab: 'work' }
  return { page: 'home' }
}

export function useRoute() {
  const [route, setRoute] = useState(() => parse(window.location.hash))
  useEffect(() => {
    const onChange = () => setRoute(parse(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

export const projectHref = (projectId: string) => `#/projects/${projectId}`
export const resourcesHref = (projectId: string) => `#/projects/${projectId}/resources`
export const settingsHref = (projectId: string) => `#/projects/${projectId}/settings`
export const storyHref = (projectId: string, storyId: string) => `#/projects/${projectId}/stories/${storyId}`
