import { Archive, ArchiveRestore, Globe, Lock, Trash2, UserPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api, PROJECT_ROLE_LABEL, type Member, type Project, type ProjectRole, type User, type Visibility } from '../api'
import { useAuth } from '../auth'
import { confirm } from '../confirm'
import { Avatar } from './Avatar'
import { SelectField } from './SelectField'

const ROLE_HINT: Record<ProjectRole, string> = {
  scrum_master: 'Runs sprints, members and settings',
  contributor: 'Creates, edits and moves stories',
  viewer: 'Reads and comments',
}

const roleOptions = (Object.keys(PROJECT_ROLE_LABEL) as ProjectRole[]).map((r) => ({
  value: r,
  label: PROJECT_ROLE_LABEL[r],
  hint: ROLE_HINT[r],
  icon: <span className={`status-dot proj-dot-${r}`} />,
}))

export function ProjectSettings({
  project,
  users,
  onProjectChange,
}: {
  project: Project
  users: User[]
  onProjectChange: (p: Project) => void
}) {
  const { me, refreshMe } = useAuth()
  const [members, setMembers] = useState<Member[] | null>(null)
  const [newUser, setNewUser] = useState('')
  const [newRole, setNewRole] = useState<ProjectRole>('contributor')

  useEffect(() => {
    api
      .listMembers(project.id)
      .then(setMembers)
      .catch(() => setMembers([]))
  }, [project.id])

  const userById = new Map(users.map((u) => [u.id, u]))
  const memberIds = new Set((members ?? []).map((m) => m.user_id))
  const candidates = users.filter((u) => !memberIds.has(u.id))

  // My own role may have changed; refresh what the UI thinks I can do.
  const touchesMe = (userId: string) => userId === me?.id && refreshMe()

  async function add() {
    if (!newUser) return
    try {
      const m = await api.addMember(project.id, newUser, newRole)
      setMembers((prev) => [...(prev ?? []), m])
      touchesMe(m.user_id)
      setNewUser('')
      setNewRole('contributor')
    } catch {
      // The API client already showed an error toast.
    }
  }

  async function changeRole(m: Member, role: ProjectRole) {
    try {
      const updated = await api.updateMember(project.id, m.user_id, role)
      setMembers((prev) => (prev ?? []).map((x) => (x.user_id === updated.user_id ? updated : x)))
      touchesMe(m.user_id)
    } catch {
      // The API client already showed an error toast.
    }
  }

  async function remove(m: Member) {
    const name = userById.get(m.user_id)?.name ?? 'this person'
    const self = m.user_id === me?.id
    const ok = await confirm({
      title: self ? 'Leave this project?' : `Remove ${name}?`,
      message: self
        ? "You'll lose your role here. You may still be able to read it if it's open to the workspace."
        : `${name} will lose access to this project${project.visibility === 'open' ? ', though they can still read it because it is open' : ''}. Their stories and comments stay.`,
      confirmLabel: self ? 'Leave' : 'Remove',
      danger: true,
    })
    if (!ok) return
    try {
      await api.removeMember(project.id, m.user_id)
      setMembers((prev) => (prev ?? []).filter((x) => x.user_id !== m.user_id))
      touchesMe(m.user_id)
    } catch {
      // The API client already showed an error toast.
    }
  }

  async function setVisibility(visibility: Visibility) {
    if (visibility === project.visibility) return
    try {
      onProjectChange(await api.updateProject(project.id, { visibility }))
    } catch {
      // The API client already showed an error toast.
    }
  }

  async function toggleArchive() {
    const archiving = !project.archived_at
    if (archiving) {
      const ok = await confirm({
        title: `Archive ${project.name}?`,
        message: 'It becomes read-only for everyone and moves to the Archived section. You can restore it any time.',
        confirmLabel: 'Archive project',
        danger: true,
      })
      if (!ok) return
    }
    try {
      onProjectChange(await api.updateProject(project.id, { archived: archiving }))
    } catch {
      // The API client already showed an error toast.
    }
  }

  return (
    <div className="settings-stack">
      <section className="panel settings-card">
        <div className="settings-head">
          <div>
            <h2 className="panel-h">Members</h2>
            <p className="field-help">
              Who works on this project and what they can do. Workspace admins can act as scrum master without being added.
            </p>
          </div>
        </div>

        <div className="member-add">
          <div className="member-add-user">
            <SelectField
              ariaLabel="Person to add"
              value={newUser}
              placeholder={candidates.length ? 'Choose a person…' : 'Everyone is already a member'}
              options={candidates.map((u) => ({
                value: u.id,
                label: u.name,
                hint: u.email ?? undefined,
                icon: <Avatar name={u.name} size={22} />,
              }))}
              onChange={setNewUser}
            />
          </div>
          <div className="member-add-role">
            <SelectField ariaLabel="Role" value={newRole} options={roleOptions} onChange={(v) => setNewRole(v as ProjectRole)} />
          </div>
          <button type="button" className="btn primary" disabled={!newUser} onClick={() => void add()}>
            <UserPlus size={16} /> Add
          </button>
        </div>

        {members === null ? (
          <p className="empty">Loading…</p>
        ) : (
          <ul className="member-list">
            {members.map((m) => {
              const u = userById.get(m.user_id)
              return (
                <li key={m.user_id} className="member-row">
                  <Avatar name={u?.name ?? '?'} size={32} />
                  <div className="member-text">
                    <span className="member-name">
                      {u?.name ?? 'Unknown user'}
                      {m.user_id === me?.id && <span className="you-tag">You</span>}
                    </span>
                    <span className="member-email">{u?.email ?? '—'}</span>
                  </div>
                  <div className="member-role">
                    <SelectField
                      ariaLabel={`Role for ${u?.name ?? 'member'}`}
                      value={m.role}
                      options={roleOptions}
                      onChange={(v) => void changeRole(m, v as ProjectRole)}
                    />
                  </div>
                  <button
                    type="button"
                    className="row-icon-btn danger"
                    title={m.user_id === me?.id ? 'Leave project' : 'Remove from project'}
                    aria-label={m.user_id === me?.id ? 'Leave project' : `Remove ${u?.name ?? 'member'}`}
                    onClick={() => void remove(m)}
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="panel settings-card">
        <h2 className="panel-h">Visibility</h2>
        <div className="choice-grid" role="radiogroup" aria-label="Visibility">
          <button
            type="button"
            role="radio"
            aria-checked={project.visibility === 'open'}
            className={project.visibility === 'open' ? 'choice active' : 'choice'}
            onClick={() => void setVisibility('open')}
          >
            <Globe size={18} />
            <span>
              <strong>Open</strong>
              <span>Everyone in the workspace can find and read it. Guests still need to be added.</span>
            </span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={project.visibility === 'private'}
            className={project.visibility === 'private' ? 'choice active' : 'choice'}
            onClick={() => void setVisibility('private')}
          >
            <Lock size={18} />
            <span>
              <strong>Private</strong>
              <span>Only members and workspace admins can see it exists. Good for HR, security or client work.</span>
            </span>
          </button>
        </div>
      </section>

      <section className="panel settings-card danger-zone">
        <div className="danger-row">
          <div>
            <h2 className="panel-h">{project.archived_at ? 'Restore project' : 'Archive project'}</h2>
            <p className="field-help">
              {project.archived_at
                ? 'Make it editable again and move it back to the projects list.'
                : 'Make it read-only for everyone and tuck it away under Archived. Nothing is deleted.'}
            </p>
          </div>
          <button type="button" className={project.archived_at ? 'btn' : 'btn danger'} onClick={() => void toggleArchive()}>
            {project.archived_at ? <ArchiveRestore size={16} /> : <Archive size={16} />}
            {project.archived_at ? 'Restore' : 'Archive'}
          </button>
        </div>
      </section>
    </div>
  )
}
