import { ArrowRight, Building2, FlaskConical, KeyRound, Lock, LogOut, Mail, UserRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { api, ORG_ROLE_LABEL, PROJECT_ROLE_LABEL, type OrgRole, type Project } from '../api'
import { useAuth } from '../auth'
import { projectHref } from '../routes'
import { signOut, stytch } from '../stytch'
import { formatDateTime } from '../time'
import { Avatar } from './Avatar'
import { StytchSessionInfo } from './StytchSessionInfo'

const ORG_ROLE_EXPLAINER: Record<OrgRole, string> = {
  admin: 'You run this workspace: people, roles and every project, including private ones.',
  member: 'You can see open projects, create projects, and work in the ones you are added to.',
  guest: 'You only see the projects you have been added to.',
}

export function AccountPage({ projects }: { projects: Project[] }) {
  const { me, mode, refreshMe } = useAuth()
  const [name, setName] = useState(me?.name ?? '')
  const [saving, setSaving] = useState(false)

  if (!me) return <p className="empty">Loading…</p>

  const dirty = name.trim() !== '' && name.trim() !== me.name
  const isAdmin = me.role === 'admin'
  const myProjects = projects
    .map((p) => ({ p, role: me.project_roles[p.id] ?? null }))
    .filter(({ role }) => role || isAdmin)

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!dirty || saving) return
    setSaving(true)
    try {
      await api.updateMe({ name: name.trim() })
      refreshMe()
    } catch {
      // The API client already showed an error toast.
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="account-hero">
        <Avatar name={me.name} size={64} />
        <div className="account-hero-text">
          <h1>{me.name}</h1>
          <p className="subtitle">
            {me.email ?? 'No email'} · <span className={`role-badge role-${me.role}`}>{ORG_ROLE_LABEL[me.role]}</span>
          </p>
        </div>
      </div>

      <div className="account-grid">
        <section className="panel settings-card">
          <h2 className="panel-h card-title">
            <UserRound size={16} /> Profile
          </h2>
          <form className="form" onSubmit={save}>
            <label className="field">
              <span className="field-label">Display name</span>
              <input value={name} maxLength={200} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
              <span className="field-help">Shown on stories, comments and avatars.</span>
            </label>
            <label className="field">
              <span className="field-label">Email</span>
              <span className="input-group is-readonly">
                <span className="input-adorn icon">
                  <Mail size={15} />
                </span>
                <input value={me.email ?? ''} readOnly aria-readonly="true" />
              </span>
              <span className="field-help">
                {mode === 'stytch' ? 'This is the address you sign in with.' : 'Set when you were added.'}
              </span>
            </label>
            <div className="form-actions start">
              <button className="btn primary" disabled={!dirty || saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              {dirty && (
                <button type="button" className="btn subtle" onClick={() => setName(me.name)}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="panel settings-card">
          <h2 className="panel-h card-title">
            <Building2 size={16} /> Workspace
          </h2>
          <dl className="kv">
            <dt>Workspace</dt>
            <dd>{me.org_name}</dd>
            <dt>Your role</dt>
            <dd>
              <span className={`role-badge role-${me.role}`}>{ORG_ROLE_LABEL[me.role]}</span>
            </dd>
            <dt>Member since</dt>
            <dd>{formatDateTime(me.created_at)}</dd>
          </dl>
          <p className="field-help">{ORG_ROLE_EXPLAINER[me.role]}</p>
          {mode === 'stytch' && (
            <p className="field-help">Your workspace role is managed by a workspace admin in Stytch.</p>
          )}
        </section>

        <section className="panel settings-card account-wide">
          <h2 className="panel-h card-title">
            <Lock size={16} /> Projects &amp; roles
          </h2>
          {myProjects.length === 0 ? (
            <p className="muted">You aren&apos;t a member of any project yet.</p>
          ) : (
            <ul className="account-projects">
              {myProjects.map(({ p, role }) => (
                <li key={p.id}>
                  <a href={projectHref(p.id)} className="account-project">
                    <span className="project-avatar sm" style={{ background: p.color }}>
                      {p.key.slice(0, 2)}
                    </span>
                    <span className="account-project-text">
                      <span className="account-project-name">
                        {p.name}
                        {p.visibility === 'private' && <Lock size={12} className="card-lock" aria-label="Private" />}
                        {p.archived_at && <span className="pill">Archived</span>}
                      </span>
                      <span className="muted">{p.key}</span>
                    </span>
                    <span className="account-project-role">
                      {role ? PROJECT_ROLE_LABEL[role] : 'Admin access'}
                    </span>
                    <ArrowRight size={15} className="account-project-go" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel settings-card account-wide">
          <h2 className="panel-h card-title">
            <KeyRound size={16} /> Sign-in &amp; security
          </h2>
          {mode === 'stytch' ? (
            <>
              <dl className="kv">
                <dt>Method</dt>
                <dd>Email link to {me.email}</dd>
              </dl>
              {stytch && <StytchSessionInfo />}
              <div className="form-actions start">
                <button type="button" className="btn" onClick={() => void signOut()}>
                  <LogOut size={15} /> Sign out
                </button>
              </div>
            </>
          ) : (
            <p className="secret-note">
              <FlaskConical size={16} />
              <span>Dev mode: there&apos;s no login. Anyone who can reach the app can act as anyone.</span>
            </p>
          )}
        </section>
      </div>
    </>
  )
}
