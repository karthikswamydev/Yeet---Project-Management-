import { createContext, useContext } from 'react'
import type { Me, Project, ProjectRole } from './api'

// What someone can do in a project. "reader" is an org member looking at an open
// project they haven't joined; it isn't stored anywhere.
export type Access = 'none' | 'reader' | ProjectRole
const RANK: Record<Access, number> = { none: -1, reader: 0, viewer: 1, contributor: 2, scrum_master: 3 }

export type AuthState = { me: Me | null; mode: 'dev' | 'stytch'; refreshMe: () => void }

export const AuthContext = createContext<AuthState>({ me: null, mode: 'dev', refreshMe: () => {} })

export const useAuth = () => useContext(AuthContext)

/** Mirrors the backend's rules (backend/app/routes.py) so the UI only offers what will work. */
export function projectAccess(me: Me | null, project: Pick<Project, 'id' | 'visibility'> | null): Access {
  if (!me || !project) return 'none'
  if (me.role === 'admin') return 'scrum_master'
  const role = me.project_roles[project.id]
  if (role) return role
  return project.visibility === 'open' && me.role !== 'guest' ? 'reader' : 'none'
}

export const atLeast = (access: Access, need: Access) => RANK[access] >= RANK[need]

/** Everything the project UI needs to decide which controls to show. */
export function projectPermissions(me: Me | null, project: Project | null) {
  const access = projectAccess(me, project)
  const archived = !!project?.archived_at
  const can = (need: Access) => atLeast(access, need) && !archived
  return {
    access,
    archived,
    canComment: can('viewer'),
    canEditWork: can('contributor'),
    canManageSprints: can('scrum_master'),
    canSeeResources: atLeast(access, 'contributor'),
    canEditResources: can('scrum_master'),
    // Settings stay reachable on archived projects so they can be restored.
    canManageProject: atLeast(access, 'scrum_master'),
    canDeleteStory: (reporterId: string | null) =>
      can('scrum_master') || (can('contributor') && reporterId !== null && reporterId === me?.id),
    canDeleteComment: (authorId: string | null) => authorId === me?.id || can('scrum_master'),
  }
}

export type ProjectPermissions = ReturnType<typeof projectPermissions>
