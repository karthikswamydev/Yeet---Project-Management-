import { Cloud, DollarSign, ExternalLink, Layers, Pencil, Plus, Search, Server, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api, type Resource, type ResourceInput, type User } from '../api'
import {
  ENV_LABEL,
  ENVIRONMENTS,
  PROVIDER_ORDER,
  PROVIDERS,
  STATUS_LABEL,
  formatCost,
  type Environment,
  type Provider,
} from '../resources'
import { Avatar } from './Avatar'
import { FilterDropdown } from './FilterDropdown'
import { ResourceModal } from './ResourceModal'
import { confirm } from '../confirm'

export function ProviderBadge({ provider }: { provider: Provider }) {
  const p = PROVIDERS[provider]
  return (
    <span className="provider-badge" style={{ background: p.color, color: p.text }} title={p.label}>
      {p.short}
    </span>
  )
}

export function ResourcesTab({ projectId, users }: { projectId: string; users: User[] }) {
  const [resources, setResources] = useState<Resource[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Resource | 'new' | null>(null)
  const [env, setEnv] = useState<Environment | 'all'>('all')
  const [providers, setProviders] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [showRetired, setShowRetired] = useState(false)

  useEffect(() => {
    let cancelled = false
    api
      .listResources(projectId)
      .then((r) => !cancelled && setResources(r))
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : String(e)))
    return () => {
      cancelled = true
    }
  }, [projectId])

  async function save(input: ResourceInput) {
    if (editing && editing !== 'new') {
      const updated = await api.updateResource(editing.id, input)
      setResources((prev) => (prev ?? []).map((r) => (r.id === updated.id ? updated : r)))
    } else {
      const created = await api.createResource(projectId, input)
      setResources((prev) => [...(prev ?? []), created])
    }
    setEditing(null)
  }

  async function remove(r: Resource) {
    const ok = await confirm({
      title: `Remove ${r.name}?`,
      message:
        "This only removes it from this project's list. It doesn't touch the actual resource in your cloud account.",
      confirmLabel: 'Remove',
      danger: true,
    })
    if (!ok) return
    try {
      await api.deleteResource(r.id)
      setResources((prev) => (prev ?? []).filter((x) => x.id !== r.id))
    } catch {
      // The API client already showed an error toast.
    }
  }

  const all = resources ?? []
  const active = all.filter((r) => r.status !== 'retired')
  const totalCost = active.reduce((sum, r) => sum + (r.monthly_cost ?? 0), 0)
  const providersUsed = PROVIDER_ORDER.filter((p) => active.some((r) => r.provider === p))
  const retiredCount = all.length - active.length
  const userById = new Map(users.map((u) => [u.id, u]))

  const q = query.trim().toLowerCase()
  const shown = all.filter(
    (r) =>
      (showRetired || r.status !== 'retired') &&
      (env === 'all' || r.environment === env) &&
      (providers.length === 0 || providers.includes(r.provider)) &&
      (!q || [r.name, r.service, r.identifier, r.region, r.notes].some((f) => f.toLowerCase().includes(q))),
  )

  return (
    <>
      <div className="stats resource-stats">
        <div className="stat stat-neutral">
          <span className="stat-icon">
            <Server size={20} />
          </span>
          <div>
            <div className="stat-value">{resources ? active.length : '–'}</div>
            <div className="stat-label">Active resources</div>
          </div>
        </div>
        <div className="stat stat-success">
          <span className="stat-icon">
            <DollarSign size={20} />
          </span>
          <div>
            <div className="stat-value">{resources ? formatCost(totalCost) : '–'}</div>
            <div className="stat-label">Est. monthly cost</div>
          </div>
        </div>
        <div className="stat stat-info">
          <span className="stat-icon">
            <Cloud size={20} />
          </span>
          <div>
            <div className="stat-providers">
              {providersUsed.length ? providersUsed.map((p) => <ProviderBadge key={p} provider={p} />) : <span className="stat-value">0</span>}
            </div>
            <div className="stat-label">Providers</div>
          </div>
        </div>
        <div className="stat stat-danger">
          <span className="stat-icon">
            <Layers size={20} />
          </span>
          <div>
            <div className="stat-value">{active.filter((r) => r.environment === 'production').length}</div>
            <div className="stat-label">In production</div>
          </div>
        </div>
      </div>

      <div className="resource-toolbar">
        <div className="segmented" role="tablist" aria-label="Environment">
          {(['all', ...ENVIRONMENTS] as const).map((e) => (
            <button
              key={e}
              role="tab"
              aria-selected={env === e}
              className={env === e ? 'active' : ''}
              onClick={() => setEnv(e)}
            >
              {e === 'all' ? 'All' : ENV_LABEL[e]}
            </button>
          ))}
        </div>
        <FilterDropdown
          label="Provider"
          icon={<Cloud size={14} />}
          options={PROVIDER_ORDER.filter((p) => all.some((r) => r.provider === p)).map((p) => ({
            value: p,
            text: PROVIDERS[p].label,
            node: (
              <span className="menu-row">
                <ProviderBadge provider={p} /> {PROVIDERS[p].label}
              </span>
            ),
          }))}
          value={providers}
          onChange={setProviders}
          emptyText="No resources yet"
        />
        <label className="resource-search">
          <Search size={14} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, ID, region…" />
        </label>
        <button className="btn primary resource-add" onClick={() => setEditing('new')}>
          <Plus size={16} /> Add resource
        </button>
      </div>

      {error && <p className="empty">Couldn&apos;t load this. Try refreshing the page.</p>}
      {resources === null && !error && <p className="empty">Loading…</p>}

      {resources !== null && all.length === 0 && (
        <div className="panel resource-empty">
          <Cloud size={28} />
          <h3>Track what this project runs on</h3>
          <p>Add the servers, buckets, databases and services this project uses, with their environment, owner and cost.</p>
          <button className="btn primary" onClick={() => setEditing('new')}>
            <Plus size={16} /> Add your first resource
          </button>
        </div>
      )}

      {resources !== null && all.length > 0 && (
        <div className="panel">
          {shown.length === 0 ? (
            <p className="empty">No resources match these filters.</p>
          ) : (
            <table className="resource-table">
              <thead>
                <tr>
                  <th>Resource</th>
                  <th>Service</th>
                  <th>Environment</th>
                  <th>Region</th>
                  <th>Owner</th>
                  <th className="num">Monthly</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => {
                  const owner = r.owner_id ? userById.get(r.owner_id) : null
                  return (
                    <tr key={r.id} className={r.status === 'retired' ? 'is-retired' : ''}>
                      <td>
                        <div className="resource-name">
                          <ProviderBadge provider={r.provider} />
                          <div className="resource-name-text">
                            <button type="button" className="resource-title" onClick={() => setEditing(r)}>
                              {r.name}
                            </button>
                            {r.identifier && (
                              <code className="resource-id" title={r.identifier}>
                                {r.identifier}
                              </code>
                            )}
                          </div>
                          {r.status !== 'active' && <span className={`pill res-${r.status}`}>{STATUS_LABEL[r.status]}</span>}
                        </div>
                      </td>
                      <td>
                        <span className="service-chip">{r.service}</span>
                      </td>
                      <td>
                        <span className={`env-chip env-${r.environment}`}>{ENV_LABEL[r.environment]}</span>
                      </td>
                      <td className="muted mono-cell">{r.region || '—'}</td>
                      <td>
                        {owner ? (
                          <span className="owner-cell" title={owner.name}>
                            <Avatar name={owner.name} size={24} />
                            <span className="ellipsis">{owner.name}</span>
                          </span>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td className="num">{formatCost(r.monthly_cost)}</td>
                      <td>
                        <div className="resource-actions">
                          {r.url && (
                            <a className="row-icon-btn" href={r.url} target="_blank" rel="noreferrer noopener" title="Open console" aria-label="Open console">
                              <ExternalLink size={15} />
                            </a>
                          )}
                          <button type="button" className="row-icon-btn" onClick={() => setEditing(r)} title="Edit" aria-label="Edit">
                            <Pencil size={15} />
                          </button>
                          <button type="button" className="row-icon-btn danger" onClick={() => void remove(r)} title="Remove" aria-label="Remove">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
          {retiredCount > 0 && (
            <div className="panel-foot resource-foot">
              <button className="link-btn" onClick={() => setShowRetired((v) => !v)}>
                {showRetired ? 'Hide' : 'Show'} {retiredCount} retired
              </button>
            </div>
          )}
        </div>
      )}

      {editing && (
        <ResourceModal
          resource={editing === 'new' ? null : editing}
          users={users}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
    </>
  )
}
