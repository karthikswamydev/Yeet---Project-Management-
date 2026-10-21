import { ShieldCheck, UserPlus } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { api, AUTH_REQUIRED_EVENT, ORG_ROLE_LABEL, type OrgRole, type User } from '../api'
import { useAuth } from '../auth'
import { Avatar } from './Avatar'
import { SelectField } from './SelectField'
import { authenticateUrl, stytch } from '../stytch'
import { toast } from '../toast'

// Yeet org role -> Stytch RBAC roles on the invite (see app/auth.py for the reverse mapping).
const STYTCH_ROLES: Record<OrgRole, string[]> = { admin: ['stytch_admin'], member: [], guest: ['guest'] }

const ROLE_HINT: Record<OrgRole, string> = {
  admin: 'Runs the workspace: people, settings, every project',
  member: 'Sees open projects, creates projects, works where added',
  guest: 'Only sees projects they are added to',
}

const roleOptions = (Object.keys(ORG_ROLE_LABEL) as OrgRole[]).map((r) => ({
  value: r,
  label: ORG_ROLE_LABEL[r],
  hint: ROLE_HINT[r],
  icon: <span className={`status-dot org-dot-${r}`} />,
}))

export function PeoplePage() {
  const { me, mode } = useAuth()
  const [people, setPeople] = useState<User[] | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<OrgRole>('member')
  const [saving, setSaving] = useState(false)

  const isAdmin = me?.role === 'admin'

  useEffect(() => {
    if (isAdmin) api.listUsers().then(setPeople).catch(() => setPeople([]))
  }, [isAdmin])

  if (me && !isAdmin) {
    return (
      <div className="panel resource-empty">
        <ShieldCheck size={28} />
        <h3>Only admins can manage people</h3>
        <p>Ask a workspace admin if you need someone added or their role changed.</p>
      </div>
    )
  }

  async function add(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || saving) return
    if (mode === 'stytch' && !email.trim()) return
    setSaving(true)
    try {
      if (mode === 'stytch' && stytch) {
        // The invite makes them a member of this Stytch organization; without it,
        // signing in would offer them a brand-new workspace instead of this one.
        try {
          await stytch.magicLinks.email.invite({
            email_address: email.trim(),
            name: name.trim(),
            roles: STYTCH_ROLES[role],
            invite_redirect_url: authenticateUrl(),
          })
        } catch (err) {
          if (stytchErrorType(err) === 'unauthorized_credentials') {
            // Stytch rejects the browser's session: it has expired, so sign in again.
            toast.warning('Your session expired', { description: 'Sign in again, then resend the invite.' })
            window.dispatchEvent(new Event(AUTH_REQUIRED_EVENT))
            return
          }
          toast.error("Couldn't send the invite", { description: stytchErrorMessage(err) })
          return
        }
      }
      const user = await api.createUser({ name: name.trim(), email: email.trim() || undefined, org_role: role })
      if (mode === 'stytch') toast.success(`Invite sent to ${user.email}`)
      setPeople((prev) => [...(prev ?? []), user].sort((a, b) => a.name.localeCompare(b.name)))
      setName('')
      setEmail('')
      setRole('member')
    } catch {
      // The API client already showed an error toast.
    } finally {
      setSaving(false)
    }
  }

  async function changeRole(user: User, next: OrgRole) {
    try {
      const updated = await api.updateUserRole(user.id, next)
      setPeople((prev) => (prev ?? []).map((u) => (u.id === updated.id ? updated : u)))
    } catch {
      // The API client already showed an error toast.
    }
  }

  const counts = (people ?? []).reduce<Record<OrgRole, number>>(
    (acc, u) => ({ ...acc, [u.org_role]: acc[u.org_role] + 1 }),
    { admin: 0, member: 0, guest: 0 },
  )

  return (
    <>
      <div className="page-head">
        <h1>People</h1>
        <p className="subtitle">
          Everyone in this workspace and what they can do.
          {people && ` ${people.length} people · ${counts.admin} admin${counts.admin === 1 ? '' : 's'} · ${counts.guest} guest${counts.guest === 1 ? '' : 's'}`}
        </p>
      </div>

      <form className="panel form invite-form" onSubmit={add}>
        <div className="invite-head">
          <UserPlus size={18} />
          <div>
            <h2 className="panel-h">{mode === 'stytch' ? 'Invite a person' : 'Add a person'}</h2>
            <p className="field-help">
              {mode === 'stytch'
                ? 'We email them an invite. You can add them to projects now; it takes effect when they accept.'
                : 'Dev mode: they can be picked from "View as" in your user menu.'}
            </p>
          </div>
        </div>
        <div className="invite-grid">
          <label className="field">
            <span className="field-label">
              Name <span className="req">*</span>
            </span>
            <input required maxLength={200} value={name} onChange={(e) => setName(e.target.value)} placeholder="Dana Scully" />
          </label>
          <label className="field">
            <span className="field-label">
              Email {mode === 'stytch' && <span className="req">*</span>}
            </span>
            <input type="email" required={mode === 'stytch'} maxLength={320} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="dana@company.com" />
          </label>
          <div className="field">
            <span className="field-label">Role</span>
            <SelectField ariaLabel="Role" value={role} options={roleOptions} onChange={(v) => setRole(v as OrgRole)} />
          </div>
          <button
            className="btn primary invite-btn"
            disabled={!name.trim() || saving || (mode === 'stytch' && !email.trim())}
          >
            {saving ? (mode === 'stytch' ? 'Inviting…' : 'Adding…') : mode === 'stytch' ? 'Send invite' : 'Add person'}
          </button>
        </div>
      </form>

      <div className="panel">
        {people === null ? (
          <p className="empty">Loading…</p>
        ) : (
          <table className="resource-table people-table">
            <thead>
              <tr>
                <th>Person</th>
                <th>Email</th>
                <th>Workspace role</th>
              </tr>
            </thead>
            <tbody>
              {people.map((u) => (
                <tr key={u.id}>
                  <td>
                    <span className="owner-cell people-name">
                      <Avatar name={u.name} size={32} />
                      <span className="ellipsis">
                        {u.name}
                        {u.id === me?.id && <span className="you-tag">You</span>}
                      </span>
                    </span>
                  </td>
                  <td className="muted">{u.email ?? '—'}</td>
                  <td className="people-role">
                    {mode === 'stytch' ? (
                      <span className={`role-badge role-${u.org_role}`} title="Managed in Stytch">
                        {ORG_ROLE_LABEL[u.org_role]}
                      </span>
                    ) : (
                    <SelectField
                      ariaLabel={`Role for ${u.name}`}
                      value={u.org_role}
                      options={roleOptions}
                      onChange={(v) => void changeRole(u, v as OrgRole)}
                    />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}

function stytchErrorType(err: unknown): string | undefined {
  const type = (err as { error_type?: unknown } | null)?.error_type
  return typeof type === 'string' ? type : undefined
}

// Stytch SDK errors carry the API's error type and message; surface the useful part.
function stytchErrorMessage(err: unknown): string {
  const type = stytchErrorType(err)
  const raw = err instanceof Error ? err.message : String(err)
  if (type === 'billing_not_verified_for_email') {
    return 'Stytch only emails your own address until billing is verified. Add a card at stytch.com/dashboard/settings/billing.'
  }
  if (type === 'unauthorized_action') {
    return 'Your Stytch role isn\'t allowed to invite people. Check its permissions under Roles & permissions.'
  }
  if (/role/i.test(raw) && /not found|invalid/i.test(raw)) {
    return 'That role doesn\'t exist in Stytch yet. Create a "guest" role under Roles & permissions.'
  }
  if (/member actions|not enabled|sdk.*disabled/i.test(raw)) {
    return 'Member invites are turned off in Stytch\'s Frontend SDK settings.'
  }
  return raw.split('\n')[0].slice(0, 200)
}
